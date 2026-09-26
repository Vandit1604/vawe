import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openScene } from './scene-page.mjs';
import { writeReceipt } from '../lib/receipt.mjs';
import { scratch, ffmpegOrDie } from '../lib/scratch.mjs';
import { drawtext } from './sheets.mjs';
import { loadScene } from '../../core/engine/expand.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Beat windows for a scene, [t0,t1).
 *  A beat is a story unit, and the truest signal of one is the AUTHORED transition: a `cuts[]` time.
 *  Next best is a CLUSTER of layer start-times (a new group of content entering after a gap), the
 *  same heuristic the motion director uses. camera/captions are weaker signals, and an even chop is
 *  the last resort. Earlier this used ONLY camera→captions→even-split, so a cut-driven scene (the
 *  reel) was chopped into arbitrary 5s chunks and undercounted its real beats. */
export function beatWindows(data, duration) {
  const near = (arr, t, eps = 0.35) => arr.some((x) => Math.abs(x - t) < eps);
  let bounds = [];
  for (const c of data.cuts || []) if (typeof c.t === 'number' && !near(bounds, c.t)) bounds.push(c.t);
  const starts = [...new Set((data.layers || []).filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
  let last = -9;
  for (const t of starts) { if (t - last > 1.2 && !near(bounds, t)) { bounds.push(t); } last = t; }
  if (bounds.length < 2) for (const k of data.camera || []) if (typeof k.t === 'number' && !near(bounds, k.t)) bounds.push(k.t);
  if (bounds.length < 2) for (const c of data.captions || []) if (typeof c.start === 'number' && !near(bounds, c.start)) bounds.push(c.start);
  if (bounds.length < 2) { const n = Math.max(2, Math.round(duration / 5)); bounds = Array.from({ length: n }, (_, i) => (i * duration) / n); }
  bounds = [...new Set(bounds.map((t) => Math.max(0, Math.min(duration, t))))].sort((a, b) => a - b);
  if (bounds[0] > 0.05) bounds.unshift(0);
  return bounds.map((t0, i) => ({ i, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration })).filter((b) => b.t1 - b.t0 > 0.2);
}

/** Build the beat contact sheet from an open scene. `auto` marks the receipt as machine-made, see
 *  sheets.mjs for why an automatic sheet must not read as a sheet somebody looked at. */
export async function beatSheet(s, { dataArg, vs = null, auto = false } = {}) {
  const data = loadScene(JSON.parse(fs.readFileSync(dataArg, 'utf8')));
  const { duration } = s.meta;
  const beats = beatWindows(data, duration);

  let sections = [];
  if (vs) {
    try { sections = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/brands', vs, 'sections', 'sections.json'), 'utf8')).sections; }
    catch { console.warn(`  ⚠ --vs ${vs}: no sections.json (run: make sections URL=… NAME=${vs}), skipping fidelity column`); }
  }

  const SLUG = path.basename(dataArg, '.json');
  const sheet = scratch('beats', `${SLUG}.png`);
  const tmp = scratch('beats', `${SLUG}.frames`);
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });

  const tileW = 300, tileH = Math.round((tileW * s.height) / s.width);
  const rows = [];
  for (const b of beats) {
    const ts = [b.t0 + 0.3, (b.t0 + b.t1) / 2, b.t1 - 0.2].map((t) => Math.max(b.t0, Math.min(b.t1 - 0.02, t)));
    const cells = [];
    for (let k = 0; k < ts.length; k++) {
      const raw = path.join(tmp, `b${b.i}_${k}.png`);
      await s.grab(ts[k], raw);
      const lab = path.join(tmp, `b${b.i}_${k}_l.png`);
      const tag = k === 0 ? 'in' : k === 1 ? 'mid' : 'out';
      ffmpegOrDie(['-v', 'error', '-y', '-i', raw, '-vf',
        `scale=${tileW}:${tileH},drawtext=text='${drawtext(`${b.i + 1}·${tag} ${ts[k].toFixed(1)}s`)}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65`, lab], lab, `tile ${b.i + 1}·${tag}`);
      cells.push(lab);
    }
    const sec = sections[b.i];
    if (sec) {
      const secShot = path.join(ROOT, sec.shot);
      if (!fs.existsSync(secShot)) {
        console.warn(`  ⚠ --vs ${vs}: section ${b.i + 1} shot missing (${sec.shot}), no fidelity cell for this beat`);
      } else {
        const sl = path.join(tmp, `b${b.i}_src.png`);
        ffmpegOrDie(['-v', 'error', '-y', '-i', secShot, '-vf',
          `scale=${tileW}:${tileH}:force_original_aspect_ratio=decrease,pad=${tileW}:${tileH}:(ow-iw)/2:(oh-ih)/2:color=0x1a1a1e,drawtext=text='${drawtext(`SITE ${sec.label}`)}':x=8:y=8:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.7`, sl], sl, `site tile ${b.i + 1}`);
        cells.unshift(sl);
      }
    }
    const rowImg = path.join(tmp, `row_${String(b.i).padStart(2, '0')}.png`);
    ffmpegOrDie(['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]), '-filter_complex', `hstack=inputs=${cells.length}`, '-frames:v', '1', rowImg], rowImg, `row ${b.i + 1}`);
    rows.push({ img: rowImg, n: cells.length });
  }

  const maxCells = Math.max(...rows.map((r) => r.n));
  const full = tileW * maxCells;
  const padded = rows.map((r, i) => {
    if (r.n === maxCells) return r.img;
    const p = path.join(tmp, `padrow_${i}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-i', r.img, '-vf', `pad=${full}:ih:0:0:color=0x0a0a0c`, p], p, `pad row ${i}`);
    return p;
  });
  ffmpegOrDie(['-v', 'error', '-y', ...padded.flatMap((p) => ['-i', p]), '-filter_complex', `vstack=inputs=${padded.length}`, '-frames:v', '1', sheet], sheet, 'contact sheet');
  writeReceipt('beats', dataArg, { sheet, tool: 'beats', ...(auto ? { auto: true } : {}) });
  console.log(`✓ ${beats.length} beats · ${duration.toFixed(1)}s${vs ? ` · vs SITE ${vs}` : ''}  →  ${sheet}`);
  return { sheet, beats: beats.length, duration };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node harness/author/beats.mjs <data.json> [--vs brand]'); process.exit(1); }
  let s;
  try { s = await openScene(dataArg); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
  try {
    await beatSheet(s, { dataArg, vs: flag('--vs', null) });
  } finally { await s.close(); }
  console.log('  Read the sheet, give a verdict PER numbered beat (keep / fix X / cut / too fast). Judge each against\n  engine-doctrine/CRAFT/TASTE-RULES.md: does it read, earn its time, and connect to its neighbours?');
}
