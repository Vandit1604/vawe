// scripts/author/lightfield-compare.mjs: measure a generated field against the reference.
//
//   node scripts/author/lightfield-compare.mjs refs/lightfield-ref.jpg out/lightfield-ref.png
//
// "Looks close" is not a claim anybody can check, so this prints numbers:
//   - mean luma and mean R, G, B over the whole frame
//   - the four sampled colours, at their positions in the reference
//   - a 24x14 block grid, mean absolute difference per channel, and the worst blocks
//
// ffmpeg does the decoding, so there is no image library to install and no version to drift.

import { execFileSync } from 'node:child_process';

const BW = 24;
const BH = 14;

// Decode any image to a raw RGB buffer at a given size.
function pixels(file, w, h) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  if (buf.length !== w * h * 3) throw new Error(`ffmpeg returned ${buf.length} bytes for ${file}, expected ${w * h * 3}`);
  return buf;
}

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function stats(buf, w, h) {
  let r = 0, g = 0, b = 0, y = 0;
  for (let i = 0; i < w * h; i++) {
    const R = buf[i * 3], G = buf[i * 3 + 1], B = buf[i * 3 + 2];
    r += R; g += G; b += B; y += luma(R, G, B);
  }
  const nPx = w * h;
  return { r: r / nPx, g: g / nPx, b: b / nPx, luma: y / nPx };
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// Read a small patch, not one pixel: a single pixel of a slatted field lands on a bright edge or a
// dark seam and tells you nothing about the colour there.
function patch(buf, w, h, fx, fy, rad = 0.02) {
  const x0 = Math.max(0, Math.round((fx - rad) * w)), x1 = Math.min(w - 1, Math.round((fx + rad) * w));
  const y0 = Math.max(0, Math.round((fy - rad) * h)), y1 = Math.min(h - 1, Math.round((fy + rad) * h));
  let r = 0, g = 0, b = 0, count = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * w + x) * 3;
    r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; count++;
  }
  return { r: r / count, g: g / count, b: b / count };
}

// The four samples named in the brief, at where they are in the reference.
const SAMPLES = [
  // Positions read OFF the reference, not guessed. A 24x14 dump located each hue: the bloom is
  // upper right of centre, not centre; the magenta sits mid-frame, not at the bottom.
  { name: 'bloom', x: 0.65, y: 0.08 },
  { name: 'deep red', x: 0.04, y: 0.32 },
  { name: 'magenta', x: 0.44, y: 0.47 },
  { name: 'right edge', x: 0.97, y: 0.50 },
];

const [refFile, genFile] = process.argv.slice(2);
if (!refFile || !genFile) {
  console.error('usage: node scripts/author/lightfield-compare.mjs <reference> <generated>');
  process.exit(1);
}

// Full-size pass for the mean and the samples, block pass for the structure.
const W = 735, H = 420;
const a = pixels(refFile, W, H);
const b = pixels(genFile, W, H);
const sa = stats(a, W, H);
const sb = stats(b, W, H);

const row = (label, x, y, z) => `  ${label.padEnd(14)} ${x.padStart(9)} ${y.padStart(9)} ${z.padStart(9)}`;
const f1 = (v) => v.toFixed(1);

console.log(`reference  ${refFile}`);
console.log(`generated  ${genFile}\n`);
console.log('MEAN (whole frame)');
console.log(row('', 'ref', 'gen', 'delta'));
for (const k of ['luma', 'r', 'g', 'b']) console.log(row(k, f1(sa[k]), f1(sb[k]), f1(sb[k] - sa[k])));

console.log('\nSAMPLES (mean of a 2% patch at the reference position)');
console.log(row('', 'ref', 'gen', 'dE'));
let sampleErr = 0;
for (const s of SAMPLES) {
  const pa = patch(a, W, H, s.x, s.y);
  const pb = patch(b, W, H, s.x, s.y);
  const d = Math.hypot(pa.r - pb.r, pa.g - pb.g, pa.b - pb.b);
  sampleErr += d;
  console.log(row(s.name, hex(pa.r, pa.g, pa.b), hex(pb.r, pb.g, pb.b), f1(d)));
}
console.log(row('mean', '', '', f1(sampleErr / SAMPLES.length)));

// Block difference: downsample hard, so slat phase cancels and what is left is the colour field.
const ga = pixels(refFile, BW, BH);
const gb = pixels(genFile, BW, BH);
let mad = 0;
const worst = [];
for (let i = 0; i < BW * BH; i++) {
  const d = (Math.abs(ga[i * 3] - gb[i * 3]) + Math.abs(ga[i * 3 + 1] - gb[i * 3 + 1]) + Math.abs(ga[i * 3 + 2] - gb[i * 3 + 2])) / 3;
  mad += d;
  worst.push({ d, x: i % BW, y: (i / BW) | 0, ref: hex(ga[i * 3], ga[i * 3 + 1], ga[i * 3 + 2]), gen: hex(gb[i * 3], gb[i * 3 + 1], gb[i * 3 + 2]) });
}
mad /= BW * BH;
worst.sort((p, q) => q.d - p.d);
console.log(`\nBLOCK GRID ${BW}x${BH}`);
console.log(`  mean absolute difference per channel   ${mad.toFixed(2)} / 255   (${((mad / 255) * 100).toFixed(1)}%)`);
console.log('  worst blocks:');
for (const w of worst.slice(0, 5)) console.log(`    (${String(w.x).padStart(2)},${String(w.y).padStart(2)})  ref ${w.ref}  gen ${w.gen}  d ${w.d.toFixed(0)}`);
