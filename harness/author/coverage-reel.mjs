import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIM_NAMES } from '../../core/timeline/clips.js';
import { PRESENTATIONS } from '../../core/cuts/index.js';
import { SHADER_FX } from '../../core/stings/index.js';
import { execFileSync } from 'node:child_process';
import { loadScene } from '../../core/engine/expand.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repoRoot, 'films/scene');
const OUT = path.join(dir, '_coverage-reel.json');

const CLIP_DIR = path.join(repoRoot, 'assets/gen/sweep');
const CLIP_MANIFEST = '/assets/gen/sweep/manifest.json';
if (!fs.existsSync(path.join(CLIP_DIR, 'manifest.json'))) {
  const tmp = path.join(repoRoot, 'assets/gen/_sweep-src.mp4');
  fs.mkdirSync(path.join(repoRoot, 'assets/gen'), { recursive: true });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
    'gradients=s=640x360:c0=0x0f1620:c1=0x2563eb:c2=0xf6f8fb:x0=0:y0=0:x1=640:y1=360:d=4:speed=0.25:n=3',
    '-t', '2.5', '-r', '30', '-pix_fmt', 'yuv420p', tmp], { cwd: repoRoot });
  execFileSync('node', ['harness/media/gen-clip.mjs', path.relative(repoRoot, tmp), 'sweep', '--fps', '30', '--w', '640'], { cwd: repoRoot, stdio: 'ignore' });
  fs.rmSync(tmp, { force: true });
  console.log('  · synthesized the clip fixture (assets/gen/sweep), it is gitignored, so this self-heals');
}

const scenes = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json' && f !== '_coverage-reel.json')
  // Lowered, for the same reason `quality/gates/coverage.mjs` lowers: a cut style or sting fx declared
  // through the unified `transitions` surface is exercised by a real scene, and counting it as a gap
  // would put an already-covered effect back in the reel (engine-doctrine/MISTAKES.md #408).
  .map((f) => { try { return loadScene(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch { return null; } })
  .filter((j) => j && j.module === 'scene');
const seen = { anim: new Set(), cut: new Set(), sting: new Set() };
for (const j of scenes) {
  for (const c of j.cuts || []) if (c?.style) seen.cut.add(c.style);
  for (const s of j.stings || []) if (s?.fx) seen.sting.add(s.fx);
  const walk = (ls) => { for (const l of ls || []) { if (l.anim) seen.anim.add(l.anim); if (l.children) walk(l.children); } };
  walk(j.layers);
}
const cuts = Object.keys(PRESENTATIONS).filter((v) => v !== 'none' && !seen.cut.has(v));
const anims = ANIM_NAMES.filter((v) => !seen.anim.has(v));
const stings = SHADER_FX.filter((v) => !seen.sting.has(v));

if (!cuts.length && !anims.length && !stings.length) {
  console.log('✓ nothing unexercised: every cut, anim and sting already appears in an authored scene');
  process.exit(0);
}

const BEAT = 1.9, LEAD = 1.2, CUT_DUR = 0.42;
const layers = [], cutArr = [], stingArr = [];
const X = 140;

layers.push({ type: 'text', text: 'Coverage reel', x: X, y: 300, w: 1500, align: 'left', size: 96, weight: 800,
  start: 0.1, duration: LEAD - 0.05, anim: 'rise', enterDur: 0.5, exitDur: 0.25 });
layers.push({ type: 'text', text: `${cuts.length} cuts · ${anims.length} anims · ${stings.length} stings that no scene renders`,
  x: X, y: 430, w: 1500, align: 'left', size: 34, font: 'mono', color: 'var(--dim)',
  start: 0.35, duration: LEAD - 0.3, anim: 'fade', enterDur: 0.45, exitDur: 0.25 });

cuts.forEach((style, i) => {
  const t0 = +(LEAD + i * BEAT).toFixed(3);
  // beats OVERLAP their cut: a transition needs something on both sides of it (MISTAKES #29)
  const dur = +(BEAT - 0.04).toFixed(3);
  cutArr.push({ t: t0, style, dur: CUT_DUR });
  layers.push({ type: 'text', text: style, x: X, y: 420, w: 1400, align: 'left', size: 130, weight: 800,
    start: +(t0 + 0.04).toFixed(3), duration: dur, anim: 'rise', enterDur: 0.34, exitDur: 0.16 });
  const anim = anims[i % Math.max(1, anims.length)];
  if (anims.length) layers.push({ type: 'text', text: `cut · ${style}      enter · ${anim}`,
    x: X, y: 590, w: 1400, align: 'left', size: 32, font: 'mono', color: 'var(--dim)',
    start: +(t0 + 0.14).toFixed(3), duration: +(dur - 0.2).toFixed(3), anim, enterDur: 0.42, exitDur: 0.12 });
  if (i < stings.length) stingArr.push({ t: t0, fx: stings[i], dur: 0.9, seed: 3 + i });
});

const clipT = +(LEAD + cuts.length * BEAT).toFixed(3);
cutArr.push({ t: clipT, style: 'softwipe', dur: CUT_DUR });
layers.push({ type: 'clip', src: CLIP_MANIFEST, x: 140, y: 250, w: 900, radius: 20, loop: true,
  start: +(clipT + 0.06).toFixed(3), duration: 2.4, anim: 'lift', enterDur: 0.5, exitDur: 0.25 });
layers.push({ type: 'text', text: 'clip', x: 1120, y: 420, w: 700, align: 'left', size: 130, weight: 800,
  start: +(clipT + 0.1).toFixed(3), duration: 2.3, anim: 'rise', enterDur: 0.34, exitDur: 0.2 });
layers.push({ type: 'text', text: 'layer · a real video, played frame-accurately', x: 1120, y: 590, w: 700,
  align: 'left', size: 30, font: 'mono', color: 'var(--dim)',
  start: +(clipT + 0.2).toFixed(3), duration: 2.2, anim: 'fade', enterDur: 0.45, exitDur: 0.2 });

const duration = +(clipT + 2.6).toFixed(3);
const scene = { module: 'scene', aspect: '16:9', theme: 'vawe', duration, audio: { silent: true },
  bg: [{ preset: 'plain', from: 0, to: duration }], layers, cuts: cutArr, stings: stingArr };
fs.writeFileSync(OUT, JSON.stringify(scene, null, 1) + '\n');

console.log(`✓ ${path.relative(repoRoot, OUT)}  ${duration}s · ${layers.length} layers`);
console.log(`  cuts   (${cuts.length}): ${cuts.join(', ')}`);
console.log(`  anims  (${anims.length}): ${anims.join(', ') || '-'}`);
console.log(`  stings (${stings.length}): ${stings.join(', ') || '-'}`);
console.log('  render it and WATCH it: the gates only prove it did not crash.');
