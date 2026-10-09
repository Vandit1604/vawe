// harness/lib/ref-measure/colour.mjs: the colour of a film, measured in Lab on frames the spec already decoded.
// Colours per shot and per film (k-means, merged by distance), chroma, and the value structure.
// Port of the reliable colour measures of the python prototype (measures.md, "Palette per shot").
import { r1, r3, percentile } from '../move-fit.mjs';

export const SAMPLE_W = 96;
export const KMEANS_K = 8;
export const KMEANS_ITERATIONS = 20;
export const MERGE_DE = 10;
export const MIN_SHARE = 0.03;
export const MIN_SHOT_FRAMES = 1;
export const SHOT_FRAMES = 3;
export const MAX_STAT_PIXELS = 200000;
export const DARK_L = 20;
export const LIGHT_L = 85;

const LINEAR = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const WHITE = [0.95047, 1, 1.08883];
const labF = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

export function rgbToLab(r, g, b, out, o = 0) {
  const lr = LINEAR[r], lg = LINEAR[g], lb = LINEAR[b];
  const fx = labF((0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / WHITE[0]);
  const fy = labF(0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb);
  const fz = labF((0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / WHITE[2]);
  out[o] = 116 * fy - 16; out[o + 1] = 500 * (fx - fy); out[o + 2] = 200 * (fy - fz);
}

// Frame f of V as Lab, box-averaged down to about SAMPLE_W pixels wide: three floats per pixel.
export function frameLab(V, f, sampleW = SAMPLE_W) {
  const ow = Math.min(sampleW, V.w), oh = Math.max(1, Math.round((ow * V.h) / V.w));
  const out = new Float32Array(ow * oh * 3), base = f * V.w * V.h * 3;
  for (let y = 0; y < oh; y++) {
    const y0 = Math.floor((y * V.h) / oh), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * V.h) / oh));
    for (let x = 0; x < ow; x++) {
      const x0 = Math.floor((x * V.w) / ow), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * V.w) / ow));
      let r = 0, g = 0, b = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const o = base + (yy * V.w + xx) * 3;
        r += V.rgb[o]; g += V.rgb[o + 1]; b += V.rgb[o + 2];
      }
      const n = (y1 - y0) * (x1 - x0);
      rgbToLab(Math.round(r / n), Math.round(g / n), Math.round(b / n), out, (y * ow + x) * 3);
    }
  }
  return out;
}

export const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Farthest-point start from the middle point, then Lloyd's algorithm: the same input gives the same clusters.
export function kmeans(pts, k = KMEANS_K) {
  const n = pts.length / 3, at = (i) => [pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]];
  const dist2 = (i, c) => (pts[i * 3] - c[0]) ** 2 + (pts[i * 3 + 1] - c[1]) ** 2 + (pts[i * 3 + 2] - c[2]) ** 2;
  const centers = [at(Math.floor(n / 2))], nearest = new Float64Array(n).fill(Infinity);
  while (centers.length < k) {
    const last = centers[centers.length - 1];
    let far = -1, farD = 1e-6;
    for (let i = 0; i < n; i++) {
      nearest[i] = Math.min(nearest[i], dist2(i, last));
      if (nearest[i] > farD) { farD = nearest[i]; far = i; }
    }
    if (far < 0) break;
    centers.push(at(far));
  }
  const label = new Int32Array(n).fill(-1);
  for (let it = 0; it < KMEANS_ITERATIONS; it++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    let moved = 0;
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < centers.length; j++) { const d = dist2(i, centers[j]); if (d < bd) { bd = d; best = j; } }
      if (label[i] !== best) { label[i] = best; moved++; }
      const s = sum[best];
      s[0] += pts[i * 3]; s[1] += pts[i * 3 + 1]; s[2] += pts[i * 3 + 2]; s[3]++;
    }
    sum.forEach((s, j) => { if (s[3]) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (!moved) break;
  }
  const count = centers.map(() => 0);
  for (let i = 0; i < n; i++) count[label[i]]++;
  return { centers, weights: count.map((c) => c / n) };
}

