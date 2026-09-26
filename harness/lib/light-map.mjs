// harness/lib/light-map.mjs: a LOW-FREQUENCY LIGHT MAP, the brightness/colour a beat reads at a
// glance before any detail is legible. SSIM and the colour ΔE in quality/gates/tile.mjs both judge one
// frame at a time; this judges the frame's LIGHT, which is why a recreation can score fine on both and
// still look wrong: a reference that reads 4-8x brighter with a diagonal field of light, matched by a
// render that is mostly black with a small glow, is a light-map failure neither existing measure sees.
//
// The map is an `rows`x`cols` grid (16x9 by default, matching the reference photograph's own aspect),
// each cell the AREA AVERAGE of the pixels under it, done IN LINEAR LIGHT. Averaging in sRGB (gamma)
// space under-counts brightness, because gamma compresses the top of the range: two pixels at 0 and 255
// average to 128 in sRGB but the two together carry the light of one pixel at ~188. That gap is exactly
// the kind of miss this exists to catch, so the average happens in linear light and is re-encoded to
// sRGB only for storage and display.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { probeSize } from './frame-forensics.mjs';
import { labDeltaE } from '../../quality/gates/tile.mjs';
import { srgbToLinear, linearToSrgb } from '../../core/color/linear.js';

function rawFrame(source, t) {
  const isImage = /\.(png|jpg|jpeg)$/i.test(source);
  const seek = isImage || t == null ? [] : ['-ss', Number(t).toFixed(3)];
  const r = spawnSync('ffmpeg', ['-v', 'error', ...seek, '-i', source, '-frames:v', '1',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout?.length)
    throw new Error(`light-map: ffmpeg could not read a frame from ${source}${t != null ? ` at ${t}s` : ''}.`);
  return r.stdout;
}

/**
 * lightMap(source, opts) -> rows x cols grid of [r,g,b] (0..255 sRGB).
 * `source` is a video (with `t` seconds to seek to) or a still image (`t` ignored).
 */
export function lightMap(source, { t, cols = 16, rows = 9 } = {}) {
  const { width: W, height: H } = probeSize(source);
  if (!W || !H) throw new Error(`light-map: ${source} has no readable video/image stream.`);
  const buf = rawFrame(source, t);
  const sum = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [0, 0, 0]));
  const n = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  for (let y = 0; y < H; y++) {
    const cy = Math.min(rows - 1, Math.floor((y * rows) / H));
    const row = buf.subarray(y * W * 3, (y + 1) * W * 3);
    for (let x = 0; x < W; x++) {
      const cx = Math.min(cols - 1, Math.floor((x * cols) / W));
      const i = x * 3;
      const cell = sum[cy][cx];
      cell[0] += srgbToLinear(row[i]);
      cell[1] += srgbToLinear(row[i + 1]);
      cell[2] += srgbToLinear(row[i + 2]);
      n[cy][cx] += 1;
    }
  }
  return sum.map((row, ry) => row.map(([r, g, b], rx) => {
    const k = n[ry][rx] || 1;
    return [linearToSrgb(r / k), linearToSrgb(g / k), linearToSrgb(b / k)];
  }));
}

/** lightMapDistance(a, b): mean per-cell Lab ΔE between two same-shaped light maps. */
export function lightMapDistance(a, b) {
  const rows = Math.min(a.length, b.length);
  let sum = 0, count = 0;
  for (let y = 0; y < rows; y++) {
    const cols = Math.min(a[y].length, b[y].length);
    for (let x = 0; x < cols; x++) {
      const d = labDeltaE(a[y][x], b[y][x]);
      if (d != null) { sum += d; count += 1; }
    }
  }
  return count ? sum / count : null;
}

const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** lightMapPNG(map, outPng, {cell}): the grid painted as flat cells, one solid colour per cell, at
 *  `cell` pixels square, for a human to look at next to the reference's own map. */
export function lightMapPNG(map, outPng, { cell = 48 } = {}) {
  const rows = map.length, cols = map[0].length;
  const W = cols * cell, H = rows * cell;
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const ry = Math.min(rows - 1, Math.floor(y / cell));
    for (let x = 0; x < W; x++) {
      const rx = Math.min(cols - 1, Math.floor(x / cell));
      const [r, g, b] = map[ry][rx];
      const i = (y * W + x) * 3;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
    }
  }
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgb24',
    '-video_size', `${W}x${H}`, '-i', '-', outPng], { input: buf });
  if (r.status !== 0) throw new Error(`light-map: ffmpeg could not encode ${outPng}.`);
  return outPng;
}

export { toHex };
