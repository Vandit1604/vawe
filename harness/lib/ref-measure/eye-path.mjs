// harness/lib/ref-measure/eye-path.mjs: where the action is in each shot, and how far the eye travels at and inside cuts.
// The eye point is the motion-weighted centroid of the heaviest moving region over the first and the last WINDOW_S of a
// shot. A static shot (or one where the whole frame moves, a camera move) falls back to the centroid of high local contrast.
// Positions are 0..1 of the frame; every distance is in frame heights, so a 16:9 frame is 1.78 units wide.
import { percentile, r3 } from '../move-fit.mjs';
import { GRID_W, STEP_S, DIFF_THR, REGION_MIN, coarse, blurredGrid, dilate } from './motion-regions.mjs';

export const WINDOW_S = 0.3;
export const CARRIED_JUMP = 0.15;
export const MOVED_JUMP = 0.35;
export const CENTRE_RADIUS = 0.15;
export const GLOBAL_MOVE_SHARE = 0.5;
export const TRAVEL_MIN_SHOT_S = 2 * WINDOW_S;
export const MIN_SHOT_S = 0.2;

// Centroid of non-negative weights on a w by h grid, as 0..1 coordinates of cell centres; null when no weight.
export function weightedCentroid(weights, w, h) {
  let sum = 0, sx = 0, sy = 0;
  for (let i = 0; i < weights.length; i++) {
    const v = weights[i];
    if (v <= 0) continue;
    sum += v; sx += v * ((i % w) + 0.5); sy += v * (Math.floor(i / w) + 0.5);
  }
  return sum > 0 ? { x: sx / sum, y: sy / sum, mass: sum } : null;
}

// The weights of the heaviest 4-connected region (after joining cells within the motion-regions join radius).
export function heaviestRegion(weights, w, h) {
  const mask = Uint8Array.from(weights, (v) => (v > 0 ? 1 : 0)), grown = dilate(mask, w, h);
  const seen = new Uint8Array(w * h), out = new Float32Array(w * h);
  let best = 0;
  for (let s = 0; s < grown.length; s++) {
    if (!grown[s] || seen[s]) continue;
    const stack = [s], cells = [];
    let mass = 0;
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      cells.push(i); mass += weights[i];
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < grown.length && grown[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (mass > best) { best = mass; out.fill(0); for (const i of cells) out[i] = weights[i]; }
  }
  return out;
}

// Local contrast: gradient size on the grid, minus the frame mean, so a smooth gradient or a flat ground weighs nothing.
export function contrastWeights(g, w, h) {
  const grad = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    grad[i] = Math.abs(g[y * w + Math.min(w - 1, x + 1)] - g[y * w + Math.max(0, x - 1)]) + Math.abs(g[Math.min(h - 1, y + 1) * w + x] - g[Math.max(0, y - 1) * w + x]);
  }
  const mean = grad.reduce((a, b) => a + b, 0) / grad.length;
  return grad.map((v) => Math.max(0, v - mean));
}

// Distance between two points in frame heights; aspect is frame width over height.
export const eyeDistance = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);

// Share of the values below carried and above moved; the cuts in between are neither.
export function jumpShares(jumps, carried = CARRIED_JUMP, moved = MOVED_JUMP) {
  const xs = jumps.filter((v) => Number.isFinite(v));
  if (!xs.length) return { carried: null, moved: null };
  return { carried: r3(xs.filter((v) => v < carried).length / xs.length), moved: r3(xs.filter((v) => v > moved).length / xs.length) };
}

// Share of the points that lie within radius frame heights of the frame centre.
export function centreShare(points, aspect, radius = CENTRE_RADIUS) {
  const ps = points.filter(Boolean);
  if (!ps.length) return null;
  return r3(ps.filter((p) => eyeDistance(p, { x: 0.5, y: 0.5 }, aspect) <= radius).length / ps.length);
}

function motionWeights(V, f0, f1, gw, gh, step, cache) {
  const grid = (f) => cache.get(f) ?? (cache.set(f, blurredGrid(V, f, gw, gh)), cache.get(f));
  const acc = new Float32Array(gw * gh);
  for (let f = f0; f + step < f1; f++) {
    const a = grid(f), b = grid(f + step);
    for (let i = 0; i < acc.length; i++) acc[i] += Math.max(0, Math.abs(a[i] - b[i]) - DIFF_THR);
  }
  return acc;
}

