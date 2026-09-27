// harness/media/see.mjs · let an agent SEE a reference video for the price of a few images.
//
//   node harness/media/see.mjs <video> [outDir] [--frames N]           · make study REF=<video> SEE=1
//   node harness/media/see.mjs <video> --shot <from>-<to> [--fps N]    · make study REF=<video> SHOT=<from>-<to>
//   node harness/media/see.mjs <video> --compare <draft.mp4> [--from s --to s]  · make study REF=<video> COMPARE=<draft.mp4>
//   node harness/media/see.mjs <html> --probe --at <s> --sel <css>     · make study REF=<html> PROBE=1 AT=<s> SEL=<css>
//   node harness/media/see.mjs <html> --look --times <s,...> [--ref <mp4>]  · make study REF=<html> LOOK=<s,...> [COMPARE=<mp4>]
//   node harness/media/see.mjs <html> --layout --times <s,...> [--film <film.json>]  · make study REF=<html> LAYOUT=<s,...>
//
// --probe/--look/--layout exist because agents kept writing their own throwaway browser probe scripts
// to debug a fragment (one stalled twice doing it), never made a still before touching motion (0 of 7
// agents did), and lost whole sessions to a stray `position:absolute` or two stacked opaque backgrounds
// nothing had ever screenshotted together. All three reuse this file's own serveRepo/launchPage page
// loader and the same animation-seek (`document.getAnimations()` paused at a given `currentTime`) that
// --dom already uses, never a second page-loading path.
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
import { serveRepo, launchPage } from '../lib/render-harness.mjs';

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

// ── OCR: tesseract on downscaled frames at ocrFps, psm 11 (sparse text, no layout) ─────────────────
function ocrWords(video, outDir, ocrFps, minConf, minLen) {
  const ocrDir = path.join(outDir, '.ocr');
  fs.mkdirSync(ocrDir, { recursive: true });
  const framesGlob = path.join(ocrDir, 'f_%05d.png');
  ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-vf', `fps=${ocrFps},scale=640:-2`, framesGlob],
    null, 'ocr frame extraction');
  const files = fs.readdirSync(ocrDir).filter((f) => f.endsWith('.png')).sort();
  const perFrame = files.map((f, i) => {
    const t = i / ocrFps;
    const base = path.join(ocrDir, `f_${String(i + 1).padStart(5, '0')}`);
    const r = spawnSync('tesseract', [path.join(ocrDir, f), base, '--psm', '11', 'tsv'], { encoding: 'utf8' });
    const tsv = fs.existsSync(`${base}.tsv`) ? fs.readFileSync(`${base}.tsv`, 'utf8') : '';
    const words = new Set();
    for (const line of tsv.split('\n').slice(1)) {
      const cols = line.split('\t');
      if (cols.length < 12) continue;
      const conf = Number(cols[10]), text = (cols[11] || '').trim();
      if (conf >= minConf && text.length >= minLen && /[a-zA-Z]/.test(text)) words.add(text);
    }
    return { t, words };
  });
  fs.rmSync(ocrDir, { recursive: true, force: true });
  // A word "seen" is one that persists >= 2 consecutive samples; tIn is the first of that run.
  const seenAt = new Map();   // text -> [t,t,...]
  for (const f of perFrame) for (const w of f.words) {
    if (!seenAt.has(w)) seenAt.set(w, []);
    seenAt.get(w).push(f.t);
  }
  const words = [];
  for (const [text, times] of seenAt) {
    times.sort((a, b) => a - b);
    let runStart = times[0], prev = times[0], runLen = 1;
    for (let i = 1; i <= times.length; i++) {
      const t = times[i];
      if (t !== undefined && t - prev <= 1 / ocrFps + 0.01) { runLen++; prev = t; continue; }
      if (runLen >= 2) words.push({ text, tIn: Number(runStart.toFixed(2)) });
      runStart = t; prev = t; runLen = 1;
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

function runCompare(refPath, draftPath, outDirRoot, fromArg, toArg, filmArg) {
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
  const rows = refCurve.map((w, i) => {
    const draftMean = draftCurve[i] ? draftCurve[i].mean : 0;
    return { t0: w.t0, t1: w.t1, refMean: w.mean, draftMean, tooStill: draftMean < 0.5 * w.mean };
  });

  const refHolds = findHolds(refEnergy, HOLD_FLOOR, HOLD_MIN);
  const draftHolds = findHolds(draftEnergy, HOLD_FLOOR, HOLD_MIN);
  const refLongest = longestHold(refHolds);
  const draftLongest = longestHold(draftHolds);
  const tooStillWindows = rows.filter((r) => r.tooStill);

  const tableRows = rows.map((r) => `| ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s | ${r.refMean.toFixed(2)} `
    + `| ${r.draftMean.toFixed(2)} |${r.tooStill ? ' <- too still' : ''} |`).join('\n');
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
      refMean: Number(r.refMean.toFixed(3)), draftMean: Number(r.draftMean.toFixed(3)), tooStill: r.tooStill })),
    refLongestStill: refLongest, draftLongestStill: draftLongest,
  });

  console.log(`\n  COMPARE · ${path.basename(refPath)} vs ${path.basename(draftPath)}, ${from}-${clampedTo}s\n`);
  for (const r of rows)
    console.log(`  ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s  ref ${r.refMean.toFixed(2)}  draft ${r.draftMean.toFixed(2)}${r.tooStill ? '  <- too still' : ''}`);
  console.log(`\n  ✓ wrote ${path.relative(ROOT, path.join(outDir, 'compare.md'))}`);
  console.log(tooStillWindows.length
    ? `  next: fix motion in ${tooStillWindows.length} window(s) marked "too still" (${tooStillWindows.map((r) => `${r.t0.toFixed(1)}-${r.t1.toFixed(1)}s`).join(', ')}), then re-run --compare.`
    : '  next: draft matches the reference\'s motion in every window; proceed to the next post-draft step.');

  // `--film` records this run against the FILM's own hash (harness/lib/receipt.mjs), the same receipt
  // shape conform.mjs/verify.mjs already write, so quality/gates/post-draft.mjs can read one fresh/stale
  // answer instead of re-running ffmpeg itself.
  if (filmArg) {
    writeReceipt('motion-compare', filmArg, {
      ok: tooStillWindows.length === 0, tooStillCount: tooStillWindows.length,
      tooStillWindows: tooStillWindows.map((r) => ({ t0: r.t0, t1: r.t1 })),
      ref: refPath, draft: draftPath, from, to: clampedTo,
    });
  }
}

