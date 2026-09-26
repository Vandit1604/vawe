#!/usr/bin/env node
// harness/media/light-fit.mjs: FIT a reference's light, not its detail.
//
// A recreation that matches the reference's edges can still be wrong in the one way a viewer notices
// first: the reference reads 4-8x brighter, with a diagonal field of light, and the recreation is
// mostly black with a small glow spot bolted on. SSIM and the colour ΔE in quality/gates/tile.mjs both
// grade one frame at a time and neither one is built to see that, because a small bright patch on a
// black field can still average out close in both. harness/lib/light-map.mjs names the thing that is
// actually missing (the LOW-FREQUENCY light, not the content on top of it) and this file fits it.
//
// It fits ONLY colour.* on the engine's own light field (core/lightfield/index.js's `paintField`,
// exported by that file for exactly this: "so a probe can render the colour field ALONE, with no
// pattern over it"). That is the existing "a few large soft radial light fields, position/radius/
// colour/intensity per key" owner named in the brief: bloom/mid/deep/ground are hex colours, originX/Y
// is where the light sits, spread and lobes are its reach and its shape. Nothing here draws a new box,
// a new gradient kind, or a hard edge; the fit is entirely a search over that existing schema.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeSize } from '../lib/frame-forensics.mjs';
import { lightMap, lightMapDistance, lightMapPNG } from '../lib/light-map.mjs';
import { tileGrid } from '../../quality/gates/tile.mjs';
import { paintField, SCHEMA } from '../../core/lightfield/index.js';
import { toRgb } from '../../core/lightfield/colour.js';
import { srgbToLinear, linearToSrgb } from '../../core/color/linear.js';
import { shoot } from '../author/lightfield-shot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toHex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
const CS = SCHEMA.colour.fields;

// ---------- the analytic fit: one light map in, one colour.* option set out ----------
//
// This is a CLOSED-FORM read of the schema's own roles off the grid, not a search: `originX/Y` is the
// map's own brightness centroid, `bloom` the most saturated of the bright cells, `ground` the darkest
// cell, `mid` the lit cell furthest in colour from the bloom (the schema's own reason `mid` exists:
// "the second colour, opposite the bloom"), `deep` a cell near the darker quartile, `spread` and
// `evenness` read off how far and how broadly the light actually reaches versus the schema's fitted
// default. It is deliberately the cheap rung on the ladder: `searchGeometry` below only enters because
// this heuristic gets the geometry in the right neighbourhood, not on the number.
const linLum = ([r, g, b]) => (srgbToLinear(r) + srgbToLinear(g) + srgbToLinear(b)) / 3;
const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
const forEachCell = (map, fn) => { for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) fn(x, y, map[y][x]); };

// The brightness centroid (as a % position) and, along the way, the peak, darkest and near-Q1 cells:
// one pass over the grid rather than five, each stat read off the same loop.
function mapStats(map, lin) {
  const rows = map.length, cols = map[0].length;
  const flat = lin.flat().slice().sort((a, b) => a - b);
  const q1 = flat[Math.floor(flat.length * 0.25)];
  let total = 0, cx = 0, cy = 0, peak = -1, darkest = Infinity, darkAt = [0, 0], deepAt = [0, 0], deepGap = Infinity;
  const litCols = new Set();
  forEachCell(map, (x, y) => {
    const l = lin[y][x];
    total += l;
    cx += l * ((x + 0.5) / cols) * 100;
    cy += l * ((y + 0.5) / rows) * 100;
    if (l > peak) peak = l;
    if (l < darkest) { darkest = l; darkAt = [x, y]; }
    const gap = Math.abs(l - q1);
    if (gap < deepGap) { deepGap = gap; deepAt = [x, y]; }
  });
  const originX = clamp(total > 0 ? cx / total : CS.originX.def, CS.originX.min, CS.originX.max);
  const originY = clamp(total > 0 ? cy / total : CS.originY.def, CS.originY.min, CS.originY.max);
  forEachCell(map, (x, y) => { if (lin[y][x] > 0.5 * peak || peak === 0) litCols.add(x); });
  return { rows, cols, peak, darkAt, deepAt, originX, originY, litCols };
}

