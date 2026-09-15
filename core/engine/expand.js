// core/engine/expand.js: expandScene(data), the PURE data->data expansion of the three build-time sugar layer
// types (`block`, `beat`, `comp`) into the real layers they produce, and loadScene(data) =
// lowerScene(expandScene(data)), the loader every Node gate and script calls to read a scene off disk.
//
// NODE-ONLY BY POLICY, NOT BY CONSTRAINT: expandScene itself is pure ESM (no `fs`) and boots fine in
// any browser that can fetch `blocks/`. The render page cannot: internal/scene's file
// server default-denies everything outside core/themes/films/assets/.vawe-data
// (internal/scene/scene.go `served`), by design, because it renders scenes from strangers over MCP,
// and this module's dependency on ~186 block/beat factories (one of which, blocks/geo.mjs, imports
// `d3-geo` by bare specifier, resolvable only through an import map the render page does not carry)
// sits outside that allowlist on purpose. So `films/scene/scene.js` never imports this file: a scene
// using this vocabulary is expanded SERVER-SIDE instead, in Node (internal/render/expand.go shells out
// to `harness/author/expand-blocks.mjs`, the debug CLI this file now backs), before the browser ever
// sees the JSON. Every OTHER consumer of a scene, every gate and script, is plain Node and imports
// `loadScene` from here directly, `core/transitions/lower.js` untouched by this dependency.
//
// Was harness/author/expand-blocks.mjs, a Node-only CLI that wrote a second file (`<name>.expanded.json`)
// nothing but this same expansion could produce, so every author worked in a two-file world: write the
// JSON, remember to expand it, render the derivative, keep both current. That CLI is now a thin wrapper
// around this module (still useful standalone, to eyeball what a beat/block resolves to), and every
// gate reads the ONE source file, sugar included; the render path resolves it a level down, in Go.
//
// Idempotent: a scene with no block/beat/comp layers passes through unchanged, so calling this twice (a
// gate that clones and re-derives, or a Go pre-expand followed by a gate's own loadScene) never
// double-expands.
import * as B from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';
import { bakeCameraMove } from './produce.js';
import { frameOf } from '../layout/safe.js';
import { lowerScene } from '../transitions/lower.js';
import { expandRecipes } from '../../recipes/expand.mjs';
import { resolveTempo } from './tempo.js';
import { resolveRelativeTimes } from '../timeline/relative-time.js';

// An AUTHOR NOTE is not an unknown-prop finding. This repo writes notes as `_`-prefixed keys everywhere
// (`_why`, `_template`, `_camera`); `note` is the one un-prefixed alias already in use.
const isNote = (k) => k === 'note' || k.startsWith('_');

// offset a comp's authored-at-origin layer by the instance's x/y/start (group children flow, untouched).
const shift = (layer, dx, dy, dt) => ({
  ...layer,
  ...(dx || layer.x != null ? { x: (layer.x ?? 0) + dx } : {}),
  ...(dy || layer.y != null ? { y: (layer.y ?? 0) + dy } : {}),
  start: (layer.start ?? 0) + dt,
});

