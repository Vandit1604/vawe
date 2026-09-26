#!/usr/bin/env node
// engine-doctrine/MISTAKES.md #608 ruled out structure (a shared fragment, a keyed object chain); this rig tests
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = '.vawe-data/scenes/overlap-sweep';
const EACH = 0.4;          // professional speed band, held constant across every variant
const BASE_DELAY = 0.1;    // the engine's own lead-in convention (films/scene/scene.js: p.delay ?? 0.1)
const DURATION = 4;
const SELECTORS = ['[data-part="line1"]', '[data-part="line2"]', '[data-part="line3"]', '[data-part="line4"]'];
const FRACTIONS = { '100': 1, '75': 0.75, '50': 0.5, '25': 0.25, '0': 0 };

const FRAG = `<style>
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:flex-start;
  justify-content:center;gap:28px;padding:0 140px}
.row{font:700 92px/1.05 sans-serif;color:#111}
.row:nth-child(2){color:#1d6fd6}
.row:nth-child(3){color:#c07800}
.row:nth-child(4){color:#1c8a44}
</style>
<div class="stage">
  <div class="row" data-part="line1">One thing arrives</div>
  <div class="row" data-part="line2">then a second</div>
  <div class="row" data-part="line3">then a third</div>
  <div class="row" data-part="line4">then a fourth</div>
</div>
`;

function buildVariants() {
  const dir = path.join(ROOT, OUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'frag.html'), FRAG);
  const names = [];
  for (const [name, frac] of Object.entries(FRACTIONS)) {
    const delays = [];
    let d = BASE_DELAY;
    for (let i = 0; i < SELECTORS.length; i++) { delays.push(+d.toFixed(3)); d += frac * EACH; }
    const parts = SELECTORS.map((select, i) => ({ select, anim: 'fadeUp', each: EACH, exitDur: EACH, delay: delays[i] }));
    const scene = {
      module: 'scene', theme: 'vawe', aspect: '16:9', duration: DURATION,
      bg: [{ preset: 'plain' }],
      layers: [{ id: 'scene1', type: 'html', src: `${OUT_DIR}/frag.html`, start: 0, duration: DURATION,
        track: 1, x: 0, y: 0, w: 1920, h: 1080, parts }],
    };
    fs.writeFileSync(path.join(dir, `ov-${name}.json`), JSON.stringify(scene, null, 1) + '\n');
    names.push(name);
  }
  return names;
}

function run(cmd, args) { return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' }); }

async function measure(mp4) {
  const { pullFrames, profile, DEAD } = await import('../../quality/gates/motion-floor.mjs');
  const frames = pullFrames(mp4);
  if (!frames) return { error: 'ffmpeg returned no frames' };
  const prof = profile(frames);
  const body = prof.slice(0, -2);
  const dead = body.filter((w) => w.local < DEAD).length;
  const sorted = [...body.map((w) => w.local)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const peak = Math.max(...body.map((w) => w.local));
  return { windows: body.length, dead, median, peak, series: body.map((w) => w.local) };
}

async function main() {
  const keep = process.argv.includes('--keep');
  const names = buildVariants();
  const rows = [];
  for (const name of names) {
    const jsonPath = path.join(OUT_DIR, `ov-${name}.json`);
    const mp4 = path.join(ROOT, 'out', `ov-${name}.mp4`);
    const r = run('./bin/vawe', [jsonPath, '--draft']);
    if (r.status !== 0) { rows.push({ name, error: `render: ${(r.stdout + r.stderr).trim().slice(-500)}` }); continue; }
    const stats = await measure(mp4);
    rows.push({ name, ...(stats.error ? { error: stats.error } : { stats }) });
  }

  console.log(`\n  ${'overlap%'.padEnd(9)} ${'dead'.padStart(8)} ${'median'.padStart(8)} ${'peak'.padStart(8)}`);
  for (const r of rows) {
    if (r.error) { console.log(`  ${r.name.padEnd(9)}  ✗ ${r.error}`); continue; }
    const s = r.stats;
    const pct = `${Math.round((s.dead / s.windows) * 100)}%`;
    console.log(`  ${r.name.padEnd(9)} ${`${s.dead}/${s.windows} ${pct}`.padStart(8)} ${s.median.toFixed(3).padStart(8)} ${s.peak.toFixed(3).padStart(8)}`);
  }
  console.log('');
  for (const r of rows) if (!r.error) console.log(`  ${r.name}%: ${r.stats.series.map((v) => v.toFixed(2)).join(' ')}`);
  console.log('');

  if (!keep) {
    const dir = path.join(ROOT, OUT_DIR);
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    fs.rmdirSync(dir);
    for (const name of names) { try { fs.unlinkSync(path.join(ROOT, 'out', `ov-${name}.mp4`)); } catch {} } // a failed render never wrote this file: cleanup only
  }
}

main();