// Write-then-rename: a reader that opens `file` either sees the old content or the whole new one,
// never a half-written one (the same failure a compare once hit reading a half-written mp4 mid-render,
// "moov atom not found"). Cheap enough to use for every JSON this file writes.
function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  fs.renameSync(tmp, file);
}

// ── --sheet-check: compare two ALREADY-COMPUTED motion curves, no render, no ffmpeg ──────────────────
// Both --shot's and --dom's own motion.json share one shape (`curve`: [{t0,t1,mean}]), so one function
// diffs either pairing: a reference's `see --shot` sheet against a film's `--dom` sheet, or two shots
// of the same reference. Plain numbers only: a ratio per window, and how far the two curves' peaks land
// apart in time.
function sheetCheck(refSheet, filmSheet) {
  const refCurve = refSheet.curve || [];
  const filmCurve = filmSheet.curve || [];
  const n = Math.min(refCurve.length, filmCurve.length);
  const rows = Array.from({ length: n }, (_, i) => {
    const r = refCurve[i], f = filmCurve[i];
    const ratio = r.mean > 1e-6 ? f.mean / r.mean : (f.mean > 1e-6 ? Infinity : 1);
    return { t0: r.t0, t1: r.t1, refMean: r.mean, filmMean: f.mean, ratio };
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

  return {
    rows, peakOffset, refPeakT: refCurve[refPeakIdx]?.t0 ?? null, filmPeakT: filmCurve[filmPeakIdx]?.t0 ?? null,
    refPeak, filmPeak, peakRatio, refExit: refEdge.exit, filmExit: filmEdge.exit, exitRatio,
  };
}

function runSheetCheck(refFile, filmFile) {
  if (!fs.existsSync(refFile)) die(`no such file: ${refFile}`);
  if (!fs.existsSync(filmFile)) die(`no such file: ${filmFile}`);
  const refSheet = JSON.parse(fs.readFileSync(refFile, 'utf8'));
  const filmSheet = JSON.parse(fs.readFileSync(filmFile, 'utf8'));
  const { rows, peakOffset, refPeakT, filmPeakT, refPeak, filmPeak, peakRatio, refExit, filmExit, exitRatio } = sheetCheck(refSheet, filmSheet);
  if (!rows.length) die(`no overlapping curve windows between ${refFile} and ${filmFile} (missing "curve"?)`);

  console.log(`\n  SHEET CHECK · ${path.basename(refFile)} vs ${path.basename(filmFile)}\n`);
  for (const r of rows) {
    const ratioTxt = Number.isFinite(r.ratio) ? `${r.ratio.toFixed(2)}x` : 'n/a';
    const note = r.ratio < 0.5 ? '  <- much slower' : r.ratio > 2 ? '  <- much faster' : '';
    console.log(`  ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s  ref ${r.refMean.toFixed(2)}  film ${r.filmMean.toFixed(2)}  ratio ${ratioTxt}${note}`);
  }
  const dir = peakOffset > 1e-6 ? 'late' : peakOffset < -1e-6 ? 'early' : 'on time';
  const refTxt = refPeakT != null ? refPeakT.toFixed(2) : 'n/a';
  const filmTxt = filmPeakT != null ? filmPeakT.toFixed(2) : 'n/a';
  console.log(`\n  peak motion: reference at ${refTxt}s, film at ${filmTxt}s (${Math.abs(peakOffset).toFixed(2)}s ${dir})`);
  console.log(`  peak speed: ref ${refPeak.toFixed(2)}, film ${filmPeak.toFixed(2)} (film is ${describeRatio(peakRatio)})`);
  console.log(`  exit speed: ref ${refExit.toFixed(2)}, film ${filmExit.toFixed(2)} (film's exit is ${describeRatio(exitRatio)})`);
}

// ── --dom: read a film's motion straight from the DOM, no video, no screenshot per sample ────────────
// Loads `html` once (harness/lib/render-harness.mjs's own serveRepo/launchPage, the same pair every
// other headless tool in this repo uses), then SEEKS every `document.getAnimations()` (the Web
// Animations API this repo's `element.animate()` scenes already use) by setting `currentTime`, reading
// each tracked element's box/opacity straight from the live page: 30x/s costs one page.evaluate call
// each, not a screenshot decode. Also captures screenshots at the --compare cadence (4/s) into the same
// side-by-side style grid via tileInGrids, without spinning up a second page or a second browser.
async function domSample(page, ids, t) {
  return page.evaluate((ms, trackedIds) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
    return trackedIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const opacity = Number(getComputedStyle(el).opacity);
      return { id, x: r.x + r.width / 2, y: r.y + r.height / 2, opacity };
    });
  }, t * 1000, ids);
}