// The eye point of frames f0..f1-1: { x, y, src } with src 'motion' or 'contrast'; null for an empty window.
export function eyePoint(V, f0, f1, fps, cache = new Map()) {
  if (f1 - f0 < 1) return null;
  const gw = Math.min(GRID_W, V.w), gh = Math.max(1, Math.round((gw * V.h) / V.w)), step = Math.max(1, Math.round(fps * STEP_S));
  const acc = motionWeights(V, f0, f1, gw, gh, step, cache);
  const moving = acc.filter((v) => v > 0).length / acc.length;
  if (moving >= REGION_MIN && moving < GLOBAL_MOVE_SHARE) {
    const c = weightedCentroid(heaviestRegion(acc, gw, gh), gw, gh);
    if (c) return { x: r3(c.x / gw), y: r3(c.y / gh), src: 'motion' };
  }
  const mid = Math.floor((f0 + f1 - 1) / 2);
  const g = coarse({ g: V.gray.subarray(mid * V.w * V.h, (mid + 1) * V.w * V.h), w: V.w, h: V.h }, gw, gh).g;
  const c = weightedCentroid(contrastWeights(g, gw, gh), gw, gh);
  return c ? { x: r3(c.x / gw), y: r3(c.y / gh), src: 'contrast' } : { x: 0.5, y: 0.5, src: 'none' };
}

const rn = (v) => (v == null ? null : r3(v));
const median = (xs) => percentile(xs.filter((v) => Number.isFinite(v)), 50);

// The measures of one film from its shots; `motion` keeps only the points and cuts found from motion, the reliable ones.
function summarise(perShot, cuts, aspect, motion) {
  const keep = (p) => p && (!motion || p.src === 'motion');
  const points = perShot.flatMap((p) => [p.start, p.end]).filter(keep);
  const jumps = cuts.filter((c) => !motion || c.motionBoth).map((c) => c.jump);
  const pairs = perShot.filter((p) => keep(p.start) && keep(p.end));
  const travels = pairs.map((p) => p.travel);
  const shares = jumpShares(jumps);
  return { cuts: jumps.length, jumpMedian: rn(median(jumps)), carriedShare: shares.carried, movedShare: shares.moved, travelMedian: rn(median(travels)),
    centreShare: centreShare(points, aspect), centredShotShare: pairs.length ? r3(pairs.filter((p) => centreShare([p.start, p.end], aspect) === 1).length / pairs.length) : null };
}

// shots: [{ f0, f1 }] in frames of V (a transition's frames are in no shot). Returns the eye block of spec.json.
export function measureEye(V, shots, fps) {
  const aspect = V.w / V.h, win = Math.max(3, Math.round(WINDOW_S * fps)), cache = new Map();
  const perShot = shots.map((s, i) => {
    const t0 = r3(s.f0 / fps);
    if ((s.f1 - s.f0) / fps < MIN_SHOT_S) return { shot: i + 1, t0, start: null, end: null, travel: null };
    const start = eyePoint(V, s.f0, Math.min(s.f1, s.f0 + win), fps, cache);
    const end = eyePoint(V, Math.max(s.f0, s.f1 - win), s.f1, fps, cache);
    const long = (s.f1 - s.f0) / fps >= TRAVEL_MIN_SHOT_S;
    return { shot: i + 1, t0, start, end, travel: long ? r3(eyeDistance(start, end, aspect)) : null };
  });
  const cuts = [];
  for (let i = 1; i < perShot.length; i++) {
    const a = perShot[i - 1].end, b = perShot[i].start;
    if (a && b) cuts.push({ at: perShot[i].t0, jump: r3(eyeDistance(a, b, aspect)), motionBoth: a.src === 'motion' && b.src === 'motion' });
  }
  const points = perShot.flatMap((p) => [p.start, p.end]).filter(Boolean);
  return {
    method: `motion-weighted centroid of the heaviest moving region over the first and last ${WINDOW_S} s of each shot (frame difference over ${STEP_S} s, threshold ${DIFF_THR}); contrast centroid when the shot is static or the whole frame moves; shots under ${MIN_SHOT_S} s are skipped; distances in frame heights`,
    carriedBelow: CARRIED_JUMP, movedAbove: MOVED_JUMP, centreRadius: CENTRE_RADIUS,
    perShot, cuts,
    summary: { shots: perShot.filter((p) => p.start).length, motionPointShare: points.length ? r3(points.filter((p) => p.src === 'motion').length / points.length) : null,
      ...summarise(perShot, cuts, aspect, false), motion: summarise(perShot, cuts, aspect, true) },
  };
}

