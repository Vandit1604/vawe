// core/surfaces/image-points.js: a photo sampled into a point cloud, so a particle film gets the photo's own detail.
//
//   const cloud = imagePoints(img, { count: 300000, seed: 3, mask, depth });
//   cloud.positions  Float32Array x,y,z per point. The longer image side spans -1..1, y points up, z = (depth - 0.5) * depthScale.
//   cloud.colors     Float32Array r,g,b 0..1 (sRGB, as stored in the image).
//   cloud.luma       Float32Array, 0..1.
//   cloud.normals    Float32Array x,y,z, unit length, tilted by the luma gradient: light a point by dot(normal, light).
//   cloud.size       [width, height] of the image in px.
//   const part =regions(labelImage, [[255, 0, 0], '#0000ff'], cloud);   // Uint8Array: the label index of each point
//
// image, mask, depth and labelImage are an HTMLImageElement, ImageBitmap, canvas or ImageData ({ width, height, data }).
// Point density follows weight = max(0, luma - threshold)^gamma * (1 + edgeBoost * edge) * mask, where edge is the Sobel
// magnitude scaled to 1 at the strongest edge. A point is a seeded draw from the cumulative weight, so the same inputs give the same cloud.
// mask limits the points by its alpha when it has any transparent pixel, else by its luma. depth is read from its red channel,
// linear 0 (near) to 1 (far); without it depth is the luma. Mask and depth may have another size than the image.
// jitter spreads a point by up to that many image px from its pixel centre, so the points do not line up on the pixel grid.
import { rng } from '../motion/springs.js';

const LUMA = [0.2126, 0.7152, 0.0722];

function pixelsOf(image) {
  if (image.data) return image;
  const w = image.naturalWidth || image.videoWidth || image.width, h = image.naturalHeight || image.videoHeight || image.height;
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function lumaOf({ width, height, data }) {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = (LUMA[0] * data[i * 4] + LUMA[1] * data[i * 4 + 1] + LUMA[2] * data[i * 4 + 2]) / 255;
  return out;
}

// Central differences in luma per px, edge-clamped. Returns the two gradients and the edge strength scaled to 1.
function gradients(luma, w, h) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), edge = new Float32Array(w * h);
  const at = (x, y) => luma[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  let peak = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      gx[i] = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
      gy[i] = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
      edge[i] = Math.hypot(gx[i], gy[i]);
      if (edge[i] > peak) peak = edge[i];
    }
  }
  if (peak > 0) for (let i = 0; i < edge.length; i++) edge[i] /= peak;
  return { gx, gy, edge };
}

// The value of a second image at every pixel of the w by h image, by nearest uv. `read` picks the number from an RGBA pixel.
function resampled(image, w, h, read) {
  const src = pixelsOf(image), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor(((y + 0.5) / h) * src.height));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor(((x + 0.5) / w) * src.width));
      out[y * w + x] = read(src.data, (sy * src.width + sx) * 4);
    }
  }
  return out;
}

const lumaAt = (d, i) => (LUMA[0] * d[i] + LUMA[1] * d[i + 1] + LUMA[2] * d[i + 2]) / 255;
const alphaAt = (d, i) => d[i + 3] / 255;
const redAt = (d, i) => d[i] / 255;

function maskValues(mask, w, h) {
  const src = pixelsOf(mask);
  const hasAlpha = src.data.some((v, i) => i % 4 === 3 && v < 255);
  return resampled(src, w, h, hasAlpha ? alphaAt : lumaAt);
}

function cumulativeWeights({ luma, edge, maskV }, { threshold, gamma, edgeBoost }) {
  const cdf = new Float64Array(luma.length);
  let total = 0;
  for (let i = 0; i < cdf.length; i++) {
    const over = luma[i] - threshold;
    if (over > 0) total += over ** gamma * (1 + edgeBoost * edge[i]) * (maskV ? maskV[i] : 1);
    cdf[i] = total;
  }
  if (!(total > 0)) throw new Error('imagePoints: no pixel has weight (every pixel is under the threshold or outside the mask); lower threshold or check the mask');
  return cdf;
}

// The first index whose cumulative weight is above u.
function pick(cdf, u) {
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] > u) hi = mid; else lo = mid + 1;
  }
  return lo;
}

/** Pixel position of the point at (x, y) in -1..1 of an image of w by h px: the one mapping imagePoints and regions share. */
export const pixelOf = (x, y, w, h) => {
  const half = Math.max(w, h) / 2;
  return [Math.min(w - 1, Math.max(0, Math.floor(w / 2 + x * half))), Math.min(h - 1, Math.max(0, Math.floor(h / 2 - y * half)))];
};

export function imagePoints(image, options = {}) {
  const { count = 300000, seed = 1, threshold = 0.04, gamma = 1.6, edgeBoost = 0.5, jitter = 0.6, depthScale = 0.5, normalStrength = 6, mask = null, depth = null } = options;
  const px = pixelsOf(image), { width: w, height: h, data } = px;
  const luma = lumaOf(px);
  const { gx, gy, edge } = gradients(luma, w, h);
  const cdf = cumulativeWeights({ luma, edge, maskV: mask && maskValues(mask, w, h) }, { threshold, gamma, edgeBoost });
  const depthV = depth && resampled(depth, w, h, redAt);
  const random = rng(seed);
  const total = cdf[cdf.length - 1], half = Math.max(w, h) / 2;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), lumas = new Float32Array(count), normals = new Float32Array(count * 3);
  for (let n = 0; n < count; n++) {
    const i = pick(cdf, random() * total), x = i % w, y = (i - x) / w;
    const jx = x + 0.5 + (random() * 2 - 1) * jitter, jy = y + 0.5 + (random() * 2 - 1) * jitter;
    positions.set([(jx - w / 2) / half, (h / 2 - jy) / half, ((depthV ? depthV[i] : luma[i]) - 0.5) * depthScale], n * 3);
    colors.set([data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255], n * 3);
    lumas[n] = luma[i];
    const nx = -gx[i] * normalStrength, ny = gy[i] * normalStrength, len = Math.hypot(nx, ny, 1);
    normals.set([nx / len, ny / len, 1 / len], n * 3);
  }
  return { count, positions, colors, luma: lumas, normals, size: [w, h] };
}

const parseColor = (c) => (typeof c === 'string' ? [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) : c);

/** For each point of `cloud`, the index in `labels` (RGB 0..255 arrays or '#rrggbb') of the label colour nearest the label image pixel under it. */
export function regions(labelImage, labels, cloud) {
  if (labels.length > 256) throw new Error('regions: at most 256 labels');
  const { width, height, data } = pixelsOf(labelImage), colours = labels.map(parseColor);
  const out = new Uint8Array(cloud.count);
  for (let n = 0; n < cloud.count; n++) {
    const [x, y] = pixelOf(cloud.positions[n * 3], cloud.positions[n * 3 + 1], width, height), i = (y * width + x) * 4;
    let best = 0, bestD = Infinity;
    colours.forEach((c, k) => {
      const d = (c[0] - data[i]) ** 2 + (c[1] - data[i + 1]) ** 2 + (c[2] - data[i + 2]) ** 2;
      if (d < bestD) { bestD = d; best = k; }
    });
    out[n] = best;
  }
  return out;
}
