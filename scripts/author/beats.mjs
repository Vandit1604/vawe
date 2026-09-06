// beats.mjs: verify a video BEAT BY BEAT before you trust it. Renders the first / mid / last frame of
// every beat into one labeled contact sheet (/tmp/beats/<name>.png) so one image tells you if a beat is murky,
// overlapping, or off. With --vs <brand> it stacks each beat beside its source-section screenshot (from
// `make sections`). A side-by-side taste diff: does our beat actually reflect the real section?
//
//   node scripts/author/beats.mjs <data.json> [--vs brand] [--stride 1]
//   make beats D=formats/scene/linear-30.json            (self check)
//   make beats D=formats/scene/linear-30.json VS=linear  (fidelity vs captured sections)
//   make sheets D=…                                      (this sheet AND the reveal sheet, one browser)
//
// Beat boundaries: authored cut times, else layer-start clusters (>1.2s gap), else camera/captions, else even chop.
//
// The serve+boot block this file used to carry is gone: `openScene` owns it (scripts/author/scene-page.mjs),
// as its header asked for. `beatSheet` takes an ALREADY-OPEN scene, which is what lets `make sheets` pay
// for one browser and get both contact sheets out of it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openScene } from './scene-page.mjs';
import { writeReceipt } from '../lib/receipt.mjs';
import { scratch, ffmpegOrDie } from '../lib/scratch.mjs';
import { drawtext } from './sheets.mjs';
import { lowerScene } from '../../core/transitions/lower.js';

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
  // 1. explicit cut times, the strongest boundary
  for (const c of data.cuts || []) if (typeof c.t === 'number' && !near(bounds, c.t)) bounds.push(c.t);
  // 2. layer-start clusters: sort starts, a >1.2s gap opens a new beat (ignore the full-bleed base track 0)
  const starts = [...new Set((data.layers || []).filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
  let last = -9;
  for (const t of starts) { if (t - last > 1.2 && !near(bounds, t)) { bounds.push(t); } last = t; }
  // 3. fallbacks only if the above found nothing
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
  // `transitions` is the documented unified surface and lowers to cuts/seams/stings before the engine
  // renders (core/transitions-lower.js). Without this, a film that declares its boundaries the
  // documented way was read as a film with NO boundaries. Idempotent; a no-op for raw `cuts`. #380.
  const data = lowerScene(JSON.parse(fs.readFileSync(dataArg, 'utf8')));
  const { duration } = s.meta;
  const beats = beatWindows(data, duration);

  // optional source sections for the fidelity column
  let sections = [];
  if (vs) {
    try { sections = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/brands', vs, 'sections', 'sections.json'), 'utf8')).sections; }
    catch { console.warn(`  ⚠ --vs ${vs}: no sections.json (run: make sections URL=… NAME=${vs}), skipping fidelity column`); }
  }

  // PER SCENE, not one global path. Two authors working at once wrote the same `/tmp/beats.png` and wiped
  // the same `/tmp/beats_frames`, so each read a contact sheet of the other's film and the receipt swore
  // they had looked at their own. `judge.mjs` was moved off a shared directory for exactly this; the rest
  // of the sheet-writers were not, and a campaign is when that stops being theoretical.
  const SLUG = path.basename(dataArg, '.json');
  // The frames and the sheet come off ONE base (scripts/lib/scratch.mjs). This file used to write both
  // as `/tmp/...` literals, which is the half of #245 that was fixed in reveal.mjs and left here.
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
    // fidelity: prepend the source section shot (letterboxed to tile height)
    const sec = sections[b.i];
    if (sec) {
      const secShot = path.join(ROOT, sec.shot);
      // A `make sections` run from a differently-named checkout wrote `engine/assets/...` into `shot`,
      // and half the brands on disk carry those. Skipping in silence made --vs look like it worked and
      // produced a sheet with no fidelity column at all, so say which file is missing.
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

  // stack rows (pad narrower rows so hstack widths match)
  const maxCells = Math.max(...rows.map((r) => r.n));
  const full = tileW * maxCells;
  const padded = rows.map((r, i) => {
    if (r.n === maxCells) return r.img;
    const p = path.join(tmp, `padrow_${i}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-i', r.img, '-vf', `pad=${full}:ih:0:0:color=0x0a0a0c`, p], p, `pad row ${i}`);
    return p;
  });
  ffmpegOrDie(['-v', 'error', '-y', ...padded.flatMap((p) => ['-i', p]), '-filter_complex', `vstack=inputs=${padded.length}`, '-frames:v', '1', sheet], sheet, 'contact sheet');
  // REVIEW RECEIPT. The sheet is an image, so no gate can score it; the only checkable fact is whether
  // anyone rendered one for THIS version of the scene. Stamp the scene's content hash next to the sheet and
  // beat-check reads it back: a hash that no longer matches means the scene changed since it was looked at.
  writeReceipt('beats', dataArg, { sheet, tool: 'beats', ...(auto ? { auto: true } : {}) });
  console.log(`✓ ${beats.length} beats · ${duration.toFixed(1)}s${vs ? ` · vs SITE ${vs}` : ''}  →  ${sheet}`);
  return { sheet, beats: beats.length, duration };
}

// ---- CLI ----------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/author/beats.mjs <data.json> [--vs brand]'); process.exit(1); }
  let s;
  try { s = await openScene(dataArg); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
  try {
    await beatSheet(s, { dataArg, vs: flag('--vs', null) });
  } finally { await s.close(); }
  console.log('  Read the sheet, give a verdict PER numbered beat (keep / fix X / cut / too fast). Judge each against\n  docs/CRAFT/TASTE-RULES.md: does it read, earn its time, and connect to its neighbours?');
}
