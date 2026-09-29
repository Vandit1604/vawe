#!/usr/bin/env node
// Reference and render frames at the SAME exact seconds, side by side, one row per time, in one PNG.
//   node harness/media/compare-frames.mjs <ours.mp4> --ref <ref.mp4> --at 2.5,3.1 [--from <s>] [--out file.png]
// --at is film seconds; --from is the film second where ours starts (a --from/--to draft).
// Each frame is an accurate seek (-ss after -i), never an fps=N,tile sheet: those drift about 0.1 s.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROW_H = 360;
const die = (m) => { console.error(`✗ ${m}`); process.exit(2); };

function grab(video, t, out, label = t) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-ss', String(t), '-frames:v', '1',
    '-vf', `scale=-2:${ROW_H},drawtext=text='${path.basename(video, path.extname(video))} ${label}s':x=12:y=12:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6`, out]);
  if (r.status !== 0 || !fs.existsSync(out)) die(`no frame at ${t}s in ${video}: ${String(r.stderr || '').trim()}`);
}

export function compareFrames({ ours, ref, times, out, from = 0 }) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)), '.cmp-'));
  try {
    const rows = times.map((t, i) => {
      const a = path.join(dir, `r${i}.png`), b = path.join(dir, `o${i}.png`), row = path.join(dir, `row${i}.png`);
      grab(ref, t, a);
      grab(ours, t - from, b, t);
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', a, '-i', b, '-filter_complex', 'hstack=inputs=2', row]);
      return row;
    });
    const args = rows.flatMap((r) => ['-i', r]);
    const filter = rows.length > 1 ? ['-filter_complex', `vstack=inputs=${rows.length}`] : [];
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args, ...filter, out]);
    if (r.status !== 0) die(`stack failed: ${String(r.stderr || '').trim()}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const ours = argv.find((a, i) => !a.startsWith('--') && !['--ref', '--at', '--out', '--from'].includes(argv[i - 1]));
  const ref = flag('--ref');
  const times = String(flag('--at') || '').split(',').map(Number).filter((t) => Number.isFinite(t));
  if (!ours || !ref || !times.length) die('usage: compare-frames.mjs <ours.mp4> --ref <ref.mp4> --at 2.5,3.1 [--out file.png]');
  for (const f of [ours, ref]) if (!fs.existsSync(f)) die(`no such file: ${f}`);
  const out = path.resolve(flag('--out') || path.join('out', `compare-${path.basename(ours, path.extname(ours))}.png`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  compareFrames({ ours, ref, times, out, from: Number(flag('--from')) || 0 });
  console.log(`✓ ${path.relative(process.cwd(), out)}: reference left, yours right, ${times.length} row(s) at ${times.join(', ')} s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
