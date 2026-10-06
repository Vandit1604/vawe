// harness/lib/ref-measure/ground.mjs: the ground of each shot (the tone along the frame edge), how it changes at a cut,
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

// Per-channel median Lab of the cells within BAND of the frame height from any edge: a ground seen behind a centred object.
export function borderGround(lab, w, h, band = BAND) {
  const m = Math.max(1, Math.round(band * h)), ch = [[], [], []];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= m && x < w - m && y >= m && y < h - m) continue;
    for (let c = 0; c < 3; c++) ch[c].push(lab[(y * w + x) * 3 + c]);
  }
  return ch.map((v) => percentile(v, 50));
}

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
  return { ground: borderGround(lab, w, h), map: lightMap(lab, w, h) };
}

// shots: [{ f0, f1 }] in frames of V. Returns the ground block of spec.json.
export function measureGround(V, shots, fps) {
  const perShot = shots.map((s, i) => {
    if ((s.f1 - s.f0) / fps < MIN_SHOT_S) return { shot: i + 1, t0: r3(s.f0 / fps), start: null };
    const a = groundAt(V, s.f0), b = groundAt(V, s.f1 - 1), long = (s.f1 - s.f0) / fps >= DRIFT_MIN_SHOT_S;
    return { shot: i + 1, t0: r3(s.f0 / fps), start: a.ground.map(r1), end: b.ground.map(r1), L: r1(a.ground[0]), chroma: r1(Math.hypot(a.ground[1], a.ground[2])), hue: hueOf(a.ground),
      driftDE: long ? r1(deltaE(a.ground, b.ground)) : null, lightDrift: long ? r1(lightDrift(a.map, b.map)) : null };
  });
  const cuts = [];
  for (let i = 1; i < perShot.length; i++) {
    const a = perShot[i - 1].end, b = perShot[i].start;
    if (a && b) cuts.push({ at: perShot[i].t0, dE: r1(deltaE(a, b)) });
  }
  const dE = cuts.map((c) => c.dE), drift = perShot.map((p) => p.lightDrift).filter((v) => v != null);
  const share = (xs, pred) => (xs.length ? r3(xs.filter(pred).length / xs.length) : null);
  return {
    method: `median Lab of the outer ${BAND * 100}% of the frame height on every side; change at a cut is deltaE (Lab 1976) from the last frame of a shot to the first of the next; shots under ${MIN_SHOT_S} s are skipped; drift is the median over an ${LIGHT_GRID_W}-column grid of the absolute L change from the first to the last frame of a shot`,
    changeDE: CHANGE_DE, turnDE: TURN_DE, driftL: DRIFT_L,
    perShot, cuts,
    summary: {
      shots: perShot.filter((p) => p.start).length, cuts: cuts.length, dEMedian: rn(median(dE)), changedShare: share(dE, (v) => v >= CHANGE_DE), turnShare: share(dE, (v) => v > TURN_DE),
      driftShotShare: share(drift, (v) => v >= DRIFT_L), driftMedian: rn(median(drift)), driftShots: drift.length,
      groundLMedian: rn(median(perShot.map((p) => p.L))), groundChromaMedian: rn(median(perShot.map((p) => p.chroma))),
    },
  };
}
