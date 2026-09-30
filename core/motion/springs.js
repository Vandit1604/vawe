// Page motion library: pure functions of time. Import by relative path from a page.
// t is seconds unless a name says frame. No state, no Math.random, no dependency but ./curves.js.
import * as curves from './curves.js';

export const SPRINGS = {
  snappy: { k: 400, d: 32 },
  default: { k: 170, d: 26 },
  heavy: { k: 90, d: 22 },
  playful: { k: 220, d: 12 },
};

// Unit-mass spring from 0 to 1: stiffness k, damping d. Exact for under, critical and over damping.
export function spring(t, k = 170, d = 26) {
  if (!(t > 0)) return 0;
  const w = Math.sqrt(k), z = d / (2 * w);
  if (Math.abs(z - 1) < 1e-6) return 1 - Math.exp(-w * t) * (1 + w * t);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  const s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s;
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

// keys [[time, value], ...] in time order. Each key after the first adds one spring for its change.
export function track(t, keys, k = 170, d = 26) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  return v;
}

// stops [[time, x], ...] where x is the left edge of the target and width its size.
// The edge that leads the move springs stiffer than the edge that trails. Returns {left, right}.
export function indicator(t, stops, width) {
  const lead = SPRINGS.snappy, trail = SPRINGS.default;
  let left = stops[0][1], right = stops[0][1] + width;
  for (let i = 1; i < stops.length; i++) {
    const dx = stops[i][1] - stops[i - 1][1], dt = t - stops[i][0];
    const l = dx < 0 ? lead : trail, r = dx < 0 ? trail : lead;
    left += dx * spring(dt, l.k, l.d);
    right += dx * spring(dt, r.k, r.d);
  }
  return { left, right };
}

// Opacity 0..1 for text inside a morphing box: fades in 0.08s after the morph starts at tIn,
// finishes fading out 0.04s before the next morph starts at tOut.
export function swapAlpha(t, tIn, tOut) {
  const fade = Math.min(0.18, Math.max(0.001, (tOut - tIn) / 3));
  const up = curves.clamp01((t - tIn - 0.08) / fade);
  const down = curves.clamp01((tOut - 0.04 - t) / fade);
  return Math.min(up, down);
}

// f is a frame number and may be fractional. k is the share of the remaining distance covered per frame.
export function approach(f, from, to, k = 0.15) {
  if (!(f > 0)) return from;
  return to - (to - from) * Math.pow(1 - k, f);
}

// table [[t, v], ...] with v a number or an array of numbers. ease: function, easing name from
// curves.js (e.g. 'easeOutCubic'), or an array with one entry per segment. Clamped at both ends.
export function kf(t, table, ease) {
  const n = table.length;
  if (t <= table[0][0]) return table[0][1];
  if (t >= table[n - 1][0]) return table[n - 1][1];
  let i = 1;
  while (t > table[i][0]) i++;
  const [t0, a] = table[i - 1], [t1, b] = table[i];
  const e = resolveEase(Array.isArray(ease) ? ease[i - 1] : ease);
  const u = e(curves.clamp01((t - t0) / (t1 - t0)));
  return Array.isArray(a) ? a.map((x, j) => x + (b[j] - x) * u) : a + (b - a) * u;
}

function resolveEase(e) {
  if (typeof e === 'function') return e;
  if (e == null || e === 'linear') return (u) => u;
  if (typeof curves[e] !== 'function') throw new Error(`kf: unknown ease "${e}"`);
  return curves[e];
}

// Seconds until the spring stays within epsilon of 1. Pair it with springLinear as the duration.
export function springDuration(k = 170, d = 26, epsilon = 0.001) {
  let last = 0;
  for (let t = 0.005; t < 10; t += 0.005) if (Math.abs(1 - spring(t, k, d)) > epsilon) last = t;
  return Math.min(10, last + 0.005);
}

// A CSS linear() easing that follows the spring over springDuration(k, d). Starts at 0, ends at 1.
export function springLinear(k = 170, d = 26, samples = 40) {
  const T = springDuration(k, d);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const v = i === 0 ? 0 : i === samples ? 1 : spring((i / samples) * T, k, d);
    pts.push(String(Math.round(v * 10000) / 10000));
  }
  return `linear(${pts.join(', ')})`;
}

// Any easing fn(u) on [0, 1] as an exact CSS linear() string: never approximate a curve with
// cubic-bezier. fn may be a curves.js name. Samples are evenly spaced; 40 is smooth to 1/1000.
export function curveToLinear(fn, samples = 40) {
  const e = resolveEase(fn);
  const pts = [];
  for (let i = 0; i <= samples; i++) pts.push(String(Math.round(e(i / samples) * 10000) / 10000));
  return `linear(${pts.join(', ')})`;
}

// Named curves for curveToLinear. expoOut matches approach(k = 0.15) settling over 40 frames.
export const CURVES = {
  expoOut: (u) => (1 - Math.pow(0.85, u * 40)) / (1 - Math.pow(0.85, 40)),
  spring: (u) => (u >= 1 ? 1 : spring(u * springDuration(), 170, 26)),
  overshoot: (u) => (u >= 1 ? 1 : spring(u * springDuration(260, 14), 260, 14)),
};

// mulberry32: returns a function giving uniform numbers in [0, 1). Same seed, same sequence.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise in [-1, 1]. One new random value per whole step of x.
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const at = (n) => rng(Math.imul(n | 0, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b))() * 2 - 1;
  const a = at(i), b = at(i + 1);
  return a + (b - a) * f * f * (3 - 2 * f);
}

// t wrapped into [0, dur), also for negative t.
export const loopT = (t, dur) => ((t % dur) + dur) % dur;
