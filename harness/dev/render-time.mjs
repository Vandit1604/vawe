
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);

const DEFAULT_FILMS = ['plinth-ad', 'site-backdrop'];
const RUNS = +arg('--runs', 3);
const BASELINE = 'quality/baselines/perf/baseline.json';
const BUSY = Math.max(2, os.cpus().length * 0.5);

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const loadNow = () => os.loadavg()[0];

function frameCount(film) {
  try {
    const d = JSON.parse(fs.readFileSync(`films/scene/${film}.json`, 'utf8'));
    return Math.round((d.duration ?? 0) * (d.fps ?? 30));
  } catch { return null; }
}

function timeOne(film) {
  const t0 = process.hrtime.bigint();
  execFileSync('./bin/vawe', [`films/scene/${film}.json`, '--draft'], { stdio: 'ignore' });
  return Number(process.hrtime.bigint() - t0) / 1e9;
}

function measure(film) {
  const file = `films/scene/${film}.json`;
  if (!fs.existsSync(file)) return { film, skipped: `no ${file} on disk (most films are gitignored)` };

  const before = loadNow();
  const frames = frameCount(film);
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(timeOne(film));

  const med = median(runs);
  return {
    film, frames, runs: runs.map((r) => +r.toFixed(2)),
    median: +med.toFixed(2),
    spread: +(Math.max(...runs) - Math.min(...runs)).toFixed(2),
    fps: frames ? +(frames / med).toFixed(1) : null,
    loadBefore: +before.toFixed(2),
    atRest: before < BUSY,
  };
}

const films = arg('--films', DEFAULT_FILMS.join(',')).split(',').filter(Boolean);
console.log(`\n  RENDER TIME · ${films.length} film(s) × ${RUNS} run(s) · draft · ${os.cpus().length} cores\n`);

const results = films.map(measure);
let contended = false;

for (const r of results) {
  if (r.skipped) { console.log(`  ~ ${r.film}: ${r.skipped}`); continue; }
  if (!r.atRest) contended = true;
  const flag = r.atRest ? '' : `  ⚠ machine was BUSY (load ${r.loadBefore}), not a baseline`;
  console.log(`  ${r.film.padEnd(20)} ${String(r.median).padStart(7)}s  ±${r.spread}s  ${r.frames} frames  ${r.fps} fps${flag}`);
}

if (contended) {
  console.log(`\n  ⚠ At least one run started with load above ${BUSY.toFixed(1)} (half of ${os.cpus().length} cores). Those numbers`);
  console.log('    describe a busy machine, not this engine.');
  console.log('    Re-run when nothing else is rendering before saving or comparing.\n');
}

const stamp = {
  when: new Date().toISOString(),
  commit: (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return null; } })(),
  cores: os.cpus().length,
  memGB: Math.round(os.totalmem() / 1e9),
  runs: RUNS,
  results: results.filter((r) => !r.skipped),
};

if (has('--save')) {
  if (contended) { console.log('  ✗ refusing to save a baseline measured under load.\n'); process.exit(1); }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(stamp, null, 1) + '\n');
  console.log(`  ✓ baseline saved → ${BASELINE}  (commit ${stamp.commit})\n`);
} else if (has('--against')) {
  if (!fs.existsSync(BASELINE)) { console.log(`  ✗ no ${BASELINE}. Run with --save on a quiet machine first.\n`); process.exit(1); }
  const was = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  console.log(`\n  vs baseline ${was.commit} (${was.when.slice(0, 10)}):\n`);
  for (const r of stamp.results) {
    const b = was.results.find((x) => x.film === r.film);
    if (!b) { console.log(`  ~ ${r.film}: not in the baseline`); continue; }
    const d = ((r.median - b.median) / b.median) * 100;
    const noise = Math.abs(r.median - b.median) < Math.max(r.spread, b.spread);
    const mark = noise ? 'within the spread, not a signal' : (d > 0 ? 'SLOWER' : 'faster');
    console.log(`  ${r.film.padEnd(20)} ${b.median}s → ${r.median}s   ${d > 0 ? '+' : ''}${d.toFixed(1)}%  ${mark}`);
  }
  console.log('');
}
