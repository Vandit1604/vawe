// scripts/lib/frame-forensics.mjs: read PIXELS inside one authored BOX, at one frame.
//
// seam-snap.mjs already reads the rendered mp4 for a luminance flash across the WHOLE frame at a
// boundary. Three defects survive that check because they never touch the whole-frame average: a layer
// redrawn where it has no business being (a resurrection), an outgoing layer that keeps fading for
// several extra frames past its own declared transition (a ghost), and a background that steps instead
// of blending while the layers on top of it dissolve (a split seam). All three are local to a REGION and
// a WINDOW a flash check never opens. This module is the crop-and-measure primitive the three checks in
// quality/gates/seam-forensics.mjs share, so each stays a short function over real pixels.
//
// Every measurement here is `spawnSync('ffmpeg', …)`, real decoded pixels, never renderFrame: a seam is
// composited during the render (core/timeline/seams.js), so it exists only in the mp4 (seam-snap.mjs's
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
// crop's mean colour (the same trick seam-snap.mjs's lumaAt uses, cropped to a box instead of the frame).
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
