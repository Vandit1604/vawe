// harness/media/see.mjs · let an agent SEE a reference video for the price of a few images.
//
//   node harness/media/see.mjs <video> [outDir] [--frames N]           · make study REF=<video> SEE=1
//   node harness/media/see.mjs <video> --shot <from>-<to> [--fps N]    · make study REF=<video> SHOT=<from>-<to>
//   node harness/media/see.mjs <video> --compare <draft.mp4> [--from s --to s]  · make study REF=<video> COMPARE=<draft.mp4>
//   node harness/media/see.mjs <html> --probe --at <s> --sel <css>     · make study REF=<html> PROBE=1 AT=<s> SEL=<css>
//   node harness/media/see.mjs <html> --look --times <s,...> [--ref <mp4>]  · make study REF=<html> LOOK=<s,...> [COMPARE=<mp4>]
//   node harness/media/see.mjs <html> --layout --times <s,...> [--film <film.json>]  · make study REF=<html> LAYOUT=<s,...>
//   node harness/media/see.mjs <video|page.html> --phone | --strip <t> | --loop   · make critique PAGE=<html>
//     (the critique views, harness/media/see-views.mjs: phone contact sheet, 12-frame strip, loop seam)
//
// --probe/--look/--layout exist because agents kept writing their own throwaway browser probe scripts
// to debug a fragment (one stalled twice doing it), never made a still before touching motion (0 of 7
// agents did), and lost whole sessions to a stray `position:absolute` or two stacked opaque backgrounds
// nothing had ever screenshotted together. All four (--dom too) reuse preview-server.mjs's one
// openPreview() page loader (a shared, kept-open browser when one is running, a fresh one otherwise)
// and the same animation-seek (`document.getAnimations()` paused at a given `currentTime`), never a
// second page-loading path.
//
// WHY THIS EXISTS: an agent reads images, not video, and one image costs at most ~1,568 tokens
// regardless of its content (a 3x3 grid at 1568px long edge runs ~174 tokens/frame, per Claude's own
// vision pricing). Reading every frame of a reference is either impossible (no video reader) or
// ruinous (one call per frame). This writes a FEW grids plus one index.md an agent reads first, all
// from ffmpeg + tesseract, both already required by this repo; no new dependency, no OpenCV.
//
// --shot and --compare exist because agents kept failing to match a reference without ever seeing a
// shot DENSELY (every 0.1-0.25s, not the sparse cut/hold/peak sampling below) or comparing a draft
// against the reference AT THE SAME TIMESTAMPS. Both reuse this file's own computeEnergy/HOLD_FLOOR
// and the renderGrids/stackImages helpers below rather than duplicating them.
//
// REUSE, not rewrite: detectCuts/motionDeltaSeries/frameSeries/mergeJoints all come from
// shot-detect.mjs, exactly as study.mjs uses them. ffmpegOrDie from lib/scratch.mjs. The ease-name
// table is core/motion/motion.js's own EASINGS: this never invents ease names, it fits the beat's
// speed curve against the SAME curves the engine already understands.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { drawtext } from '../author/sheets.mjs';
import { ffmpegOrDie, scratch } from '../lib/scratch.mjs';
import { detectCuts, motionDeltaSeries } from './shot-detect.mjs';
import { EASINGS } from '../../core/motion/motion.js';
import { writeReceipt } from '../lib/receipt.mjs';
import { openPreview } from './preview-server.mjs';
import { writeMotionStamp } from '../lib/motion-stamp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const die = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };

// ── energy: the one owner for "how much did the rendered picture actually move" ────────────────────
// Downsample motionDeltaSeries (shot-detect.mjs's per-frame YAVG-of-difference, 0-255 scale) to ~10/s:
// average |delta| in each 0.1s bucket. Exported so a caller other than this CLI (harness/dev/conform.mjs's
// `hold` claim) can measure a rendered mp4's real motion instead of reading it from this script's stdout.
const ENERGY_HZ = 10;
function downsample(series, hz) {
  const step = 1 / hz;
  const buckets = new Map();
  for (const p of series) {
    const k = Math.floor(p.t / step);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(p.v);
  }
  return [...buckets.keys()].sort((a, b) => a - b).map((k) => ({
    t: Number((k * step).toFixed(3)),
    v: Number((buckets.get(k).reduce((a, b2) => a + b2, 0) / buckets.get(k).length).toFixed(3)),
  }));
}
export function computeEnergy(video, hz = ENERGY_HZ) {
  return downsample(motionDeltaSeries(video), hz);
}

// Below this motionDeltaSeries value, nothing is visibly moving. Measured, not guessed: a moving 40x40
// box on a 320x180 frame never drops under 0.64 while still visibly sliding (its ease-out tail decays to
// 0 only once motion truly stops); a sting's frozen 2.0-4.3s span (mean 0.09, peak 0.35, gold-sting-v2.mp4)
// sits entirely under 0.6. 0.6 splits the two with margin on both sides.
export const HOLD_FLOOR = 0.6;
const HOLD_MIN = 0.25; // seconds a flat run must hold to count, this CLI's own default

// ── holds: energy under floor for at least minLen ───────────────────────────────────────────────────
function findHolds(series, floor, minLen) {
  const runs = [];
  let cur = null;
  for (const p of series) {
    if (p.v <= floor) { if (cur) cur.t1 = p.t; else cur = { t0: p.t, t1: p.t }; }
    else { if (cur) runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.t1 - r.t0 >= minLen);
}

// Default outDir: quality/refs/<name>/see/ when the video already lives in a refs folder (the loop's
// own home for this reference), scratch/see/<name>/ otherwise. One rule, so a caller who omits outDir
// never has to know which.
function defaultOutDir(video) {
  const abs = path.resolve(video);
  const m = /^(.*\/quality\/refs\/([^/]+))\//.exec(abs);
  const name = path.basename(video).replace(/\.[^.]+$/, '');
  if (m) return path.join(m[1], 'see');
  return scratch('see', name);
}

function probeVideo(video) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,r_frame_rate,avg_frame_rate', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1', video], { encoding: 'utf8' });
  const fields = Object.fromEntries(String(probe.stdout).trim().split('\n').filter(Boolean)
    .map((l) => l.split('=')).map(([k, v]) => [k, v]));
  const width = +fields.width, height = +fields.height, dur = +fields.duration;
  const rate = (v) => { const m = /^(\d+)(?:\/(\d+))?$/.exec(String(v || '')); return m ? +m[1] / (m[2] ? +m[2] : 1) : 0; };
  const fps = rate(fields.avg_frame_rate) || rate(fields.r_frame_rate) || 30;
  if (!width || !height || !(dur > 0)) die(`${video} has no readable video stream. Is it a video?`);
  return { width, height, dur, fps };
}

// A generated OCR frame's own pixel size (the `scale=640:-2` output, not the source video's): tesseract's
// tsv box columns are in THIS frame's pixels, so a box fraction (of frame height/width) needs this, not
// the source. Falls back to the 640x360 nominal size when no frame exists (nothing to OCR).
function pngDims(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'default=noprint_wrappers=1', file], { encoding: 'utf8' });
  const m = Object.fromEntries(String(r.stdout).trim().split('\n').filter(Boolean).map((l) => l.split('=')));
  return { width: Number(m.width) || 640, height: Number(m.height) || 360 };
}

// tesseract's own tsv -> [{text, box}], box a FRACTION of the frame this tsv was run on. Pulled out of
// ocrWords so the adaptive per-timestamp tracker below (wordTracks) runs the exact same parse on a
// single extracted frame, never a second hand-rolled tsv reader that could drift from this one.
function parseTesseractTsv(tsv, minConf, minLen, frameW, frameH) {
  const words = [];
  for (const line of tsv.split('\n').slice(1)) {
    const cols = line.split('\t');
    if (cols.length < 12) continue;
    const conf = Number(cols[10]), text = (cols[11] || '').trim();
    if (conf >= minConf && text.length >= minLen && /[a-zA-Z]/.test(text)) {
      const left = Number(cols[6]), top = Number(cols[7]), w = Number(cols[8]), h = Number(cols[9]);
      words.push({ text, box: { hFrac: h / frameH, wFrac: w / frameW, cxFrac: (left + w / 2) / frameW, cyFrac: (top + h / 2) / frameH } });
    }
  }
  return words;
}

function ocrOneFrame(src, base, minConf, minLen, frameW, frameH) {
  // One retry: a non-zero exit right after ffmpeg wrote the frame is cheaper to retry once than to
  // silently read as "no text in this frame" (the failure mode before this: an empty tsv either way).
  let r = spawnSync('tesseract', [src, base, '--psm', '11', 'tsv'], { encoding: 'utf8' });
  if (r.status !== 0) r = spawnSync('tesseract', [src, base, '--psm', '11', 'tsv'], { encoding: 'utf8' });
  const tsv = fs.existsSync(`${base}.tsv`) ? fs.readFileSync(`${base}.tsv`, 'utf8') : '';
  return parseTesseractTsv(tsv, minConf, minLen, frameW, frameH);
}

// ── OCR: tesseract on downscaled frames at ocrFps, psm 11 (sparse text, no layout) ─────────────────
// Each surviving word also carries `box`: its own average height/width/centre as a FRACTION of the
// frame, the input the type-scale/placement check (textScaleCheck below) needs to say a headline reads
// smaller or sits lower than the reference, not just that different words were seen. `samples` keeps
// every raw {t, box} the run was built from (not only the averaged `box`): a word that grows or moves
// while it is on screen needs its box AT A GIVEN MOMENT, not one number smeared across its whole run
// (textScaleCheck below reads `samples`, never the averaged `box`, for exactly this reason).
export function ocrWords(video, outDir, ocrFps, minConf, minLen) {
  const ocrDir = path.join(outDir, '.ocr');
  fs.mkdirSync(ocrDir, { recursive: true });
  const framesGlob = path.join(ocrDir, 'f_%05d.png');
  ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-vf', `fps=${ocrFps},scale=640:-2`, framesGlob],
    null, 'ocr frame extraction');
  const files = fs.readdirSync(ocrDir).filter((f) => f.endsWith('.png')).sort();
  const { width: frameW, height: frameH } = files.length ? pngDims(path.join(ocrDir, files[0])) : { width: 640, height: 360 };
  const perFrame = files.map((f, i) => {
    const t = i / ocrFps;
    const base = path.join(ocrDir, `f_${String(i + 1).padStart(5, '0')}`);
    const src = path.join(ocrDir, f);
    return { t, words: ocrOneFrame(src, base, minConf, minLen, frameW, frameH) };
  });
  fs.rmSync(ocrDir, { recursive: true, force: true });
  // A word "seen" is one that persists >= 2 consecutive samples; tIn/tOut are that run's first/last
  // sample, `box` its average geometry (kept for callers that only want one number, e.g. the beat
  // table), `samples` the raw {t, box} list a matched-moment lookup needs.
  const seenAt = new Map();   // text -> [{t, box}, ...]
  for (const f of perFrame) for (const w of f.words) {
    if (!seenAt.has(w.text)) seenAt.set(w.text, []);
    seenAt.get(w.text).push({ t: f.t, box: w.box });
  }
  const avgBox = (boxes) => ({
    hFrac: boxes.reduce((s, b) => s + b.hFrac, 0) / boxes.length,
    wFrac: boxes.reduce((s, b) => s + b.wFrac, 0) / boxes.length,
    cxFrac: boxes.reduce((s, b) => s + b.cxFrac, 0) / boxes.length,
    cyFrac: boxes.reduce((s, b) => s + b.cyFrac, 0) / boxes.length,
  });
  const words = [];
  for (const [text, occ] of seenAt) {
    occ.sort((a, b) => a.t - b.t);
    let runStart = occ[0].t, prev = occ[0].t, run = [occ[0]];
    for (let i = 1; i <= occ.length; i++) {
      const o = occ[i];
      if (o && o.t - prev <= 1 / ocrFps + 0.01) { run.push(o); prev = o.t; continue; }
      if (run.length >= 2) words.push({ text, tIn: Number(runStart.toFixed(2)), tOut: Number(run[run.length - 1].t.toFixed(2)),
        box: avgBox(run.map((r) => r.box)), samples: run });
      if (o) { runStart = o.t; prev = o.t; run = [o]; }
    }
  }
  return words.sort((a, b) => a.tIn - b.tIn);
}

function easeProgressCurve(vals) {
  const cum = [];
  let acc = 0;
  for (const v of vals) { acc += v; cum.push(acc); }
  const total = cum[cum.length - 1] || 1;
  return cum.map((c) => c / total);
}
function fitEase(progress) {
  const n = progress.length;
  if (n < 3) return { name: null, rmse: null };
  let best = null;
  for (const [name, fn] of Object.entries(EASINGS)) {
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const expect = fn(u);
      sq += (progress[i] - expect) ** 2;
    }
    const rmse = Math.sqrt(sq / n);
    if (!best || rmse < best.rmse) best = { name, rmse: Number(rmse.toFixed(4)) };
  }
  return best;
}