function domCurveAndEvents(samples, ids) {
  const perElement = new Map(ids.map((id) => [id, []]));
  for (const s of samples) {
    for (const row of s.boxes) {
      if (row) perElement.get(row.id).push({ t: s.t, x: row.x, y: row.y, opacity: row.opacity });
    }
  }
  const energy = [];
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
  return { energy, events: events.sort((a, b) => a.t - b.t) };
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

async function runDom(htmlPath, outDirRoot, opts) {
  const { from: fromArg, to: toArg, fps: domFps, w, h, ids: idsArg } = opts;
  const root = path.resolve(htmlPath, '..');
  const rel = path.basename(htmlPath);
  const { close: closeServer, port } = await serveRepo({ root });
  const { page, close: closePage } = await launchPage({ width: w, height: h });
  try {
    await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'load' });
    const info = await page.evaluate(() => {
      const durMeta = document.querySelector('meta[name="duration"]');
      const anims = document.getAnimations();
      const ids = [...new Set(anims.map((a) => a.effect && a.effect.target).filter(Boolean).map((t) => t.id).filter(Boolean))];
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

    const outDir = path.join(outDirRoot, 'dom');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const times = timeRange(fromArg, to, 1 / domFps);
    const samples = [];
    for (const t of times) samples.push({ t, boxes: await domSample(page, ids, t) });
    const { energy, events } = domCurveAndEvents(samples, ids);
    const curve = bucketMean(energy, fromArg, to, 0.5)
      .map((wnd) => ({ t0: Number(wnd.t0.toFixed(2)), t1: Number(wnd.t1.toFixed(2)), mean: Number(wnd.mean.toFixed(3)) }));

    const gridPaths = await domStillGrid(page, outDir, fromArg, to, w, h);

    const sheet = { html: htmlPath, from: fromArg, to, fps: domFps, ids, events, curve };
    writeJsonAtomic(path.join(outDir, 'motion.json'), sheet);

    console.log(`\n  DOM · ${path.basename(htmlPath)}, ${fromArg}-${to}s, ${ids.length} tracked element(s)\n`);
    for (const c of curve) console.log(`  ${c.t0.toFixed(2)}-${c.t1.toFixed(2)}s  ${c.mean.toFixed(2)}`);
    console.log(`\n  ${events.length} event(s): ${events.map((e) => `${e.id} ${e.type}@${e.t}s`).join(', ') || 'none'}`);
    console.log(`  ✓ wrote ${path.relative(ROOT, path.join(outDir, 'motion.json'))}, ${gridPaths.length} still grid(s)`);
  } finally {
    await closePage();
    closeServer();
  }
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
  const root = path.resolve(htmlPath, '..');
  const rel = path.basename(htmlPath);
  const { close: closeServer, port } = await serveRepo({ root });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'load' });
    await seekPage(page, atS);
    const rows = await page.evaluate((selector) => {
      const shortSelInPage = (el) => (el.id ? `#${el.id}` : (el.className && String(el.className).trim() ? `.${String(el.className).split(' ')[0]}` : el.tagName.toLowerCase()));
      return [...document.querySelectorAll(selector)].map((el) => {
        const r = el.getBoundingClientRect();
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
  } finally { await closePage(); closeServer(); }
}

// ── --look: a still per requested time, gridded, optionally paired against the reference at the same
// timestamps. Built because 0 of 7 agents made a still frame before touching motion; layout faults
// then surfaced only after a full render.
async function runLook(htmlPath, times, refPath, outDir) {
  const root = path.resolve(htmlPath, '..');
  const rel = path.basename(htmlPath);
  const { close: closeServer, port } = await serveRepo({ root });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const longEdge = 1568;
  const tileW = Math.floor(longEdge / 3);
  const tileH = Math.round((tileW * 1080) / 1920);
  try {
    await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'load' });
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
  } finally { await closePage(); closeServer(); }
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
  const root = path.resolve(htmlPath, '..');
  const rel = path.basename(htmlPath);
  const { close: closeServer, port } = await serveRepo({ root });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  fs.mkdirSync(outDir, { recursive: true });
  try {
    await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'load' });
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
  } finally { await closePage(); closeServer(); }
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
      die('usage: node harness/media/see.mjs --sheet-check <ref-sheet.json> <film-sheet.json>');
    return runSheetCheck(refFile, filmFile);
  }

  const video = positional[0];

  if (!video) die('usage: node harness/media/see.mjs <video> [outDir] [--frames N] '
    + '| --shot <from>-<to> [--fps N] | --compare <draft.mp4> [--from s --to s] '
    + '| --dom [<html>] [--from s --to s] [--dom-fps N] [--ids a,b,c] | --sheet-check <ref.json> <film.json> '
    + '| --probe --at <s> --sel <css> | --look --times <s,...> [--ref <mp4>] | --layout --times <s,...> [--film <f.json>]');
  if (!fs.existsSync(video)) die(`no such file: ${video}`);
  for (const bin of ['ffprobe', 'ffmpeg']) {
    if (spawnSync(bin, ['-version'], { encoding: 'utf8' }).error)
      die(`${bin} is not on PATH. see.mjs needs ffmpeg (and tesseract for the full flow); install and re-run.`);
  }

  if (argv.includes('--probe')) return dispatchProbe(video, positional, flag);
  if (argv.includes('--look')) return dispatchLook(video, positional, flag);
  if (argv.includes('--layout')) return dispatchLayout(video, positional, flag);
  if (argv.includes('--dom')) return dispatchDom(video, positional, flag);

  const shotSpec = flag('--shot', null);
  if (shotSpec) return dispatchShot(video, positional, shotSpec, flag);

  const compareArg = flag('--compare', null);
  if (compareArg) return dispatchCompare(video, positional, compareArg, flag);

  return runFullFlow(video, positional, flag);
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

