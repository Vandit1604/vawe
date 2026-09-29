#!/usr/bin/env node
// Per-step SSIM between your render and the reference at the reference size, so no second of the film
// goes unchecked. Prints min SSIM per second and the worst moments, writes the worst 6 as one compare sheet.
//   node harness/media/coverage.mjs <ours.mp4> --ref <ref.mp4> [--step 0.1] [--min 0.5] [--out sheet.png]
// Exit 1 when any second falls below --min.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { compareFrames } from './compare-frames.mjs';

const SHEET_ROWS = 6;
const SIZE = '736:414';
const die = (m) => { console.error(`✗ ${m}`); process.exit(2); };

function ssimRows(ours, ref, step) {
  const fps = 1 / step;
  const lavfi = `[0:v]fps=${fps},scale=${SIZE},format=gray[a];[1:v]fps=${fps},scale=${SIZE},format=gray[b];[a][b]ssim=stats_file=-`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', ours, '-i', ref, '-lavfi', lavfi, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) die(`ffmpeg ssim failed: ${String(r.stderr || '').trim()}`);
  return r.stdout.split('\n').filter(Boolean).map((l) => ({
    t: (Number(/n:(\d+)/.exec(l)[1]) - 1) * step,
    ssim: Number(/All:([\d.]+)/.exec(l)[1]),
  }));
}

// The worst samples, at least `gap` seconds apart, so the sheet shows six moments, not one bad second six times.
export function worstMoments(rows, count, gap) {
  const picked = [];
  for (const row of [...rows].sort((a, b) => a.ssim - b.ssim)) {
    if (picked.every((p) => Math.abs(p.t - row.t) >= gap)) picked.push(row);
    if (picked.length === count) break;
  }
  return picked.sort((a, b) => a.t - b.t);
}

export async function coverage({ ours, ref, step = 0.1, min = 0.5, out }) {
  const rows = ssimRows(ours, ref, step);
  if (!rows.length) die('no samples: the two videos share no frames');
  const mean = rows.reduce((a, b) => a + b.ssim, 0) / rows.length;
  const perSecond = [];
  for (const row of rows) (perSecond[Math.floor(row.t)] ||= []).push(row.ssim);
  const mins = perSecond.map((v) => (v ? Math.min(...v) : 1));
  const worst = worstMoments(rows, SHEET_ROWS, 0.5);
  const low = mins.map((m, s) => ({ s, m })).filter((x) => x.m < min);

  console.log(`${rows.length} samples every ${step}s, mean SSIM ${mean.toFixed(3)}, worst ${Math.min(...rows.map((r) => r.ssim)).toFixed(2)}`);
  console.log('\nper second (min SSIM, lower = more different):');
  console.log(mins.map((m, s) => `${String(s).padStart(3)}s ${m.toFixed(2)} ${'#'.repeat(Math.round(m * 20))}${m < min ? '  < min' : ''}`).join('\n'));
  console.log('\nworst moments:', worst.map((w) => `${w.t.toFixed(1)}s=${w.ssim.toFixed(2)}`).join(' '));
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await compareFrames({ ours, ref, times: worst.map((w) => w.t), out });
    console.log(`sheet: ${path.relative(process.cwd(), out)} (reference left, yours right, rows at ${worst.map((w) => w.t.toFixed(1)).join(', ')} s)`);
  }
  return { mean, low };
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const ours = argv.find((a, i) => !a.startsWith('--') && !['--ref', '--step', '--min', '--out'].includes(argv[i - 1]));
  const ref = flag('--ref');
  if (!ours || !ref) die('usage: coverage.mjs <ours.mp4> --ref <ref.mp4> [--step 0.1] [--min 0.5]');
  for (const f of [ours, ref]) if (!fs.existsSync(f)) die(`no such file: ${f}`);
  const step = Number(flag('--step')) || 0.1;
  const min = flag('--min') === undefined ? 0.5 : Number(flag('--min'));
  const out = path.resolve(flag('--out') || path.join('out', `coverage-${path.basename(ours, path.extname(ours))}.png`));
  const { low } = await coverage({ ours, ref, step, min, out });
  if (low.length) {
    console.error(`✗ ${low.length} second(s) below ${min}: ${low.map((x) => `${x.s}s`).join(' ')}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