// ── beats: spans between cuts, holds, AND caption changes ──────────────────────────────────────────
// A caption swap is usually a soft crossfade, not a hard cut, so ffmpeg's scene score barely moves for
// it (measured on the kinetic-typography reference this tool was built against: 4 scene cuts, but 11
// readable beats driven mostly by on-screen text changing). OCR's own word onsets are the only signal
// that catches those, so every new word's first-seen time is a candidate split too.
function buildBeats(cutTimes, holds, ocr, energy, dur) {
  const wordOnsets = [...ocr.map((w) => w.tIn)].sort((a, b) => a - b)
    .reduce((acc, t) => (acc.length && t - acc[acc.length - 1] < 0.5 ? acc : [...acc, t]), []);
  // Two candidate boundaries within MIN_SHOT of each other are the same moment measured two ways (a
  // hold's own edge sits right where the clip cuts): the MORE EXACT signal wins, same priority order as
  // shot-detect.mjs's mergeJoints (cut > everything else), extended with hold-edge and word-onset.
  const MIN_SHOT = 0.4;
  const boundaryCandidates = [
    ...cutTimes.map((t) => ({ t, pri: 0 })),
    ...holds.flatMap((h) => [{ t: h.t0, pri: 1 }, { t: h.t1, pri: 1 }]),
    ...wordOnsets.map((t) => ({ t, pri: 2 })),
  ].sort((a, b) => a.t - b.t);
  const mergedBoundaries = [];
  for (const c of boundaryCandidates) {
    const prev = mergedBoundaries[mergedBoundaries.length - 1];
    if (prev && c.t - prev.t < MIN_SHOT) { if (c.pri < prev.pri) mergedBoundaries[mergedBoundaries.length - 1] = c; continue; }
    mergedBoundaries.push({ ...c });
  }
  const splitPoints = [0, ...mergedBoundaries.map((b) => b.t), dur]
    .filter((t, i, a) => i === 0 || t - a[i - 1] >= 0.05);
  const rawBeats = [];
  for (let i = 0; i < splitPoints.length - 1; i++) {
    const t0 = splitPoints[i], t1 = splitPoints[i + 1];
    if (t1 - t0 > 0.05) rawBeats.push({ t0, t1 });
  }

  return rawBeats.map((b) => {
    const inWindow = energy.filter((p) => p.t >= b.t0 && p.t < b.t1);
    const vals = inWindow.map((p) => p.v);
    const meanSpeed = vals.length ? Number((vals.reduce((a, c) => a + c, 0) / vals.length).toFixed(2)) : 0;
    const peak = vals.length ? Math.max(...vals) : 0;
    const peakIdx = vals.indexOf(peak);
    const peakT = peakIdx >= 0 ? inWindow[peakIdx].t : b.t0;
    const progress = easeProgressCurve(vals.length ? vals : [0]);
    const fit = fitEase(progress);
    const words = ocr.filter((w) => w.tIn >= b.t0 && w.tIn < b.t1);
    // How often something visibly changes (share of samples above HOLD_FLOOR), and the exit-to-entrance
    // speed ratio (last 20% of the beat's energy over its first 20%): a beat that enters fast and dies
    // slow reads as unfinished motion, and neither number was visible before this.
    const changeRate = vals.length ? Number((vals.filter((v) => v > HOLD_FLOOR).length / vals.length).toFixed(2)) : 0;
    const edge = edgeMean(vals.length ? vals : [0], 0.2);
    const exitEntryRatio = edge.entrance > 1e-6 ? Number((edge.exit / edge.entrance).toFixed(2)) : null;
    return {
      t0: Number(b.t0.toFixed(2)), t1: Number(b.t1.toFixed(2)),
      meanSpeed, peak: Number(peak.toFixed(2)), peakT: Number(peakT.toFixed(2)),
      ease: fit.name, easeRmse: fit.rmse, changeRate, exitEntryRatio, words,
    };
  });
}

// ── frame choice: cut frames, each hold's settle frame, each beat's peak, budget-capped, deduped ───
function pickFrames(cutTimes, holds, beats, dur, budget) {
  const minGap = Math.max(0.15, dur / (budget * 4));
  const cands = [
    ...cutTimes.map((t) => ({ t, tag: 'cut' })),
    ...holds.map((h) => ({ t: Math.min(h.t1, dur - 0.01), tag: 'hold' })),
    ...beats.map((b) => ({ t: b.peakT, tag: 'peak' })),
  ].sort((a, b) => a.t - b.t);
  const picked = [];
  for (const c of cands) {
    if (picked.length >= budget) break;
    if (picked.every((p) => Math.abs(p.t - c.t) >= minGap)) picked.push(c);
  }
  if (picked.length === 0) picked.push({ t: 0, tag: 'start' });
  return picked.sort((a, b) => a.t - b.t);
}

// Same shape as study.mjs's own stackImages (lifted, not imported: study.mjs is a top-level CLI
// script, not a module of exports). A partial row/column is PADDED to the full tile grid rather than
// left its own width, or ffmpeg's vstack refuses two inputs of different widths.
function stackImages(files, out, axis, padW, padH) {
  const pad = padW && padH ? `,pad=${padW}:${padH}:0:0:black` : '';
  if (files.length === 1) {
    ffmpegOrDie(['-v', 'error', '-y', '-i', files[0], '-vf', `null${pad}`, '-frames:v', '1', out], out, 'grid stack');
    return;
  }
  const stack = axis === 'h' ? `hstack=inputs=${files.length}` : `vstack=inputs=${files.length}`;
  ffmpegOrDie(['-v', 'error', '-y', ...files.flatMap((c) => ['-i', c]),
    '-filter_complex', `${stack}${pad}`, '-frames:v', '1', out], out, 'grid stack');
}

// Tiles `cellFiles` (already the right size, one image per panel) into <=`cellsPerGrid`-panel grids,
// 3 columns wide, via stackImages for both axes. ONE tiler: renderGrids, buildCompareGrids's stacked
// ref/draft pairs, and --dom's screenshot stills all feed it instead of each re-writing the row/grid
// loop, which is the same math regardless of how a cell's image was produced (ffmpeg -ss or a page
// screenshot).
function tileInGrids(cellFiles, outDir, prefix, tileW, tileH, cellsPerGrid) {
  const gridPaths = [];
  for (let g = 0; g * cellsPerGrid < cellFiles.length; g++) {
    const chunk = cellFiles.slice(g * cellsPerGrid, (g + 1) * cellsPerGrid);
    const cols = Math.min(3, chunk.length);
    const rowsN = Math.ceil(chunk.length / cols);
    const rowFiles = [];
    for (let r = 0; r < rowsN; r++) {
      const rowCells = chunk.slice(r * cols, (r + 1) * cols);
      const rowOut = path.join(outDir, `.${prefix}row_${g}_${r}.png`);
      stackImages(rowCells, rowOut, 'h', tileW * cols, tileH);
      rowFiles.push(rowOut);
    }
    const gridOut = path.join(outDir, `${prefix}-${String(g + 1).padStart(2, '0')}.png`);
    stackImages(rowFiles, gridOut, 'v', null, null);
    gridPaths.push(gridOut);
    for (const f of rowFiles) fs.rmSync(f, { force: true });
  }
  return gridPaths;
}

// ── grids: 3x3, <=9 panels, 1568px long edge ────────────────────────────────────────────────────
function renderGrids(video, outDir, chosen, width, height, dur) {
  const GRID_CELLS = 9;
  const longEdge = 1568;
  const tileW = Math.floor(longEdge / 3);
  const tileH = Math.round((tileW * height) / width);
  const cellFiles = chosen.map((c, i) => {
    const t = Math.max(0, Math.min(c.t, dur - 0.03));
    const out = path.join(outDir, `.cell_${i}.png`);
    const label = c.tag ? `${c.tag} ${t.toFixed(2)}s` : `${t.toFixed(2)}s`;
    ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf',
      `scale=${tileW}:${tileH},drawtext=text='${drawtext(label)}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65`,
      out], out, `grid cell ${i}`);
    return out;
  });
  const gridPaths = tileInGrids(cellFiles, outDir, 'grid', tileW, tileH, GRID_CELLS);
  for (const f of cellFiles) fs.rmSync(f, { force: true });
  return gridPaths;
}

// ── shared by --shot and --compare: bucket a computeEnergy series into fixed windows ────────────────
function bucketMean(series, from, to, winLen) {
  const buckets = new Map();
  for (const p of series) {
    if (p.t < from || p.t >= to) continue;
    const k = Math.floor((p.t - from) / winLen);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(p.v);
  }
  const n = Math.max(0, Math.ceil((to - from) / winLen));
  return Array.from({ length: n }, (_, k) => {
    const vals = buckets.get(k) || [];
    return {
      t0: from + k * winLen, t1: Math.min(to, from + (k + 1) * winLen),
      mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
    };
  });
}

// Index-based, not accumulated (`t += step`): float drift on an accumulator (0.1 * 49 = 4.900000000000002)
// can push one extra tick past `to` that a `t < to` guard alone won't catch, which minted a spurious
// 51st sample over a clean 5.0s/10fps window and crashed a later grid on a cell that should not exist.
function timeRange(from, to, step) {
  const n = Math.max(0, Math.floor((to - from) / step + 1e-9));
  return Array.from({ length: n }, (_, i) => Number((from + i * step).toFixed(6)));
}

// ── edge speeds: mean of a curve's first/last `frac` share, used both for a beat's own
// exit-to-entrance ratio and for --sheet-check's ref-vs-film exit comparison. `vals` is a plain array
// of energy numbers; a `{mean}`-shaped curve maps to one before calling this.
function edgeMean(vals, frac) {
  const n = Math.max(1, Math.round(vals.length * frac));
  const head = vals.slice(0, n), tail = vals.slice(-n);
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return { entrance: avg(head), exit: avg(tail) };
}

function describeRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return 'n/a';
  return ratio >= 1 ? `${ratio.toFixed(1)}x faster than the reference` : `${(1 / ratio).toFixed(1)}x slower than the reference`;
}

function longestHold(holds) {
  return holds.reduce((m, h) => (h.t1 - h.t0 > m.len ? { len: h.t1 - h.t0, at: h.t0 } : m), { len: 0, at: 0 });
}

function parseRange(spec) {
  const m = /^([\d.]+)-([\d.]+)$/.exec(String(spec || ''));
  if (!m) die(`bad range "${spec}": expected <from>-<to> in seconds, e.g. --shot 12-18`);
  const from = Number(m[1]), to = Number(m[2]);
  if (!(to > from)) die(`bad range "${spec}": <to> (${to}) must be greater than <from> (${from})`);
  return { from, to };
}

// ── --shot <from>-<to>: a dense strip of ONE window, plus its motion curve ──────────────────────────
function runShot(video, outDirRoot, from, to, fps) {
  const { width, height, dur } = probeVideo(video);
  if (from >= dur) die(`--shot ${from}-${to}: from (${from}s) is past ${video}'s duration (${dur.toFixed(2)}s)`);
  const clampedTo = Math.min(to, dur);
  const outDir = path.join(outDirRoot, `shot-${from}-${to}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const chosen = timeRange(from, clampedTo, 1 / fps).map((t) => ({ t, tag: '' }));
  const gridPaths = renderGrids(video, outDir, chosen, width, height, dur);

  const energy = computeEnergy(video).filter((p) => p.t >= from && p.t < clampedTo);
  const curve = bucketMean(energy, from, clampedTo, 0.5)
    .map((w) => ({ t0: Number(w.t0.toFixed(2)), t1: Number(w.t1.toFixed(2)), mean: Number(w.mean.toFixed(3)) }));

  writeJsonAtomic(path.join(outDir, 'motion.json'), { video, from, to: clampedTo, fps, curve });

  const rows = curve.map((w) => `| ${w.t0.toFixed(2)}-${w.t1.toFixed(2)}s | ${w.mean.toFixed(2)} |`).join('\n');
  const index = `# see --shot: ${path.basename(video)} ${from}-${clampedTo}s

${gridPaths.length} grid(s) at ${fps}fps, 1568px long edge, chronological.

## Grids

${gridPaths.map((p) => `- ${path.relative(ROOT, p)}`).join('\n')}

## Motion (0.5s windows)

| window | mean energy |
|---|---|
${rows}
`;
  fs.writeFileSync(path.join(outDir, 'index.md'), index);
  console.log(`✓ shot ${from}-${clampedTo}s: ${gridPaths.length} grid(s) at ${fps}fps -> ${path.relative(ROOT, outDir)}/index.md`);
}

// ── --compare <draft.mp4>: reference vs draft at the SAME timestamps ────────────────────────────────
// Side-by-side grids (reference top, draft bottom, every 0.25s) tiled 3x2, plus a per-0.5s energy
// table that marks a window "too still" when the draft's energy is under half the reference's: the
// same HOLD_FLOOR/computeEnergy this file's own `see` flow and conform.mjs's `hold` claim both read.
function compareCell(clip, t, outDir, tag, tileW, tileH) {
  const at = Math.max(0, Math.min(t, clip.dur - 0.03));
  const out = path.join(outDir, `.${tag}.png`);
  ffmpegOrDie(['-v', 'error', '-y', '-ss', at.toFixed(3), '-i', clip.path, '-frames:v', '1', '-vf',
    `scale=${tileW}:${tileH},drawtext=text='${drawtext(`${clip.label} ${t.toFixed(2)}s`)}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.65`,
    out], out, `compare ${tag} cell`);
  return out;
}

function buildCompareGrids(ref, draft, outDir, window, dims) {
  const CELLS_PER_GRID = 6; // 3x2
  const longEdge = 1568;
  const tileW = Math.floor(longEdge / 3);
  const tileH = Math.round((tileW * dims.height) / dims.width);
  const times = timeRange(window.from, window.to, 0.25);
  const pairFiles = times.map((t, i) => {
    const refCell = compareCell(ref, t, outDir, `ref_${i}`, tileW, tileH);
    const draftCell = compareCell(draft, t, outDir, `draft_${i}`, tileW, tileH);
    const pairOut = path.join(outDir, `.pair_${i}.png`);
    stackImages([refCell, draftCell], pairOut, 'v', tileW, tileH * 2);
    fs.rmSync(refCell, { force: true }); fs.rmSync(draftCell, { force: true });
    return pairOut;
  });
  const gridPaths = tileInGrids(pairFiles, outDir, 'side', tileW, tileH * 2, CELLS_PER_GRID);
  for (const f of pairFiles) fs.rmSync(f, { force: true });
  return gridPaths;
}

