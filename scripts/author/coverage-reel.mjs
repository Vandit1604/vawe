// coverage-reel.mjs — build a reel that renders whatever nothing else renders.
//
//   node scripts/author/coverage-reel.mjs          write formats/scene/_coverage-reel.json
//   make coverage-reel                             write it, then render it
//
// `make coverage` says which vocabulary no authored scene exercises. Conformance already proves those
// values CHANGE the frame, but "changes the frame" is not "looks right": the descender bug (#35) was
// a real effect doing real work and slicing the glyphs while it did. Nobody caught it for 11 scenes
// because nobody had reason to look closely at that word.
//
// So this generates a reel from the LIVE coverage gap rather than a hand-listed snapshot — run it
// after adding an effect and the new effect is in the reel, no edit required. The output is a real
// video you watch; the gates only say it did not crash.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIM_NAMES } from '../../core/clips.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repoRoot, 'formats/scene');
const OUT = path.join(dir, '_coverage-reel.json');

// ---- what is currently unexercised (same scan as scripts/gates/coverage.mjs) ----
const scenes = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json' && f !== '_coverage-reel.json')
  .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } })
  .filter((j) => j && j.module === 'scene');
const seen = { anim: new Set(), cut: new Set(), sting: new Set() };
for (const j of scenes) {
  for (const c of j.cuts || []) if (c?.style) seen.cut.add(c.style);
  for (const s of j.stings || []) if (s?.fx) seen.sting.add(s.fx);
  const walk = (ls) => { for (const l of ls || []) { if (l.anim) seen.anim.add(l.anim); if (l.children) walk(l.children); } };
  walk(j.layers);
}
// `none` is a documented no-op sentinel (the builder filters it before it reaches the renderer), so
// it is not a coverage gap — listing it would make the reel look permanently incomplete.
const cuts = Object.keys(PRESENTATIONS).filter((v) => v !== 'none' && !seen.cut.has(v));
const anims = ANIM_NAMES.filter((v) => !seen.anim.has(v));
const stings = SHADER_FX.filter((v) => !seen.sting.has(v));

if (!cuts.length && !anims.length && !stings.length) {
  console.log('✓ nothing unexercised — every cut, anim and sting already appears in an authored scene');
  process.exit(0);
}

// ---- compose: one beat per unused cut, with unused anims + stings woven through ----
const BEAT = 1.15, LEAD = 1.0;
const layers = [], cutArr = [], stingArr = [];
const X = 140;

layers.push({ type: 'text', text: 'Coverage reel', x: X, y: 300, w: 1500, align: 'left', size: 96, weight: 800,
  start: 0.1, duration: LEAD - 0.05, anim: 'rise', enterDur: 0.5, exitDur: 0.25 });
layers.push({ type: 'text', text: `${cuts.length} cuts · ${anims.length} anims · ${stings.length} stings that no scene renders`,
  x: X, y: 430, w: 1500, align: 'left', size: 34, font: 'mono', color: 'var(--dim)',
  start: 0.35, duration: LEAD - 0.3, anim: 'fade', enterDur: 0.45, exitDur: 0.25 });

cuts.forEach((style, i) => {
  const t0 = +(LEAD + i * BEAT).toFixed(3);
  // beats OVERLAP their cut — a transition needs something on both sides of it (MISTAKES #29)
  const dur = +(BEAT + 0.22).toFixed(3);
  cutArr.push({ t: t0, style });
  layers.push({ type: 'text', text: style, x: X, y: 420, w: 1400, align: 'left', size: 130, weight: 800,
    start: +(t0 + 0.04).toFixed(3), duration: dur, anim: 'rise', enterDur: 0.32, exitDur: 0.2 });
  // each unused ANIM rides the caption of one beat, so both gaps close in the same pass
  const anim = anims[i % Math.max(1, anims.length)];
  if (anims.length) layers.push({ type: 'text', text: `cut · ${style}      enter · ${anim}`,
    x: X, y: 590, w: 1400, align: 'left', size: 32, font: 'mono', color: 'var(--dim)',
    start: +(t0 + 0.12).toFixed(3), duration: +(dur - 0.16).toFixed(3), anim, enterDur: 0.42, exitDur: 0.18 });
  // and an unused STING on the boundary of the first few beats
  if (i < stings.length) stingArr.push({ t: t0, fx: stings[i], dur: 0.9, seed: 3 + i });
});

const duration = +(LEAD + cuts.length * BEAT + 0.5).toFixed(3);
const scene = { module: 'scene', aspect: '16:9', theme: 'vawe', duration, audio: { silent: true },
  bg: [{ preset: 'plain', from: 0, to: duration }], layers, cuts: cutArr, stings: stingArr };
fs.writeFileSync(OUT, JSON.stringify(scene, null, 1) + '\n');

console.log(`✓ ${path.relative(repoRoot, OUT)}  ${duration}s · ${layers.length} layers`);
console.log(`  cuts   (${cuts.length}): ${cuts.join(', ')}`);
console.log(`  anims  (${anims.length}): ${anims.join(', ') || '—'}`);
console.log(`  stings (${stings.length}): ${stings.join(', ') || '—'}`);
console.log('  render it and WATCH it — the gates only prove it did not crash.');
