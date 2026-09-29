// harness/lib/move-fit.mjs: the one owner of "how does this thing arrive". A per-frame position series
// in, overshoot and the best arrival curve (approach k or spring k,d from core/motion/springs.js) out.
// ref-spec.mjs feeds it positions tracked from pixels, render-spec.mjs feeds it positions read from
// the DOM, so both sides of a comparison are summarised by the same code.
import { approach, spring } from '../../core/motion/springs.js';

export const r1 = (v) => Math.round(v * 10) / 10;
export const r3 = (v) => Math.round(v * 1000) / 1000;
export const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
export const mode = (a) => { const c = {}; for (const x of a) c[x] = (c[x] || 0) + 1; return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; };

function fitApproach(p, p0, p1, sc) {
  let best = null;
  for (let k = 0.04; k <= 0.5; k += 0.005) for (const sh of [-1, -0.5, 0, 0.5, 1]) {
    let sse = 0;
    p.forEach((v, i) => { const e = (approach(i + 1 - sh, p0, p1, k) - v) * sc; sse += e * e; });
    if (!best || sse < best.sse) best = { kind: 'approach', k: r3(k), shift: sh, sse };
  }
  return { ...best, rmse: r1(Math.sqrt(best.sse / p.length)) };
}

function fitSpring(p, p0, p1, fps, sc) {
  let best = null;
  for (let k = 40; k <= 1600; k *= 1.25) for (let d = 6; d <= 70; d += 4) for (const sh of [-1, -0.5, 0, 0.5, 1]) {
    let sse = 0;
    p.forEach((v, i) => { const e = (p0 + (p1 - p0) * spring((i + 1 - sh) / fps, k, d) - v) * sc; sse += e * e; });
    if (!best || sse < best.sse) best = { kind: 'spring', k: Math.round(k), d, shift: sh, sse };
  }
  return { ...best, rmse: r1(Math.sqrt(best.sse / p.length)) };
}

/**
 * pos: one coordinate per frame while the element moves. p0: where it was the frame before pos[0].
 * p1: where it comes to rest. sc: multiplier from pos units to px. Returns { overshoot, fit }, both
 * null when the move is under 4 px or under 4 frames (too short to fit a curve).
 */
export function summariseMove(pos, p0, p1, fps, sc) {
  const D = p1 - p0;
  const travelled = Math.abs(D) * sc;
  if (travelled < 4 || pos.length < 4) return { overshoot: null, fit: null };
  const dir = Math.sign(D);
  const maxEx = Math.max(...pos.map((v) => (v - p0) * dir));
  const overshoot = r3(maxEx / Math.abs(D));
  const a = fitApproach(pos, p0, p1, sc);
  const s = fitSpring(pos, p0, p1, fps, sc);
  const useSpring = overshoot > 1.03 || (a.rmse > 0.06 * travelled && s.rmse < a.rmse);
  const pick = useSpring ? s : a;
  return { overshoot, fit: { kind: pick.kind, k: pick.k, ...(pick.d ? { d: pick.d } : {}), shiftFrames: pick.shift, rmsePx: pick.rmse,
    otherRmsePx: (useSpring ? a : s).rmse } };
}