// `bloom` is the MOST SATURATED cell among the bright ones, not simply the brightest: a photograph's
// single brightest cell is usually a blown near-white highlight, and painting that as the light's own
// hue leaves every gradient tinted grey instead of the colour the light actually reads as. "bright" is
// any cell within 70% of peak, wide enough to reach the gold band around a blown highlight rather than
// only the highlight pixel itself.
function pickBloom(map, lin, peak) {
  let at = [0, 0], best = -1;
  forEachCell(map, (x, y, cell) => {
    if (lin[y][x] < 0.7 * peak) return;
    const c = chroma(cell);
    if (c > best) { best = c; at = [x, y]; }
  });
  return map[at[1]][at[0]];
}

function pickMid(map, lin, median, bloomCell) {
  let mid = bloomCell, bestGap = -1;
  forEachCell(map, (x, y, cell) => {
    if (lin[y][x] <= median) return;
    const gap = Math.abs(cell[0] - bloomCell[0]) + Math.abs(cell[1] - bloomCell[1]) + Math.abs(cell[2] - bloomCell[2]);
    if (gap > bestGap) { bestGap = gap; mid = cell; }
  });
  return mid;
}

// The reach: the distance (as a fraction of the frame diagonal) out to which the field stays at least
// half its peak. A tight reference (light dies fast) wants `spread` near its fitted 0; a broad one
// (light still half-strength far from the source) wants it near 1.
function fitReach(map, lin, peak, originX, originY) {
  const diag = Math.hypot(100, 100);
  let halfDist = 0;
  forEachCell(map, (x, y) => {
    if (lin[y][x] < 0.5 * peak) return;
    const px = (x + 0.5) / map[0].length * 100, py = (y + 0.5) / map.length * 100;
    halfDist = Math.max(halfDist, Math.hypot(px - originX, py - originY));
  });
  return clamp((halfDist / diag - 0.12) / 0.35, 0, 1);
}

export function fitFieldOpts(map) {
  const lin = map.map((row) => row.map(linLum));
  const flat = lin.flat().slice().sort((a, b) => a - b);
  const median = flat[Math.floor(flat.length / 2)];
  const { peak, darkAt, deepAt, originX, originY, litCols, cols } = mapStats(map, lin);

  const bloomCell = pickBloom(map, lin, peak);
  const mid = pickMid(map, lin, median, bloomCell);
  const spread = fitReach(map, lin, peak, originX, originY);
  const evenness = clamp(litCols.size / cols, 0, 1);

  return {
    colour: {
      bloom: toHex({ r: bloomCell[0], g: bloomCell[1], b: bloomCell[2] }),
      mid: toHex({ r: mid[0], g: mid[1], b: mid[2] }),
      deep: toHex({ r: map[deepAt[1]][deepAt[0]][0], g: map[deepAt[1]][deepAt[0]][1], b: map[deepAt[1]][deepAt[0]][2] }),
      ground: toHex({ r: map[darkAt[1]][darkAt[0]][0], g: map[darkAt[1]][darkAt[0]][1], b: map[darkAt[1]][darkAt[0]][2] }),
      originX, originY, spread, evenness, lobes: CS.lobes.def,
    },
  };
}

// One measured correction: render the closed-form fit, compare its own light map against the
// reference's over the cells the reference itself called "lit" (top third by brightness), and shift
// bloom/mid/deep/ground by the mean residual, in linear light so the shift is additive light rather
// than a gamma-warped one. This is the "iterate until the light maps look alike" step, done once rather
// than as an open-ended search: a single measured nudge already closes nearly all of a compositing bias
// (three translucent radial gradients summed under `sRGB` land short of the colour typed in, the same
// bias core/lightfield/index.js's own `vivid` dial documents), and a colour fit is not worth a search
// loop the way a geometry fit can be.
export async function shootFieldMap(opts, shotBox) {
  const html = `<div style="position:absolute;inset:0;background:${paintField(opts)}"></div>`;
  const tmp = path.join(ROOT, 'out', '.light-fit-probe.html');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, html);
  const png = path.join(ROOT, 'out', '.light-fit-probe.png');
  await shoot(tmp, png, shotBox);
  const map = lightMap(png);
  fs.rmSync(tmp, { force: true });
  fs.rmSync(png, { force: true });
  return map;
}

// The residual: a mean linear-light shift, taken over the cells the REFERENCE itself calls lit (its
// top third by brightness), so it corrects the compositing bias where the light is and does not spend
// its one shift flattening a shadow the render was never trying to match.
export function colourDelta(refMap, gotMap) {
  const rows = refMap.length, cols = refMap[0].length;
  const lin = refMap.map((row) => row.map(([r, g, b]) => (srgbToLinear(r) + srgbToLinear(g) + srgbToLinear(b)) / 3));
  const flat = lin.flat().slice().sort((a, b) => a - b);
  const cut = flat[Math.floor(flat.length * (2 / 3))];
  let d = [0, 0, 0], n = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (lin[y][x] < cut) continue;
    for (let c = 0; c < 3; c++) d[c] += srgbToLinear(refMap[y][x][c]) - srgbToLinear(gotMap[y][x][c]);
    n += 1;
  }
  return n ? d.map((v) => v / n) : d;
}