function runCompare(refPath, draftPath, outDirRoot, fromArg, toArg, filmArg, words = false) {
  const refP = probeVideo(refPath);
  const draftP = probeVideo(draftPath);
  const from = fromArg != null ? fromArg : 0;
  const to = toArg != null ? toArg : Math.min(refP.dur, draftP.dur);
  if (!(to > from)) die(`--compare: bad window ${from}-${to}`);
  const clampedTo = Math.min(to, refP.dur, draftP.dur);

  const outDir = path.join(outDirRoot, 'compare');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const width = Math.min(refP.width, draftP.width);
  const height = Math.round((width * refP.height) / refP.width);
  const ref = { path: refPath, dur: refP.dur, label: 'ref' };
  const draft = { path: draftPath, dur: draftP.dur, label: 'draft' };
  const gridPaths = buildCompareGrids(ref, draft, outDir, { from, to: clampedTo }, { width, height });

  const refEnergy = computeEnergy(refPath).filter((p) => p.t >= from && p.t < clampedTo);
  const draftEnergy = computeEnergy(draftPath).filter((p) => p.t >= from && p.t < clampedTo);
  const refCurve = bucketMean(refEnergy, from, clampedTo, 0.5);
  const draftCurve = bucketMean(draftEnergy, from, clampedTo, 0.5);
  // Required-motion-match's own diff (window ratio + peak/exit speed + a numeric hint per failing
  // window), the same one --dom --ref and --sheet-check run: one owner for "is the motion close
  // enough", not a second bespoke tooStill calc living only here.
  const { rows, tooStillWindows, tooBusyWindows, ok, peakRatio, exitRatio } = sheetCheck({ curve: refCurve }, { curve: draftCurve });

  const refHolds = findHolds(refEnergy, HOLD_FLOOR, HOLD_MIN);
  const draftHolds = findHolds(draftEnergy, HOLD_FLOOR, HOLD_MIN);
  const refLongest = longestHold(refHolds);
  const draftLongest = longestHold(draftHolds);

  const tableRows = rows.map((r) => `| ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s | ${r.refMean.toFixed(2)} `
    + `| ${r.filmMean.toFixed(2)} |${r.tooStill ? ' <- too still' : r.tooBusy ? ' <- too busy' : ''} |`).join('\n');
  const lines = [
    `# see --compare: ${path.basename(refPath)} vs ${path.basename(draftPath)}`, '',
    `window ${from}-${clampedTo}s · ${gridPaths.length} grid(s) every 0.25s, reference top, draft bottom.`, '',
    '| window | ref energy | draft energy | |', '|---|---|---|---|', tableRows, '',
    `ref longest still span: ${refLongest.len.toFixed(2)}s at ${refLongest.at.toFixed(2)}s`,
    `draft longest still span: ${draftLongest.len.toFixed(2)}s at ${draftLongest.at.toFixed(2)}s`, '',
    '## Grids', '', ...gridPaths.map((p) => `- ${path.relative(ROOT, p)}`),
  ];
  fs.writeFileSync(path.join(outDir, 'compare.md'), `${lines.join('\n')}\n`);
  writeJsonAtomic(path.join(outDir, 'motion.json'), {
    ref: refPath, draft: draftPath, from, to: clampedTo,
    windows: rows.map((r) => ({ t0: Number(r.t0.toFixed(2)), t1: Number(r.t1.toFixed(2)),
      refMean: Number(r.refMean.toFixed(3)), draftMean: Number(r.filmMean.toFixed(3)), tooStill: r.tooStill, tooBusy: r.tooBusy })),
    refLongestStill: refLongest, draftLongestStill: draftLongest, peakRatio, exitRatio,
  });

  console.log(`\n  COMPARE · ${path.basename(refPath)} vs ${path.basename(draftPath)}, ${from}-${clampedTo}s\n`);
  for (const r of rows)
    console.log(`  ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s  ref ${r.refMean.toFixed(2)}  draft ${r.filmMean.toFixed(2)}${r.tooStill ? '  <- too still' : r.tooBusy ? '  <- too busy' : ''}`);
  console.log(`\n  ✓ wrote ${path.relative(ROOT, path.join(outDir, 'compare.md'))}`);
  if (tooStillWindows.length || tooBusyWindows.length) {
    if (tooStillWindows.length) {
      console.log(`  next: fix motion in ${tooStillWindows.length} window(s) marked "too still":`);
      for (const r of tooStillWindows) console.log(`    - ${r.hint}`);
    }
    if (tooBusyWindows.length) {
      console.log(`  next: fix motion in ${tooBusyWindows.length} window(s) marked "too busy":`);
      for (const r of tooBusyWindows) console.log(`    - ${r.hint}`);
    }
  } else {
    console.log('  next: draft matches the reference\'s motion in every window; proceed to the next post-draft step.');
  }

  // `--words` (opt-in: adaptive OCR is not free): the per-word entrance/highlight/exit/star check, on
  // the SAME two clips this function already has open, never a third render.
  const wordsOk = words ? runWordEventCompare(refPath, draftPath, outDir, from, clampedTo, `${path.basename(refPath)} vs ${path.basename(draftPath)}`) : true;

  // `--film` records this run against the FILM's own hash (harness/lib/receipt.mjs), the same receipt
  // shape conform.mjs/verify.mjs already write, so quality/gates/post-draft.mjs can read one fresh/stale
  // answer instead of re-running ffmpeg itself.
  const overallOk = ok && wordsOk;
  if (filmArg) {
    writeReceipt('motion-compare', filmArg, {
      ok: overallOk, tooStillCount: tooStillWindows.length, tooBusyCount: tooBusyWindows.length,
      tooStillWindows: tooStillWindows.map((r) => ({ t0: r.t0, t1: r.t1, hint: r.hint })),
      tooBusyWindows: tooBusyWindows.map((r) => ({ t0: r.t0, t1: r.t1, hint: r.hint })),
      peakRatio, exitRatio, ref: refPath, draft: draftPath, from, to: clampedTo, wordsOk,
    });
  }
  // Reports, does not block by default (this repo's own house rule: a gate blocks only with --strict
  // or through a specific caller that opts in, e.g. --film for post-draft.mjs's own required-motion
  // step, or runRequiredMotionMatch below for a bare-page check with no film to gate). `ok` is
  // returned so a caller that DOES want to refuse (no film/scene wrapping it) can.
  return { ok: overallOk, tooStillWindows, tooBusyWindows, peakRatio, exitRatio, wordsOk };
}

// Write-then-rename: a reader that opens `file` either sees the old content or the whole new one,
// never a half-written one (the same failure a compare once hit reading a half-written mp4 mid-render,
// "moov atom not found"). Cheap enough to use for every JSON this file writes.
function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  fs.renameSync(tmp, file);
}

// Required-motion-match thresholds: a BAND, not a floor alone. Under HALF the reference reads
// "tooStill" (--compare's original rule, now also applied to peak and exit speed); over TWICE the
// reference reads "tooBusy": a film passed the floor-only check with windows sitting at 4x the
// reference because several glows pulsed at once, everywhere, all at once, reading as noise rather
// than the reference's one deliberate move. Both ends fail `ok`.
export const MATCH_FLOOR = 0.5;
export const BUSY_CEIL = 2;

// Qualitative read of a raw energy number, for a hint a person can act on without knowing this file's
// own units. Bucketed off measured values already on record in this file: sting's frozen span reads
// ~0.1, HOLD_FLOOR is 0.6 (nothing visibly moving below it), a full-frame flash/sweep reads 8+.
function describeEnergy(v) {
  if (v >= 6) return 'a full-frame flash and sweep';
  if (v >= 2) return 'broad movement across the frame';
  if (v >= HOLD_FLOOR) return 'movement across part of the frame';
  return 'almost nothing moving';
}

// One line, per failing window, built from the numbers this run actually measured: never canned text.
// `filmArea` (0-1, tracked-element box area / frame area) only exists on a `--dom` curve; the mp4-vs-mp4
// path (no DOM to read boxes from) falls back to describing the film side by its energy number alone.
function windowHint(row, isEdgeWindow) {
  const refDesc = describeEnergy(row.refMean);
  const filmDesc = row.area == null ? describeEnergy(row.filmMean)
    : row.area < 0.15 ? 'in a small area' : row.area < 0.4 ? 'across part of the frame' : 'across most of the frame';
  const actions = [];
  if (row.area != null && row.area < 0.15) actions.push('enlarge the moving area');
  actions.push(isEdgeWindow ? 'speed up the exit' : 'speed up the motion');
  const advice = actions.join(' and ');
  return `${row.t0.toFixed(1)}-${row.t1.toFixed(1)}s: reference moves ${row.refMean.toFixed(1)} ${refDesc}; `
    + `yours ${row.filmMean.toFixed(1)} ${filmDesc}. ${advice[0].toUpperCase()}${advice.slice(1)}.`;
}

// The other end of the band: a window moving MORE than BUSY_CEIL times the reference. Worded the same
// way as windowHint (both sides' numbers, no canned text), but the fix is the opposite direction: this
// window is not too weak, it is too loud, usually several things pulsing/glowing at once where the
// reference commits to one.
function busyHint(row) {
  const refDesc = describeEnergy(row.refMean);
  const filmDesc = row.area == null ? describeEnergy(row.filmMean)
    : row.area < 0.4 ? 'across part of the frame' : 'across most of the frame';
  return `${row.t0.toFixed(1)}-${row.t1.toFixed(1)}s: reference moves ${row.refMean.toFixed(1)} ${refDesc}; `
    + `yours ${row.filmMean.toFixed(1)} ${filmDesc} (${row.ratio.toFixed(1)}x the reference). `
    + 'Slow it down, or drop one of the simultaneous motion devices in this window.';
}

// ── --sheet-check: compare two ALREADY-COMPUTED motion curves, no render, no ffmpeg ──────────────────
// Both --shot's and --dom's own motion.json share one shape (`curve`: [{t0,t1,mean}], --dom's also
// carrying `area`), so one function diffs either pairing: a reference's `see --shot` sheet against a
// film's `--dom` sheet, or two shots of the same reference. `ok` (required-motion-match's own gate)
// fails on ANY window outside [MATCH_FLOOR, BUSY_CEIL] of the reference, or peak/exit speed under
// MATCH_FLOOR.
export function sheetCheck(refSheet, filmSheet) {
  const refCurve = refSheet.curve || [];
  const filmCurve = filmSheet.curve || [];
  const n = Math.min(refCurve.length, filmCurve.length);
  const edgeCount = Math.max(1, Math.round(n * 0.2));
  const rows = Array.from({ length: n }, (_, i) => {
    const r = refCurve[i], f = filmCurve[i];
    const ratio = r.mean > 1e-6 ? f.mean / r.mean : (f.mean > 1e-6 ? Infinity : 1);
    const tooStill = ratio < MATCH_FLOOR, tooBusy = ratio > BUSY_CEIL;
    const row = { t0: r.t0, t1: r.t1, refMean: r.mean, filmMean: f.mean, area: f.area ?? null, ratio, tooStill, tooBusy };
    const isEdgeWindow = i >= n - edgeCount;
    return { ...row, isEdgeWindow, hint: tooStill ? windowHint(row, isEdgeWindow) : tooBusy ? busyHint(row) : null };
  });
  const peakIdx = (curve) => curve.reduce((bi, c, i) => (c.mean > (curve[bi]?.mean ?? -Infinity) ? i : bi), 0);
  const winLen = refCurve[0] ? refCurve[0].t1 - refCurve[0].t0 : 0.5;
  const refPeakIdx = peakIdx(refCurve), filmPeakIdx = peakIdx(filmCurve);
  const peakOffset = (filmPeakIdx - refPeakIdx) * winLen;

  // Peak and exit speed, not only the mean-energy ratio per window: a draft can hit the reference's
  // AVERAGE motion while its fast whips and its exits are both dead flat, and the per-window table above
  // never says so.
  const refPeak = refCurve.length ? Math.max(...refCurve.map((c) => c.mean)) : 0;
  const filmPeak = filmCurve.length ? Math.max(...filmCurve.map((c) => c.mean)) : 0;
  const refEdge = edgeMean(refCurve.map((c) => c.mean), 0.2);
  const filmEdge = edgeMean(filmCurve.map((c) => c.mean), 0.2);
  const peakRatio = refPeak > 1e-6 ? filmPeak / refPeak : (filmPeak > 1e-6 ? Infinity : 1);
  const exitRatio = refEdge.exit > 1e-6 ? filmEdge.exit / refEdge.exit : (filmEdge.exit > 1e-6 ? Infinity : 1);

  const tooStillWindows = rows.filter((r) => r.tooStill);
  const tooBusyWindows = rows.filter((r) => r.tooBusy);
  const ok = n > 0 && tooStillWindows.length === 0 && tooBusyWindows.length === 0
    && peakRatio >= MATCH_FLOOR && exitRatio >= MATCH_FLOOR;

  return {
    rows, tooStillWindows, tooBusyWindows, ok, peakOffset,
    refPeakT: refCurve[refPeakIdx]?.t0 ?? null, filmPeakT: filmCurve[filmPeakIdx]?.t0 ?? null,
    refPeak, filmPeak, peakRatio, refExit: refEdge.exit, filmExit: filmEdge.exit, exitRatio,
  };
}

