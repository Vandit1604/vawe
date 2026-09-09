// scripts/research/lightfield/lightfield-metrics.mjs: the measurements, defined once.
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

// The same block comparison, but over the WORST `frac` of the grid only.
//
// blockError is a mean, and a mean is a budget a fit is free to spend: it will trade one region deep
// into the ground to shave a fraction off everywhere else, and it did. Between two passes the
// aggregate improved from 7.3% to 6.9% while the magenta sample went from dE 36.7 to 59.1, which is
// the whole reason anyone was looking. That is docs/MISTAKES.md #272 again in a second costume: a
// number that cannot see the defect you were sent to fix is not a pass mark.
//
// So this reports the tail. `frac` 0.15 over a 24x14 grid is the worst ~50 blocks. A fit scored on
// it cannot buy the average by abandoning a region, because the abandoned region IS the score.
export function tailError(refBlocks, genBlocks, frac = 0.15) {
  const n = refBlocks.length / 3;
  const per = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    per[i] = (Math.abs(refBlocks[i * 3] - genBlocks[i * 3])
      + Math.abs(refBlocks[i * 3 + 1] - genBlocks[i * 3 + 1])
      + Math.abs(refBlocks[i * 3 + 2] - genBlocks[i * 3 + 2])) / 3;
  }
  per.sort();
  const take = Math.max(1, Math.round(n * frac));
  let sum = 0;
  for (let i = n - take; i < n; i++) sum += per[i];
  return sum / take;
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

// ---------------------------------------------------------------------------------------------
// REGIONS: the same picture graded where the light ISN'T.
//
// Everything above this line grades a mean, and a mean over a lit picture is a report on the lit
// part. The `ref` preset scored a mean sample dE of 12.7 and a human said "that is not it", because
// all four sample points sat in bright areas and the defect was in the dark ones: the reference's
// shadows are COOL (right third rgb(0,2,11), lower left rgb(23,12,35) violet) and the generated
// ones were WARM (rgb(11,4,4) and rgb(83,5,12)). No number here could see that. docs/MISTAKES.md
// #262 is titled "a fidelity metric that averages away the thing it is grading"; this is the same
// failure in a third costume.
//
// So: cut the frame into a coarse grid, split the cells into SHADOW / MID / HIGHLIGHT by the
// REFERENCE's own luma (the reference decides what a shadow is, never the render), and report each
// band separately. Report warmth, r minus b, because "warm or cool" is the axis the eye grades a
// shadow on and dE cannot tell a violet miss from a green one.

export const warmth = ({ r, b }) => r - b;

const GW = 8, GH = 5;

// Mean rgb per grid cell, from an already-decoded buffer at any size.
function cells(buf, w, h, gw = GW, gh = GH) {
  const out = [];
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      const x0 = Math.floor((cx * w) / gw), x1 = Math.floor(((cx + 1) * w) / gw);
      const y0 = Math.floor((cy * h) / gh), y1 = Math.floor(((cy + 1) * h) / gh);
      let r = 0, g = 0, b = 0, count = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 3;
        r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; count++;
      }
      out.push({ x: cx, y: cy, r: r / count, g: g / count, b: b / count });
    }
  }
  for (const c of out) c.luma = luma(c.r, c.g, c.b);
  return out;
}

/**
 * regions(refBuf, genBuf, w, h) -> { bands, worst, worstWarm, all }
 *
 * bands  one entry per tonal band, each with mean dE and mean warmth for both pictures.
 * worst  the single cell with the largest dE, whatever band it is in. A mean is a budget a fit is
 *        free to spend, so the tail is reported next to it and never folded into it.
 * worstWarm  the cell whose warmth is most wrong, which is a different question and usually a
 *        different cell: a shadow can be near-black in both pictures, tiny in dE, and still be red
 *        where the reference is violet.
 */