// Greedy, largest first: a cluster within thr of one already kept joins it, as a weighted mean.
export function mergeClusters(centers, weights, thr = MERGE_DE) {
  const order = centers.map((_, i) => i).sort((a, b) => weights[b] - weights[a] || a - b), out = [];
  for (const i of order) {
    const hit = out.find((o) => deltaE(o.lab, centers[i]) < thr);
    if (!hit) { out.push({ lab: [...centers[i]], share: weights[i] }); continue; }
    const tot = hit.share + weights[i];
    hit.lab = hit.lab.map((v, c) => (v * hit.share + centers[i][c] * weights[i]) / tot);
    hit.share = tot;
  }
  return out.sort((a, b) => b.share - a.share);
}

const evenFrames = (f0, f1, n = SHOT_FRAMES) => [...new Set(Array.from({ length: n }, (_, i) => (n === 1 ? f0 : f0 + Math.floor((i * (f1 - 1 - f0)) / (n - 1)))))];

// The merged clusters of one shot: up to SHOT_FRAMES frames pooled, each Lab pixel counted once.
export function shotClusters(V, f0, f1) {
  const parts = evenFrames(f0, f1).map((f) => frameLab(V, f));
  const pts = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { pts.set(p, o); o += p.length; }
  const { centers, weights } = kmeans(pts);
  return mergeClusters(centers, weights);
}

const round1 = (lab) => lab.map(r1);

// shots: [{ f0, f1 }] in frames of V. Returns the colour block of spec.json; perShot also feeds worldTurns.
export function measureColour(V, shots, fps) {
  const perShot = [], pooled = [];
  shots.forEach((s, i) => {
    if (s.f1 - s.f0 < MIN_SHOT_FRAMES) return;
    const big = shotClusters(V, s.f0, s.f1).filter((c) => c.share > MIN_SHARE);
    if (!big.length) return;
    perShot.push({ shot: i + 1, t0: r3(s.f0 / fps), colours: big.length, dominant: round1(big[0].lab), shares: big.map((c) => r3(c.share)) });
    for (const c of big) pooled.push({ lab: c.lab, w: c.share * (s.f1 - s.f0) });
  });
  const distinct = pooled.length ? mergeClusters(pooled.map((p) => p.lab), pooled.map((p) => p.w)).length : null;
  const stats = pixelStats(V);
  return { sampleWidth: Math.min(SAMPLE_W, V.w), perShot, coloursPerShotMedian: percentile(perShot.map((s) => s.colours), 50), coloursDistinct: distinct, ...stats };
}

// Chroma and value over every second frame, thinned to MAX_STAT_PIXELS by a fixed stride.
export function pixelStats(V) {
  const frames = [];
  for (let f = 0; f < V.n; f += 2) frames.push(frameLab(V, f));
  const total = frames.reduce((s, p) => s + p.length / 3, 0), stride = Math.max(1, Math.ceil(total / MAX_STAT_PIXELS));
  const chroma = [], L = [];
  let k = 0;
  for (const p of frames) for (let i = 0; i < p.length; i += 3, k++) {
    if (k % stride) continue;
    chroma.push(Math.hypot(p[i + 1], p[i + 2]));
    L.push(p[i]);
  }
  const mean = L.reduce((a, b) => a + b, 0) / L.length;
  return { chromaMedian: r1(percentile(chroma, 50)), chromaP90: r1(percentile(chroma, 90)),
    shareDark: r3(L.filter((v) => v < DARK_L).length / L.length), shareLight: r3(L.filter((v) => v > LIGHT_L).length / L.length),
    lStd: r1(Math.sqrt(L.reduce((a, b) => a + (b - mean) ** 2, 0) / L.length)) };
}
