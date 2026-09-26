// core/tracks/trim.js: AE-style Trim Paths, a GENERAL track over any SVG path/stroke geometry.
//
// `svg.js`'s own `draw` already measures a path's real getTotalLength() and ramps dashoffset 0->1
// once, on the layer's own clock (engine-doctrine/MISTAKES.md #581 for why REAL px, not the
// pathLength="1" normalise trick). This is the more general instrument that measurement was missing:
// `trim: { start, end, offset }`, each a fraction of the path (0..1), each independently KEYFRAMABLE
// through the layer's own `motion` array (`trimStart`/`trimEnd`/`trimOffset`), so a stroke can draw
// on AND slide its revealed segment around the loop, composing with whatever ease the author already
// gave that segment of `motion` (core/timeline/sequence.js `motionAt`/`poseAt` interpolate these
// exactly like `x`/`rot`, no second interpolator here).
//
// `start`/`end` pick the revealed SEGMENT (AE's Start/End); `offset` slides that segment around the
// path, wrapping past 1 back to 0, without moving start/end themselves (AE's Offset). A static
// `trim: { start: 0.25, end: 0.75 }` alone shows a fixed quarter-to-three-quarters arc; keying
// `trimOffset` from 0 to 1 spins that arc once around a closed path (a loader ring), and keying
// `trimEnd` from 0 to 1 alone is a draw-on with a floor to start from other than the path's own start.
//
// TARGET RESOLUTION: `el.__svgPath`, the single path core/layers/svg.js already builds and measures,
// or (for any other layer type: an `html` fragment, a `group`) the first path-like SVG geometry
// element found inside `el`. Every one of path/rect/circle/ellipse/polyline/polygon/line implements
// SVGGeometryElement and so carries a real getTotalLength(), the same contract svg.js's own `draw`
// already trusts.
import { motionAt } from '../timeline/sequence.js';

export const slot = 'trim';

export const PROPS = { motion: {}, trim: {} };

function trimTarget(el) {
  if (el.__svgPath) return el.__svgPath;
  if (el.__trimTarget !== undefined) return el.__trimTarget;
  return (el.__trimTarget = el.querySelector('path, rect, circle, ellipse, polyline, polygon, line') || null);
}

// trimDash(total, start, end, offset) -> { dasharray, dashoffset }, pure and DOM-free so it is the one
// piece of this file a plain Node test can assert. `start > end` is swapped rather than refused: a
// keyed pair that crosses (an offset spin carrying start past end) should shrink the segment to
// nothing and grow it back, not throw mid-render.
//
// Negative `dashoffset` is not a bug to clamp away: SVG wraps a dash pattern by its own total length,
// so `-(s*total) - offset*total` slides the revealed segment backward around a CLOSED path exactly as
// AE's Offset does, with no modulo needed on this side.
export function trimDash(total, start, end, offset) {
  const s0 = Number.isFinite(start) ? start : 0, e0 = Number.isFinite(end) ? end : 1;
  const s = Math.min(s0, e0), e = Math.max(s0, e0);
  const segLen = Math.max(0, (e - s) * total);
  const gap = Math.max(0, total - segLen);
  const off = (Number.isFinite(offset) ? offset : 0) * total;
  return {
    dasharray: gap <= 0.001 ? `${total} 0` : `${segLen.toFixed(3)} ${gap.toFixed(3)}`,
    dashoffset: (-(s * total) - off).toFixed(3),
  };
}

export function frame(ctx) {
  const { el, L, t, start } = ctx;
  const keyed = L.motion && L.motion.length
    && (L.motion[0].trimStart != null || L.motion[0].trimEnd != null || L.motion[0].trimOffset != null);
  if (!L.trim && !keyed) return;
  const target = trimTarget(el);
  if (!target || typeof target.getTotalLength !== 'function') return;
  if (target.__trimLen == null) {
    try { target.removeAttribute('pathLength'); } catch {}
    target.__trimLen = target.getTotalLength();
  }
  const total = target.__trimLen;
  const base = L.trim || {};
  let s = base.start ?? 0, e = base.end ?? 1, o = base.offset ?? 0;
  if (keyed) {
    const p = motionAt(L.motion, t - start, L.motionDelay);
    if (p.trimStart != null) s = p.trimStart;
    if (p.trimEnd != null) e = p.trimEnd;
    if (p.trimOffset != null) o = p.trimOffset;
  }
  const { dasharray, dashoffset } = trimDash(total, s, e, o);
  target.style.strokeDasharray = dasharray;
  target.style.strokeDashoffset = dashoffset;
  // A stamp, like svg.js's own draw/morph: a frame whose only change is a dash value must still
  // change the DOM signature, or the renderer's static-frame dedup reuses a neighbouring frame.
  el.dataset.trim = `${s.toFixed(3)}_${e.toFixed(3)}_${o.toFixed(3)}`;
}
