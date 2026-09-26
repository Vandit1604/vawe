// harness/author/curve-math.mjs: pure math for the tune graph editor (value + speed curves, and the
// screen-point <-> handle conversion a drag needs). No DOM: importable from node (tests) and the
// browser (tune.js) alike. Owner of the math is core/motion/motion.js and core/timeline/sequence.js;
// this file adds no second easing mechanism, it only reads theirs and converts a point on screen to
// the {influence, speed} they already define.
import { resolveHandle } from '../../core/motion/motion.js';
import { segmentAt, DENSE_KEY_SEC } from '../../core/timeline/sequence.js';

// Mirrors motionAt's own default-ease choice (core/timeline/sequence.js) so a sampled curve never
// disagrees with what the engine actually renders for the same segment.
export const defaultEaseFor = (seg) => (seg < DENSE_KEY_SEC ? 'linear' : 'easeInOutCubic');

/**
 * sampleSegment(a, b, prop, identity, steps): the value curve for one property across one segment,
 * as `{a: aValue, b: bValue, pts: [{t, v}...]}`, or null when the property isn't keyed on this
 * segment (a null-identity prop, e.g. `w`, that only one endpoint states: core/timeline/sequence.js
 * `poseAt`'s "both endpoints or neither" rule).
 */
export function sampleSegment(a, b, prop, identity, steps = 48) {
  if (identity === null && (a[prop] == null || b[prop] == null)) return null;
  const seg = b.t - a.t;
  const dflt = defaultEaseFor(seg);
  const av = a[prop] ?? identity, bv = b[prop] ?? identity;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = a.t + (i / steps) * seg;
    pts.push({ t, v: segmentAt([a, b], 0, t, dflt)(prop, identity) });
  }
  return { av, bv, pts };
}

// The two handles of a segment, resolved through the same registry a render uses: absent -> the
// linear side, a name -> its registry entry, an object -> validated as-is.
export const outHandle = (a) => resolveHandle(a.easeOut ?? null, 'easeOut');
export const inHandle = (b) => resolveHandle(b.easeIn ?? null, 'easeIn');

// {influence, speed} -> the point in the segment's own 0..1 x 0..1 bezier space (core/motion.js
// handleCurve derives x1/y1 and x2/y2 the same way; this is that derivation run forwards).
export const outPoint = (h) => { const x = h.influence / 100; return { x, y: h.speed * x }; };
export const inPoint = (h) => { const x2i = h.influence / 100; return { x: 1 - x2i, y: 1 - h.speed * x2i }; };

// A dragged point -> {influence, speed}, the inverse of outPoint/inPoint. x is clamped away from 0
// (an easeOut at influence 0 has no reach to divide speed by, and speed is a slope, not a position).
const EPS = 1e-4;
export function outHandleFromPoint(x, y) {
  const cx = Math.min(Math.max(x, EPS), 1);
  return { influence: cx * 100, speed: y / cx };
}
export function inHandleFromPoint(x, y) {
  const x2i = Math.min(Math.max(1 - x, EPS), 1);
  return { influence: x2i * 100, speed: (1 - y) / x2i };
}