// warnUnknown(fn, opts, label): an unknown-prop finding for a block/beat instance, printed (an author
// typo a factory silently ignores, engine-doctrine/MISTAKES.md #60), never thrown: the same posture `make expand`
// always had. Reads the factory's OWN signature, so nobody maintains a second copy of its parameter list.
function warnUnknown(fn, opts, label) {
  const sig = fn && /\(\s*\{([^}]*)\}/.exec(fn.toString());
  if (!sig) return;
  const known = new Set(sig[1].split(',').map((t) => t.split(/[:=]/)[0].trim()).filter(Boolean));
  const unknown = Object.keys(opts).filter((k) => !known.has(k) && !isNote(k));
  if (unknown.length) console.warn(`${label} ignores ${unknown.map((u) => `\`${u}\``).join(', ')}, not a prop it accepts (known: ${[...known].join(', ')})`);
}

// expandBlock(layer) -> [rawLayer...], the factory's own output, unrecursed (the caller flatMaps back
// through `expand` so a block emitting a comp, in theory, still resolves).
function expandBlock(layer) {
  const f = B.BLOCKS[layer.block];
  if (!f) throw new Error(`unknown block "${layer.block}". known: ${Object.keys(B.BLOCKS).join(', ')}`);
  const { type: _type, block: _block, ...opts } = layer;
  // A namespaced entry ("searchEngine.home") resolves to a WRAPPER; walk to the family the catalog
  // declares so introspecting its signature reads the right function (engine-doctrine/MISTAKES.md).
  const entry = CATALOG.find((e) => e.name === layer.block);
  const famFn = entry ? B.BLOCKS[entry.family] : (layer.block.includes('.') ? B.BLOCKS[layer.block.split('.')[0]] : f);
  warnUnknown(famFn, opts, `block "${layer.block}"`);
  return f(opts);
}

// expandBeat(layer) -> refused. Blueprints are retired: `{type:"beat"}` was the sugar that expanded to
// one, and every film that used it has been baked to its literal layers (engine-doctrine/MISTAKES.md, the
// retire-blueprints migration). A scene still authoring `{type:"beat"}` is either a stale draft or a
// copy-paste from an old example; the fix is to compose from `recipes/` (recipes/README.md) or, for a
// whole beat's worth of layers, to read `make arsenal Q="..."` for the nearest vocabulary that replaced
// it, never to add a new blueprint.
function expandBeat(layer) {
  throw new Error(`beat "${layer.beat}": blueprints are retired. Compose from recipes/ instead `
    + '(recipes/README.md), or run `make arsenal Q="..."` to find the nearest replacement. '
    + 'A shipped film should never author {type:"beat"}; every film that did has been baked to its '
    + 'literal layers.');
}

// expandComp(layer, comps, stack) -> [rawLayer...], the comp's own layers shifted onto the instance's
// x/y/start, unrecursed (the caller flatMaps back through `expand`, extending `stack` for the cycle
// guard: a comp's layers may themselves be blocks or other comps).
function expandComp(layer, comps, stack) {
  const c = comps[layer.ref];
  if (!c) throw new Error(`unknown comp "${layer.ref}". defined: ${Object.keys(comps).join(', ') || '(none)'}`);
  if (stack.includes(layer.ref)) throw new Error(`comp cycle: ${[...stack, layer.ref].join(' → ')}`);
  const dx = layer.x ?? 0, dy = layer.y ?? 0, dt = layer.start ?? 0;
  return (c.layers || []).map((l) => shift(l, dx, dy, dt));
}

/**
 * expandScene(data, aspectKey = '') -> data, mutated in place and returned. Expands every
 * `{type:"block"}`, `{type:"beat"}` and `{type:"comp"}` layer (at any nesting depth, recursively) into
 * the concrete layers its factory/blueprint/definition produces, bakes `cameraMove` (idempotent: a
 * no-op if it was already baked, e.g. by core/engine/boot.js for the browser render path), and strips
 * the top-level `comps` map. Unknown-prop findings for a block/beat instance are printed as warnings
 * (an author typo that a factory silently ignores, engine-doctrine/MISTAKES.md #60), never thrown: the same
 * posture `make expand` always had.
 *
 * aspectKey names the canvas any aspect-dependent resolution (the camera bake, a flow-seam's travel)
 * should use. Every Node consumer (loadScene, `make expand`) omits it and keeps today's default, the
 * scene's own declared aspect (frameOf's own fallback). internal/render/expand.go passes the Go render's
 * actual --aspect, because that render happens BEFORE the browser exists to resolve it itself
 * (films/scene/scene.js never imports this module, see the file banner), so without a key here the
 * bake always used the scene's own aspect no matter which canvas the render targeted.
 */
export function expandScene(data, aspectKey = '') {
  if (!data || typeof data !== 'object') return data;
  const comps = data.comps || {};

  function expand(layer, stack) {
    if (layer.type === 'block') return expandBlock(layer).flatMap((l) => expand(l, stack));
    if (layer.type === 'beat') return expandBeat(layer);
    if (layer.type === 'comp') return expandComp(layer, comps, stack).flatMap((l) => expand(l, [...stack, layer.ref]));
    // SLOTS: a container block/comp's `children` may themselves be sugar (a `listRow` block inside a
    // `phoneFrame` block). Descend through every nesting level; a non-sugar child passes through untouched.
    if (Array.isArray(layer.children) && layer.children.length) {
      return [{ ...layer, children: layer.children.flatMap((c) => expand(c, stack)) }];
    }
    return [layer];
  }

  data.layers = (data.layers || []).flatMap((l) => expand(l, []));

  // recipes[] sugar -> plain `motion` keys and layer windows on the layers they name (recipes/expand.mjs).
  // Runs after block/beat/comp, so a recipe naming a layer id one of those produced still resolves.
  if (data.recipes) {
    // Copy back EVERYTHING the expansion wrote, not just layers: a camera recipe (window-dolly) writes
    // `cameraMove`, and copying layers alone dropped every recipe camera leg before bakeCameraMove saw it.
    Object.assign(data, expandRecipes(data, aspectKey));
    delete data.recipes;
  }

  // RELATIVE TIME ("otherId+0.5", "otherId.end-0.2"), resolved to a plain number BEFORE tempo below:
  // an offset is authored in the film's real seconds, so it must scale like any other authored time,
  // not get added on top of an already-scaled target. core/timeline/relative-time.js.
  resolveRelativeTimes(data);

  // TEMPO, the one global pace dial. Resolved AFTER blocks/beats/comps/recipes have produced their
  // final concrete times, and BEFORE the camera bake below, so a scaled cameraMove leg (still sugar
  // here) reaches bakeCameraMove already in the film's real seconds. core/engine/tempo.js.
  resolveTempo(data);

  // cameraMove sugar -> data.camera. ONE implementation, core/engine/produce.js. Idempotent (it deletes the
  // field), so calling it here after core/engine/boot.js already baked it for a browser render is a no-op.
  if (data.cameraMove) bakeCameraMove(data, frameOf(data, aspectKey));

  delete data.comps;
  return data;
}

// loadScene(data): THE loader every Node consumer of a scene JSON calls (a gate, a script). Expands
// build-time sugar BEFORE lowering the unified transitions surface, so a beat/block emitting its own
// `transition` sugar is normalised too. films/scene/scene.js (the render page) does not call this:
// see the file banner for why, and internal/render/expand.go for where the same expansion happens for
// that path instead.
// DO NOT call core/engine/produce.js's produceBaseline (or any other defaults pass) from here. It was
// tried and reverted: engine-doctrine/MISTAKES.md #157 records that wiring the produced baseline into the gates
// masked the exact conditions they test (a gate checking "no camera was injected" can no longer see
// that once loadScene injects one first). A gate coaches on what the author WROTE; the engine fills
// the baseline only on the render path, at core/engine/boot.js. Two different jobs, read the same
// source file, never the same derived one.
export function loadScene(data) {
  return lowerScene(expandScene(data));
}
