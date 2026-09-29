// harness/lib/move-fit.mjs: the one owner of "how does this thing arrive". A per-frame position series
// in, overshoot, the best arrival curve, the start and the landing time out. Four curve classes are fitted
// to the same series: linear, approach k, spring k,d (core/motion/springs.js) and cubic-bezier.
// ref-spec.mjs feeds it positions tracked from pixels, render-spec.mjs feeds it positions read from
// the DOM, so both sides of a comparison are summarised by the same code.
import { approach, spring, springLinear, springDuration } from '../../core/motion/springs.js';

export const r1 = (v) => Math.round(v * 10) / 10;
export const r2 = (v) => Math.round(v * 100) / 100;
export const r3 = (v) => Math.round(v * 1000) / 1000;
export const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
export const mode = (a) => { const c = {}; for (const x of a) c[x] = (c[x] || 0) + 1; return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; };

const REST_PX = 0.5;
const clamp01 = (u) => Math.min(1, Math.max(0, u));

// Progress 0..1 of a cubic-bezier easing at x = u. A 96-step table, linear between steps.
function bezierProgress(x1, y1, x2, y2) {
  const N = 96, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const s = i / N, m = 1 - s;
    xs[i] = 3 * m * m * s * x1 + 3 * m * s * s * x2 + s ** 3;
    ys[i] = 3 * m * m * s * y1 + 3 * m * s * s * y2 + s ** 3;
  }
  return (u) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= u) lo = mid; else hi = mid; }
    const w = (u - xs[lo]) / Math.max(1e-9, xs[hi] - xs[lo]);
    return ys[lo] + (ys[hi] - ys[lo]) * w;
  };
}

// Each class: name, rank (simpler first), curve(params, fps) -> progress(F) for an absolute frame F,
// css/duration for the agent, start(params) in frames. params[0] is always the start frame.
const CLASSES = {
  linear: { rank: 0, names: ['start', 'dur'], curve: ([fs, dur]) => (F) => clamp01((F - fs) / dur),
    lo: [-Infinity, 2], hi: [Infinity, 600] },
  approach: { rank: 1, names: ['start', 'k'], curve: ([fs, k]) => (F) => approach(F - fs, 0, 1, k),
    lo: [-Infinity, 0.02], hi: [Infinity, 0.6] },
  spring: { rank: 2, names: ['start', 'k', 'd'], curve: ([fs, k, d], fps) => (F) => spring((F - fs) / fps, k, d),
    lo: [-Infinity, 30, 4], hi: [Infinity, 2000, 80] },
  bezier: { rank: 3, names: ['start', 'dur', 'x1', 'y1', 'x2', 'y2'], curve: ([fs, dur, x1, y1, x2, y2]) => {
    const e = bezierProgress(x1, y1, x2, y2);
    return (F) => e((F - fs) / dur);
  }, lo: [-Infinity, 2, 0, -1, 0, -1], hi: [Infinity, 600, 1, 2.5, 1, 2.5] },
};

function makeSse(cls, pos, frames, p0, D, sc, fps) {
  const make = CLASSES[cls].curve;
  return (params) => {
    const c = make(params, fps);
    let sse = 0;
    for (let i = 0; i < pos.length; i++) { const e = (p0 + D * c(frames[i]) - pos[i]) * sc; sse += e * e; }
    return sse;
  };
}

// Nelder-Mead with box clamping, restarted from its own best with smaller steps.
function descend(cls, start, steps, sse, hi) {
  const { lo } = CLASSES[cls], n = start.length;
  const clamp = (p) => p.map((v, j) => Math.min(hi[j], Math.max(lo[j], v)));
  let best = { p: clamp(start), v: sse(clamp(start)) };
  for (let restart = 0; restart < 3; restart++) {
    const scale = 0.5 ** restart;
    let pts = [best.p, ...best.p.map((_, j) => clamp(best.p.map((v, i) => (i === j ? v + steps[j] * scale : v))))].map((p) => ({ p, v: sse(p) }));
    for (let it = 0; it < 250; it++) {
      pts.sort((a, b) => a.v - b.v);
      const cen = pts[0].p.map((_, j) => pts.slice(0, n).reduce((s, q) => s + q.p[j], 0) / n);
      const along = (t) => { const p = clamp(cen.map((c, j) => c + t * (pts[n].p[j] - c))); return { p, v: sse(p) }; };
      const refl = along(-1);
      if (refl.v < pts[0].v) { const ex = along(-2); pts[n] = ex.v < refl.v ? ex : refl; }
      else if (refl.v < pts[n - 1].v) pts[n] = refl;
      else {
        const con = along(refl.v < pts[n].v ? -0.5 : 0.5);
        if (con.v < Math.min(refl.v, pts[n].v)) pts[n] = con;
        else pts = pts.map((q, i) => { if (i === 0) return q; const p = clamp(q.p.map((v, j) => pts[0].p[j] + 0.5 * (v - pts[0].p[j]))); return { p, v: sse(p) }; });
      }
    }
    pts.sort((a, b) => a.v - b.v);
    if (pts[0].v < best.v) best = pts[0];
  }
  return { params: best.p, sse: best.v };
}