// Prints a sheetCheck() result and returns its `ok`. Shared by --sheet-check (two pre-computed JSON
// curves) and --required-motion (a live reference video + a live HTML page), so the table/hints/pass
// line are worded identically wherever this runs.
function printSheetCheck(result, refLabel, filmLabel) {
  const { rows, tooStillWindows, tooBusyWindows, ok, peakOffset, refPeakT, filmPeakT, refPeak, filmPeak, peakRatio, refExit, filmExit, exitRatio } = result;
  console.log(`\n  SHEET CHECK · ${refLabel} vs ${filmLabel}\n`);
  for (const r of rows) {
    const ratioTxt = Number.isFinite(r.ratio) ? `${r.ratio.toFixed(2)}x` : 'n/a';
    const note = r.tooStill ? '  <- too still' : r.tooBusy ? '  <- too busy' : '';
    console.log(`  ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s  ref ${r.refMean.toFixed(2)}  film ${r.filmMean.toFixed(2)}  ratio ${ratioTxt}${note}`);
  }
  const dir = peakOffset > 1e-6 ? 'late' : peakOffset < -1e-6 ? 'early' : 'on time';
  const refTxt = refPeakT != null ? refPeakT.toFixed(2) : 'n/a';
  const filmTxt = filmPeakT != null ? filmPeakT.toFixed(2) : 'n/a';
  console.log(`\n  peak motion: reference at ${refTxt}s, film at ${filmTxt}s (${Math.abs(peakOffset).toFixed(2)}s ${dir})`);
  console.log(`  peak speed: ref ${refPeak.toFixed(2)}, film ${filmPeak.toFixed(2)} (film is ${describeRatio(peakRatio)})`);
  console.log(`  exit speed: ref ${refExit.toFixed(2)}, film ${filmExit.toFixed(2)} (film's exit is ${describeRatio(exitRatio)})`);
  if (tooStillWindows.length) {
    console.log(`\n  ${tooStillWindows.length} window(s) read too still (< ${MATCH_FLOOR}x the reference):\n`);
    for (const r of tooStillWindows) console.log(`  - ${r.hint}`);
  }
  if (tooBusyWindows.length) {
    console.log(`\n  ${tooBusyWindows.length} window(s) read too busy (> ${BUSY_CEIL}x the reference):\n`);
    for (const r of tooBusyWindows) console.log(`  - ${r.hint}`);
  }
  if (peakRatio < MATCH_FLOOR) console.log(`\n  peak speed fails required motion match: ${describeRatio(peakRatio)}.`);
  if (exitRatio < MATCH_FLOOR) console.log(`  exit speed fails required motion match: ${describeRatio(exitRatio)}.`);
  console.log(`\n  ${ok ? '✓ passes required motion match.' : '✗ fails required motion match.'}`);
  return ok;
}

function runSheetCheck(refFile, filmFile, filmArg) {
  if (!fs.existsSync(refFile)) die(`no such file: ${refFile}`);
  if (!fs.existsSync(filmFile)) die(`no such file: ${filmFile}`);
  const refSheet = JSON.parse(fs.readFileSync(refFile, 'utf8'));
  const filmSheet = JSON.parse(fs.readFileSync(filmFile, 'utf8'));
  const result = sheetCheck(refSheet, filmSheet);
  const { rows, tooStillWindows, tooBusyWindows, ok, peakRatio, exitRatio } = result;
  if (!rows.length) die(`no overlapping curve windows between ${refFile} and ${filmFile} (missing "curve"?)`);
  printSheetCheck(result, path.basename(refFile), path.basename(filmFile));

  if (filmArg) {
    writeReceipt('motion-match', filmArg, {
      ok, tooStillCount: tooStillWindows.length, tooBusyCount: tooBusyWindows.length,
      tooStillWindows: tooStillWindows.map((r) => ({ t0: r.t0, t1: r.t1, hint: r.hint })),
      tooBusyWindows: tooBusyWindows.map((r) => ({ t0: r.t0, t1: r.t1, hint: r.hint })),
      peakRatio, exitRatio, ref: refFile, film: filmFile,
    });
  }
  if (!ok) process.exitCode = 1;
}

// ── --dom: read a film's motion straight from the DOM, no video, no screenshot per sample ────────────
// Loads `html` once (preview-server.mjs's own openPreview, the same loader every other check in this
// file uses), then SEEKS every `document.getAnimations()` (the Web
// Animations API this repo's `element.animate()` scenes already use) by setting `currentTime`, reading
// each tracked element's box/opacity straight from the live page: 30x/s costs one page.evaluate call
// each, not a screenshot decode. Also captures screenshots at the --compare cadence (4/s) into the same
// side-by-side style grid via tileInGrids, without spinning up a second page or a second browser.
async function domSample(page, ids, t) {
  return page.evaluate((ms, trackedIds) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
    // Looked up by `data-see-track`, not `id`: most animated elements in a real authored page (a
    // per-letter/word span, a particle, an icon wrapper) carry a class, never an id, so tracking only
    // `document.getAnimations()` targets that HAPPEN to have one misses almost everything real pages
    // animate. `sampleDomMotion`'s own setup pass tags every target with this attribute once, using its
    // real id when it has one so this stays a superset of the old id-only behaviour, never a narrower one.
    return trackedIds.map((id) => {
      const el = document.querySelector(`[data-see-track="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const opacity = Number(getComputedStyle(el).opacity);
      return { id, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, opacity };
    });
  }, t * 1000, ids);
}

// `area`: at each sample, the tracked elements' own box area (summed, uncapped at the frame) as a
// fraction of the viewport. Not "how much moved" (`energy` already answers that) but "how much of the
// frame the moving elements occupy" - the number required-motion-match's hint needs to say a fix is
// "enlarge the moving area" rather than only "speed it up".
function domCurveAndEvents(samples, ids, frameArea) {
  const perElement = new Map(ids.map((id) => [id, []]));
  for (const s of samples) {
    for (const row of s.boxes) {
      if (row) perElement.get(row.id).push({ t: s.t, x: row.x, y: row.y, opacity: row.opacity });
    }
  }
  const energy = [];
  const area = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    let total = 0;
    for (const id of ids) {
      const a = samples[i - 1].boxes.find((b) => b?.id === id);
      const b = samples[i].boxes.find((b2) => b2?.id === id);
      if (!a || !b) continue;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      total += (dist / (dt || 1)) * Math.max(a.opacity, b.opacity);
    }
    energy.push({ t: samples[i].t, v: total });
    const visibleArea = samples[i].boxes.reduce((sum, b) => sum + (b && b.opacity > 0.05 ? b.w * b.h : 0), 0);
    area.push({ t: samples[i].t, v: frameArea > 0 ? visibleArea / frameArea : 0 });
  }
  const VISIBLE = 0.05;
  const events = [];
  for (const [id, pts] of perElement) {
    let wasVisible = false;
    for (const p of pts) {
      const visible = p.opacity > VISIBLE;
      if (visible && !wasVisible) events.push({ id, type: 'appear', t: Number(p.t.toFixed(2)) });
      if (!visible && wasVisible) events.push({ id, type: 'leave', t: Number(p.t.toFixed(2)) });
      wasVisible = visible;
    }
  }
  return { energy, area, events: events.sort((a, b) => a.t - b.t) };
}

async function domStillGrid(page, outDir, from, to, w, h) {
  const times = timeRange(from, to, 0.25);
  const longEdge = 1568;
  const tileW = Math.floor(longEdge / 3);
  const tileH = Math.round((tileW * h) / w);
  const cellFiles = [];
  for (const [i, t] of times.entries()) {
    await domSample(page, [], t); // seeks currentTime; ids irrelevant here, only the seek matters
    const raw = path.join(outDir, `.domraw_${i}.png`);
    await page.screenshot({ path: raw });
    const out = path.join(outDir, `.domcell_${i}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-i', raw, '-frames:v', '1', '-vf',
      `scale=${tileW}:${tileH},drawtext=text='${drawtext(`${t.toFixed(2)}s`)}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65`,
      out], out, `dom still ${i}`);
    fs.rmSync(raw, { force: true });
    cellFiles.push(out);
  }
  const gridPaths = tileInGrids(cellFiles, outDir, 'dom-still', tileW, tileH, 9);
  for (const f of cellFiles) fs.rmSync(f, { force: true });
  return gridPaths;
}

// Boots `htmlPath`, resolves its tracked element ids and window, and samples domSample() across it at
// `fps`, bucketed to 0.5s windows: `{energy, area}`-curved, plus raw events. The one path both `--dom`
// and the reference-required-motion-match check sample through, so a page's ids/window/box-reading are
// resolved exactly once per caller, never twice.
async function sampleDomMotion(page, url, opts) {
  const { from: fromArg, to: toArg, fps: domFps, w, h, ids: idsArg } = opts;
  await page.goto(url, { waitUntil: 'load' });
  const info = await page.evaluate(() => {
    const durMeta = document.querySelector('meta[name="duration"]');
    const anims = document.getAnimations();
    // Tag EVERY animation target with `data-see-track`, using its real id when it has one, a
    // synthetic `_N` otherwise: most animated elements on a real authored page (a per-letter span, a
    // particle, an icon wrapper) carry a class, never an id, so tracking id'd elements only would miss
    // almost everything such a page actually moves.
    const targets = [...new Set(anims.map((a) => a.effect && a.effect.target).filter(Boolean))];
    const ids = targets.map((el, i) => {
      const key = el.id || `_${i}`;
      el.setAttribute('data-see-track', key);
      return key;
    });
    const maxEndMs = anims.reduce((m, a) => {
      const timing = a.effect.getComputedTiming();
      return Math.max(m, (timing.delay || 0) + (timing.duration || 0) * (timing.iterations || 1));
    }, 0);
    return { durationS: durMeta ? Number(durMeta.content) : null, ids, maxEndMs, animCount: anims.length };
  });
  if (!info.animCount) die(`${htmlPath} has no document.getAnimations() (no element.animate() calls ran).`);

  const ids = idsArg || info.ids;
  const to = toArg != null ? toArg : (info.durationS != null ? info.durationS : info.maxEndMs / 1000);
  if (!(to > fromArg)) die(`--dom: bad window ${fromArg}-${to}`);

  const times = timeRange(fromArg, to, 1 / domFps);
  const samples = [];
  for (const t of times) samples.push({ t, boxes: await domSample(page, ids, t) });
  const { energy, area, events } = domCurveAndEvents(samples, ids, w * h);
  const energyCurve = bucketMean(energy, fromArg, to, 0.5);
  const areaCurve = bucketMean(area, fromArg, to, 0.5);
  const curve = energyCurve.map((wnd, i) => ({
    t0: Number(wnd.t0.toFixed(2)), t1: Number(wnd.t1.toFixed(2)),
    mean: Number(wnd.mean.toFixed(3)), area: Number((areaCurve[i]?.mean ?? 0).toFixed(3)),
  }));
  return { ids, from: fromArg, to, curve, events };
}

async function runDom(htmlPath, outDirRoot, opts) {
  const { fps: domFps, w, h } = opts;
  const { page, url, close } = await openPreview(htmlPath, { width: w, height: h });
  try {
    const { ids, from, to, curve, events } = await sampleDomMotion(page, url, opts);

    const outDir = path.join(outDirRoot, 'dom');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const gridPaths = await domStillGrid(page, outDir, from, to, w, h);

    const sheet = { html: htmlPath, from, to, fps: domFps, ids, events, curve };
    writeJsonAtomic(path.join(outDir, 'motion.json'), sheet);

    console.log(`\n  DOM · ${path.basename(htmlPath)}, ${from}-${to}s, ${ids.length} tracked element(s)\n`);
    for (const c of curve) console.log(`  ${c.t0.toFixed(2)}-${c.t1.toFixed(2)}s  ${c.mean.toFixed(2)}`);
    console.log(`\n  ${events.length} event(s): ${events.map((e) => `${e.id} ${e.type}@${e.t}s`).join(', ') || 'none'}`);
    console.log(`  ✓ wrote ${path.relative(ROOT, path.join(outDir, 'motion.json'))}, ${gridPaths.length} still grid(s)`);
  } finally {
    await close();
  }
}

// ── --dom --ref <mp4>: required-motion-match on a BARE HTML PAGE, no scene.json, no wiring into a
// film first. A recreation agent authors the fragment before it is ever wired in; this renders it with
// harness/media/render-page.mjs (item 4's own batched, reliable HTML-page renderer: write-then-rename,
// fails loudly, one ffmpeg pass) into a scratch mp4, then hands both mp4s to the SAME runCompare() the
// post-draft loop already runs on a scene's own draft. A DOM-sampled curve (this file's --dom) reads in
// px/s; a video's own pixel-energy curve reads in a wholly different unit (0-255 frame-diff intensity):
// diffing one against the other produced a ratio in the THOUSANDS, meaningless noise, not a hint. Two
// curves of the SAME unit (pixel energy, both from a real render) is the one comparison that means
// anything, so this never invents a second one.
//
// `from`/`to` window the check to one slice instead of the whole page (a draft's whole point:
// iteration speed, not full-length fidelity). The reference is cut to the SAME window before compare
// (`runCompare`'s own from/to assumes both sides start at the same origin; the page render starts its
// mp4 at 0 regardless of `from`, so the reference is re-cut to 0-relative too, never left absolute).
// `--final` ignores any window and renders full length, matching what `make ship` will actually cut.
// A --final pass's own render already IS the shippable cut (full size, full length, real blur): the
// path this persists to once every check passes, next to the page, so `make next PAGE= REF= FINAL=1`
// is both the check and the one render an agent would otherwise run again by hand right after.
function finalOutputFor(htmlPath) {
  const base = path.basename(htmlPath).replace(/\.[^.]+$/, '');
  return path.join(path.dirname(htmlPath), `${base}.mp4`);
}

async function runRequiredMotionMatch(htmlPath, refPath, outDirRoot, opts) {
  if (!fs.existsSync(refPath)) die(`no such --ref file: ${refPath}`);
  const finalOut = opts.final ? finalOutputFor(htmlPath) : null;
  // Nothing changed since the last passing FINAL: the stamp (keyed on the page's own content hash) is
  // still fresh AND the render it produced is still on disk, so re-running ffmpeg buys nothing.
  if (opts.final && motionStampFresh(htmlPath) && fs.existsSync(finalOut)) {
    console.log(`✓ ${finalOut}: already verified and rendered for this page's current content, skipping.`);
    return;
  }
  const refP = probeVideo(refPath);
  const from = opts.final ? 0 : (opts.from || 0);
  const to = opts.final ? refP.dur : (opts.to != null ? opts.to : refP.dur);
  if (!(to > from)) die(`--dom --ref: bad window ${from}-${to}`);
  const windowed = from > 0 || to < refP.dur;

  const outDir = path.join(outDirRoot, 'required-motion');
  fs.mkdirSync(outDir, { recursive: true });
  const tmpMp4 = path.join(outDir, `.page-render-${process.pid}.mp4`);
  const refWindow = windowed ? path.join(outDir, `.ref-window-${process.pid}.mp4`) : refPath;
  try {
    const { renderPage, readPageMeta } = await import('./render-page.mjs');
    const authoringFps = Number(readPageMeta(htmlPath, 'fps')) || 30;
    if (opts.final) console.log(`  rendering FINAL ${htmlPath} (foreground, one pass)...`);
    await renderPage(htmlPath, tmpMp4, {
      fps: authoringFps, w: opts.w, h: opts.h, blur: opts.blur, from, durArg: to - from, progress: opts.final,
    });
    if (windowed) {
      ffmpegOrDie(['-v', 'error', '-y', '-i', refPath, '-ss', String(from), '-to', String(to),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', refWindow], refWindow, 'ref window slice');
    }
    // Unlike a bare `--compare` (report-only, this repo's own house rule), a bare-page check has no
    // film/post-draft step wrapping it to refuse the ship on its behalf, so THIS is the one place that
    // must actually fail the process: a recreation agent running this standalone needs a non-zero exit.
    const { ok } = runCompare(refWindow, tmpMp4, outDirRoot, 0, to - from, opts.filmArg, opts.words);
    const textOk = await runTextScaleCheck(htmlPath, refWindow, outDirRoot, { from, windowDur: to - from, w: opts.w, h: opts.h });
    if (!ok || !textOk) process.exitCode = 1;
    else {
      // A pass (motion AND text-scale/placement) stamps the PAGE'S CURRENT content hash
      // (harness/lib/motion-stamp.mjs), so render-page.mjs can refuse a FINAL render for a page never
      // checked since its last edit, without re-running ffmpeg.
      writeMotionStamp(htmlPath);
      if (opts.final) {
        fs.copyFileSync(tmpMp4, finalOut);
        console.log(`✓ ${finalOut}`);
      }
    }
  } finally {
    fs.rmSync(tmpMp4, { force: true });
    if (windowed) fs.rmSync(refWindow, { force: true });
  }
}

// ── text-scale/placement: does the page's on-screen text match the reference's SCALE and PLACEMENT,
// never its glyphs (a recreation writes its own words on purpose, so comparing text CONTENT is the
// wrong check)? Buckets the reference's OCR word boxes (ocrWords, now carrying box geometry) and the
// page's own DOM text boxes (domTextBoxes) into the SAME 0.5s windows runCompare already uses for
// motion, and flags a window where the two disagree by more than TEXT_SCALE_TOLERANCE on height, width,
// or either centre axis: a headline typeset at the reference's own timing but the wrong size, or sitting
// in the wrong place, reads exactly as broken as one moving at the wrong speed, and nothing before this
// ever compared type at all.
export const TEXT_SCALE_TOLERANCE = 0.2;

// Reads text geometry off the actual rendered GLYPH rects (Range.getClientRects() on every visible text
// node), never off a container element's own box: a hand-authored headline is usually built from many
// nested per-letter/per-word spans (this repo's own typing effect included) inside a background/stage
// wrapper that is itself sized to the full frame (`inset:0`), so a container-based box either fragments
// into one box per glyph or, worse, inherits the wrapper's full-frame size and says nothing. Clustering
// glyph rects by vertical proximity into "lines" mirrors exactly what an OCR pass reads a text line as
// (tesseract's own box), regardless of how the DOM built it.
export async function domTextBoxes(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const isVisible = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.textContent.trim() && node.parentElement && isVisible(node.parentElement)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const glyphRects = [];
    let node;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) glyphRects.push(r);
    }
    const lines = [];
    for (const r of glyphRects.sort((a, b) => (a.top + a.height / 2) - (b.top + b.height / 2))) {
      const cy = r.top + r.height / 2;
      const line = lines.find((l) => Math.abs(l.cy - cy) < r.height / 2 + 4);
      if (line) { line.rects.push(r); line.cy = (line.cy * (line.rects.length - 1) + cy) / line.rects.length; }
      else lines.push({ cy, rects: [r] });
    }
    return lines.map((line) => {
      const left = Math.min(...line.rects.map((r) => r.left)), right = Math.max(...line.rects.map((r) => r.right));
      const top = Math.min(...line.rects.map((r) => r.top)), bottom = Math.max(...line.rects.map((r) => r.bottom));
      return { hFrac: (bottom - top) / vh, wFrac: (right - left) / vw,
        cxFrac: (left + right) / 2 / vw, cyFrac: (top + bottom) / 2 / vh };
    }).filter((b) => b.hFrac > 0 && b.wFrac > 0);
  });
}

