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

// One row per time: the reference frame left, `oursAt(t, i, dir)` (a PNG path it writes) right.
async function sheet({ ref, times, out, oursAt }) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)), '.cmp-'));
  try {
    const rows = [];
    for (const [i, t] of times.entries()) {
      const a = path.join(dir, `r${i}.png`), row = path.join(dir, `row${i}.png`);
      grab(ref, t, a);
      const b = await oursAt(t, i, dir);
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', a, '-i', b, '-filter_complex', 'hstack=inputs=2', row]);
      rows.push(row);
    }
    const args = rows.flatMap((r) => ['-i', r]);
    const filter = rows.length > 1 ? ['-filter_complex', `vstack=inputs=${rows.length}`] : [];
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args, ...filter, out]);
    if (r.status !== 0) die(`stack failed: ${String(r.stderr || '').trim()}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

export async function compareFrames({ ours, ref, times, out, from = 0 }) {
  return sheet({ ref, times, out, oursAt: (t, i, dir) => {
    const png = path.join(dir, `o${i}.png`);
    grab(ours, t - from, png, t);
    return png;
  } });
}

// Page mode: seek the page with the renderer's own functions and screenshot at draft (half) size,
// so a look at a few frames costs one page load, not a range render.
export async function comparePage({ page: pagePath, ref, times, out }) {
  const { openPage, seekAll, resolveFrame, settle } = await import('./render-page.mjs');
  const opened = await openPage(pagePath, resolveFrame(pagePath));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    return await sheet({ ref, times, out, oursAt: async (t, i, dir) => {
      await seekAll(opened.page, t * 1000);
      const shot = path.join(dir, `${path.basename(pagePath, '.html')}.png`), png = path.join(dir, `o${i}.png`);
      await opened.page.screenshot({ path: shot });
      grab(shot, 0, png, t);
      return png;
    } });
  } finally {
    await opened.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const page = flag('--page');
  const ours = argv.find((a, i) => !a.startsWith('--') && !['--ref', '--at', '--out', '--from', '--page'].includes(argv[i - 1]));
  const ref = flag('--ref');
  const times = String(flag('--at') || '').split(',').map(Number).filter((t) => Number.isFinite(t));
  if (!(page || ours) || !ref || !times.length) die('usage: compare-frames.mjs <ours.mp4> | --page <page.html> --ref <ref.mp4> --at 2.5,3.1 [--out file.png]');
  for (const f of [page || ours, ref]) if (!fs.existsSync(f)) die(`no such file: ${f}`);
  const source = page || ours;
  const out = path.resolve(flag('--out') || path.join('out', `compare-${path.basename(source, path.extname(source))}.png`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (page) await comparePage({ page, ref, times, out });
  else await compareFrames({ ours, ref, times, out, from: Number(flag('--from')) || 0 });
  console.log(`✓ ${path.relative(process.cwd(), out)}: reference left, yours right, ${times.length} row(s) at ${times.join(', ')} s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
