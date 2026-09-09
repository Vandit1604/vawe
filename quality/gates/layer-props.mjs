// layer-props.mjs: does the engine READ the props a layer sets, and will it read them on THIS layer?
//
//   node quality/gates/layer-props.mjs [scene.json ...]   ·   make layer-props
//
// core/engine/expand.js warns when a BLOCK/BEAT is handed a prop its factory does not accept (MISTAKES #60).
// Nothing did the equivalent for a raw layer, so `{"type":"glow","r":620,"opacity":0.5}` was accepted
// and silently dropped, `core/layers/glow.js` sizes from w/h and takes color+intensity, and neither
// `r` nor that `opacity` is a prop it reads. That is the single most expensive bug class in this repo.
//
// THE ANSWER IS DECLARED, NOT FOUND. This gate used to regex the engine's source for `L.<prop>` over a
// hardcoded four-file list plus one hop of each builder's relative imports. That list was a map of where
// the engine lived on the day it was written, and the engine moves: when core/tracks/ became a registry
// the gate could not see it and reported 1454 working props as dropped, alongside 26 in a .mjs outside
// every registry directory and 2 in a file it did scan but under a variable named `A`. Three earlier
// widenings of the same scan were each overtaken by the next move (#229 · #232 · #242). Every module
// that reads a layer prop now says so beside the read; this is a set difference against those statements.
// The declaration contract is core/registry/props.js.
//
// AND THE GUARD IS HALF THE ANSWER. Six props fire only behind another, `preset` needs a split, `dist`
// needs a `cut` or a split, `motionBlur` needs a `motion` track. A layer that sets one without its
// enabler renders exactly as if the prop were absent, which is the very thing this gate exists to name,
// and the scanner could not express it at all: it called them live and shouted about the ones that work.
import fs from 'node:fs';
import path from 'node:path';
import { LAYER_TYPES, LAYER_PROPS } from '../../core/layers/index.js';
import { SHARED_PROPS as SHARED } from '../../core/layers/vocabulary.js';
import { firesOn } from '../../core/registry/props.js';
import { population, isTemplate } from '../../scripts/lib/census.mjs';
import { SCENE_DIR } from './paths.mjs';
import { gateFindings } from '../../scripts/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const f = gateFindings();

// The shared half of the vocabulary - what every layer reads whatever its type - comes from
// core/layers/vocabulary.js, the same module the RENDERER refuses unknown props with. This gate used
// to assemble that union itself from the same six imports, which meant the gate and the engine each
// held their own copy of "what the engine accepts". They agreed on the day it was written. A gate that
// disagrees with the renderer is worse than no gate, so there is now one union and two readers.

// Self-check, not an allowlist: these are the props the shared path is DEFINED by (timing + the motion
// track every layer can ride). If they are not declared, the declarations have been gutted rather than
// the scenes being wrong, and the gate must say that instead of blaming the library.
for (const k of ['start', 'duration', 'motion', 'anim', 'out']) {
  if (!SHARED[k] || SHARED[k].when) {
    f.fail('blind-check', `layer-props is blind: nothing declares \`${k}\` as an unconditional shared read. `
      + `The declarations in formats/scene/props.js and core/tracks/ have drifted from the engine.`);
    f.emit();
    process.exit(2);
  }
}

// Authoring-only keys the engine never reads by design: build-time sugar and documentation.
const AUTHORING = new Set(['type', 'block', 'ref', 'comps', 'id', 'note', 'comment', 'children', 'dur']);

const targets = process.argv.slice(2).length ? process.argv.slice(2)
  // #377: in a bare worktree this walked 41 scenes of 149 and printed a green tick. The population
  // helper refuses that checkout instead of reporting a pass over the third of the library it can see.
  : population('layer props', { filter: (f) => f !== 'schema.json' && !isTemplate(f), quiet: true })
      .names.map((f) => path.join(SCENE_DIR, f));

// The verdict for one prop on one layer: read unconditionally, read behind a guard this layer satisfies,
// read behind a guard it does not (INERT), or read by nothing (DROPPED). The last two are both "the JSON
// looks right and the render is wrong", and they are reported apart because the fix differs: one is a
// missing enabler, the other a prop that does not exist.
const verdict = (L, t, k) => {
  const decls = [LAYER_PROPS[t][k], SHARED[k]].filter(Boolean);
  if (!decls.length) return { kind: 'dropped' };
  if (decls.some((d) => firesOn(L, d))) return { kind: 'live' };
  const guards = [...new Set(decls.flatMap((d) => (Array.isArray(d.when) ? d.when : [d.when])))];
  return { kind: 'inert', guards };
};

let dropped = 0, inert = 0, checked = 0;
for (const rel of targets) {
  const abs = path.resolve(repoRoot, rel);
  let cfg; try { cfg = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
  if (!cfg.module) continue;
  const walk = (layers, where) => {
    for (const [i, L] of (layers || []).entries()) {
      if (!L || typeof L !== 'object') continue;
      if (L.type === 'block' || L.type === 'beat' || L.type === 'comp') continue;   // core/engine/expand.js owns those props
      const t = L.type || 'text';
      if (!LAYER_PROPS[t]) continue;
      checked++;
      for (const k of Object.keys(L)) {
        // `_`-prefixed keys are an author's own annotations, never engine input
        if (k.startsWith('_') || AUTHORING.has(k)) continue;
        const v = verdict(L, t, k);
        if (v.kind === 'live') continue;
        const at = `${path.basename(rel)} ${where}[${i}] (${t})`;
        if (v.kind === 'dropped') {
          dropped++;
          const reads = Object.keys(LAYER_PROPS[t]).sort();
          f.fail('prop-dropped', `${at}: \`${k}\` is set and nothing reads it.`, {
            at, fix: `${t} reads: ${reads.slice(0, 14).join(', ')}${reads.length > 14 ? ', …' : ''}`,
          });
        } else {
          inert++;
          f.fail('prop-inert', `${at}: \`${k}\` is read only when the layer sets `
            + `${v.guards.map((g) => `\`${g}\``).join(' or ')}. It does not, so \`${k}\` does nothing.`, { at });
        }
      }
      if (L.children) walk(L.children, `${where}[${i}].children`);
    }
  };
  walk(cfg.layers, 'layers');
}
console.log(`\n── layer props · ${checked} layer(s) across ${targets.length} file(s)`);
f.emit();
if (!dropped && !inert) { console.log('✓ every prop a layer sets is read by its type or the shared path'); process.exit(0); }
console.log(`✗ ${dropped + inert} prop(s) accepted and dropped (${dropped} nothing reads, ${inert} behind an`);
console.log('  enabler the layer never sets). A prop the engine ignores is the most expensive bug class');
console.log('  in this repo: the JSON looks right and the render is wrong.');
process.exit(1);