function candidates(cls, f0, n, fps) {
  const out = [];
  const starts = [f0 - 2, f0 - 1, f0 - 0.5, f0];
  if (cls === 'linear') for (const fs of starts) for (const dur of [n - 1, n, n + 1, n + 3]) out.push([fs, dur]);
  if (cls === 'approach') for (let k = 0.04; k <= 0.5; k += 0.02) for (const fs of starts) out.push([fs, k]);
  if (cls === 'spring') for (let k = 40; k <= 1600; k *= 1.4) for (let d = 6; d <= 70; d += 8) for (const fs of starts) out.push([fs, k, d]);
  if (cls === 'bezier') {
    const xs = [0, 0.3, 0.6, 1], ys = [0, 0.5, 1, 1.5];
    for (const x1 of xs) for (const y1 of ys) for (const x2 of xs) for (const y2 of ys)
      for (const fs of [f0 - 1, f0 - 0.5]) for (const dur of [n, n + 4]) out.push([fs, dur, x1, y1, x2, y2]);
  }
  return out;
}

const STEPS = { linear: [0.5, 1], approach: [0.5, 0.02], spring: [0.5, 30, 3], bezier: [0.5, 1, 0.1, 0.2, 0.1, 0.2] };

function fitClass(cls, pos, frames, p0, D, sc, fps, overshoots) {
  const hi = cls === 'bezier' && !overshoots ? [...CLASSES.bezier.hi.slice(0, 3), 1, 1, 1] : CLASSES[cls].hi;
  const sse = makeSse(cls, pos, frames, p0, D, sc, fps);
  const scored = candidates(cls, frames[0], pos.length, fps).map((c) => ({ c, v: sse(c) })).sort((a, b) => a.v - b.v);
  const seeds = scored.slice(0, cls === 'bezier' ? 4 : 2);
  const runs = seeds.map((s) => descend(cls, s.c, STEPS[cls], sse, hi));
  const best = runs.reduce((a, b) => (b.sse < a.sse ? b : a));
  return { cls, ...best, runs, sseFn: sse, rmse: Math.sqrt(best.sse / pos.length) };
}

function landFrame(curve, p0, D, p1, sc, fs) {
  let lastOut = fs;
  for (let F = fs; F < fs + 400; F += 0.125) if (Math.abs(p0 + D * curve(F) - p1) * sc > REST_PX) lastOut = F;
  return lastOut + 0.125;
}

// How far the whole curve can slide in time before the residual grows past the noise floor.
function timeError(fit, n) {
  const rmse0 = Math.sqrt(fit.sse / n), limit = rmse0 + Math.max(0.5, 0.25 * rmse0);
  for (let d = 0.25; d <= 3; d += 0.25) {
    for (const sgn of [-1, 1]) {
      const p = fit.params.slice();
      p[0] += sgn * d;
      if (Math.sqrt(fit.sseFn(p) / n) > limit) return d;
    }
  }
  return 3;
}

function cssFor(cls, params, fps) {
  const round = (v) => Math.round(v * 100) / 100;
  if (cls === 'linear') return { css: 'linear', durMs: Math.round((params[1] / fps) * 1000) };
  if (cls === 'bezier') return { css: `cubic-bezier(${params.slice(2).map(round).join(', ')})`, durMs: Math.round((params[1] / fps) * 1000) };
  if (cls === 'spring') return { css: springLinear(params[1], params[2]), durMs: Math.round(springDuration(params[1], params[2]) * 1000) };
  const frames = Math.ceil(Math.log(0.001) / Math.log(1 - params[1])), pts = [];
  for (let i = 0; i <= 40; i++) pts.push(String(r3(i === 40 ? 1 : approach((i / 40) * frames, 0, 1, params[1]))));
  return { css: `linear(${pts.join(', ')})`, durMs: Math.round((frames / fps) * 1000) };
}

