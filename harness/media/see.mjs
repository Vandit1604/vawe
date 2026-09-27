// harness/media/see.mjs · let an agent SEE a reference video for the price of a few images.
//
//   node harness/media/see.mjs <video> [outDir] [--frames N]   ·   make study REF=<video> SEE=1
//
// WHY THIS EXISTS: an agent reads images, not video, and one image costs at most ~1,568 tokens
// regardless of its content (a 3x3 grid at 1568px long edge runs ~174 tokens/frame, per Claude's own
// vision pricing). Reading every frame of a reference is either impossible (no video reader) or
// ruinous (one call per frame). This writes a FEW grids plus one index.md an agent reads first, all
// from ffmpeg + tesseract, both already required by this repo; no new dependency, no OpenCV.
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
    return {
      t0: Number(b.t0.toFixed(2)), t1: Number(b.t1.toFixed(2)),
      meanSpeed, peak: Number(peak.toFixed(2)), peakT: Number(peakT.toFixed(2)),
      ease: fit.name, easeRmse: fit.rmse, words,
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

// ── grids: 3x3, <=9 panels, 1568px long edge ────────────────────────────────────────────────────
function renderGrids(video, outDir, chosen, width, height, dur) {
  const GRID_CELLS = 9;
  const longEdge = 1568;
  const tileW = Math.floor(longEdge / 3);
  const tileH = Math.round((tileW * height) / width);
  const gridPaths = [];
  for (let g = 0; g * GRID_CELLS < chosen.length; g++) {
    const chunk = chosen.slice(g * GRID_CELLS, (g + 1) * GRID_CELLS);
    const cellFiles = chunk.map((c, k) => {
      const t = Math.max(0, Math.min(c.t, dur - 0.03));
      const out = path.join(outDir, `.cell_${g}_${k}.png`);
      ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf',
        `scale=${tileW}:${tileH},drawtext=text='${drawtext(`${c.tag} ${t.toFixed(2)}s`)}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65`,
        out], out, `grid ${g} cell ${k}`);
      return out;
    });
    const cols = Math.min(3, cellFiles.length);
    const rowsN = Math.ceil(cellFiles.length / cols);
    const rowFiles = [];
    for (let r = 0; r < rowsN; r++) {
      const rowCells = cellFiles.slice(r * cols, (r + 1) * cols);
      const rowOut = path.join(outDir, `.row_${g}_${r}.png`);
      stackImages(rowCells, rowOut, 'h', tileW * cols, tileH);
      rowFiles.push(rowOut);
    }
    const gridOut = path.join(outDir, `grid-${String(g + 1).padStart(2, '0')}.png`);
    stackImages(rowFiles, gridOut, 'v', null, null);
    gridPaths.push(gridOut);
    for (const f of [...cellFiles, ...rowFiles]) fs.rmSync(f, { force: true });
  }
  return gridPaths;
}

function writeOutputs({ outDir, video, dur, fps, cutTimes, energy, holds, beats, gridPaths }) {
  const motion = {
    dur: Number(dur.toFixed(2)), fps: Number(fps.toFixed(3)),
    cuts: cutTimes.map((t) => Number(t.toFixed(2))),
    energy: { fps: ENERGY_HZ, values: energy.map((p) => p.v) },
    holds: holds.map((h) => ({ t0: Number(h.t0.toFixed(2)), t1: Number(h.t1.toFixed(2)) })),
    beats,
  };
  fs.writeFileSync(path.join(outDir, 'motion.json'), JSON.stringify(motion, null, 1) + '\n');

  const tokenEstimate = gridPaths.length * 1568 + 400;
  const beatRows = beats.map((b) => {
    const hs = holds.filter((h) => h.t0 >= b.t0 && h.t1 <= b.t1)
      .map((h) => `${h.t0.toFixed(1)}-${h.t1.toFixed(1)}`).join(', ') || '-';
    const ws = b.words.map((w) => `"${w.text}"@${w.tIn}s`).join(', ') || '-';
    return `| ${b.t0}-${b.t1} | ${b.meanSpeed} | ${b.ease ?? '-'} (rmse ${b.easeRmse ?? '-'}) | ${hs} | ${ws} |`;
  }).join('\n');

  const index = `# see: ${path.basename(video)}

${dur.toFixed(1)}s, ${fps.toFixed(1)}fps, ${cutTimes.length} cut(s), ${holds.length} hold(s).

## Beats

| span (s) | mean speed | ease | holds | OCR words |
|---|---|---|---|---|
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

function main() {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  const video = positional[0];
  const framesBudget = Number(flag('--frames', 12));
  const holdFloor = Number(flag('--hold-floor', HOLD_FLOOR));
  const holdMin = Number(flag('--hold-min', HOLD_MIN));
  const ocrFps = Number(flag('--ocr-fps', 4));
  const ocrMinConf = Number(flag('--ocr-conf', 60));
  const ocrMinLen = 3;

  if (!video) die('usage: node harness/media/see.mjs <video> [outDir] [--frames N]');
  if (!fs.existsSync(video)) die(`no such file: ${video}`);
  for (const bin of ['ffprobe', 'ffmpeg', 'tesseract']) {
    if (spawnSync(bin, ['-version'], { encoding: 'utf8' }).error)
      die(`${bin} is not on PATH. see.mjs needs ffmpeg and tesseract; install and re-run.`);
  }

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
