// harness/lib/ref-measure/motion-regions.mjs: how many separate regions move at once. Frames are box-averaged
// to a coarse grid and blurred first, so film grain averages out. Method: frame difference over about
// STEP_S seconds, thresholded, edges joined, then 4-connected components; the python prototype used optical flow.
import { percentile, r3 } from '../move-fit.mjs';

export const GRID_W = 80;
export const STEP_S = 0.1;
export const DIFF_THR = 3;
export const REGION_MIN = 0.005;
export const JOIN_R = 2;

// Mean of g over x0..x1-1, y0..y1-1, clipped to the w by h image.
function boxMean({ g, w, h }, x0, x1, y0, y1) {
  let s = 0, n = 0;
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++, n++) s += g[y * w + x];
  }
  return s / n;
}

function coarse(img, gw, gh) {
  const out = new Float32Array(gw * gh), start = (i, size, grid) => Math.floor((i * size) / grid);
  const end = (i, size, grid) => Math.max(start(i, size, grid) + 1, start(i + 1, size, grid));
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    out[y * gw + x] = boxMean(img, start(x, img.w, gw), end(x, img.w, gw), start(y, img.h, gh), end(y, img.h, gh));
  }
  return { g: out, w: gw, h: gh };
}

function blur3(img) {
  const out = new Float32Array(img.g.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) out[y * img.w + x] = boxMean(img, x - 1, x + 2, y - 1, y + 2);
  return { ...img, g: out };
}

function paint(dst, i, pos, len, stride) {
  for (let k = Math.max(0, pos - JOIN_R); k <= Math.min(len - 1, pos + JOIN_R); k++) dst[i + (k - pos) * stride] = 1;
}

// A moving object changes at its leading and trailing edge; growing the mask by JOIN_R joins the two.
function dilate(mask, w, h) {
  const rows = new Uint8Array(mask.length), out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) if (mask[i]) paint(rows, i, i % w, w, 1);
  for (let i = 0; i < mask.length; i++) if (rows[i]) paint(out, i, Math.floor(i / w), h, w);
  return out;
}

// Changed pixels of the dilated component that contains start; marks the whole component seen.
function componentArea(grown, mask, seen, w, start) {
  const stack = [start];
  let area = 0;
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % w;
    area += mask[i];
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j >= 0 && j < grown.length && grown[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
  }
  return area;
}

export function countRegions(a, b, w, h, thr = DIFF_THR) {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = Math.abs(a[i] - b[i]) > thr ? 1 : 0;
  const grown = dilate(mask, w, h), seen = new Uint8Array(w * h), minArea = REGION_MIN * w * h;
  let regions = 0;
  for (let s = 0; s < grown.length; s++) {
    if (grown[s] && !seen[s] && componentArea(grown, mask, seen, w, s) >= minArea) regions++;
  }
  return regions;
}

// V: decoded frames { w, h, n, gray }. transitions: [{ startFrame, endFrame }], excluded from the differences.
export function measureMotionRegions(V, transitions, fps, thr = DIFF_THR) {
  const gw = Math.min(GRID_W, V.w), gh = Math.max(1, Math.round((gw * V.h) / V.w));
  const step = Math.max(1, Math.round(fps * STEP_S));
  const grid = [];
  for (let f = 0; f < V.n; f++) grid.push(blur3(coarse({ g: V.gray.subarray(f * V.w * V.h, (f + 1) * V.w * V.h), w: V.w, h: V.h }, gw, gh)).g);
  const inCut = new Int32Array(V.n + 1);
  for (const t of transitions) for (let f = t.startFrame; f <= t.endFrame && f < V.n; f++) inCut[f + 1] = 1;
  for (let f = 0; f < V.n; f++) inCut[f + 1] += inCut[f];
  const counts = [];
  for (let f = step; f < V.n; f++) {
    if (inCut[f + 1] - inCut[f - step] > 0) continue;
    counts.push(countRegions(grid[f - step], grid[f], gw, gh, thr));
  }
  return { method: `frame difference over ${step} f (${STEP_S} s) on a ${gw}x${gh} blurred grid, threshold ${thr}, edges joined within ${JOIN_R} cells, regions over ${REGION_MIN * 100}% of the frame`,
    frames: counts.length, median: percentile(counts, 50), p90: percentile(counts, 90), mean: counts.length ? r3(counts.reduce((a, b) => a + b, 0) / counts.length) : null };
}
