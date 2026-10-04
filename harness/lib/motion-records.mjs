// What the motion lint (motion-lint.mjs, motion-variety.mjs) asks of one motion record: does it move, enter, leave, which
// ease and which way. Pure. A record is { target, id, props, delay, duration, easing, kfEasings, opacity, from, step? }.
import { EASE } from '../../core/motion/presets.js';

export const CUT = 0.05;
const MOVE = /^(transform|translate|scale|rotate|left|top|right|bottom|clipPath|maskPosition|backgroundPosition|offsetDistance)$/;

export const moveProps = (r) => r.props.filter((p) => MOVE.test(p));
export const moves = (r) => moveProps(r).length > 0;
export const entering = (r) => r.id === 'enter' || (r.opacity && r.opacity[1] > r.opacity[0]);
export const exiting = (r) => r.id === 'leave' || (r.opacity && r.opacity[1] < r.opacity[0]);

// A record inferred from box samples is exact only when it spans a few samples; one animation's own timing always is.
const MIN_SAMPLES = 2;
export const measured = (r) => !r.step || r.duration >= MIN_SAMPLES * r.step;

/** The records grouped per element, in first-seen order. */
export function byTarget(records) {
  const m = new Map();
  for (const r of records) (m.get(r.target) || m.set(r.target, []).get(r.target)).push(r);
  return [...m.values()];
}

// A browser reports linear() with explicit stop positions, so compare the output values alone.
const outputs = (curve) => String(curve).replace(/^linear\(|\)$/g, '').split(',').map((stop) => stop.trim().split(/\s+/)[0]).join(' ');

/** The EASE name of a record's curve, or null on an inferred or unnamed curve. */
export const easeName = (r) => Object.keys(EASE).find((n) => outputs(EASE[n]) === outputs(r.easing)) ?? null;

/** A translate or transform's dominant direction: x+, x-, y+, y- or ''. */
export function moveDirection(from) {
  const s = String(from);
  const one = /translate([XY])\(\s*(-?[\d.]+)/.exec(s);
  if (one) return Number(one[2]) ? `${one[1].toLowerCase()}${Number(one[2]) > 0 ? '+' : '-'}` : '';
  const pair = /(?:translate\(|^)\s*(-?[\d.]+)[a-z%]*(?:[\s,]+(-?[\d.]+))?/.exec(s);
  if (!pair) return '';
  const [x, y] = [Number(pair[1]), Number(pair[2] || 0)];
  if (!x && !y) return '';
  return Math.abs(x) >= Math.abs(y) ? `x${x > 0 ? '+' : '-'}` : `y${y > 0 ? '+' : '-'}`;
}