function dispatchDom(video, positional, flag) {
  const fromArg = Number(flag('--from', 0));
  const toArg = flag('--to', null);
  const domFps = Number(flag('--dom-fps', 30));
  const w = Number(flag('--w', 1920));
  const h = Number(flag('--h', 1080));
  const idsArg = flag('--ids', null);
  const outDirRoot = path.resolve(positional[1] || defaultOutDir(video));
  return runDom(video, outDirRoot, {
    from: fromArg, to: toArg != null ? Number(toArg) : null, fps: domFps, w, h,
    ids: idsArg ? idsArg.split(',') : null,
  });
}

function dispatchShot(video, positional, shotSpec, flag) {
  const { from, to } = parseRange(shotSpec);
  const fps = Number(flag('--fps', 10));
  const outDirRoot = path.resolve(positional[1] || defaultOutDir(video));
  return runShot(video, outDirRoot, from, to, fps);
}

function dispatchCompare(video, positional, compareArg, flag) {
  if (!fs.existsSync(compareArg)) die(`no such draft file: ${compareArg}`);
  const fromArg = flag('--from', null);
  const toArg = flag('--to', null);
  const filmArg = flag('--film', null);
  const outDirRoot = path.resolve(positional[1] || defaultOutDir(video));
  return runCompare(video, compareArg, outDirRoot, fromArg != null ? Number(fromArg) : null, toArg != null ? Number(toArg) : null, filmArg);
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
