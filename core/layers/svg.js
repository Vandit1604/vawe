// core/layers/svg.js: a vector layer for LOGOS and ICONS with two signature moves:
//   • draw: the stroke draws itself on (a mark assembling line-by-line), dashoffset 1→0, and then,
//           if you give it a fill, RESOLVES: the fill comes up and the stroke leaves.
//   • morph: one shape MELTS into another (a blob into the logo, one icon into the next), the true
//              shape-morph from core/path-morph.js, with an optional spin as it resolves.
// Both are pure functions of local time t (draw = dashoffset f(t); morph = a precomputed point-lerp f(t)),
// so renderFrame(n) stays seek-safe. Like glow/shader, frame() stamps el.dataset so a motion-only frame
// always changes the DOM signature (the render's static-frame dedup can't reuse a neighbour).
//
//   { "type":"svg", "x":810,"y":760,"w":300,"h":300, "viewBox":"0 0 100 100",
//     "d":"M50 5 L95 95 L5 95 Z", "stroke":"var(--accent)", "draw":{"dur":1.2,"weight":3} }
//   { …, "fill":"var(--accent)", "draw":{"dur":1.2,"fillDur":0.4,"ease":"easeInOutCubic"} }  ← ends AS the mark
//   { "type":"svg", "x":810,"y":760,"w":300,"h":300, "viewBox":"0 0 100 100",
//     "d":"<blob path>", "fill":"var(--accent)", "morph":{"to":"<logo path>","dur":1.4,"spin":6.28} }
//
// THE FILL RESOLVE IS THE SECOND HALF OF THE STANDARD RECIPE, and we shipped only the first for as
// long as this file has existed. After Effects does a logo write-on with Trim Paths and then uses the
// drawn stroke as an ALPHA MATTE for the real artwork, so the stroke reveals the filled mark and then
// disappears. Ours forced `fill: none` for a draw and never restored it, so a logo could draw itself on
// and could never end as itself: an outline effect wearing a logo reveal's name. Give the layer a
// `fill` (or `draw.fill`) and it now resolves. Give it none and nothing changes, which is why no
// shipped film moved: 0 of the 7 `svg` draw layers in the library carried a fill, because carrying one
// did nothing. docs/CRAFT/PARITY-AUDIT.md, docs/MISTAKES.md #545.
import { interpolate, easeOutCubic, resolveEasing } from '../motion.js';
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
  // static stroke was `draw:{weight:30}` for the side effect, a hack written to route around the
  // engine, which CLAUDE.md calls a bug report rather than an answer. `strokeWidth` is the honest
  // spelling; `draw.weight` still wins when present so no existing scene moves.
  if (L.strokeWidth != null) p.setAttribute('stroke-width', L.strokeWidth);
  if (L.draw) {
    // WHAT THE STROKE RESOLVES TO, decided once here rather than recomputed per frame. `draw.fill`
    // wins over `fill` so a mark can stroke in one colour and land in another; `true` means the
    // theme's accent, the same spelling `fill: true` already had at the top of this function.
    const want = L.draw.fill ?? L.fill;
    const fillTo = want == null || want === false ? null : (want === true ? 'var(--accent)' : want);
    // The fill is PRESENT from frame 0 and merely transparent. Painting it in at the end instead would
    // change the path's own attributes mid-shot for no gain, and fill-opacity is the one channel the
    // engine does not already own on this element (`opacity` is the enter/exit envelope's).
    p.setAttribute('fill', fillTo ?? 'none');
    if (fillTo) p.style.fillOpacity = '0';
    p.setAttribute('stroke', stroke === 'none' ? (fill !== 'none' ? fill : 'var(--accent)') : stroke);
    p.setAttribute('stroke-width', L.draw.weight ?? L.strokeWidth ?? 3);
    p.setAttribute('pathLength', '1');       // normalise so the offset is a pure function of u, no measuring
    p.style.strokeDasharray = '1 1';
    p.style.strokeDashoffset = '1';          // hidden at t=0
    el.__drawFill = fillTo;
    // ABSENT → easeOutCubic, exactly as before. A WRONG NAME → throws naming the field. The curve used
    // to be hardcoded, so the write-on always started at maximum speed; the standard is Easy Ease at
    // both ends, which is `ease: "easeInOutCubic"` here.
    el.__drawEase = resolveEasing(L.draw.ease);
  }
  svg.appendChild(p);
  el.appendChild(svg);
  el.__svgPath = p;

  if (L.morph && L.morph.to) {
    // resample BOTH shapes to equal point counts ONCE (build-time DOM read), align by best rotation, and
    // stash the arrays. From here morphD(u) is pure, no per-frame getPointAtLength.
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
    const u = interpolate(t - start, [0, dur], [0, 1], { easing: el.__drawEase || easeOutCubic, clamp: true });
    if (u >= 1) { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = '0'; }
    else { p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = (1 - u).toFixed(4); }
    // THE RESOLVE. The fill comes up over `fillDur` once the stroke has finished, and the stroke leaves
    // over the last 65% of that window rather than the whole of it: crossing them evenly puts both at
    // half alpha in the middle, which reads as the mark dimming rather than as one becoming the other.
    let v = 0;
    if (el.__drawFill) {
      const fd = L.draw.fillDur ?? 0.4;
      v = interpolate(t - start - dur, [0, fd], [0, 1], { easing: easeOutCubic, clamp: true });
      p.style.fillOpacity = v.toFixed(4);
      p.style.strokeOpacity = (1 - Math.min(1, Math.max(0, (v - 0.35) / 0.65))).toFixed(4);
    }
    // LOAD-BEARING, and the resolve is exactly the stretch that needed it: `u` sits at 1 for every frame
    // of the fill fade, so a stamp of `u` alone stops changing and the renderer's static-frame dedup is
    // free to reuse a neighbour and drop the whole second half.
    el.dataset.dw = u.toFixed(3); el.dataset.df = v.toFixed(3);
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
export const blurb = "a vector mark that DRAWS itself on (stroke dashoffset) and then RESOLVES INTO ITS FILL, the stroke leaving as the solid logo arrives, or MELTS from one path into another (true point-lerp morph, optional spin)";
