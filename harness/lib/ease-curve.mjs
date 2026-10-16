// How far an easing string goes past its end value. Reads what getComputedTiming() reports: a CSS keyword, cubic-bezier()
// or linear(). Pure.
import { cubicBezier } from '../../core/motion/curves.js';

const KEYWORDS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};
const BEZIER_SAMPLES = 100;

const numbers = (text) => text.split(',').map((s) => Number(s.trim()));

// Each linear() stop is a value with optional positions; only the values decide the peak, since the curve is straight between stops.
const stopValues = (text) => text.split(',').map((stop) => Number(stop.trim().split(/\s+/)[0]));

/** The highest value an easing reaches over 0 to 1: 1 for a curve that never goes past its end, above 1 for an overshoot. Null for a string it cannot read. */
export function peakValue(easing) {
  const text = String(easing).trim();
  if (KEYWORDS[text]) return peakOfBezier(KEYWORDS[text]);
  const bezier = /^cubic-bezier\((.*)\)$/.exec(text);
  if (bezier) {
    const p = numbers(bezier[1]);
    return p.length === 4 && p.every(Number.isFinite) ? peakOfBezier(p) : null;
  }
  const linear = /^linear\((.*)\)$/.exec(text);
  if (linear) {
    const v = stopValues(linear[1]);
    return v.length >= 2 && v.every(Number.isFinite) ? Math.max(1, ...v) : null;
  }
  return null;
}

function peakOfBezier(points) {
  const f = cubicBezier(...points);
  let peak = 1;
  for (let i = 0; i <= BEZIER_SAMPLES; i++) peak = Math.max(peak, f(i / BEZIER_SAMPLES));
  return peak;
}

/** Does the easing go past its end value by more than `tol` (a share of the move)? Null when the string is not readable. */
export function overshoots(easing, tol = 0.01) {
  const peak = peakValue(easing);
  return peak === null ? null : peak > 1 + tol;
}

// A linear() stop is "value", "value pos%" or "value pos% pos%"; a stop with no position sits evenly between its positioned neighbours.
function linearStops(text) {
  const raw = text.split(',').flatMap((stop) => {
    const [v, ...pos] = stop.trim().split(/\s+/);
    return pos.length ? pos.map((p) => ({ v: Number(v), x: parseFloat(p) / 100 })) : [{ v: Number(v), x: null }];
  });
  if (raw.length < 2 || raw.some((s) => !Number.isFinite(s.v))) return null;
  raw[0].x ??= 0;
  raw.at(-1).x ??= 1;
  raw.forEach((s, i) => {
    if (s.x !== null) return;
    const hi = raw.findIndex((r, j) => j > i && r.x !== null);
    let lo = i - 1;
    while (raw[lo].x === null) lo--;
    s.x = raw[lo].x + ((raw[hi].x - raw[lo].x) * (i - lo)) / (hi - lo);
  });
  return raw;
}

function linearAt(stops, u) {
  if (u <= stops[0].x) return stops[0].v;
  for (let i = 1; i < stops.length; i++) {
    if (u <= stops[i].x) {
      const span = stops[i].x - stops[i - 1].x;
      return span > 0 ? stops[i - 1].v + ((stops[i].v - stops[i - 1].v) * (u - stops[i - 1].x)) / span : stops[i].v;
    }
  }
  return stops.at(-1).v;
}

function easeFunction(text) {
  const bezier = KEYWORDS[text] ?? (/^cubic-bezier\((.*)\)$/.test(text) ? numbers(text.slice(13, -1)) : null);
  if (bezier) return bezier.length === 4 && bezier.every(Number.isFinite) ? cubicBezier(...bezier) : null;
  if (!/^linear\(.*\)$/.test(text)) return null;
  const stops = linearStops(text.slice(7, -1));
  return stops && ((u) => linearAt(stops, u));
}

/** `n + 1` points [u, y] of an easing string for u from 0 to 1, to draw its curve; null for a string it cannot read. Pure. */
export function easeSamples(easing, n = 24) {
  const f = easeFunction(String(easing).trim());
  return f ? Array.from({ length: n + 1 }, (_, i) => [i / n, f(i / n)]) : null;
}