const PARAM_OUT = {
  linear: (p, fps) => ({ durMs: Math.round((p[1] / fps) * 1000) }),
  approach: (p) => ({ k: r3(p[1]) }),
  spring: (p) => ({ k: Math.round(p[1]), d: r1(p[2]) }),
  bezier: (p, fps) => ({ x1: r2(p[2]), y1: r2(p[3]), x2: r2(p[4]), y2: r2(p[5]), durMs: Math.round((p[1] / fps) * 1000) }),
};

/**
 * pos: one coordinate per frame while the element moves. p0: where it was the frame before pos[0].
 * p1: where it comes to rest. sc: multiplier from pos units to px. opts.f0: absolute frame of pos[0]
 * (default 0). Returns { overshoot, fit, easing, start, land }, all null when the move is under 4 px or
 * under 4 frames (too short to fit a curve). fit is the legacy approach-or-spring view of the same fits.
 * easing.rmsePx is the residual of the winning curve in px; land.errFrames only covers the start time
 * and the curve shape the pixels can see: a tail below the detection threshold is extrapolated.
 */
export function summariseMove(pos, p0, p1, fps, sc, opts = {}) {
  const D = p1 - p0;
  const travelled = Math.abs(D) * sc;
  if (travelled < 4 || pos.length < 4) return { overshoot: null, fit: null, easing: null, start: null, land: null };
  const f0 = opts.f0 ?? 0, frames = pos.map((_, i) => f0 + i);
  const dir = Math.sign(D);
  const overshoot = r3(Math.max(...pos.map((v) => (v - p0) * dir)) / Math.abs(D));
  const fits = Object.fromEntries(Object.keys(CLASSES).map((c) => [c, fitClass(c, pos, frames, p0, D, sc, fps, overshoot > 1.03)]));
  const a = fits.approach, s = fits.spring;
  const useSpring = overshoot > 1.03 || (a.rmse > 0.06 * travelled && s.rmse < a.rmse);
  const pick = useSpring ? s : a;
  const legacy = { kind: pick.cls, k: pick.cls === 'spring' ? Math.round(pick.params[1]) : r3(pick.params[1]), ...(pick.cls === 'spring' ? { d: r1(pick.params[2]) } : {}),
    shiftFrames: r2(pick.params[0] - (f0 - 1)), rmsePx: r1(pick.rmse), otherRmsePx: r1((useSpring ? a : s).rmse) };

  const ranked = Object.values(fits).sort((x, y) => x.rmse - y.rmse);
  const floor = ranked[0].rmse;
  const win = [...ranked].sort((x, y) => CLASSES[x.cls].rank - CLASSES[y.cls].rank).find((f) => f.rmse <= floor * 1.3 + 0.35);
  const runner = ranked.find((f) => f !== win);
  const curveOf = (cls, params) => CLASSES[cls].curve(params, fps);
  const curve = curveOf(win.cls, win.params);
  const landF = landFrame(curve, p0, D, p1, sc, win.params[0]);
  const mean = pos.reduce((x, y) => x + y, 0) / pos.length;
  const sst = pos.reduce((acc, v) => acc + ((v - mean) * sc) ** 2, 0);
  const n = pos.length, tol = win.rmse * 1.1 + 0.15;
  const spread = win.runs.filter((r) => Math.sqrt(r.sse / n) <= tol).map((r) => landFrame(curveOf(win.cls, r.params), p0, D, p1, sc, r.params[0]));
  const errFrames = Math.max(timeError(win, n), ...spread.map((l) => Math.abs(l - landF)));
  const { css, durMs } = cssFor(win.cls, win.params, fps);
  return { overshoot, fit: legacy,
    easing: { class: win.cls, css, durMs, params: PARAM_OUT[win.cls](win.params, fps), r2: r3(sst > 0 ? 1 - win.sse / sst : 0), rmsePx: r2(win.rmse),
      runnerUp: { class: runner.cls, rmsePx: r2(runner.rmse) } },
    start: { t: r3(win.params[0] / fps), frame: r2(win.params[0]) },
    land: { t: r3(landF / fps), frame: r2(landF), errFrames: r2(errFrames) } };
}
