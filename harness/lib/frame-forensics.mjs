// harness/lib/frame-forensics.mjs: read PIXELS inside one authored BOX, at one frame.
//
// seams.mjs already reads the rendered mp4 for a luminance flash across the WHOLE frame at a
// boundary. Three defects survive that check because they never touch the whole-frame average: a layer
// redrawn where it has no business being (a resurrection), an outgoing layer that keeps fading for
// several extra frames past its own declared transition (a ghost), and a background that steps instead
// of blending while the layers on top of it dissolve (a split seam). All three are local to a REGION and
// a WINDOW a flash check never opens. This module is the crop-and-measure primitive the three checks in
// quality/gates/seams.mjs share, so each stays a short function over real pixels.
//
// Every measurement here is `spawnSync('ffmpeg', …)`, real decoded pixels, never renderFrame: a seam is
// composited during the render (core/timeline/seams.js), so it exists only in the mp4 (seams.mjs's
// own reasoning, unchanged here).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const clampBox = (box, W, H) => {
  const x = Math.max(0, Math.min(W - 2, Math.round(box.x)));
  const y = Math.max(0, Math.min(H - 2, Math.round(box.y)));
  const w = Math.max(2, Math.min(W - x, Math.round(box.w)));
  const h = Math.max(2, Math.min(H - y, Math.round(box.h)));
  return { x, y, w, h };
};

/** requireTool(bin): exit(2) naming the missing binary, never a silent absence-of-findings (seam-snap's own rule). */
export function requireTool(bin) {
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  if (r.error?.code === 'ENOENT') {
    console.error(`✗ seam-forensics cannot run: ${bin} is not on PATH. Install it and re-run.`);
    process.exit(2);
  }
  if (r.status !== 0) {
    console.error(`✗ seam-forensics cannot run: \`${bin} -version\` exited ${r.status}.`);
    process.exit(2);
  }
}

/** probeFps(mp4): the real frame rate, read from the file (a draft is 30, a final is 60; never assumed). */
export function probeFps(mp4) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' });
  const m = /^(\d+)(?:\/(\d+))?/.exec(String(r.stdout).trim());
  const v = m ? (+m[1] / (m[2] ? +m[2] : 1)) : 0;
  return v > 0 ? Math.round(v) : 0;
}

/** probeTotalFrames(mp4): the real decoded length, never the declared duration. */
export function probeTotalFrames(mp4) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames', '-of', 'default=nk=1:nw=1', mp4]);
  return parseInt(String(r.stdout).trim(), 10) || 0;
}

// mean RGB (0..1 each) of one crop at one frame, scaled to a single pixel: that 1×1 average IS the
// crop's mean colour (the same trick seams.mjs's lumaAt uses, cropped to a box instead of the frame).
function meanPixel(mp4, frameIdx, box, extraVf = '') {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf',
    `select=eq(n\\,${frameIdx}),crop=${box.w}:${box.h}:${box.x}:${box.y}${extraVf},scale=1:1`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
  const b = r.stdout;
  if (!b || b.length < 3) return null;
  return [b[0] / 255, b[1] / 255, b[2] / 255];
}

/** meanColorAt(mp4, frameIdx, box, W, H) → [r,g,b] in 0..1, or null if the frame would not decode. */
export function meanColorAt(mp4, frameIdx, box, W, H) {
  return meanPixel(mp4, frameIdx, clampBox(box, W, H));
}

/**
 * gridStatsSweep(mp4, stride) → [{ frame, luma, spread }]: the SAME statistic as gridStatsAt, for every
 * `stride`-th frame of the whole film, in ONE decode.
 *
 * WHY THIS EXISTS RATHER THAN A LOOP OVER gridStatsAt. That function seeks by `select=eq(n,K)`, which
 * has no keyframe seek in front of it, so ffmpeg decodes from frame 0 to K every single call: a sweep
 * of a 22s film at a 0.15s stride cost 147 calls and 60 seconds of wall clock, quadratic in length.
 * This is linear: one pass, one process, the frames arriving in order. Measured on the same film, the
 * same sweep, 60s to under 2s.
 *
 * The arithmetic is deliberately IDENTICAL to gridStatsAt (32x18 gray, mean and max-min over the bytes)
 * so "what counts as empty" stays one answer. A caller that finds a hit here still confirms and measures
 * it with emptinessAt, which owns the duration walk.
 */
