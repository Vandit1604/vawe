// scripts/research/lightfield/lightfield-compare.mjs: measure a generated field against the reference.
//
//   node scripts/research/lightfield/lightfield-compare.mjs refs/lightfield-ref.jpg out/lightfield-ref.png
//
// "Looks close" is not a claim anybody can check, so this prints numbers:
//   - mean luma and mean R, G, B over the whole frame
//   - TONAL BANDS: dE and warm/cool, graded separately in the shadows, the mids and the highlights
//   - the WORST region, and the region whose temperature is most wrong
//   - the four sampled colours, at their positions in the reference
//   - BANDS: how many vertical elements there are and how hard their edges cut
//   - a 24x14 block grid, mean absolute difference per channel
//   - the STRIPING: how hard the pattern cuts, at full resolution
//
// The block grid deliberately averages the pattern away so it can judge the colour field. That
// makes it blind to whether the bars are crisp or mushy, which is a real defect it will happily
// call a pass. The striping numbers below are the half it cannot see, and they are reported
// separately because they are a separate question.
//
// THE SHADOW SECTION EXISTS BECAUSE THIS TOOL ONCE PASSED A PICTURE A HUMAN REJECTED. It scored the
// `ref` preset at a mean sample dE of 12.7 while the render's shadows were warm red and the
// reference's were violet and navy. The four sample points were all in bright areas, so no number
// printed here could see the one thing that was wrong. Every mean below is now printed beside its
// tail, and the dark end of the picture is graded on its own. docs/MISTAKES.md #272.
//
// ffmpeg does the decoding, so there is no image library to install and no version to drift.

import { pixels, luma, means, striping, blockError, chroma, regions, bandProfile, warmth } from './lightfield-metrics.mjs';

const BW = 24;
const BH = 14;

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
  console.error('usage: node scripts/research/lightfield/lightfield-compare.mjs <reference> <generated>');
  process.exit(1);
}

// Full-size pass for the mean and the samples, block pass for the structure.
const W = 735, H = 420;
const a = pixels(refFile, W, H);
const b = pixels(genFile, W, H);
const sa = means(a, W, H);
const sb = means(b, W, H);

const row = (label, x, y, z) => `  ${label.padEnd(14)} ${x.padStart(9)} ${y.padStart(9)} ${z.padStart(9)}`;
const f1 = (v) => v.toFixed(1);

console.log(`reference  ${refFile}`);
console.log(`generated  ${genFile}\n`);
console.log('MEAN (whole frame)');
console.log(row('', 'ref', 'gen', 'delta'));
for (const k of ['luma', 'r', 'g', 'b']) console.log(row(k, f1(sa[k]), f1(sb[k]), f1(sb[k] - sa[k])));
const ca = chroma(a, W, H), cb = chroma(b, W, H);
console.log(row('chroma', f1(ca), f1(cb), f1(cb - ca) + `  ${(cb / ca).toFixed(2)}x`));

// ---------------------------------------------------------------------------------------------
// The dark end of the picture, on its own. This is the section that would have caught the miss.
const reg = regions(a, b, W, H);
const warmWord = (v) => (v > 6 ? 'warm' : v < -6 ? 'cool' : 'neutral');
console.log('\nTONAL BANDS (8x5 grid, split by the REFERENCE luma)');
console.log(`  ${'band'.padEnd(10)} ${'dE'.padStart(6)} ${'worst'.padStart(6)}   `
  + `${'ref r-b'.padStart(8)} ${'gen r-b'.padStart(8)} ${'delta'.padStart(7)}`);
