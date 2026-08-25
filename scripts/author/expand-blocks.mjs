// scripts/author/expand-blocks.mjs — makes taste BLOCKS and reusable COMPS first-class in scene JSON, at build time.
//
// BLOCK — a vetted factory from blocks/index.mjs:
//   { "type": "block", "block": "stripeCard", "x": 1260, "y": 400, "start": 40, "dur": 3 }
//   → expands into the real layers the block emits.
//
// COMP — a named sub-composition you define once and instance many times/places/times. Define under a
// top-level "comps" map (each entry is { "layers": [...] } authored relative to origin 0,0), then place it:
//   "comps": { "gate": { "layers": [ ... ] } }
//   { "type": "comp", "ref": "gate", "x": 200, "y": 120, "start": 8 }
//   → the comp's layers, each with x/y/start OFFSET by the instance (group children flow, so untouched).
//   Comps may contain blocks and other comps — expansion is recursive (cycle-guarded).
//
// Both are deterministic: same JSON → identical expanded layers → identical render. Run before
// validate/render, or via `make expand`. The "comps" key is stripped from the output.
//
// Usage: node scripts/author/expand-blocks.mjs <scene.json> [out.json]   (default out = <scene>.expanded.json)
import fs from 'node:fs';
import * as B from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';
import { BEATS } from '../../blueprints/index.mjs';
// bakeCameraMove owns the conversion now (core/produce.js) and takes a FRAME, not dimensions. This
// file was switched to call it and its imports were not, so `bakeCameraMove is not defined` threw on
// any scene carrying a top-level `cameraMove` — and nothing caught it, because no snapshotted scene
// has one. A call site updated without its import is invisible to every gate that never takes that
// branch, which is why the check below renders one.
import { bakeCameraMove } from '../../core/produce.js';
import { frameOf } from '../../core/safe.js';

const inp = process.argv[2];
if (!inp) { console.error('usage: node scripts/author/expand-blocks.mjs <scene.json> [out.json]'); process.exit(2); }
const out = process.argv[3] || inp.replace(/\.json$/, '.expanded.json');
const d = JSON.parse(fs.readFileSync(inp, 'utf8'));

const comps = d.comps || {};
let nBlocks = 0, nComps = 0, nBeats = 0;
const warnings = [];

// offset a comp's authored-at-origin layer by the instance's x/y/start (group children flow, untouched).
const shift = (layer, dx, dy, dt) => ({
  ...layer,
  ...(dx || layer.x != null ? { x: (layer.x ?? 0) + dx } : {}),
  ...(dy || layer.y != null ? { y: (layer.y ?? 0) + dy } : {}),
  start: (layer.start ?? 0) + dt,
});