export function regions(refBuf, genBuf, w, h, gw = GW, gh = GH) {
  const A = cells(refBuf, w, h, gw, gh);
  const B = cells(genBuf, w, h, gw, gh);
  const all = A.map((a, i) => {
    const b = B[i];
    return {
      x: a.x, y: a.y, ref: a, gen: b,
      dE: Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b),
      refWarm: warmth(a), genWarm: warmth(b), warmDelta: warmth(b) - warmth(a),
    };
  });

  // The REFERENCE's luma terciles decide the bands. Using the render's own luma would let a field
  // that lost all its shadows redefine what a shadow is and then pass.
  const sorted = [...all].sort((p, q) => p.ref.luma - q.ref.luma);
  const third = Math.max(1, Math.round(sorted.length / 3));
  const split = [
    ['shadow', sorted.slice(0, third)],
    ['mid', sorted.slice(third, sorted.length - third)],
    ['highlight', sorted.slice(sorted.length - third)],
  ];
  const mean = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / xs.length;
  const bands = split.map(([name, xs]) => ({
    name,
    n: xs.length,
    dE: mean(xs, (c) => c.dE),
    worstDE: Math.max(...xs.map((c) => c.dE)),
    refWarm: mean(xs, (c) => c.refWarm),
    genWarm: mean(xs, (c) => c.genWarm),
    warmDelta: mean(xs, (c) => c.warmDelta),
  }));

  const worst = [...all].sort((p, q) => q.dE - p.dE)[0];
  const worstWarm = [...all].sort((p, q) => Math.abs(q.warmDelta) - Math.abs(p.warmDelta))[0];
  return { bands, worst, worstWarm, all };
}

// ---------------------------------------------------------------------------------------------
// BANDS: how many elements the field has, and how hard their edges are.
//
// striping() below answers "is the pattern crisp" as an amplitude. It cannot answer "are there 76
// bars or 102", and a field with the right crispness and half again too many bars is a different
// picture. Both questions come off ONE column-luma profile: average every row away, so what is left
// is the vertical structure alone.

// Mean luma per column. Rows are averaged out, so the colour field's vertical variation cannot be
// mistaken for a bar.
export function columnProfile(buf, w, h) {
  const p = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 3;
      s += luma(buf[i], buf[i + 1], buf[i + 2]);
    }
    p[x] = s / h;
  }
  return p;
}

/**
 * bandProfile(buf, w, h) -> { count, hardness, swing }
 *
 * count     local maxima in the column profile whose PROMINENCE clears a floor. Counting bare local
 *           maxima counts sensor noise; prominence (the drop to the lower of the two neighbouring
 *           valleys) is what makes a bar a bar. The floor is a fraction of the profile's own range,
 *           so the number does not change when the picture gets brighter.
 * hardness  mean |p[x] - p[x-1]| in luma units. High when the boundaries cut.
 * swing     standard deviation of the profile: how much light-to-dark the banding actually covers.
 *           hardness alone cannot tell 100 faint bars from 50 hard ones.
 */
export function bandProfile(buf, w, h, prominence = 0.04) {
  const p = columnProfile(buf, w, h);
  let lo = Infinity, hi = -Infinity, sum = 0;
  for (const v of p) { if (v < lo) lo = v; if (v > hi) hi = v; sum += v; }
  const floor = (hi - lo) * prominence;

  // Walk the profile as an alternating chain of extrema, dropping any swing smaller than the floor.
  // This is the standard prominence filter and it is done in one pass: a peak survives only if the
  // valleys on both sides are at least `floor` below it.
  const ext = [];
  for (let x = 1; x < p.length - 1; x++) {
    if (p[x] >= p[x - 1] && p[x] > p[x + 1]) ext.push({ x, v: p[x], max: true });
    else if (p[x] <= p[x - 1] && p[x] < p[x + 1]) ext.push({ x, v: p[x], max: false });
  }
  // Collapse the chain until every swing left in it clears the floor. The bound is the number of
  // extrema, because each pass removes two, and it must NOT be a fixed number of passes: a profile
  // with flat plateaus in it (which is what a field of solid silhouettes produces) throws off
  // hundreds of near-equal extrema, and a 64-pass cap left them in and reported 292 bands for a
  // picture with twelve panels. A metric that gives up quietly is worse than no metric.
  let chain = ext;
  for (let pass = 0; pass <= ext.length && chain.length > 1; pass++) {
    let smallest = Infinity, at = -1;
    for (let i = 1; i < chain.length; i++) {
      const d = Math.abs(chain[i].v - chain[i - 1].v);
      if (d < smallest) { smallest = d; at = i; }
    }
    if (at < 0 || smallest >= floor) break;
    chain = chain.filter((_, i) => i !== at && i !== at - 1);
  }
  const count = chain.filter((e) => e.max).length;

  let grad = 0;
  for (let x = 1; x < p.length; x++) grad += Math.abs(p[x] - p[x - 1]);
  const meanV = sum / p.length;
  let varr = 0;
  for (const v of p) varr += (v - meanV) * (v - meanV);
  return { count, hardness: grad / (p.length - 1), swing: Math.sqrt(varr / p.length) };
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