// The single largest box in a set, by area: the most prominent text on screen at that instant, the one
// a viewer's eye actually lands on, not an average across every caption and label sharing the frame.
function biggestBox(boxes) {
  return boxes.reduce((best, b) => (!best || b.hFrac * b.wFrac > best.hFrac * best.wFrac ? b : best), null);
}

// One line per mismatched window, built from the numbers this run measured: never canned text, same
// discipline windowHint/busyHint already follow.
function textScaleHint(row) {
  const refPct = Math.round(row.ref.hFrac * 100), filmPct = Math.round(row.film.hFrac * 100);
  const centreDelta = Math.round((row.film.cyFrac - row.ref.cyFrac) * 100);
  const vDir = centreDelta === 0 ? '' : centreDelta > 0 ? `, ${Math.abs(centreDelta)}% lower` : `, ${Math.abs(centreDelta)}% higher`;
  return `${row.t0.toFixed(1)}-${row.t1.toFixed(1)}s: reference text ${refPct}% of frame height centred; yours ${filmPct}%${vDir}.`;
}

// The sample nearest a given instant, from a word's `samples` list (or its single averaged `box` when
// no per-sample list exists, e.g. an older sheet or a hand-built test fixture): the one lookup every
// window below uses, so "closest sample" is defined once, not re-picked per caller.
function boxAtMoment(word, t) {
  if (!word.samples || !word.samples.length) return word.box;
  let best = word.samples[0];
  for (const s of word.samples) if (Math.abs(s.t - t) < Math.abs(best.t - t)) best = s;
  return best.box;
}

// textScaleCheck(refWords, filmBoxesByWindow, windows) -> {rows, mismatched, ok}. `refWords` is
// ocrWords()'s own return (each word carries `tIn`/`tOut` and `samples`); `filmBoxesByWindow` maps each
// window's `t0` to the DOM text boxes sampled at that window's midpoint.
//
// A word is compared in EVERY window it is visible during (`tIn <= t1 && tOut >= t0`), each time at the
// SAMPLE NEAREST THAT WINDOW'S OWN MIDPOINT, the same instant the film side was sampled at
// (runTextScaleCheck seeks the page to `(t0+t1)/2` before reading its DOM box). Comparing a word's box
// AVERAGED OVER ITS WHOLE ON-SCREEN RUN against the film's box AT ONE INSTANT is a unit mismatch, not a
// bug in the film: a headline that grows from 0 to full size over 1s averages to roughly HALF its
// settled height, so a film that renders it correctly at full size reads as "too big" the moment its own
// run has finished growing. Matching moments, not averaging spans, is the fix.
//
// Pure and framework-free on purpose, so a test can prove it against literal boxes with no browser and
// no OCR.
export function textScaleCheck(refWords, filmBoxesByWindow, windows) {
  const rows = [];
  for (const w of windows) {
    const tMid = (w.t0 + w.t1) / 2;
    const visible = refWords.filter((word) => word.tIn <= w.t1 && (word.tOut ?? word.tIn) >= w.t0);
    const refBox = biggestBox(visible.map((word) => boxAtMoment(word, tMid)));
    const filmBox = biggestBox(filmBoxesByWindow.get(w.t0) || []);
    if (!refBox || !filmBox) continue;
    const hDiff = Math.abs(filmBox.hFrac - refBox.hFrac) / Math.max(refBox.hFrac, 1e-6);
    const wDiff = Math.abs(filmBox.wFrac - refBox.wFrac) / Math.max(refBox.wFrac, 1e-6);
    const cxDiff = Math.abs(filmBox.cxFrac - refBox.cxFrac);
    const cyDiff = Math.abs(filmBox.cyFrac - refBox.cyFrac);
    const mismatch = hDiff > TEXT_SCALE_TOLERANCE || wDiff > TEXT_SCALE_TOLERANCE
      || cxDiff > TEXT_SCALE_TOLERANCE || cyDiff > TEXT_SCALE_TOLERANCE;
    const row = { t0: w.t0, t1: w.t1, ref: refBox, film: filmBox, hDiff, wDiff, cxDiff, cyDiff, mismatch };
    rows.push({ ...row, hint: mismatch ? textScaleHint(row) : null });
  }
  const mismatched = rows.filter((r) => r.mismatch);
  return { rows, mismatched, ok: mismatched.length === 0 };
}

// Drives textScaleCheck for a live page against a live (already windowed) reference clip: OCR's the
// reference once, samples the page's own DOM text boxes at each window's midpoint (seekPage, the same
// seek --probe/--look/--layout already share), then prints and returns `ok`. Skips, never fails, when
// tesseract is not on PATH, the same house rule the full `see` flow already applies.
async function runTextScaleCheck(htmlPath, refWindowPath, outDirRoot, { from, windowDur, w, h }) {
  if (spawnSync('tesseract', ['-version'], { encoding: 'utf8' }).error) {
    console.log('\n  (skipping text-scale/placement check: tesseract not on PATH)');
    return true;
  }
  const outDir = path.join(outDirRoot, 'required-motion');
  const refWords = ocrWords(refWindowPath, outDir, 4, 60, 3);
  const windows = timeRange(0, windowDur, 0.5).map((t0) => ({ t0, t1: Math.min(windowDur, t0 + 0.5) }));
  const { page, url, close } = await openPreview(htmlPath, { width: w, height: h });
  const filmBoxesByWindow = new Map();
  try {
    await page.goto(url, { waitUntil: 'load' });
    for (const win of windows) {
      await seekPage(page, from + (win.t0 + win.t1) / 2);
      filmBoxesByWindow.set(win.t0, await domTextBoxes(page));
    }
  } finally { await close(); }
  const result = textScaleCheck(refWords, filmBoxesByWindow, windows);
  if (result.mismatched.length) {
    console.log(`\n  ${result.mismatched.length} window(s) fail text-scale/placement match (> ${Math.round(TEXT_SCALE_TOLERANCE * 100)}% off):\n`);
    for (const r of result.mismatched) console.log(`  - ${r.hint}`);
  } else if (result.rows.length) {
    console.log('\n  ✓ text scale and placement matches the reference in every checked window.');
  }
  return result.ok;
}

// ── word events: what a beat table's one line ("words build, hold, fade") cannot say: WHERE each word
// came from, WHEN it settled, whether a highlight travelled across them, and whether a small spinning
// region (a star) was there at all. Runs OCR on BOTH the reference video and a rendered film video,
// never DOM-vs-video (this file's own runRequiredMotionMatch note already lost a session mixing a
// DOM's px/s against a video's pixel-diff energy; two OCR passes on two real renders keeps the units
// the same on both sides).

// Adaptive sample times: dense (native frame rate) while the picture is changing, one sample per hold,
// built from this file's OWN motionDeltaSeries/findHolds/HOLD_FLOOR rather than a second motion signal
// (a perceptual hash would say the same thing, slower, and this repo already owns a frame-diff signal).
// Capped to a minimum gap so a long, constantly-changing span still costs a bounded number of tesseract
// calls, not one per native frame.
const WORD_SAMPLE_MIN_GAP = 0.1;
export function adaptiveSampleTimes(video, from, to) {
  const series = motionDeltaSeries(video).filter((p) => p.t >= from && p.t < to);
  if (!series.length) return [from];
  const holds = findHolds(series, HOLD_FLOOR, HOLD_MIN);
  const changing = series.filter((p) => p.v > HOLD_FLOOR).map((p) => p.t);
  const holdMids = holds.map((h) => (h.t0 + h.t1) / 2);
  const candidates = [...new Set([from, ...changing, ...holdMids, Math.max(from, to - 0.03)])].sort((a, b) => a - b);
  const picked = [];
  for (const t of candidates) if (!picked.length || t - picked[picked.length - 1] >= WORD_SAMPLE_MIN_GAP) picked.push(t);
  return picked;
}

// Native resolution, no downscale: unlike ocrWords' bulk fps-extract (every frame of a whole video,
// where 640px keeps tesseract cheap over hundreds of frames), this only ever pulls the handful of
// stills adaptiveSampleTimes picked, so there is no cost reason to shrink them first, and every reason
// not to: a half-size 960x540 draft render downscaled AGAIN to 640 wide loses exactly the glyph detail
// OCR needs on its own smaller text.
function extractStillFrame(video, t, outPath) {
  ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', outPath],
    outPath, `word-event frame @${t.toFixed(2)}s`);
}

// A frame's mean colour inside one word's box, via ffmpeg's own area-averaging scale filter (a crop
// scaled down to 1x1 IS the crop's average colour): no image-decoding dependency, one subprocess call.
function cropMeanColor(framePath, box, frameW, frameH) {
  const w = Math.max(1, Math.min(frameW, Math.round(box.wFrac * frameW)));
  const h = Math.max(1, Math.min(frameH, Math.round(box.hFrac * frameH)));
  const x = Math.max(0, Math.min(frameW - w, Math.round((box.cxFrac * frameW) - w / 2)));
  const y = Math.max(0, Math.min(frameH - h, Math.round((box.cyFrac * frameH) - h / 2)));
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', framePath, '-vf', `crop=${w}:${h}:${x}:${y},scale=1:1:flags=area`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer' });
  return r.stdout && r.stdout.length >= 3 ? { r: r.stdout[0], g: r.stdout[1], b: r.stdout[2] } : null;
}