// expand one layer into 0+ concrete layers. `stack` carries the comp-ref path to catch cycles.
function expand(layer, stack) {
  if (layer.type === 'block') {
    const f = B.BLOCKS[layer.block];
    if (!f) throw new Error(`unknown block "${layer.block}". known: ${Object.keys(B.BLOCKS).join(', ')}`);
    const { type, block, ...opts } = layer;
    // A factory destructures the props it knows and silently ignores the rest, so a typo or a prop the
    // block never wired through renders as nothing at all and the JSON still looks right. That is how
    // `keyGain: 0.055` sat in this scene while the render used the default (docs/MISTAKES.md #60).
    // The parameter names are readable off the factory source, so the mismatch is checkable.
    // A namespaced entry ("searchEngine.home") resolves to a WRAPPER that merges the manifest props
    // and calls the family, so introspecting it reads the wrapper's own signature. Walk to the family.
    // Use the catalog's declared `family`, not the first path segment: `card.pricing.free` has family
    // `pricingCard`, so splitting on '.' introspected `card` and warned that correct props were being
    // ignored. A false warning trains authors to distrust a system that is otherwise right.
    const entry = CATALOG.find((e) => e.name === layer.block);
    const famFn = entry ? B.BLOCKS[entry.family] : (layer.block.includes('.') ? B.BLOCKS[layer.block.split('.')[0]] : f);
    const sig = famFn && /\(\s*\{([^}]*)\}/.exec(famFn.toString());
    if (sig) {
      const known = new Set(sig[1].split(',').map((t) => t.split(/[:=]/)[0].trim()).filter(Boolean));
      const unknown = Object.keys(opts).filter((k) => !known.has(k));
      if (unknown.length) warnings.push(`block "${layer.block}" ignores ${unknown.map((u) => `\`${u}\``).join(', ')} — not a prop it accepts (known: ${[...known].join(', ')})`);
    }
    nBlocks++;
    return f(opts).flatMap((l) => expand(l, stack)); // a block could emit comps in theory — stay recursive
  }
  // BEAT — a directed-motion blueprint from blueprints/index.mjs. Same expansion contract as a block,
  // but it emits a whole BEAT's richly-animated layers (kinetic reveals, count-ups, cascades, ken push),
  // so the good motion is the default rather than re-derived (docs/CRAFT/BLUEPRINTS.md).
  if (layer.type === 'beat') {
    const f = BEATS[layer.beat];
    if (!f) throw new Error(`unknown beat "${layer.beat}". known: ${Object.keys(BEATS).join(', ')}`);
    const { type, beat, ...opts } = layer;
    const sig = /\(\s*\{([^}]*)\}/.exec(f.toString());
    if (sig) {
      const known = new Set(sig[1].split(',').map((t) => t.split(/[:=]/)[0].trim()).filter(Boolean));
      const unknown = Object.keys(opts).filter((k) => !known.has(k) && k !== 'note');
      if (unknown.length) warnings.push(`beat "${layer.beat}" ignores ${unknown.map((u) => `\`${u}\``).join(', ')} — not a prop it accepts (known: ${[...known].join(', ')})`);
    }
    nBeats++;
    return f(opts).flatMap((l) => expand(l, stack));
  }
  if (layer.type === 'comp') {
    const c = comps[layer.ref];
    if (!c) throw new Error(`unknown comp "${layer.ref}". defined: ${Object.keys(comps).join(', ') || '(none)'}`);
    if (stack.includes(layer.ref)) throw new Error(`comp cycle: ${[...stack, layer.ref].join(' → ')}`);
    nComps++;
    const dx = layer.x ?? 0, dy = layer.y ?? 0, dt = layer.start ?? 0;
    return (c.layers || [])
      .map((l) => shift(l, dx, dy, dt))
      .flatMap((l) => expand(l, [...stack, layer.ref]));
  }
  // SLOTS. A container block takes `children`, and those children may themselves be blocks —
  // `{type:'block', block:'listRow'}` inside a phoneFrame. `expand` only ever mapped a block's OUTPUT
  // array, so a nested descriptor sat in the tree as an unrenderable `type:"block"` layer and the
  // validator's un-expanded-block error was the only thing that noticed. Descending here is what makes
  // composition real: a block can hold a block, which is the difference between a device frame that is
  // a picture of a bezel and one you can put an app inside.
  // Descend through EVERY nesting level, not just direct children: a container's slot is usually a few
  // groups down (phoneFrame puts its screen inside a bezel inside a card), so checking one level found
  // nothing. Non-block children pass through untouched, so this is a no-op for every existing scene.
  if (Array.isArray(layer.children) && layer.children.length) {
    return [{ ...layer, children: layer.children.flatMap((c) => expand(c, stack)) }];
  }
  return [layer];
}

d.layers = (d.layers || []).flatMap((l) => expand(l, []));

// cameraMove sugar → data.camera. ONE implementation, in core/produce.js, because there were two and
// they disagreed: this file used to reimplement the same five lines WITHOUT the refusal that catches a
// scene declaring both `camera` and `cameraMove`. So the identical scene threw at boot and silently
// overwrote the author's hand-written keys here. `bakeCameraMove` is idempotent (it deletes the field),
// so the engine baking again at boot is a no-op.
let nCam = 0;
if (d.cameraMove) {
  nCam = Array.isArray(d.cameraMove) ? d.cameraMove.length : 1;
  bakeCameraMove(d, frameOf(d));
}
delete d.comps;
fs.writeFileSync(out, JSON.stringify(d, null, 2));
console.log(`expanded ${nBlocks} block + ${nBeats} beat + ${nComps} comp instance(s)${nCam ? ` + ${nCam} cameraMove` : ''} → ${out} (${d.layers.length} total layers)`);
for (const w of warnings) console.error(`  ⚠ ${w}`);