export function gridStatsSweep(mp4, stride) {
  const N = 32 * 18;
  const step = Math.max(1, Math.round(stride));
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `select=not(mod(n\\,${step})),scale=32:18`,
    '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 });
  const b = r.stdout;
  if (!b || b.length < N) return [];
  const out = [];
  for (let i = 0; i + N <= b.length; i += N) {
    let sum = 0, min = 255, max = 0;
    for (let k = 0; k < N; k++) { const v = b[i + k]; sum += v; if (v < min) min = v; if (v > max) max = v; }
    out.push({ frame: (i / N) * step, luma: sum / N / 255, spread: (max - min) / 255 });
  }
  return out;
}

/**
 * frameDeltaSweep(mp4, gw, gh) → [{ frame, delta }]: for EVERY decoded frame of the whole film, in ONE
 * decode, the max per-pixel |Δ| (0..1) against the frame right before it, on a `gw`x`gh` downscaled
 * gray grid. Frame 0 gets `delta: 0` (nothing precedes it).
 *
 * SAME SHAPE AS gridStatsSweep, one process, frames arriving in order, no seek-and-redecode per
 * sample: quality/gates/motion-sound-check.mjs needs frame-to-frame CHANGE (does the picture move
 * between consecutive frames), which is a different question from gridStatsSweep's per-frame luma/
 * spread, so it is a sibling function over the same one-pass pattern rather than a second one invented
 * from nothing. No stride: a slide-in a stride would skip land between two sampled frames and read as
 * "nothing moved", so every frame is decoded.
 */
export function frameDeltaSweep(mp4, gw = 64, gh = 36) {
  const N = gw * gh;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `scale=${gw}:${gh},format=gray`,
    '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 29 });
  const b = r.stdout;
  if (!b || b.length < N) return [];
  const out = [];
  let prev = null;
  for (let i = 0, frame = 0; i + N <= b.length; i += N, frame++) {
    let maxDelta = 0;
    if (prev) for (let k = 0; k < N; k++) { const d = Math.abs(b[i + k] - prev[k]); if (d > maxDelta) maxDelta = d; }
    out.push({ frame, delta: maxDelta / 255 });
    prev = b.subarray(i, i + N);
  }
  return out;
}

/**
 * gridStatsAt(mp4, frameIdx) → { luma, spread } in [0,1], or null if the frame would not decode. One
 * decode of the WHOLE frame, scaled to a small grid (32x18) instead of 1x1: the grid's mean IS the same
 * frame-mean a 1x1 scale gives (seams.mjs's original lumaAt trick), and its max-min gives a SECOND,
 * colour-blind statistic for free: an empty stage has near-zero spread whatever its ground colour is,
 * where luma alone only ever catches a stage getting DARKER. Shared so seams.mjs (every transition
 * boundary) and plan-vs-render.mjs (one promised boundary, named by the storyboard's own prose) measure
 * emptiness the same one way rather than two copies that drift.
 */
export function gridStatsAt(mp4, frameIdx) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `select=eq(n\\,${frameIdx}),scale=32:18`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 20 });
  const b = r.stdout;
  if (!b || b.length < 32 * 18) return null;
  let sum = 0, min = 255, max = 0;
  for (const v of b) { sum += v; if (v < min) min = v; if (v > max) max = v; }
  return { luma: sum / b.length / 255, spread: (max - min) / 255 };
}

/**
 * emptinessAt(mp4, fps, total, nt) → { frame, spread, outsideSpread, emptySec } | null: nt (a frame
 * index) reads as an EMPTY stage, colour-blind, or null if it does not. Shared by seams.mjs (every
 * transition boundary) and plan-vs-render.mjs (the one join its transformation-at-the-end check names),
 * so "what counts as empty" is one arithmetic, not two that drift.
 *
 * THE OUTSIDE REFERENCE WALKS rather than sampling a fixed ±6 frames. An empty stretch measured at
 * 0.2-0.3s already reaches a fixed ±6-frame sample at 30fps, so a fixed offset would land the "outside"
 * reference INSIDE the empty stretch and compare emptiness to itself, never firing (measured on the
 * exemplar this closes, engine-doctrine/MISTAKES.md#144). So this walks further out, one frame at a
 * time, until it finds real structure (spread > 0.06) or gives up at a 2s cap.
 *
 * THE DROP MUST OUTLAST ONE FRAME. A 32x18 grid can read spread near zero on a frame that is a hard
 * cut's one-frame colour-flat pass-through (a wipe or dissolve midpoint), recovered the very next
 * frame; that is a cut, not this defect. edgeReadingAt cannot tell the two apart on a grained or
 * textured ground, it reads the SAME "structure" whether or not anything is on screen (measured on
 * this same exemplar), so the walk that confirms duration re-uses spread, not edges.
 */