for (const t of reg.bands) {
  console.log(`  ${t.name.padEnd(10)} ${f1(t.dE).padStart(6)} ${f1(t.worstDE).padStart(6)}   `
    + `${f1(t.refWarm).padStart(8)} ${f1(t.genWarm).padStart(8)} ${f1(t.warmDelta).padStart(7)}`
    + `   ref ${warmWord(t.refWarm)}, gen ${warmWord(t.genWarm)}`);
}
const cell = (c) => `(${c.x},${c.y})  ref ${hex(c.ref.r, c.ref.g, c.ref.b)}  gen ${hex(c.gen.r, c.gen.g, c.gen.b)}`;
console.log(`  worst region       ${cell(reg.worst)}  dE ${f1(reg.worst.dE)}`);
console.log(`  worst temperature  ${cell(reg.worstWarm)}  r-b ${f1(reg.worstWarm.refWarm)} vs ${f1(reg.worstWarm.genWarm)}`);

if (/lightfield-ref/.test(refFile)) {
  console.log('\nSAMPLES (2% patch; positions fitted to refs/lightfield-ref.jpg, meaningless elsewhere)');
  console.log(row('', 'ref', 'gen', 'dE'));
  let sampleErr = 0;
  for (const s of SAMPLES) {
    const pa = patch(a, W, H, s.x, s.y);
    const pb = patch(b, W, H, s.x, s.y);
    const d = Math.hypot(pa.r - pb.r, pa.g - pb.g, pa.b - pb.b);
    sampleErr += d;
    console.log(row(s.name, hex(pa.r, pa.g, pa.b), hex(pb.r, pb.g, pb.b), f1(d))
      + `   r-b ${f1(warmth(pa)).padStart(6)} ${f1(warmth(pb)).padStart(6)}`);
  }
  console.log(row('mean', '', '', f1(sampleErr / SAMPLES.length)));
}

const ba = bandProfile(a, W, H);
const bb = bandProfile(b, W, H);
console.log('\nBANDS (column-luma profile: how many elements, how hard they cut)');
console.log(row('', 'ref', 'gen', 'gen/ref'));
console.log(row('count', String(ba.count), String(bb.count), (bb.count / ba.count).toFixed(2) + 'x'));
console.log(row('hardness', f1(ba.hardness), f1(bb.hardness), (bb.hardness / ba.hardness).toFixed(2) + 'x'));
console.log(row('swing', f1(ba.swing), f1(bb.swing), (bb.swing / ba.swing).toFixed(2) + 'x'));

const ta = striping(a, W, H);
const tb = striping(b, W, H);
console.log('\nSTRIPING (full resolution, luma)');
console.log(row('', 'ref', 'gen', 'gen/ref'));
console.log(row('edge', f1(ta.edge), f1(tb.edge), (tb.edge / ta.edge).toFixed(2) + 'x'));
console.log(row('swing', f1(ta.swing), f1(tb.swing), (tb.swing / ta.swing).toFixed(2) + 'x'));

// Block difference: downsample hard, so slat phase cancels and what is left is the colour field.
const ga = pixels(refFile, BW, BH);
const gb = pixels(genFile, BW, BH);
const mad = blockError(ga, gb);
const worst = [];
for (let i = 0; i < BW * BH; i++) {
  const d = (Math.abs(ga[i * 3] - gb[i * 3]) + Math.abs(ga[i * 3 + 1] - gb[i * 3 + 1]) + Math.abs(ga[i * 3 + 2] - gb[i * 3 + 2])) / 3;
  worst.push({ d, x: i % BW, y: (i / BW) | 0, ref: hex(ga[i * 3], ga[i * 3 + 1], ga[i * 3 + 2]), gen: hex(gb[i * 3], gb[i * 3 + 1], gb[i * 3 + 2]) });
}
worst.sort((p, q) => q.d - p.d);
console.log(`\nBLOCK GRID ${BW}x${BH}`);
console.log(`  mean absolute difference per channel   ${mad.toFixed(2)} / 255   (${((mad / 255) * 100).toFixed(1)}%)`);
console.log('  worst blocks:');
for (const w of worst.slice(0, 5)) console.log(`    (${String(w.x).padStart(2)},${String(w.y).padStart(2)})  ref ${w.ref}  gen ${w.gen}  d ${w.d.toFixed(0)}`);