// Named, not raw RGB: a travelling highlight in this reference is a blue/white swap, and naming it is
// what lets compareWordEvents say "never changes" in plain words instead of printing three numbers.
function colorName(c) {
  if (!c) return 'unknown';
  if (c.b - c.r > 20 && c.b > 110) return 'blue';
  if (c.r > 190 && c.g > 190 && c.b > 190) return 'white';
  return 'other';
}

function grayBuffer(framePath, w, h) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', framePath, '-vf', `scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-'],
    { encoding: 'buffer' });
  return r.stdout && r.stdout.length >= w * h ? r.stdout : null;
}

function centreDist(a, b) { return Math.hypot(a.cxFrac - b.cxFrac, a.cyFrac - b.cyFrac); }

// Which way a word travelled, in words a person reads, not a signed pixel delta.
function dirFrom(fromBox, toBox) {
  const dx = fromBox.cxFrac - toBox.cxFrac, dy = fromBox.cyFrac - toBox.cyFrac;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'the right' : 'the left';
  return dy > 0 ? 'below' : 'above';
}

const SETTLE_FRAC = 0.02; // centre movement (frame fraction) between samples below which a word counts as stopped
const MOVE_FRAC = 0.08;   // centre movement above which an entrance/exit reads as "moved", not "in place"
const WORD_TRACK_GAP = 0.6; // a text run absent this long before the same word reappears is a second,
                             // separate appearance (a reused hero word), never one continuous track

function buildWordTrack(occ) {
  let settledIdx = occ.length - 1;
  for (let i = 0; i < occ.length; i++) {
    let stillRest = true;
    for (let j = i + 1; j < occ.length; j++) if (centreDist(occ[j].box, occ[j - 1].box) >= SETTLE_FRAC) { stillRest = false; break; }
    if (stillRest) { settledIdx = i; break; }
  }
  const enter = occ[0], settled = occ[settledIdx], last = occ[occ.length - 1];
  const enterDist = centreDist(enter.box, settled.box);
  const tail = occ[Math.max(settledIdx, occ.length - 3)];
  const exitDist = centreDist(tail.box, last.box);
  return {
    text: occ[0].text,
    tIn: Number(occ[0].t.toFixed(2)), tSettled: Number(settled.t.toFixed(2)), tOut: Number(last.t.toFixed(2)),
    movedIn: enterDist >= MOVE_FRAC, enterDir: enterDist >= MOVE_FRAC ? dirFrom(enter.box, settled.box) : null,
    movedOut: exitDist >= MOVE_FRAC,
    sizeIn: Number(enter.box.hFrac.toFixed(3)), sizeSettled: Number(settled.box.hFrac.toFixed(3)),
    colors: occ.map((o) => ({ t: Number(o.t.toFixed(2)), name: o.color })).filter((c) => c.name && c.name !== 'unknown'),
  };
}

// Groups one word's raw per-frame sightings (matched by TEXT, case-insensitive) into tracks, splitting
// on a gap over WORD_TRACK_GAP so a reused hero word (on screen twice, far apart) becomes two tracks.
function trackWords(perFrame) {
  const byKey = new Map();
  for (const f of perFrame) for (const w of f.words) {
    const key = w.text.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ t: f.t, box: w.box, color: w.color, text: w.text });
  }
  const tracks = [];
  for (const occAll0 of byKey.values()) {
    const occAll = occAll0.sort((a, b) => a.t - b.t);
    let run = [occAll[0]];
    for (let i = 1; i < occAll.length; i++) {
      if (occAll[i].t - occAll[i - 1].t > WORD_TRACK_GAP) { tracks.push(buildWordTrack(run)); run = []; }
      run.push(occAll[i]);
    }
    tracks.push(buildWordTrack(run));
  }
  return tracks.sort((a, b) => a.tIn - b.tIn);
}

// ── non-text moving regions: a frame-diff bounding box with any OCR word box MASKED OUT first, so a
// scattering headline never gets read as "a moving region" twice over. A region whose WIDTH oscillates
// (narrows edge-on, widens face-on) reports a half-turn period: the spacing between successive width
// minima, the one number a spinning star needs and nothing else in this file measures.
const REGION_SCALE_W = 128, REGION_SCALE_H = 72;
const REGION_DIFF_THRESHOLD = 24; // 0-255 gray delta, comfortably above encoder noise
const REGION_MIN_PIXELS = 6;      // a scattered handful of hot pixels is noise, not a region
const REGION_JUMP = 0.25;         // centroid jump (frame fraction) between samples that starts a new region track

function maskBoxes(buf, w, h, boxes) {
  const masked = Buffer.from(buf);
  for (const box of boxes) {
    const bw = Math.round(box.wFrac * w) + 2, bh = Math.round(box.hFrac * h) + 2;
    const bx = Math.max(0, Math.round((box.cxFrac * w) - bw / 2)), by = Math.max(0, Math.round((box.cyFrac * h) - bh / 2));
    for (let y = by; y < Math.min(h, by + bh); y++) for (let x = bx; x < Math.min(w, bx + bw); x++) masked[(y * w) + x] = 0;
  }
  return masked;
}

function diffBBox(a, b, w, h) {
  let minX = w, minY = h, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w) + x;
      if (Math.abs(a[i] - b[i]) >= REGION_DIFF_THRESHOLD) {
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (count < REGION_MIN_PIXELS) return null;
  return { cxFrac: (minX + maxX) / 2 / w, cyFrac: (minY + maxY) / 2 / h,
    wFrac: (maxX - minX + 1) / w, hFrac: (maxY - minY + 1) / h, area: count / (w * h) };
}

function buildRegionTrack(samples) {
  const widths = samples.map((s) => s.box.wFrac);
  const minimaT = [];
  for (let i = 1; i < widths.length - 1; i++) if (widths[i] < widths[i - 1] && widths[i] < widths[i + 1]) minimaT.push(samples[i].t);
  const gaps = minimaT.slice(1).map((t, i) => t - minimaT[i]);
  const halfTurn = gaps.length ? Number((gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2)) : null;
  return {
    tIn: Number(samples[0].t.toFixed(2)), tOut: Number(samples[samples.length - 1].t.toFixed(2)),
    area: Number((samples.reduce((s, x) => s + x.box.area, 0) / samples.length).toFixed(3)), halfTurn,
  };
}

function trackRegions(frameFiles, times, wordBoxesByTime) {
  const grays = frameFiles.map((f) => grayBuffer(f, REGION_SCALE_W, REGION_SCALE_H));
  const boxSeries = [];
  for (let i = 1; i < times.length; i++) {
    const a = grays[i - 1], b = grays[i];
    if (!a || !b) continue;
    const boxesHere = [...(wordBoxesByTime.get(times[i - 1]) || []), ...(wordBoxesByTime.get(times[i]) || [])];
    const ma = maskBoxes(a, REGION_SCALE_W, REGION_SCALE_H, boxesHere);
    const mb = maskBoxes(b, REGION_SCALE_W, REGION_SCALE_H, boxesHere);
    const bbox = diffBBox(ma, mb, REGION_SCALE_W, REGION_SCALE_H);
    if (bbox) boxSeries.push({ t: (times[i - 1] + times[i]) / 2, box: bbox });
  }
  const tracks = [];
  let run = [];
  for (const s of boxSeries) {
    if (run.length && centreDist(run[run.length - 1].box, s.box) > REGION_JUMP) { tracks.push(run); run = []; }
    run.push(s);
  }
  if (run.length) tracks.push(run);
  return tracks.filter((r) => r.length >= 2).map(buildRegionTrack);
}

// Extracts a still + OCR + per-word colour at every adaptive sample time, then tracks words and non-text
// regions across them. `outDir` gets a `.word-events` scratch folder, removed before returning.
export function wordEventTracks(video, from, to, outDir) {
  // Clamped to the FILE's own probed duration, not the caller's window end: a windowed clip is cut to
  // ~`to` seconds by ffmpeg's own encoder rounding, so a candidate time sitting right at the caller's
  // `to` can land a hair past the last real frame and make `-ss` return nothing.
  const dur = probeVideo(video).dur;
  const times = adaptiveSampleTimes(video, from, to).map((t) => Math.min(t, dur - 0.05));
  const workDir = path.join(outDir, '.word-events');
  fs.mkdirSync(workDir, { recursive: true });
  const frameFiles = times.map((t, i) => {
    const p = path.join(workDir, `f_${i}.png`);
    extractStillFrame(video, t, p);
    return p;
  });
  const { width: frameW, height: frameH } = pngDims(frameFiles[0]);
  const perFrame = times.map((t, i) => {
    const base = path.join(workDir, `f_${i}`);
    const words = ocrOneFrame(frameFiles[i], base, 60, 3, frameW, frameH)
      .map((w) => ({ ...w, color: colorName(cropMeanColor(frameFiles[i], w.box, frameW, frameH)) }));
    return { t, words };
  });
  const wordBoxesByTime = new Map(perFrame.map((f) => [f.t, f.words.map((w) => w.box)]));
  const words = trackWords(perFrame);
  const regions = trackRegions(frameFiles, times, wordBoxesByTime);
  fs.rmSync(workDir, { recursive: true, force: true });
  return { words, regions, from, to };
}

const ENTER_TIME_TOL = 0.3; // seconds; timing hints below this are noise, not a real beat mismatch
const HALF_TURN_TOL = 0.1;  // seconds; a star's own half-turn period only worth reporting past this gap

// Pairs reference and film words by TEXT (case-insensitive), in temporal order: the nth reference
// occurrence of a word pairs with the nth not-yet-used film occurrence closest to it in time, so two
// repeats of the same word (e.g. "text" used twice) pair the earlier with the earlier.
function pairWords(refWords, filmWords) {
  const byKey = new Map();
  for (const w of filmWords) { const k = w.text.toLowerCase(); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(w); }
  const used = new Set();
  return refWords.map((rw) => {
    const bucket = (byKey.get(rw.text.toLowerCase()) || []).filter((fw) => !used.has(fw));
    if (!bucket.length) return { ref: rw, film: null };
    let best = bucket[0];
    for (const fw of bucket) if (Math.abs(fw.tIn - rw.tIn) < Math.abs(best.tIn - rw.tIn)) best = fw;
    used.add(best);
    return { ref: rw, film: best };
  });
}

// Contiguous 'blue' stretches per word: the raw material for "does the highlight travel word to word,
// or does it never change" (compareWordEvents below), sorted so the FIRST entry is whichever word the
// highlight visits first.
function highlightSpans(words) {
  const spans = [];
  for (const w of words) {
    let start = null;
    for (const c of w.colors) {
      if (c.name === 'blue' && start == null) start = c.t;
      if (c.name !== 'blue' && start != null) { spans.push({ text: w.text, t0: start, t1: c.t }); start = null; }
    }
    if (start != null) spans.push({ text: w.text, t0: start, t1: w.colors[w.colors.length - 1].t });
  }
  return spans.sort((a, b) => a.t0 - b.t0);
}

// The one comparator: reference word/region tracks vs a film's, in plain numbers, worst first. Pure and
// framework-free (no ffmpeg, no OCR call inside it), so a test proves it against literal tracks.
export function compareWordEvents(ref, film) {
  const diffs = [];
  for (const { ref: rw, film: fw } of pairWords(ref.words, film.words)) {
    if (!fw) { diffs.push({ sev: 2, text: `'${rw.text}': present in the reference at ${rw.tIn.toFixed(2)}s, missing from yours.` }); continue; }
    if (rw.movedIn !== fw.movedIn) {
      diffs.push({ sev: 2, text: rw.movedIn
        ? `'${rw.text}': reference enters from ${rw.enterDir} at ${rw.tIn.toFixed(2)}s and settles at ${rw.tSettled.toFixed(2)}s; yours appears in place at ${fw.tIn.toFixed(2)}s.`
        : `'${rw.text}': reference appears in place at ${rw.tIn.toFixed(2)}s; yours enters from ${fw.enterDir} and settles at ${fw.tSettled.toFixed(2)}s.` });
    } else if (rw.movedIn && Math.abs(rw.tSettled - fw.tSettled) > ENTER_TIME_TOL) {
      diffs.push({ sev: 1, text: `'${rw.text}': reference settles at ${rw.tSettled.toFixed(2)}s; yours settles at ${fw.tSettled.toFixed(2)}s.` });
    }
    if (rw.movedOut !== fw.movedOut) {
      diffs.push({ sev: 2, text: `'${rw.text}' exit: reference ${rw.movedOut ? 'moves away' : 'fades in place'} by ${rw.tOut.toFixed(2)}s; `
        + `yours ${fw.movedOut ? 'moves away' : 'fades in place'}.` });
    }
  }

  const refSpans = highlightSpans(ref.words), filmSpans = highlightSpans(film.words);
  const refHitWords = new Set(refSpans.map((s) => s.text)), filmHitWords = new Set(filmSpans.map((s) => s.text));
  if (refHitWords.size > 1 && filmHitWords.size <= 1) {
    diffs.push({ sev: 2, text: `highlight: reference colour moves word to word ${refSpans[0].t0.toFixed(2)}-`
      + `${refSpans[refSpans.length - 1].t1.toFixed(2)}s; yours never changes.` });
  } else if (refHitWords.size > 1 && filmHitWords.size > 1 && Math.abs(refSpans[0].t0 - filmSpans[0].t0) > ENTER_TIME_TOL) {
    diffs.push({ sev: 1, text: `highlight: reference starts travelling at ${refSpans[0].t0.toFixed(2)}s; yours at ${filmSpans[0].t0.toFixed(2)}s.` });
  }

  const refRegions = ref.regions || [], filmRegions = film.regions || [];
  if (refRegions.length && !filmRegions.length) {
    for (const r of refRegions) diffs.push({ sev: 2, text: `star: reference shows a spinning region ${r.tIn.toFixed(2)}-`
      + `${r.tOut.toFixed(2)}s${r.halfTurn ? ` (half-turn ${r.halfTurn.toFixed(2)}s)` : ''}; yours has none.` });
  } else {
    for (let i = 0; i < Math.min(refRegions.length, filmRegions.length); i++) {
      const r = refRegions[i], f = filmRegions[i];
      if (r.halfTurn && f.halfTurn && Math.abs(r.halfTurn - f.halfTurn) > HALF_TURN_TOL)
        diffs.push({ sev: 1, text: `star: reference half-turn ${r.halfTurn.toFixed(2)}s, yours ${f.halfTurn.toFixed(2)}s.` });
    }
  }

  diffs.sort((a, b) => b.sev - a.sev);
  return { diffs: diffs.map((d) => d.text), ok: diffs.length === 0 };
}

