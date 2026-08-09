// scripts/author/lightfield-metrics.mjs: the measurements, defined once.
//
// The compare tool prints these and the fit tool optimises against them. They live here so a fitted
// option set and a reported number can never be answers to two different questions.

import { execFileSync } from 'node:child_process';

// Decode any image, or a PNG already in memory, to raw RGB at a given size.
export function pixels(fileOrBuf, w, h) {
  const isFile = typeof fileOrBuf === 'string';
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', isFile ? fileOrBuf : 'pipe:0',
    '-vf', `scale=${w}:${h}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 28, input: isFile ? undefined : fileOrBuf });
  if (buf.length !== w * h * 3) throw new Error(`ffmpeg returned ${buf.length} bytes, expected ${w * h * 3}`);
  return buf;
}

export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function means(buf, w, h) {
  let r = 0, g = 0, b = 0, y = 0;
  for (let i = 0; i < w * h; i++) {
    const R = buf[i * 3], G = buf[i * 3 + 1], B = buf[i * 3 + 2];
    r += R; g += G; b += B; y += luma(R, G, B);
  }
  const n = w * h;
  return { r: r / n, g: g / n, b: b / n, luma: y / n };
}

// The colour field, with the pattern averaged away. Downsampling hard cancels the slat phase, so
// what is left is where the light sits and what colour it is.
export function blockError(refBlocks, genBlocks) {
  let sum = 0;
  for (let i = 0; i < refBlocks.length; i++) sum += Math.abs(refBlocks[i] - genBlocks[i]);
  return sum / refBlocks.length;
}

// How saturated the picture is, at full resolution: mean (max - min) over the three channels,
// weighted nowhere and averaged over every pixel.
//
// This exists because nothing else here could see "washed out". blockError is an L1 over RGB, so it
// will happily trade green up against red down and call it an improvement, and it did: a fit once
// moved from 18.53 to 18.11 while mean green rose from 37.8 to 40.0 and the field visibly paled.
// A number that cannot see the defect you were sent to fix is not a pass mark.
export function chroma(buf, w, h) {
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const r = buf[i * 3], g = buf[i * 3 + 1], b = buf[i * 3 + 2];
    sum += Math.max(r, g, b) - Math.min(r, g, b);
  }
  return sum / (w * h);
}

// How hard the pattern cuts, at full resolution, on luma, row by row. This is the half blockError
// is deliberately blind to, and a field can pass that one while being visibly mushy.
//
//   edge   mean |I(x+1) - I(x)| across each row. High when boundaries are sharp.
//   swing  RMS of the row minus its own 21 pixel moving average: the amplitude of the striping
//          with the colour field subtracted out, which is exactly what "too soft" means.
export function striping(buf, w, h) {
  let edge = 0, edgeN = 0, swing = 0, swingN = 0;
  const K = 10;
  const row = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      row[x] = luma(buf[i], buf[i + 1], buf[i + 2]);
    }
    for (let x = 1; x < w; x++) { edge += Math.abs(row[x] - row[x - 1]); edgeN++; }
    for (let x = K; x < w - K; x++) {
      let sum = 0;
      for (let k = -K; k <= K; k++) sum += row[x + k];
      const d = row[x] - sum / (2 * K + 1);
      swing += d * d; swingN++;
    }
  }
  return { edge: edge / edgeN, swing: Math.sqrt(swing / swingN) };
}