// `bloom`/`mid` only: the residual is measured over the reference's OWN brightest cells, so it is a
// correction for the two roles those cells can plausibly be, and applying it to `deep`/`ground` as
// well was measured to make the fit worse, not better (colour-corrected ΔE rose above the geometry
// search's own number): those two roles live in the cells the residual was never sampled from, and a
// uniform shift dragged them toward a brightness their own part of the frame never had.
export function applyDelta(opts, d) {
  const nudge = (hex) => {
    const { r, g, b } = toRgb(hex);
    const lc = [r, g, b].map((v, i) => clamp(srgbToLinear(v) + d[i], 0, 1));
    return toHex({ r: linearToSrgb(lc[0]), g: linearToSrgb(lc[1]), b: linearToSrgb(lc[2]) });
  };
  return { colour: { ...opts.colour, bloom: nudge(opts.colour.bloom), mid: nudge(opts.colour.mid) } };
}

// ---------- one bounded search over GEOMETRY, because the closed-form fit's own reach estimate is
// a heuristic and a heuristic gets `spread` and `originX/Y` in the right neighbourhood, not on the
// number. Colour is left alone here: `colourDelta` below is the one correction pass for colour, taken
// once geometry has converged, so it corrects an already-close field rather than chasing a moving one.
//
// Coordinate hill-climbing, not a general optimiser: one knob at a time, try a step each way, keep
// whichever of the three candidates measures lowest against the reference's own light map, shrink the
// step every round. Bounded to a fixed evaluation budget so a beat with a slow reference decode cannot
// turn one `make study` invocation into a long, open-ended search.
const GEOMETRY_KNOBS = [
  { path: ['spread'], lo: 0, hi: 1, step: 0.25 },
  { path: ['evenness'], lo: 0, hi: 1, step: 0.25 },
  { path: ['originX'], lo: -50, hi: 150, step: 15 },
  { path: ['originY'], lo: -50, hi: 150, step: 15 },
];
export async function searchGeometry(refMap, initial, shotBox, { rounds = 3, budget = 40 } = {}) {
  let opts = { colour: { ...initial.colour } };
  let best = await shootFieldMap(opts, shotBox).then((m) => lightMapDistance(refMap, m));
  let evals = 1;
  for (let round = 0; round < rounds && evals < budget; round++) {
    for (const k of GEOMETRY_KNOBS) {
      if (evals >= budget) break;
      const cur = opts.colour[k.path[0]];
      const step = k.step / (round + 1);
      for (const cand of [cur + step, cur - step]) {
        if (evals >= budget) break;
        const v = clamp(cand, k.lo, k.hi);
        if (v === cur) continue;
        const tryOpts = { colour: { ...opts.colour, [k.path[0]]: v } };
        const dist = await shootFieldMap(tryOpts, shotBox).then((m) => lightMapDistance(refMap, m));
        evals += 1;
        if (dist < best) { best = dist; opts = tryOpts; }
      }
    }
  }
  return { opts, dist: best, evals };
}

// ---------- motion keys: a crossfade driven by `var(--t)`, never a CSS transition/animation ----------
//
// Two triangular ramps, `min()`'d together and clamped, is a tent function with no `abs()`: at `t`
// exactly on a key it is 1, and it falls linearly to 0 by the neighbouring key on either side. Stacking
// one such div per key and letting them cross-fade is the one way to move between fitted colour sets
// that composes with the house rule (core/tokens.css kills `animation`/`transition`; motion is only ever
// a function of the frame clock the renderer seeks).
function crossfadeHtml(keys) {
  const divs = keys.map((k, i) => {
    const before = keys[i - 1], after = keys[i + 1];
    const gapAfter = after ? after.t - k.t : (before ? k.t - before.t : 1) || 1;
    const gapBefore = before ? k.t - before.t : gapAfter;
    const a = `1 - (var(--t) - ${k.t})/${gapAfter}`;
    const b = `1 - (${k.t} - var(--t))/${gapBefore}`;
    const opacity = keys.length === 1 ? '1' : `clamp(0, min(${a}, ${b}), 1)`;
    return `<div style="position:absolute;inset:0;opacity:${opacity};background:${paintField(k.opts)}"></div>`;
  });
  return `<div style="position:absolute;inset:0;overflow:hidden">\n${divs.join('\n')}\n</div>`;
}

