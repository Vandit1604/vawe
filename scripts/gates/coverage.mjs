// coverage.mjs — which parts of the engine has nothing ever exercised?
//
//   node scripts/gates/coverage.mjs        report
//   make coverage
//
// Conformance proves a value WORKS. This asks a different question: is anyone USING it? Vocabulary
// that no scene touches is where regressions live undetected, because nothing renders it and no
// screenshot shows it. The audio path is the worked example — no scene and no gate exercised the
// mix, so `cuts` produced no sound for as long as it existed and nobody could have noticed (#23).
//
// WARN tier by design (always exits 0). Unused vocabulary is a fact to act on, not a build failure:
// a brand-new effect is legitimately unused on the day it lands.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIM_NAMES } from '../../core/clips.js';
import { PRESETS } from '../../core/type.js';
import { LOOK_NAMES } from '../../core/looks.js';
import { CANVAS_FX_NAMES } from '../../core/canvas-fx.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repoRoot, 'formats/scene');
const scenes = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !['schema.json'].includes(f))
  .map((f) => { try { return { f, j: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }; } catch { return null; } })
  .filter((x) => x && x.j.module === 'scene');

// walk every layer, including group children — a primitive used only inside a group is still used
const layersOf = (j) => { const out = [];
  const push = (ls) => { for (const l of ls || []) { out.push(l); if (l.children) push(l.children); } };
  push(j.layers); return out; };

const used = { anim: new Set(), preset: new Set(), cut: new Set(), sting: new Set(), look: new Set(),
  canvasFx: new Set(), bg: new Set(), type: new Set(), prop: new Set() };

for (const { j } of scenes) {
  // Props live on cuts/stings/bg/camera ITEMS too, not just layers. Collecting only layer keys made
  // the report claim `t`, `dur`, `style` and `timing` were unused — they are used constantly. A
  // coverage report that cries wolf gets ignored exactly like a gate that does.
  for (const arr of [j.cuts, j.stings, j.bg, j.camera]) for (const it of arr || []) if (it && typeof it === 'object') Object.keys(it).forEach((k) => used.prop.add(k));
  for (const c of j.cuts || []) if (c?.style) used.cut.add(c.style);
  for (const s of j.stings || []) if (s?.fx) used.sting.add(s.fx);
  for (const b of j.bg || []) if (b?.preset) used.bg.add(b.preset);
  for (const l of layersOf(j)) {
    if (l.type) used.type.add(l.type);
    if (l.anim) used.anim.add(l.anim);
    if (l.preset) used.preset.add(l.preset);
    if (l.canvasFx) used.canvasFx.add(typeof l.canvasFx === 'string' ? l.canvasFx : l.canvasFx.fx);
    if (l.filter) used.look.add(String(l.filter).split(':')[0].trim());
    for (const k of Object.keys(l)) used.prop.add(k);
  }
}

const LAYER_TYPES = ['text', 'image', 'component', 'rect', 'count', 'group', 'glow', 'board', 'doc', 'html', 'clip', 'cursor', 'shader', 'lottie'];
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

// props the schema declares that NO scene sets — the surface most likely to rot unnoticed
const unusedProps = [...schemaProps].filter((p) => !used.prop.has(p)).sort();

console.log('\n── unexercised vocabulary (nothing renders these, so nothing would notice a regression)\n');
for (const [label, unused] of gaps) console.log(`   ${label}: ${unused.length}\n      ${unused.join(', ')}\n`);
if (unusedProps.length) console.log(`   schema props no scene sets: ${unusedProps.length}\n      ${unusedProps.join(', ')}\n`);

console.log('Conformance proves these WORK; coverage says nothing USES them. The audio path had zero of');
console.log('both, which is why the cuts array produced no sound for as long as it existed (#23).');
