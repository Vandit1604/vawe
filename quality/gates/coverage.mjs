// coverage.mjs, which parts of the engine has nothing ever exercised?
//
//   node quality/gates/coverage.mjs        report
//   make coverage
//
// Conformance proves a value WORKS. This asks a different question: is anyone USING it? Vocabulary
// that no scene touches is where regressions live undetected, because nothing renders it and no
// screenshot shows it. The audio path is the worked example, no scene and no gate exercised the
// mix, so `cuts` produced no sound for as long as it existed and nobody could have noticed (#23).
//
// WARN tier by design (always exits 0). Unused vocabulary is a fact to act on, not a build failure:
// a brand-new effect is legitimately unused on the day it lands.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIM_NAMES } from '../../core/timeline/clips.js';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { PAINT_FX_NAMES } from '../../core/surfaces/paint-fx.js';
import { PRESETS } from '../../core/type/type.js';
import { LOOK_NAMES } from '../../core/looks/index.js';
import { CANVAS_FX_NAMES } from '../../core/canvas/effects.js';
import { PRESENTATIONS } from '../../core/cuts/index.js';
import { SHADER_FX } from '../../core/stings/index.js';
import { population, LIBRARY_WITH_DERIVATIVES } from '../../scripts/lib/census.mjs';
import { SCENE_DIR } from './paths.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../scripts/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repoRoot, SCENE_DIR);
const scenes = population('coverage · corpus', { filter: LIBRARY_WITH_DERIVATIVES, quiet: true }).names
  // Two views of the same scene. `j` is LOWERED, because a boundary declared as `transitions` carries a
  // cut style and a sting fx that this report otherwise scores as unexercised, so the library looked
  // like it used less of the engine than it does (docs/MISTAKES.md #408). `raw` is the authored file,
  // because lowering CONSUMES the unified keys, and the prop census below asks which authored props no
  // scene sets, answering that off the lowered copy would report `transition` and `mech` as dead the
  // moment somebody used them.
  .map((f) => { try { const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { f, raw, j: loadScene(structuredClone(raw)) }; } catch { return null; } })
  .filter((x) => x && x.j.module === 'scene');

// walk every layer, including group children: a primitive used only inside a group is still used
const layersOf = (j) => { const out = [];
  const push = (ls) => { for (const l of ls || []) { out.push(l); if (l.children) push(l.children); } };
  push(j.layers); return out; };

const used = { anim: new Set(), preset: new Set(), cut: new Set(), sting: new Set(), look: new Set(),
  canvasFx: new Set(), paint: new Set(), bg: new Set(), type: new Set(), prop: new Set() };

for (const { j, raw } of scenes) {
  // Props live on cuts/stings/bg/camera ITEMS too, not just layers. Collecting only layer keys made
  // the report claim `t`, `dur`, `style` and `timing` were unused, they are used constantly. A
  // coverage report that cries wolf gets ignored exactly like a gate that does.
  // Read off `raw`: this census is about what an AUTHOR writes, and `transitions` is one of the things
  // an author writes, so it is counted here and not through the cuts it lowers to.
  for (const arr of [raw.cuts, raw.stings, raw.bg, raw.camera, raw.transitions]) for (const it of arr || []) if (it && typeof it === 'object') Object.keys(it).forEach((k) => used.prop.add(k));
  for (const c of j.cuts || []) if (c?.style) used.cut.add(c.style);
  for (const s of j.stings || []) if (s?.fx) used.sting.add(s.fx);
  for (const b of j.bg || []) if (b?.preset) used.bg.add(b.preset);
  for (const l of layersOf(j)) {
    if (l.type) used.type.add(l.type);
    // `anim` and `out` draw from the SAME registry (core/timeline/clips.js ANIM), so counting only `anim`
    // reported `defocus` as unexercised while tpot-launch used it on five layers as an exit. A
    // coverage gate that undercounts sends you to build something that already ships.
    if (l.anim) used.anim.add(l.anim);
    if (l.out) used.anim.add(l.out);
    if (l.preset) used.preset.add(l.preset);
    if (l.canvasFx) used.canvasFx.add(typeof l.canvasFx === 'string' ? l.canvasFx : l.canvasFx.fx);
    if (l.paint) used.paint.add(l.paint);
    if (l.filter) used.look.add(String(l.filter).split(':')[0].trim());
  }
  // Same split again: the vocabulary above is what the ENGINE renders (lowered), the props are what the
  // author wrote. A layer's `transition` is gone from the lowered copy by the time this runs.
  for (const l of layersOf(raw)) for (const k of Object.keys(l)) used.prop.add(k);
}

const schemaProps = (() => { const s = JSON.parse(fs.readFileSync(path.join(dir, 'schema.json'), 'utf8'));
  const out = new Set(); const walk = (o) => { if (!o || typeof o !== 'object') return;
    if (o.properties) Object.keys(o.properties).forEach((k) => out.add(k));
    if (o.item && typeof o.item === 'object') Object.keys(o.item).forEach((k) => out.add(k));
    for (const k in o) walk(o[k]); }; walk(s); return out; })();

const GROUPS = [
  ['layer type', LAYER_TYPES, used.type],
  ['enter anim', ANIM_NAMES, used.anim],
  ['kinetic preset', Object.keys(PRESETS), used.preset],
  ['cut style', Object.keys(PRESENTATIONS), used.cut],
  ['shader sting', SHADER_FX, used.sting],
  ['composite look', LOOK_NAMES, used.look],
  ['canvas fx', CANVAS_FX_NAMES, used.canvasFx],
  ['paint fx', PAINT_FX_NAMES, used.paint],
];

console.log(`── coverage across ${scenes.length} authored scene(s)\n`);
const gaps = [];
for (const [label, all, seen] of GROUPS) {
  const unused = all.filter((v) => !seen.has(v));
  const pct = Math.round(((all.length - unused.length) / all.length) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·');
  console.log(`   ${label.padEnd(16)} ${bar} ${String(pct).padStart(3)}%  ${all.length - unused.length}/${all.length}`);
  if (unused.length) gaps.push([label, unused]);
}

// props the schema declares that NO scene sets: the surface most likely to rot unnoticed
const unusedProps = [...schemaProps].filter((p) => !used.prop.has(p)).sort();

console.log('\n── unexercised vocabulary (nothing renders these, so nothing would notice a regression)\n');

// WARN tier by design (always exits 0): unused vocabulary is a fact to act on, not a build failure.
const f = gateFindings({ line: (r) => `   ${r.summary}` });
for (const [label, unused] of gaps) f.warn('unexercised', `${label}: ${unused.length}\n      ${unused.join(', ')}\n`, { at: label });
if (unusedProps.length) f.warn('unexercised-prop', `schema props no scene sets: ${unusedProps.length}\n      ${unusedProps.join(', ')}\n`);
f.emit();

console.log('Conformance proves these WORK; coverage says nothing USES them. The audio path had zero of');
console.log('both, which is why the cuts array produced no sound for as long as it existed (#23).');
