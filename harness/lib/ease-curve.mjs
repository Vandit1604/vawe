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
