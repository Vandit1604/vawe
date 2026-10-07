// A video decoded to the frames the ref-measure modules read: { w, h, n, rgb, gray, frame(i) }, `gridW` pixels wide.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegOrDie } from '../scratch.mjs';

/** Decodes `video` at `fps` into `dir` (scratch space the caller owns). Throws when fewer than 2 frames decode or more than `maxFrames`. */
export function decode(video, fps, dir, W, H, gridW, maxFrames = 2400) {
  const w = gridW, h = 2 * Math.round((gridW * H) / W / 2);
  const raw = path.join(dir, 'frames.rgb');
  ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-an', '-vf', `fps=${fps},scale=${w}:${h}`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw], raw, 'frame decode');
  const buf = fs.readFileSync(raw);
  fs.rmSync(raw, { force: true });
  const n = Math.floor(buf.length / (w * h * 3));
  if (n < 2) throw new Error('fewer than 2 frames decoded');
  if (n > maxFrames) throw new Error(`${n} frames at ${fps} fps is too long for a per-frame spec (max ${maxFrames}). Pass --fps lower, or cut the reference.`);
  const gray = new Uint8Array(n * w * h);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 3;
    gray[i] = (buf[o] * 77 + buf[o + 1] * 150 + buf[o + 2] * 29) >> 8;
  }
  return { w, h, n, rgb: buf, gray, frame: (i) => gray.subarray(i * w * h, (i + 1) * w * h) };
}
