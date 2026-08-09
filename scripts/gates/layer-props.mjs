// layer-props.mjs — does the engine READ the props a layer sets, and will it read them on THIS layer?
//
//   node scripts/gates/layer-props.mjs [scene.json ...]   ·   make layer-props
//
// `make expand` warns when a BLOCK is handed a prop its factory does not accept (MISTAKES #60).
// Nothing did the equivalent for a raw layer, so `{"type":"glow","r":620,"opacity":0.5}` was accepted
// and silently dropped — `core/layers/glow.js` sizes from w/h and takes color+intensity, and neither
// `r` nor that `opacity` is a prop it reads. That is the single most expensive bug class in this repo.
//
// THE ANSWER IS DECLARED, NOT FOUND. This gate used to regex the engine's source for `L.<prop>` over a
// hardcoded four-file list plus one hop of each builder's relative imports. That list was a map of where
// the engine lived on the day it was written, and the engine moves: when core/tracks/ became a registry
// the gate could not see it and reported 1454 working props as dropped, alongside 26 in a .mjs outside
// every registry directory and 2 in a file it did scan but under a variable named `A`. Three earlier
// widenings of the same scan were each overtaken by the next move (#229 · #232 · #242). Every module
// that reads a layer prop now says so beside the read; this is a set difference against those statements.
// The declaration contract is core/props.js.
//
// AND THE GUARD IS HALF THE ANSWER. Six props fire only behind another — `preset` needs a split, `dist`
// needs a `cut` or a split, `motionBlur` needs a `motion` track. A layer that sets one without its
// enabler renders exactly as if the prop were absent, which is the very thing this gate exists to name,
// and the scanner could not express it at all: it called them live and shouted about the ones that work.
import fs from 'node:fs';
import path from 'node:path';
import { LAYER_TYPES, LAYER_PROPS } from '../../core/layers/index.js';
import { TRACK_PROPS } from '../../core/tracks/index.js';
import { PROPS as KIT_PROPS } from '../../core/layers/util.js';
import { PROPS as BOOT_PROPS } from '../../core/boot.js';
import { PROPS as PAN_PROPS } from '../../core/pan-resolve.mjs';
import { PROPS as FX_PROPS } from '../../core/fx/index.js';
import { PROPS as ORCHESTRATOR_PROPS } from '../../formats/scene/props.js';
import { mergeProps, firesOn } from '../../core/props.js';
import { SCENE_DIR } from './paths.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// Props read by the SHARED path, for every layer whatever its type: the format's own orchestration, the
// per-frame track pipeline, the shared kit, the boot-time placement grammar, the pan resolver, and the
// modifier registry. A prop honoured here is honoured for every type.
const SHARED = mergeProps(ORCHESTRATOR_PROPS, TRACK_PROPS, KIT_PROPS, BOOT_PROPS, PAN_PROPS, FX_PROPS);

// Self-check, not an allowlist: these are the props the shared path is DEFINED by (timing + the motion
// track every layer can ride). If they are not declared, the declarations have been gutted rather than
// the scenes being wrong, and the gate must say that instead of blaming the library.
for (const k of ['start', 'duration', 'motion', 'anim', 'out']) {
  if (!SHARED[k] || SHARED[k].when) {
    console.error(`✗ layer-props is blind: nothing declares \`${k}\` as an unconditional shared read. `
      + `The declarations in formats/scene/props.js and core/tracks/ have drifted from the engine.`);
    process.exit(2);
  }
}

// Authoring-only keys the engine never reads by design: build-time sugar and documentation.
const AUTHORING = new Set(['type', 'block', 'ref', 'comps', 'id', 'note', 'comment', 'children', 'dur']);

const targets = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(repoRoot, SCENE_DIR)).filter((f) => f.endsWith('.json') && f !== 'schema.json')
      .map((f) => path.join(SCENE_DIR, f));

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
      if (L.type === 'block' || L.type === 'comp') continue;   // `make expand` owns those
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
          console.log(`   ✗ ${at}: \`${k}\` is set and nothing reads it.`);
          console.log(`       ${t} reads: ${Object.keys(LAYER_PROPS[t]).sort().slice(0, 14).join(', ')}${Object.keys(LAYER_PROPS[t]).length > 14 ? ', …' : ''}`);
        } else {
          inert++;
          console.log(`   ✗ ${at}: \`${k}\` is read only when the layer sets ${v.guards.map((g) => `\`${g}\``).join(' or ')} — it does not, so \`${k}\` does nothing.`);
        }
      }
      if (L.children) walk(L.children, `${where}[${i}].children`);
    }
  };
  walk(cfg.layers, 'layers');
}
console.log(`\n── layer props · ${checked} layer(s) across ${targets.length} file(s)`);
if (!dropped && !inert) { console.log('✓ every prop a layer sets is read by its type or the shared path'); process.exit(0); }
console.log(`✗ ${dropped + inert} prop(s) accepted and dropped (${dropped} nothing reads, ${inert} behind an`);
console.log('  enabler the layer never sets). A prop the engine ignores is the most expensive bug class');
console.log('  in this repo: the JSON looks right and the render is wrong.');
process.exit(1);
