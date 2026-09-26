#!/usr/bin/env node
// harness/media/track.mjs: track ONE element in a reference video over a time range and print
// motion[]-ready keyframes, so an agent measures a move instead of guessing it from sparse frames.
//
//   node harness/media/track.mjs <video> --box x,y,w,h --from t0 --to t1 [--fps 10] [--thresh 128] [--dark]
//
// METHOD: crop the box, sample it at --fps, threshold each frame's luma (brighter than --thresh is
// foreground; --dark flips that for a dark subject on a light ground) and take the thresholded pixels'
// centroid (x,y) and bounding-box diagonal (scale, relative to the first frame's). No template
// matching, no model: a crop box + a brightness threshold is the smallest thing that tracks a single
// high-contrast subject (a cursor, a logo, a card) moving over a roughly flat ground, which is what a
// recreation beat almost always is.
// ponytail: brightness-threshold centroid, not template matching. Breaks on a subject that is the same
// brightness as its ground, or on a busy/textured background. Upgrade to matchTemplate (still ffmpeg,
// no new dependency) if a tracked box comes back empty or jittery.
import { spawnSync } from 'node:child_process';
import { requireTool, probeSize } from '../lib/frame-forensics.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(2); };

const VIDEO = argv[0];
if (!VIDEO || VIDEO.startsWith('--')) die('usage: node harness/media/track.mjs <video> --box x,y,w,h --from t0 --to t1');

const box = String(flag('--box', '')).split(',').map(Number);
if (box.length !== 4 || box.some((v) => !Number.isFinite(v))) die('--box x,y,w,h is required, four numbers.');
const [bx, by, bw, bh] = box;
const T0 = Number(flag('--from', NaN));
const T1 = Number(flag('--to', NaN));
if (!Number.isFinite(T0) || !Number.isFinite(T1) || T1 <= T0) die('--from t0 --to t1 is required, t1 > t0.');
const FPS = Number(flag('--fps', 10));
const THRESH = Number(flag('--thresh', 128));
const DARK = argv.includes('--dark');   // track pixels DARKER than THRESH instead of brighter

requireTool('ffmpeg');
requireTool('ffprobe');
const { width: VW, height: VH, duration } = probeSize(VIDEO);
if (!VW || !VH) die(`${VIDEO} has no readable video stream.`);
if (T1 > duration) die(`--to ${T1} is past the video's own duration (${duration.toFixed(2)}s).`);

// Raw 8-bit grayscale frames of the crop, at FPS: one ffmpeg call, no per-frame subprocess.
const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', T0.toFixed(3), '-t', (T1 - T0).toFixed(3), '-i', VIDEO,
  '-vf', `crop=${bw}:${bh}:${bx}:${by},fps=${FPS},format=gray`, '-f', 'rawvideo', '-'],
  { encoding: 'buffer', maxBuffer: 1 << 28 });
if (r.error) die(`could not run ffmpeg: ${r.error.message}`);
const frameBytes = bw * bh;
const nFrames = Math.floor(r.stdout.length / frameBytes);
if (nFrames < 2) die(`decoded ${nFrames} frame(s) from the box; need at least 2. Check --box and --from/--to.`);

function frameStats(buf) {
  let count = 0, sx = 0, sy = 0, minX = bw, maxX = 0, minY = bh, maxY = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const v = buf[y * bw + x];
    const hit = DARK ? v < THRESH : v > THRESH;
    if (!hit) continue;
    count++; sx += x; sy += y;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (!count) return null;
  const diag = Math.hypot(maxX - minX + 1, maxY - minY + 1);
  return { cx: sx / count, cy: sy / count, coverage: count / (bw * bh), diag };
}

const raw = [];
for (let i = 0; i < nFrames; i++) raw.push(frameStats(r.stdout.subarray(i * frameBytes, (i + 1) * frameBytes)));
const firstSeen = raw.find((s) => s);
if (!firstSeen) die('no pixel in the box ever crossed --thresh. Wrong box, wrong side of --dark, or wrong --thresh.');

const maxCoverage = Math.max(...raw.filter(Boolean).map((s) => s.coverage));
const keyframes = raw.map((s, i) => {
  const t = Number((T0 + i / FPS).toFixed(3));
  if (!s) return { t, x: null, y: null, scale: null, opacity: 0 };
  return {
    t,
    x: Number((bx + s.cx).toFixed(1)),
    y: Number((by + s.cy).toFixed(1)),
    scale: Number((s.diag / firstSeen.diag).toFixed(3)),
    opacity: Number((s.coverage / maxCoverage).toFixed(3)),
  };
});

// Ease heuristic: compare the average step speed in the first vs second half of the track. A move that
// starts slow and quickens is easeIn; one that starts fast and settles is easeOut; neither is linear.
// ponytail: a two-bucket average, not a curve fit. Good enough to pick a preset, not to reproduce a
// bespoke bezier; re-measure by eye if the picked ease looks wrong on the rendered beat.
const pts = keyframes.filter((k) => k.x != null);
const speeds = pts.slice(1).map((k, i) => Math.hypot(k.x - pts[i].x, k.y - pts[i].y));
const half = Math.max(1, Math.floor(speeds.length / 2));
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const firstHalf = avg(speeds.slice(0, half));
const secondHalf = avg(speeds.slice(half));
const ease = firstHalf < secondHalf * 0.7 ? 'easeInCubic'
  : firstHalf > secondHalf * 1.3 ? 'easeOutCubic'
  : 'linear';

console.log(JSON.stringify({ video: VIDEO, box: { x: bx, y: by, w: bw, h: bh }, from: T0, to: T1, fps: FPS, ease, keyframes }, null, 2));
