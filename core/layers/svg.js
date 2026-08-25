// core/layers/svg.js — a vector layer for LOGOS and ICONS with two signature moves:
//   • draw   — the stroke draws itself on (a mark assembling line-by-line), dashoffset 1→0.
//   • morph  — one shape MELTS into another (a blob into the logo, one icon into the next), the true
//              shape-morph from core/path-morph.js, with an optional spin as it resolves.
// Both are pure functions of local time t (draw = dashoffset f(t); morph = a precomputed point-lerp f(t)),
// so renderFrame(n) stays seek-safe. Like glow/shader, frame() stamps el.dataset so a motion-only frame
// always changes the DOM signature (the render's static-frame dedup can't reuse a neighbour).
//
//   { "type":"svg", "x":810,"y":760,"w":300,"h":300, "viewBox":"0 0 100 100",
//     "d":"M50 5 L95 95 L5 95 Z", "stroke":"var(--accent)", "draw":{"dur":1.2,"weight":3} }
//   { "type":"svg", "x":810,"y":760,"w":300,"h":300, "viewBox":"0 0 100 100",
//     "d":"<blob path>", "fill":"var(--accent)", "morph":{"to":"<logo path>","dur":1.4,"spin":6.28} }
import { interpolate, easeOutCubic } from '../motion.js';
import { resamplePath, bestRotation, rotatePoints, morphD } from '../path-morph.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// `draw.weight` still wins over `strokeWidth` where both are set, so neither is guarded on the other.
export const PROPS = { w: {}, h: {}, viewBox: {}, d: {}, fill: {}, stroke: {}, strokeWidth: {},
  draw: {}, morph: {} };

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  if (L.h != null) el.style.height = L.h + 'px';
  el.style.pointerEvents = 'none';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', L.viewBox || '0 0 100 100');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.style.overflow = 'visible';
  const fill = L.fill && L.fill !== true ? L.fill : (L.draw ? 'none' : 'var(--accent)');
  const stroke = L.stroke && L.stroke !== true ? L.stroke : (L.draw ? 'var(--accent)' : 'none');

  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', L.d || '');
  p.setAttribute('fill', fill);
  p.setAttribute('stroke', stroke);
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  // Stroke WIDTH used to be reachable only through `draw.weight`, so a stroked path that was not also
  // drawing itself on took the browser default of 1px and said nothing. The only way to get a thick
  // static stroke was `draw:{weight:30}` for the side effect — a hack written to route around the
  // engine, which CLAUDE.md calls a bug report rather than an answer. `strokeWidth` is the honest
  // spelling; `draw.weight` still wins when present so no existing scene moves.
  if (L.strokeWidth != null) p.setAttribute('stroke-width', L.strokeWidth);
  if (L.draw) {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', stroke === 'none' ? (fill !== 'none' ? fill : 'var(--accent)') : stroke);
    p.setAttribute('stroke-width', L.draw.weight ?? L.strokeWidth ?? 3);
    p.setAttribute('pathLength', '1');       // normalise so the offset is a pure function of u, no measuring
    p.style.strokeDasharray = '1 1';
    p.style.strokeDashoffset = '1';          // hidden at t=0
  }
  svg.appendChild(p);
  el.appendChild(svg);
  el.__svgPath = p;

  if (L.morph && L.morph.to) {
    // resample BOTH shapes to equal point counts ONCE (build-time DOM read), align by best rotation, and
    // stash the arrays. From here morphD(u) is pure — no per-frame getPointAtLength.
    const n = L.morph.points ?? 180;
    const tmp = document.createElementNS(SVGNS, 'path');
    tmp.setAttribute('d', L.morph.to); tmp.setAttribute('fill', 'none'); tmp.style.visibility = 'hidden';
    svg.appendChild(tmp);
    const from = resamplePath(p, n);
    const to = resamplePath(tmp, n);
    svg.removeChild(tmp);
    const k = bestRotation(from, to);
    el.__morph = { from, to: rotatePoints(to, k), rawTo: L.morph.to };
  }
}

export function frame(kit, el, L, t) {
  const p = el.__svgPath; if (!p) return;
  const start = L.start ?? 0;
  if (L.draw) {
    const dur = L.draw.dur ?? 1.2;
    const u = interpolate(t - start, [0, dur], [0, 1], { easing: easeOutCubic, clamp: true });
    if (u >= 1) { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = '0'; }
    else { p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = (1 - u).toFixed(4); }
    el.dataset.dw = u.toFixed(3);
  } else if (el.__morph) {
    const dur = L.morph.dur ?? 1.4, spin = L.morph.spin ?? 0, closed = L.morph.closed !== false;
    const u = interpolate(t - start, [0, dur], [0, 1], { easing: easeOutCubic, clamp: true });
    // crisp endpoints: render the raw target `d` once settled (the polyline only exists during the melt)
    if (u >= 1) p.setAttribute('d', el.__morph.rawTo);
    else p.setAttribute('d', morphD(el.__morph.from, el.__morph.to, u, { spin, closed }));
    el.dataset.mp = u.toFixed(3);
  }
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a vector mark that DRAWS itself on (stroke dashoffset) or MELTS from one path into another (true point-lerp morph, optional spin)";