// Runs wordEventTracks on both sides and prints compareWordEvents' verdict. Shared by --word-events
// (video vs video) and --dom --ref --words (a rendered page vs its reference, reusing the SAME two mp4s
// runCompare already built rather than rendering a third).
function runWordEventCompare(refVideo, filmVideo, outDir, from, to, label) {
  const refTracks = wordEventTracks(refVideo, from, to, outDir);
  const filmTracks = wordEventTracks(filmVideo, from, to, outDir);
  const { diffs, ok } = compareWordEvents(refTracks, filmTracks);
  console.log(`\n  WORD EVENTS · ${label}, ${from.toFixed(2)}-${to.toFixed(2)}s\n`);
  if (!diffs.length) console.log('  ✓ no per-word differences against the reference.');
  else for (const d of diffs) console.log(`  - ${d}`);
  writeJsonAtomic(path.join(outDir, 'word-events.json'), { from, to, ref: refTracks, film: filmTracks, diffs, ok });
  return ok;
}

// Every animation paused at one shared `currentTime`: the same seek --dom already relies on
// (`document.getAnimations()`), the one owner for "make this page hold still at time t" that --probe,
// --look and --layout all call instead of each inventing its own.
async function seekPage(page, t) {
  return page.evaluate((ms) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } }, t * 1000);
}

// ── --probe: box, opacity, computed transform/filter, and every active animation's progress, for
// every element matching `sel` at one instant. Built because agents kept writing throwaway
// page.evaluate() scripts by hand to answer exactly this (one stalled twice doing it).
async function runProbe(htmlPath, atS, sel, outDir) {
  const { page, url, close } = await openPreview(htmlPath, { width: 1920, height: 1080 });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await seekPage(page, atS);
    const rows = await page.evaluate((selector) => {
      const shortSelInPage = (el) => (el.id ? `#${el.id}` : (el.className && String(el.className).trim() ? `.${String(el.className).split(' ')[0]}` : el.tagName.toLowerCase()));
      // getBoundingClientRect() on an SVG shape (not the root <svg>) is inconsistent across engines
      // once it carries its own rotate/scale, some report the rect of the UNTRANSFORMED bbox translated
      // only by position. getBBox() (the shape's own coordinate space) transformed through
      // getScreenCTM() (that space -> screen pixels, folding in every ancestor SVG and CSS transform)
      // is the one path that is always screen-space and always right; box comes from those two calls
      // on any nested SVG shape, getBoundingClientRect only for the root <svg> and every non-SVG element.
      function screenBox(el) {
        if (el instanceof SVGGraphicsElement && el.ownerSVGElement && el.getBBox && el.getScreenCTM) {
          const bbox = el.getBBox();
          const ctm = el.getScreenCTM();
          if (ctm) {
            const corners = [[bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y], [bbox.x, bbox.y + bbox.height], [bbox.x + bbox.width, bbox.y + bbox.height]]
              .map(([px, py]) => ({ x: ctm.a * px + ctm.c * py + ctm.e, y: ctm.b * px + ctm.d * py + ctm.f }));
            const xs = corners.map((p) => p.x), ys = corners.map((p) => p.y);
            const x = Math.min(...xs), y = Math.min(...ys);
            return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
          }
        }
        return el.getBoundingClientRect();
      }
      return [...document.querySelectorAll(selector)].map((el) => {
        const r = screenBox(el);
        const cs = getComputedStyle(el);
        const anims = document.getAnimations().filter((a) => a.effect && a.effect.target === el).map((a) => {
          const t = a.effect.getComputedTiming();
          return { id: a.id || null, playState: a.playState, progress: t.progress, localTimeMs: t.localTime };
        });
        return {
          sel: shortSelInPage(el),
          box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          opacity: Number(cs.opacity), transform: cs.transform === 'none' ? null : cs.transform,
          filter: cs.filter === 'none' ? null : cs.filter, animations: anims,
        };
      });
    }, sel);
    if (!rows.length) die(`--probe: no element matched "${sel}" in ${htmlPath}`);
    fs.mkdirSync(outDir, { recursive: true });
    writeJsonAtomic(path.join(outDir, 'probe.json'), { html: htmlPath, at: atS, sel, rows });
    console.log(`\n  PROBE · ${path.basename(htmlPath)} @ ${atS}s, sel "${sel}"\n`);
    for (const row of rows) {
      console.log(`  ${row.sel}  box(${row.box.x},${row.box.y} ${row.box.w}x${row.box.h})  opacity ${row.opacity.toFixed(2)}`);
      if (row.transform) console.log(`    transform: ${row.transform}`);
      if (row.filter) console.log(`    filter: ${row.filter}`);
      for (const a of row.animations)
        console.log(`    animation${a.id ? ` "${a.id}"` : ''}: ${a.playState}, progress ${a.progress == null ? 'n/a' : a.progress.toFixed(3)}`);
      if (!row.animations.length) console.log('    (no active animation on this element)');
    }
    console.log(`\n  ✓ wrote ${path.relative(ROOT, path.join(outDir, 'probe.json'))}`);
  } finally { await close(); }
}

// ── --look: a still per requested time, gridded, optionally paired against the reference at the same
// timestamps. Built because 0 of 7 agents made a still frame before touching motion; layout faults
// then surfaced only after a full render.
async function runLook(htmlPath, times, refPath, outDir) {
  const { page, url, close } = await openPreview(htmlPath, { width: 1920, height: 1080 });
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const longEdge = 1568;
  const tileW = Math.floor(longEdge / 3);
  const tileH = Math.round((tileW * 1080) / 1920);
  try {
    await page.goto(url, { waitUntil: 'load' });
    const cellFiles = [];
    for (const [i, t] of times.entries()) {
      await seekPage(page, t);
      const raw = path.join(outDir, `.raw_${i}.png`);
      await page.screenshot({ path: raw });
      const pageCell = path.join(outDir, `.page_${i}.png`);
      ffmpegOrDie(['-v', 'error', '-y', '-i', raw, '-frames:v', '1', '-vf',
        `scale=${tileW}:${tileH},drawtext=text='${drawtext(`page ${t.toFixed(2)}s`)}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65`,
        pageCell], pageCell, `look page cell ${i}`);
      fs.rmSync(raw, { force: true });
      if (!refPath) { cellFiles.push(pageCell); continue; }
      const refCell = path.join(outDir, `.ref_${i}.png`);
      ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', refPath, '-frames:v', '1', '-vf',
        `scale=${tileW}:${tileH},drawtext=text='${drawtext(`ref ${t.toFixed(2)}s`)}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65`,
        refCell], refCell, `look ref cell ${i}`);
      const pairOut = path.join(outDir, `.pair_${i}.png`);
      stackImages([refCell, pageCell], pairOut, 'v', tileW, tileH * 2);
      fs.rmSync(refCell, { force: true }); fs.rmSync(pageCell, { force: true });
      cellFiles.push(pairOut);
    }
    const cellH = refPath ? tileH * 2 : tileH;
    const gridPaths = tileInGrids(cellFiles, outDir, 'look', tileW, cellH, 9);
    for (const f of cellFiles) fs.rmSync(f, { force: true });
    const index = `# see --look: ${path.basename(htmlPath)}

${times.length} still(s) at ${times.map((t) => `${t}s`).join(', ')}${refPath ? `, paired with ${path.basename(refPath)} at the same timestamps (ref top, page bottom)` : ''}.

## Grids

${gridPaths.map((p) => `- ${path.relative(ROOT, p)}`).join('\n')}
`;
    fs.writeFileSync(path.join(outDir, 'index.md'), index);
    console.log(`✓ look: ${gridPaths.length} grid(s) -> ${path.relative(ROOT, path.join(outDir, 'index.md'))}`);
  } finally { await close(); }
}

// ── --layout: clipped/overflowing text, text overlapping text, off-frame elements, and two opaque
// full-frame shots visible at once, read straight off the DOM at each requested time. Built because
// one agent lost 8 minutes to a blanket `position:absolute`, another lost most of a session to two
// stacked full-frame shots showing the wrong background, neither caught until the render came back.
// One check per job, called from the single page.evaluate below (one round trip). Nested so each
// keeps its own low complexity instead of one long function carrying the whole rule set.
async function domLayoutFindings(page) {
  return page.evaluate(() => {
    // Only when the box actually HIDES the overflow: an auto-sized span whose scrollWidth reads a
    // hair over its clientWidth (subpixel rounding, common on single-letter spans) shows nothing
    // clipped at all unless overflow is set to hide or clip it.
    function clippedTextFindings(textEls, shortSelInPage) {
      const findings = [];
      for (const el of textEls) {
        const cs = getComputedStyle(el);
        const clips = cs.overflow === 'hidden' || cs.overflow === 'clip' || cs.overflowX === 'hidden' || cs.overflowX === 'clip';
        if (clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1))
          findings.push({ kind: 'clipped-text', sel: shortSelInPage(el), text: el.textContent.trim().slice(0, 40) });
      }
      return findings;
    }

    function offFrameFindings(all, vw, vh, shortSelInPage) {
      const offFrame = (r) => r.width > 0 && r.height > 0 && (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh);
      return all.filter((el) => offFrame(el.getBoundingClientRect())).map((el) => ({ kind: 'off-frame', sel: shortSelInPage(el) }));
    }

    function textOverlapFindings(textEls) {
      const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const findings = [];
      for (let i = 0; i < textEls.length; i++) {
        for (let j = i + 1; j < textEls.length; j++) {
          const a = textEls[i], b = textEls[j];
          if (a.contains(b) || b.contains(a)) continue;
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          const areaA = ra.width * ra.height, areaB = rb.width * rb.height;
          if (areaA && areaB && overlapArea(ra, rb) / Math.min(areaA, areaB) > 0.25)
            findings.push({ kind: 'text-overlap', a: a.textContent.trim().slice(0, 30), b: b.textContent.trim().slice(0, 30) });
        }
      }
      return findings;
    }

    // "Opaque" means it actually PAINTS a near-full-frame surface (a solid background-color, or an
    // image/video), not merely CSS `opacity:1`: a bare positioning wrapper is opacity:1 and paints
    // nothing, and a decorative radial-gradient background is meant to layer under other art. Neither
    // is the "two full-frame shots hiding one another" failure this check exists for.
    // ponytail: does not account for `clip-path`, so a fully clipped full-frame layer (a wipe parked
    // at zero width) can still read as stacked; check the grid if this fires oddly.
    function stackedOpaqueFindings(all, vw, vh, shortSelInPage) {
      const frameArea = vw * vh;
      const paintsSolid = (el) => {
        const cs = getComputedStyle(el);
        if (['IMG', 'VIDEO', 'CANVAS'].includes(el.tagName)) return true;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return false;
        const m = /rgba?\([^)]*?(?:,\s*([\d.]+)\s*)?\)/.exec(cs.backgroundColor);
        const alpha = m && m[1] !== undefined ? Number(m[1]) : (cs.backgroundColor && cs.backgroundColor !== 'transparent' ? 1 : 0);
        return alpha >= 0.95;
      };
      const fullFrame = all.filter((el) => {
        const r = el.getBoundingClientRect();
        return Number(getComputedStyle(el).opacity) >= 0.95 && r.width * r.height >= frameArea * 0.9 && paintsSolid(el);
      });
      const findings = [];
      for (let i = 0; i < fullFrame.length; i++) {
        for (let j = i + 1; j < fullFrame.length; j++) {
          const a = fullFrame[i], b = fullFrame[j];
          if (!a.contains(b) && !b.contains(a)) findings.push({ kind: 'stacked-opaque', a: shortSelInPage(a), b: shortSelInPage(b) });
        }
      }
      return findings;
    }

    const vw = window.innerWidth, vh = window.innerHeight;
    const shortSelInPage = (el) => (el.id ? `#${el.id}` : (el.className && String(el.className).trim() ? `.${String(el.className).split(' ')[0]}` : el.tagName.toLowerCase()));
    const isVisible = (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
    };
    const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    const all = [...document.querySelectorAll('body *')].filter(isVisible);
    const textEls = all.filter(hasOwnText);
    return [
      ...clippedTextFindings(textEls, shortSelInPage),
      ...offFrameFindings(all, vw, vh, shortSelInPage),
      ...textOverlapFindings(textEls),
      ...stackedOpaqueFindings(all, vw, vh, shortSelInPage),
    ];
  });
}