// ---------- CLI ----------
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const die = (msg) => { console.error(`✗ light-fit: ${msg}`); process.exit(2); };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ref = flag('--ref');
  const start = Number(flag('--start', '0'));
  const end = Number(flag('--end'));
  const step = Number(flag('--step', '2'));
  const maxKeys = Number(flag('--keys', '4'));
  const out = flag('--out', path.join(ROOT, 'out/light-fit/beat.lightfit.json'));
  const grid = flag('--grid', null);
  if (!ref || !fs.existsSync(ref)) die('usage: --ref <video> --start <s> --end <s> [--step 2] [--keys 4] [--out file.json] [--grid file.png]');
  if (!Number.isFinite(end) || end <= start) die('--end must be a number greater than --start.');

  const { width, height } = probeSize(ref);
  if (!width || !height) die(`${ref} has no readable video stream.`);
  const shotBox = { w: Math.min(width, 640), h: Math.round(Math.min(width, 640) * height / width) };

  const n = Math.max(1, Math.min(maxKeys, Math.round((end - start) / step) + 1));
  const times = n === 1 ? [start] : Array.from({ length: n }, (_, i) => start + (i * (end - start)) / (n - 1));

  const refMaps = times.map((t) => lightMap(ref, { t }));
  const fitted = refMaps.map((m) => fitFieldOpts(m));

  const closedFormMap = await shootFieldMap(fitted[0], shotBox);
  const before = lightMapDistance(refMaps[0], closedFormMap);

  // geometry search at the first key only, then carried to every key: the search asks "where and how
  // far does the light reach", which this beat's own reference answers once, not once per key.
  const geo = await searchGeometry(refMaps[0], fitted[0], shotBox);
  const geoFitted = fitted.map((f) => ({ colour: { ...f.colour, spread: geo.opts.colour.spread,
    evenness: geo.opts.colour.evenness, originX: geo.opts.colour.originX, originY: geo.opts.colour.originY } }));

  // one measured colour correction, taken at the first key (now on converged geometry) and applied to
  // every key's palette: the residual this closes is a fixed compositing bias (see `colourDelta`'s own
  // comment), not a per-key quantity.
  const geoMap = await shootFieldMap(geoFitted[0], shotBox);
  const delta = colourDelta(refMaps[0], geoMap);
  const corrected = geoFitted.map((f) => applyDelta(f, delta));
  const correctedMap = await shootFieldMap(corrected[0], shotBox);
  const correctedDist = lightMapDistance(refMaps[0], correctedMap);

  // keep the correction only if it measurably helped; a residual measured on one key's brightest
  // cells is not guaranteed to help every palette, and the fallback is the geometry search's own
  // already-measured result rather than a guess.
  const useCorrection = correctedDist < geo.dist;
  const keys = times.map((t, i) => ({ t, opts: useCorrection ? corrected[i] : geoFitted[i] }));
  const afterMap = useCorrection ? correctedMap : geoMap;
  const after = useCorrection ? correctedDist : geo.dist;

  const html = crossfadeHtml(keys);
  const layer = { type: 'html', id: 'lightfit-bg', start, end, html };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(layer, null, 2) + '\n');

  console.log(`  LIGHT-FIT · ${path.basename(ref)} ${start}-${end}s · ${n} key(s)`);
  console.log(`  light-map ΔE: closed-form fit ${before.toFixed(2)} -> geometry search ${geo.dist.toFixed(2)} `
    + `(${geo.evals} evals) -> ${useCorrection ? 'colour-corrected' : 'colour correction rejected, kept'} ${after.toFixed(2)}`);
  console.log(`  ✓ wrote ${path.relative(ROOT, out)}`);

  if (grid) {
    const cell = 40;
    const a = lightMapPNG(refMaps[0], path.join(path.dirname(grid), '.lightfit-ref.png'), { cell });
    const b = lightMapPNG(afterMap, path.join(path.dirname(grid), '.lightfit-got.png'), { cell });
    tileGrid([a, b], { cols: 1, tw: refMaps[0][0].length * cell, th: refMaps[0].length * cell, gap: 4, out: grid });
    fs.rmSync(a, { force: true }); fs.rmSync(b, { force: true });
    console.log(`  ✓ wrote ${path.relative(ROOT, grid)} (top: reference, bottom: fitted background)`);
  }
}
