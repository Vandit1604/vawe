// harness/lib/ref-measure/ground.mjs: the ground of each shot (the cells along the frame edge), how it changes at a cut,
// and whether the light moves inside a shot. Lab on frames the spec already decoded (colour.mjs); deltaE is Lab 1976.
import { percentile, r1, r3 } from '../move-fit.mjs';
import { frameLab, deltaE } from './colour.mjs';
import { TURN_DE } from './world-turns.mjs';
import { MIN_SHOT_S } from './eye-path.mjs';

export const BAND = 0.1;
export const CHANGE_DE = 6;
export const LIGHT_GRID_W = 8;
export const DRIFT_L = 3;
export const DRIFT_MIN_SHOT_S = 0.8;

const rn = (v) => (v == null ? null : r3(v));
const median = (xs) => percentile(xs.filter((v) => Number.isFinite(v)), 50);

// The Lab cells within BAND of the frame height from any edge, as [L, a, b] triples in raster order: a ground seen behind a centred object.
export function borderCells(lab, w, h, band = BAND) {
  const m = Math.max(1, Math.round(band * h)), cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= m && x < w - m && y >= m && y < h - m) continue;
    const k = (y * w + x) * 3;
    cells.push([lab[k], lab[k + 1], lab[k + 2]]);
  }
  return cells;
}

// Per-channel median Lab of the border cells: the one tone of the ground.
const tone = (cells) => [0, 1, 2].map((c) => percentile(cells.map((p) => p[c]), 50));
export const borderGround = (lab, w, h, band = BAND) => tone(borderCells(lab, w, h, band));

// The ground's change between two frames: the median over border cells of the Lab distance of the same cell. A ground of soft
// blobs on one tone changes where the blobs are, which no single tone shows; an object over a few cells does not move the median.
export const groundDistance = (a, b) => percentile(a.map((p, i) => deltaE(p, b[i])), 50);

// Mean L of each cell of a gw by gh grid over the Lab image: the low-frequency light map.
export function lightMap(lab, w, h, gw = LIGHT_GRID_W) {
  const gh = Math.max(1, Math.round((gw * h) / w)), sum = new Float64Array(gw * gh), n = new Float64Array(gw * gh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = Math.min(gh - 1, Math.floor((y * gh) / h)) * gw + Math.min(gw - 1, Math.floor((x * gw) / w));
    sum[k] += lab[(y * w + x) * 3]; n[k]++;
  }
  return Array.from(sum, (s, i) => s / n[i]);
}

// Median over cells of the absolute L change: a moving object covers a few cells, a moving light changes most of them.
export const lightDrift = (a, b) => percentile(a.map((v, i) => Math.abs(v - b[i])), 50);

export const hueOf = (lab) => Math.round(((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360);

function groundAt(V, f) {
  const lab = frameLab(V, f), w = Math.min(96, V.w), h = Math.max(1, Math.round((w * V.h) / V.w));
  const cells = borderCells(lab, w, h);
  return { cells, ground: tone(cells), map: lightMap(lab, w, h) };
}

// shots: [{ f0, f1 }] in frames of V. Returns the ground block of spec.json.
export function measureGround(V, shots, fps) {
  const edges = [];
  const perShot = shots.map((s, i) => {
    if ((s.f1 - s.f0) / fps < MIN_SHOT_S) return { shot: i + 1, t0: r3(s.f0 / fps), start: null };
    const a = groundAt(V, s.f0), b = groundAt(V, s.f1 - 1), long = (s.f1 - s.f0) / fps >= DRIFT_MIN_SHOT_S;
    edges[i] = { start: a.cells, end: b.cells };
    return { shot: i + 1, t0: r3(s.f0 / fps), start: a.ground.map(r1), end: b.ground.map(r1), L: r1(a.ground[0]), chroma: r1(Math.hypot(a.ground[1], a.ground[2])), hue: hueOf(a.ground),
      driftDE: long ? r1(deltaE(a.ground, b.ground)) : null, lightDrift: long ? r1(lightDrift(a.map, b.map)) : null };
  });
  const cuts = [];
  for (let i = 1; i < perShot.length; i++) {
    if (edges[i - 1] && edges[i]) cuts.push({ at: perShot[i].t0, dE: r1(groundDistance(edges[i - 1].end, edges[i].start)) });
  }
  const dE = cuts.map((c) => c.dE), drift = perShot.map((p) => p.lightDrift).filter((v) => v != null);
  const share = (xs, pred) => (xs.length ? r3(xs.filter(pred).length / xs.length) : null);
  return {
    method: `median Lab of the outer ${BAND * 100}% of the frame height on every side; change at a cut is the median over those border cells of deltaE (Lab 1976) from the last frame of a shot to the first of the next; shots under ${MIN_SHOT_S} s are skipped; drift is the median over an ${LIGHT_GRID_W}-column grid of the absolute L change from the first to the last frame of a shot`,
    changeDE: CHANGE_DE, turnDE: TURN_DE, driftL: DRIFT_L,
    perShot, cuts,
    summary: {
      shots: perShot.filter((p) => p.start).length, cuts: cuts.length, dEMedian: rn(median(dE)), changedShare: share(dE, (v) => v >= CHANGE_DE), turnShare: share(dE, (v) => v > TURN_DE),
      driftShotShare: share(drift, (v) => v >= DRIFT_L), driftMedian: rn(median(drift)), driftShots: drift.length,
      groundLMedian: rn(median(perShot.map((p) => p.L))), groundChromaMedian: rn(median(perShot.map((p) => p.chroma))),
    },
  };
}