async function runLayout(htmlPath, times, outDir, filmArg) {
  const { page, url, close } = await openPreview(htmlPath, { width: 1920, height: 1080 });
  fs.mkdirSync(outDir, { recursive: true });
  try {
    await page.goto(url, { waitUntil: 'load' });
    const perTime = [];
    for (const t of times) { await seekPage(page, t); perTime.push({ t, findings: await domLayoutFindings(page) }); }
    const total = perTime.reduce((n, p) => n + p.findings.length, 0);
    writeJsonAtomic(path.join(outDir, 'layout.json'), { html: htmlPath, times, perTime, faultCount: total });

    const lines = [`# see --layout: ${path.basename(htmlPath)}`, '', `${times.length} time(s) checked, ${total} fault(s).`, ''];
    for (const p of perTime) {
      lines.push(`## t=${p.t}s`);
      lines.push(...(p.findings.length ? p.findings.map((f) => `- ${f.kind}: ${JSON.stringify(f)}`) : ['- clean']));
      lines.push('');
    }
    fs.writeFileSync(path.join(outDir, 'layout.md'), lines.join('\n'));

    console.log(`\n  LAYOUT · ${path.basename(htmlPath)}, ${times.length} time(s)\n`);
    for (const p of perTime)
      console.log(`  t=${p.t}s: ${p.findings.length} fault(s)${p.findings.length ? ` -> ${p.findings.map((f) => f.kind).join(', ')}` : ''}`);
    console.log(`\n  ✓ wrote ${path.relative(ROOT, path.join(outDir, 'layout.md'))}`);

    if (filmArg) writeReceipt('layout', filmArg, { ok: total === 0, faultCount: total, html: htmlPath, times });
  } finally { await close(); }
}

function writeOutputs({ outDir, video, dur, fps, cutTimes, energy, holds, beats, gridPaths }) {
  const motion = {
    dur: Number(dur.toFixed(2)), fps: Number(fps.toFixed(3)),
    cuts: cutTimes.map((t) => Number(t.toFixed(2))),
    energy: { fps: ENERGY_HZ, values: energy.map((p) => p.v) },
    holds: holds.map((h) => ({ t0: Number(h.t0.toFixed(2)), t1: Number(h.t1.toFixed(2)) })),
    beats,
  };
  writeJsonAtomic(path.join(outDir, 'motion.json'), motion);

  const tokenEstimate = gridPaths.length * 1568 + 400;
  const beatRows = beats.map((b) => {
    const hs = holds.filter((h) => h.t0 >= b.t0 && h.t1 <= b.t1)
      .map((h) => `${h.t0.toFixed(1)}-${h.t1.toFixed(1)}`).join(', ') || '-';
    const ws = b.words.map((w) => `"${w.text}"@${w.tIn}s`).join(', ') || '-';
    return `| ${b.t0}-${b.t1} | ${b.meanSpeed} | ${b.peak} | ${b.changeRate} | ${b.exitEntryRatio ?? '-'} | ${b.ease ?? '-'} (rmse ${b.easeRmse ?? '-'}) | ${hs} | ${ws} |`;
  }).join('\n');

  const index = `# see: ${path.basename(video)}

${dur.toFixed(1)}s, ${fps.toFixed(1)}fps, ${cutTimes.length} cut(s), ${holds.length} hold(s).

## Beats

| span (s) | mean speed | peak speed | change rate | exit:entrance | ease | holds | OCR words |
|---|---|---|---|---|---|---|---|
${beatRows}

## Grids

${gridPaths.map((p) => `- ${path.relative(ROOT, p)}`).join('\n')}

Panels are chronological, left to right, top to bottom.

Token estimate: ${gridPaths.length} grid(s) x ~1568 + text ≈ ${tokenEstimate} tokens.

OCR is a hint (tesseract on downscaled frames, words >=3 chars, conf >=60): it can miss or garble
text. The grids are the truth; look at them before trusting a beat's word list.
`;
  fs.writeFileSync(path.join(outDir, 'index.md'), index);
  console.log(`✓ see: ${beats.length} beat(s), ${gridPaths.length} grid(s), ~${tokenEstimate} tokens -> ${path.relative(ROOT, outDir)}/index.md`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));

  // --sheet-check needs no video and no ffmpeg: pure JSON-to-JSON, <1s.
  if (argv.includes('--sheet-check')) {
    const [refFile, filmFile] = positional;
    if (!refFile || !filmFile)
      die('usage: node harness/media/see.mjs --sheet-check <ref-sheet.json> <film-sheet.json> [--film <film.json>]');
    return runSheetCheck(refFile, filmFile, flag('--film', null));
  }

  const video = positional[0];

  if (!video) die('usage: node harness/media/see.mjs <video> [outDir] [--frames N] '
    + '| --shot <from>-<to> [--fps N] [--page <html>] | --compare <draft.mp4> [--from s --to s] [--words] '
    + '| --dom [<html>] [--from s --to s] [--dom-fps N] [--ids a,b,c] '
    + '[--ref <mp4> [--film <f.json>] [--final] [--w N --h N] [--blur N] [--words]] '
    + '| --word-events <film.mp4> [--from s --to s] '
    + '| --sheet-check <ref.json> <film.json> [--film <f.json>] '
    + '| --probe --at <s> --sel <css> | --look --times <s,...> [--ref <mp4>] | --layout --times <s,...> [--film <f.json>]');
  if (!fs.existsSync(video)) die(`no such file: ${video}`);
  for (const bin of ['ffprobe', 'ffmpeg']) {
    if (spawnSync(bin, ['-version'], { encoding: 'utf8' }).error)
      die(`${bin} is not on PATH. see.mjs needs ffmpeg (and tesseract for the full flow); install and re-run.`);
  }

  if (['--phone', '--strip', '--loop'].some((v) => argv.includes(v))) return dispatchViews(video, positional, flag, argv);
  if (argv.includes('--probe')) return dispatchProbe(video, positional, flag);
  if (argv.includes('--look')) return dispatchLook(video, positional, flag);
  if (argv.includes('--layout')) return dispatchLayout(video, positional, flag);
  if (argv.includes('--dom')) return dispatchDom(video, positional, flag, argv);

  const shotSpec = flag('--shot', null);
  if (shotSpec) return dispatchShot(video, positional, shotSpec, flag);

  const compareArg = flag('--compare', null);
  if (compareArg) return dispatchCompare(video, positional, compareArg, flag, argv);

  const wordEventsArg = flag('--word-events', null);
  if (wordEventsArg) return dispatchWordEvents(video, positional, wordEventsArg, flag);

  return runFullFlow(video, positional, flag);
}

// `see.mjs <ref.mp4> --word-events <film.mp4> [--from s --to s]`: the standalone entry point for the
// per-word entrance/highlight/exit/star check, video vs video, no page render involved (that path is
// `--dom --ref ... --words`, which reuses this same runWordEventCompare on its own two rendered mp4s).
function dispatchWordEvents(video, positional, filmVideo, flag) {
  if (!fs.existsSync(filmVideo)) die(`no such --word-events file: ${filmVideo}`);
  const refP = probeVideo(video), filmP = probeVideo(filmVideo);
  const from = Number(flag('--from', 0));
  const to = flag('--to', null) != null ? Number(flag('--to', null)) : Math.min(refP.dur, filmP.dur);
  if (!(to > from)) die(`--word-events: bad window ${from}-${to}`);
  const outDir = path.resolve(positional[1] || defaultOutDir(video));
  fs.mkdirSync(outDir, { recursive: true });
  const ok = runWordEventCompare(video, filmVideo, outDir, from, to, `${path.basename(video)} vs ${path.basename(filmVideo)}`);
  if (!ok) process.exitCode = 1;
}

function dispatchProbe(video, positional, flag) {
  const at = Number(flag('--at', 0));
  const sel = flag('--sel', null);
  if (!sel) die('usage: node harness/media/see.mjs <html> --probe --at <s> --sel <css>');
  const outDir = path.join(path.resolve(positional[1] || defaultOutDir(video)), 'probe');
  return runProbe(video, at, sel, outDir);
}

function dispatchLook(video, positional, flag) {
  const timesArg = flag('--times', null);
  if (!timesArg) die('usage: node harness/media/see.mjs <html> --look --times <s,s,...> [--ref <mp4>]');
  const times = timesArg.split(',').map(Number);
  const refArg = flag('--ref', null);
  if (refArg && !fs.existsSync(refArg)) die(`no such --ref file: ${refArg}`);
  const outDir = path.join(path.resolve(positional[1] || defaultOutDir(video)), 'look');
  return runLook(video, times, refArg, outDir);
}

function dispatchLayout(video, positional, flag) {
  const timesArg = flag('--times', null);
  if (!timesArg) die('usage: node harness/media/see.mjs <html> --layout --times <s,s,...> [--film <film.json>]');
  const times = timesArg.split(',').map(Number);
  const filmArg = flag('--film', null);
  const outDir = path.join(path.resolve(positional[1] || defaultOutDir(video)), 'layout');
  return runLayout(video, times, outDir, filmArg);
}

function dispatchDom(video, positional, flag, argv) {
  const fromArg = Number(flag('--from', 0));
  const toArg = flag('--to', null);
  const domFps = Number(flag('--dom-fps', 30));
  const idsArg = flag('--ids', null);
  const outDirRoot = path.resolve(positional[1] || defaultOutDir(video));
  // `--dom --ref <mp4>`: required-motion-match on a bare page, no scene.json, no draft render
  // (`make next PAGE=<html> REF=<mp4>`, item 2 of this file's own required-motion-match doctrine). This
  // is the one branch that renders the page through render-page.mjs, the real cost measured on this
  // repo (~57s for a 5s window at full size with blur), so it alone defaults to a half-size draft;
  // --final renders the way `make ship` does (full size, full length, motion blur), for the one check
  // that must match the actual shipped cut rather than a fast iteration draft.
  const refArg = flag('--ref', null);
  const final = argv.includes('--final');
  const w = Number(flag('--w', refArg && !final ? 960 : 1920));
  const h = Number(flag('--h', refArg && !final ? 540 : 1080));
  const blur = Number(flag('--blur', final ? 3 : 1));
  const opts = {
    from: fromArg, to: toArg != null ? Number(toArg) : null, fps: domFps, w, h, blur, final,
    ids: idsArg ? idsArg.split(',') : null,
  };
  if (refArg) return runRequiredMotionMatch(video, refArg, outDirRoot, { ...opts, filmArg: flag('--film', null), words: argv.includes('--words') });
  return runDom(video, outDirRoot, opts);
}

async function dispatchViews(input, positional, flag, argv) {
  const views = await import('./see-views.mjs');
  const video = await views.videoFor(input);
  const outDir = path.resolve(positional[1] || defaultOutDir(input));
  const rel = (p) => path.relative(process.cwd(), p);
  if (argv.includes('--phone')) {
    const r = views.phoneSheet(video, outDir);
    console.log(`✓ phone sheet, ${r.frames} frame(s) at 360 px, 1 fps: LOOK at ${rel(r.sheet)}`);
  }
  const stripAt = flag('--strip', null);
  if (stripAt != null) {
    const r = views.stripSheet(video, Number(stripAt), outDir);
    console.log(`✓ strip, 12 frames from f${r.firstFrame} at ${r.fps} fps around ${stripAt}s: LOOK at ${rel(r.sheet)}`);
  }
  if (argv.includes('--loop')) {
    const r = views.loopSeam(video, outDir);
    console.log(`✓ loop seam: LOOK at ${rel(r.sheet)}\n  ${views.describeLoop(r)}`);
  }
}

function dispatchShot(video, positional, shotSpec, flag) {
  const { from, to } = parseRange(shotSpec);
  const fps = Number(flag('--fps', 10));
  const outDirRoot = path.resolve(positional[1] || defaultOutDir(video));
  const pageArg = flag('--page', null);
  if (pageArg) console.log(`\n  next: node harness/media/see.mjs ${pageArg} --dom --ref ${video} --from ${from} --to ${to}`
    + `  (or: make next PAGE=${pageArg} REF=${video})`);
  return runShot(video, outDirRoot, from, to, fps);
}

function dispatchCompare(video, positional, compareArg, flag, argv) {
  if (!fs.existsSync(compareArg)) die(`no such draft file: ${compareArg}`);
  const fromArg = flag('--from', null);
  const toArg = flag('--to', null);
  const filmArg = flag('--film', null);
  const outDirRoot = path.resolve(positional[1] || defaultOutDir(video));
  return runCompare(video, compareArg, outDirRoot, fromArg != null ? Number(fromArg) : null, toArg != null ? Number(toArg) : null,
    filmArg, argv.includes('--words'));
}

function runFullFlow(video, positional, flag) {
  if (spawnSync('tesseract', ['-version'], { encoding: 'utf8' }).error)
    die('tesseract is not on PATH. see.mjs needs it for the full flow (--shot/--compare do not); install and re-run.');

  const framesBudget = Number(flag('--frames', 12));
  const holdFloor = Number(flag('--hold-floor', HOLD_FLOOR));
  const holdMin = Number(flag('--hold-min', HOLD_MIN));
  const ocrFps = Number(flag('--ocr-fps', 4));
  const ocrMinConf = Number(flag('--ocr-conf', 60));
  const ocrMinLen = 3;

  const outDir = path.resolve(positional[1] || defaultOutDir(video));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const { width, height, dur, fps } = probeVideo(video);

  const { cuts } = detectCuts(video, outDir, 0.3, 0.4);
  const cutTimes = cuts.map((c) => c.t);
  const energy = computeEnergy(video, ENERGY_HZ);
  const holds = findHolds(energy, holdFloor, holdMin);

  const ocr = ocrWords(video, outDir, ocrFps, ocrMinConf, ocrMinLen);
  const beats = buildBeats(cutTimes, holds, ocr, energy, dur);
  const chosen = pickFrames(cutTimes, holds, beats, dur, framesBudget);
  const gridPaths = renderGrids(video, outDir, chosen, width, height, dur);

  writeOutputs({ outDir, video, dur, fps, cutTimes, energy, holds, beats, gridPaths });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
