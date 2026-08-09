// scripts/author/lightfield-seeds.mjs: search the seed space for the layout closest to a reference.
//
//   node scripts/author/lightfield-seeds.mjs refs/lightfield-ref.jpg [howMany]
//
// The seed decides where the light sits, and that is ten numbers at once. Searching it through the
// browser costs about a second a candidate, so a few hundred tries is all you get, and a few hundred
// samples of a ten-dimensional space finds nothing. This scores the colour field ARITHMETICALLY
// instead, straight off `fieldBlobs`, and does a quarter of a million in under a minute.
//
// It is a model, so it is approximate: it composites the blobs and skips the pattern, the shadow and
// the blend. It is used only to RANK layouts. The winners then go through the real renderer in
// lightfield-fit.mjs, which is what the reported number comes from.

import { execFileSync } from 'node:child_process';
import { fieldBlobs } from '../../core/lightfield/index.js';
import { toRgb, mix } from '../../core/lightfield/colour.js';
import { PRESETS } from './lightfield-presets.mjs';

const BW = 24, BH = 14;
const refFile = process.argv[2] || 'refs/lightfield-ref.jpg';
const want = Number(process.argv[3] || 250000);

const ref = execFileSync('ffmpeg', ['-v', 'error', '-i', refFile, '-vf', `scale=${BW}:${BH}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 24 });

const opts = structuredClone(PRESETS.ref);
const rgbArr = (hex) => { const c = toRgb(hex); return [c.r, c.g, c.b]; };
const base0 = rgbArr(mix(opts.colour.deep, opts.colour.ground, 0.35));
const base1 = rgbArr(mix(opts.colour.deep, opts.colour.ground, 0.7));
const base2 = rgbArr(opts.colour.ground);

// Sample points, in percent of the FIELD element. The element is inset -4%, so it runs from -4 to
// 104 percent of the frame and every position has to be mapped into it.
const pts = [];
for (let by = 0; by < BH; by++) {
  for (let bx = 0; bx < BW; bx++) {
    const fx = ((bx + 0.5) / BW) * 100, fy = ((by + 0.5) / BH) * 100;
    pts.push({ x: ((fx + 4) / 108) * 100, y: ((fy + 4) / 108) * 100 });
  }
}

// The base gradient runs at 100deg, so its progress is mostly across and slightly down.
const RAD = ((100 - 90) * Math.PI) / 180;
const baseAt = (p) => {
  const t = Math.min(1, Math.max(0, (p.x / 100) * Math.cos(RAD) + (p.y / 100) * Math.sin(RAD)));
  return t < 0.52
    ? [base0[0] + (base1[0] - base0[0]) * (t / 0.52), base0[1] + (base1[1] - base0[1]) * (t / 0.52), base0[2] + (base1[2] - base0[2]) * (t / 0.52)]
    : [base1[0] + (base2[0] - base1[0]) * ((t - 0.52) / 0.48), base1[1] + (base2[1] - base1[1]) * ((t - 0.52) / 0.48), base1[2] + (base2[2] - base1[2]) * ((t - 0.52) / 0.48)];
};
const BASE = pts.map(baseAt);

// Alpha of one blob at one point: full at the centre, 0.62 of it at 42% out, gone by 88%.
function alphaAt(b, p) {
  const dx = (p.x - b.x) / b.rx, dy = (p.y - b.y) / b.ry;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= 0.88) return 0;
  if (d <= 0.42) return b.a * (1 - (d / 0.42) * 0.38);
  return b.a * 0.62 * (1 - (d - 0.42) / 0.46);
}

let best = [];
for (let seed = 0; seed < want; seed++) {
  const blobs = fieldBlobs({ ...opts, seed }).map((b) => ({ ...b, rgb: toRgb(b.hex) }));
  // Least squares gain, so the search ranks LAYOUT and is not distracted by the fact that the
  // pattern and the shadow will darken everything by some constant factor later.
  let num = 0, den = 0;
  const model = new Float64Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    let r = BASE[i][0], g = BASE[i][1], b = BASE[i][2];
    for (let k = blobs.length - 1; k >= 0; k--) {
      const a = alphaAt(blobs[k], pts[i]);
      if (a <= 0) continue;
      r += (blobs[k].rgb.r - r) * a; g += (blobs[k].rgb.g - g) * a; b += (blobs[k].rgb.b - b) * a;
    }
    model[i * 3] = r; model[i * 3 + 1] = g; model[i * 3 + 2] = b;
    num += ref[i * 3] * r + ref[i * 3 + 1] * g + ref[i * 3 + 2] * b;
    den += r * r + g * g + b * b;
  }
  const gain = Math.min(1.5, Math.max(0.3, den ? num / den : 1));
  let err = 0;
  for (let i = 0; i < model.length; i++) err += Math.abs(ref[i] - gain * model[i]);
  err /= model.length;
  if (best.length < 24 || err < best[best.length - 1].err) {
    best.push({ seed, err, gain });
    best.sort((a, b) => a.err - b.err);
    best = best.slice(0, 24);
  }
}

console.log(`searched ${want} seeds against ${refFile}`);
for (const b of best.slice(0, 24)) console.log(`  seed ${String(b.seed).padStart(7)}  modelled err ${b.err.toFixed(2)}  gain ${b.gain.toFixed(2)}`);
console.log('\nSEEDS=' + best.map((b) => b.seed).join(','));