export function emptinessAt(mp4, fps, total, nt) {
  const clampF = (f) => Math.max(0, Math.min(total - 1, f));
  const cache = new Map();
  const spreadAt = (f) => {
    const cf = clampF(f);
    if (!cache.has(cf)) cache.set(cf, gridStatsAt(mp4, cf)?.spread ?? null);
    return cache.get(cf);
  };
  const CAP = fps * 2;
  const outsideSpreadAt = (dir) => {
    let last = null;
    for (let k = 6; k <= CAP; k++) {
      last = spreadAt(nt + dir * k);
      if (last != null && last > 0.06) return last;
    }
    return last;
  };
  const before = outsideSpreadAt(-1), after = outsideSpreadAt(1);
  const win = [];
  for (let d = -2; d <= 2; d++) { const sp = spreadAt(nt + d); if (sp != null) win.push({ f: clampF(nt + d), l: sp }); }
  if (before == null || after == null || win.length < 5) return null;
  const outside = Math.min(before, after);
  const drained = win.reduce((m, w) => (w.l < m.l ? w : m), win[0]);
  if (!(outside > 0.06 && drained.l < outside * 0.3)) return null;
  const floor = outside * 0.3;
  let k = CAP;
  for (let d2 = 0; d2 <= CAP; d2++) {
    const sp = spreadAt(drained.f + d2);
    if (sp != null && sp >= floor) { k = d2; break; }
  }
  if (k < 2) return null;
  return { frame: drained.f, spread: Math.round(drained.l * 255), outsideSpread: Math.round(outside * 255), emptySec: k / fps };
}

/**
 * edgeReadingAt(mp4, frameIdx, box, W, H) → a single 0..255 number describing how much STRUCTURE (hard
 * edges: a glyph, an icon, a card border) sits in the box, via ffmpeg's own edgedetect filter rather
 * than a hand-rolled Sobel. Blind spot: a colour-only change with no hard edge (a wash fading in) reads
 * as flat here; that class is what meanColorAt (and diffBoxes below) exist to catch instead.
 */
export function edgeReadingAt(mp4, frameIdx, box, W, H) {
  const px = meanPixel(mp4, frameIdx, clampBox(box, W, H), ',edgedetect=mode=colormix');
  if (!px) return null;
  return Math.round((0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]) * 255);
}

/**
 * diffBoxes(mp4, frameA, frameB, box, W, H) → mean |Δ| per channel (0..255) between the SAME box at two
 * different frames, via ffmpeg's own `blend=difference` rather than a hand-pulled raw buffer subtracted
 * in JS. Two crops, not two whole frames: `blend` needs both inputs the same size, and cropping first is
 * cheaper than diffing the untouched frame.
 *
 * Each frame is grabbed to its OWN one-frame PNG first, then the two PNGs are blended, rather than
 * `select`ing both frames out of one `-i mp4` inside a single filter graph: two `select` branches on the
 * same input keep their ORIGINAL, far-apart timestamps, and `blend` synchronises its two inputs by PTS,
 * so it stalled one branch waiting to catch up and handed back a near-white "difference" of nothing
 * against nothing for every real pair tried here. Two static images have no timestamps to disagree
 * about, so blending those is exact.
 */
export function diffBoxes(mp4, frameA, frameB, box, W, H) {
  const c = clampBox(box, W, H);
  const crop = `crop=${c.w}:${c.h}:${c.x}:${c.y}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seam-forensics-'));
  try {
    const pa = path.join(tmp, 'a.png'), pb = path.join(tmp, 'b.png');
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${frameA}),${crop}`, '-frames:v', '1', pa]);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${frameB}),${crop}`, '-frames:v', '1', pb]);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) return null;
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', pa, '-i', pb, '-filter_complex',
      'blend=all_mode=difference,scale=1:1', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
      { maxBuffer: 1 << 20 });
    const b = r.stdout;
    if (!b || b.length < 3) return null;
    return (b[0] + b[1] + b[2]) / 3;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** savePNG(mp4, frameIdx, dest): a plain frame grab, for the sheet a person actually looks at. */
export function savePNG(mp4, frameIdx, dest) {
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${frameIdx})`, '-frames:v', '1', dest]);
}

export const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
