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
import { interpolate, easeOutCubic, resolveEasing } from '../motion/motion.js';
import { resamplePath, bestRotation, rotatePoints, morphD } from './path-morph.js';
import { mergeProps, propsOf } from '../registry/props.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// WHAT THE STROKE RESOLVES TO, split out of build() so the write-on's own branching does not count
// against the layer's main shape decision. `draw.fill` wins over `fill` so a mark can stroke in one
// colour and land in another; `true` means the theme's accent, the same spelling `fill: true` already
// had at the top of build(). The fill is PRESENT from frame 0 and merely transparent: painting it in at
// the end instead would change the path's own attributes mid-shot for no gain, and fill-opacity is the
// one channel the engine does not already own on this element (`opacity` is the enter/exit envelope's).
function applyDraw(el, p, draw, { fillIn, fill, stroke, strokeWidth }) {
  const want = draw.fill ?? fillIn;
  const fillTo = want == null || want === false ? null : (want === true ? 'var(--accent)' : want);
  p.setAttribute('fill', fillTo ?? 'none');
  if (fillTo) p.style.fillOpacity = '0';
  p.setAttribute('stroke', stroke === 'none' ? (fill !== 'none' ? fill : 'var(--accent)') : stroke);
  p.setAttribute('stroke-width', draw.weight ?? strokeWidth ?? 3);
  // REAL length, not the `pathLength="1"` normalise trick: for a path with an arc (`A`) command, Chromium's
  // pathLength rescaling and its arc-flattening length estimate disagree at the seam between the line and
  // the arc, so at u≈0 a stray round-cap dot paints at the seam (not the true start) for a frame or two
  // before the correct growth from the start takes over. getTotalLength() is the same accurate, build-time
  // DOM read path-morph.js already trusts for arc-bearing paths (resamplePath, core/layers/path-morph.js:18);
  // dashing in its real units sidesteps the seam entirely. docs/MISTAKES.md.
  const total = p.getTotalLength();
  p.style.strokeDasharray = `${total} ${total}`;
  p.style.strokeDashoffset = total;        // hidden at t=0
  el.__drawLen = total;
  el.__drawFill = fillTo;
  // ABSENT → easeOutCubic, exactly as before. A WRONG NAME → throws naming the field. The curve used
  // to be hardcoded, so the write-on always started at maximum speed; the standard is Easy Ease at
  // both ends, which is `ease: "easeInOutCubic"` here.
  el.__drawEase = resolveEasing(draw.ease);
}

// resample BOTH shapes to equal point counts ONCE (build-time DOM read), align by best rotation, and
// stash the arrays. From here morphD(u) is pure, no per-frame getPointAtLength.
function applyMorph(el, svg, p, morph) {
  const n = morph.points ?? 180;
  const tmp = document.createElementNS(SVGNS, 'path');
  tmp.setAttribute('d', morph.to); tmp.setAttribute('fill', 'none'); tmp.style.visibility = 'hidden';
  svg.appendChild(tmp);
  const from = resamplePath(p, n);
  const to = resamplePath(tmp, n);
  svg.removeChild(tmp);
  const k = bestRotation(from, to);
  el.__morph = { from, to: rotatePoints(to, k), rawTo: morph.to };
}

// The props are read off this signature (propsOf, core/props.js). No second list to drift from it.
export function build(kit, el, L, { w, h, viewBox, d, fill: fillIn, stroke: strokeIn, strokeWidth, draw, morph } = L) {
  if (w != null) el.style.width = w + 'px';
  if (h != null) el.style.height = h + 'px';
  el.style.pointerEvents = 'none';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', viewBox || '0 0 100 100');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.style.overflow = 'visible';
  const fill = fillIn && fillIn !== true ? fillIn : (draw ? 'none' : 'var(--accent)');
  const stroke = strokeIn && strokeIn !== true ? strokeIn : (draw ? 'var(--accent)' : 'none');

  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', d || '');
  p.setAttribute('fill', fill);
  p.setAttribute('stroke', stroke);
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  // Stroke WIDTH used to be reachable only through `draw.weight`, so a stroked path that was not also
  // drawing itself on took the browser default of 1px and said nothing. The only way to get a thick
  // static stroke was `draw:{weight:30}` for the side effect, a hack written to route around the
  // engine, which CLAUDE.md calls a bug report rather than an answer. `strokeWidth` is the honest
  // spelling; `draw.weight` still wins when present so no existing scene moves.
  if (strokeWidth != null) p.setAttribute('stroke-width', strokeWidth);
  if (draw) applyDraw(el, p, draw, { fillIn, fill, stroke, strokeWidth });
  svg.appendChild(p);
  el.appendChild(svg);
  el.__svgPath = p;

  if (morph && morph.to) applyMorph(el, svg, p, morph);
}

// Pure: the dashoffset for one frame of the write-on, in the path's REAL length units (not the
// pathLength=1 normalised units the browser used to compute, see applyDraw above). Monotonic from
// `total` (u=0, nothing revealed) down to `0` (u=1, fully revealed) with no DOM involved, so it is the
// one piece of this file's draw logic that a plain Node test can assert without a browser.
export function drawOffset(total, u) {
  return u >= 1 ? 0 : total * (1 - Math.max(0, Math.min(1, u)));
}

// The pattern sits in the SIXTH slot: core/layers/index.js calls frame(kit, el, L, t, scene) with
// five arguments, so a pattern any earlier destructures `scene` and every prop reads undefined
// (lib-test asserts the arity). `scene` itself is unused here, same as clip.js and lottie.js.
export function frame(kit, el, L, t, scene, { draw, morph } = L) {
  const p = el.__svgPath; if (!p) return;
  const begin = L.start ?? 0;
  if (draw) {
    const dur = draw.dur ?? 1.2;
    const u = interpolate(t - begin, [0, dur], [0, 1], { easing: el.__drawEase || easeOutCubic, clamp: true });
    const total = el.__drawLen || 0;
    if (u >= 1) { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = '0'; }
    else { p.style.strokeDasharray = `${total} ${total}`; p.style.strokeDashoffset = drawOffset(total, u).toFixed(4); }
    // THE RESOLVE. The fill comes up over `fillDur` once the stroke has finished, and the stroke leaves
    // over the last 65% of that window rather than the whole of it: crossing them evenly puts both at
    // half alpha in the middle, which reads as the mark dimming rather than as one becoming the other.
    let v = 0;
    if (el.__drawFill) {
      const fd = draw.fillDur ?? 0.4;
      v = interpolate(t - begin - dur, [0, fd], [0, 1], { easing: easeOutCubic, clamp: true });
      p.style.fillOpacity = v.toFixed(4);
      p.style.strokeOpacity = (1 - Math.min(1, Math.max(0, (v - 0.35) / 0.65))).toFixed(4);
    }
    // LOAD-BEARING, and the resolve is exactly the stretch that needed it: `u` sits at 1 for every frame
    // of the fill fade, so a stamp of `u` alone stops changing and the renderer's static-frame dedup is
    // free to reuse a neighbour and drop the whole second half.
    el.dataset.dw = u.toFixed(3); el.dataset.df = v.toFixed(3);
  } else if (el.__morph) {
    const dur = morph.dur ?? 1.4, spin = morph.spin ?? 0, closed = morph.closed !== false;
    const u = interpolate(t - begin, [0, dur], [0, 1], { easing: easeOutCubic, clamp: true });
    // crisp endpoints: render the raw target `d` once settled (the polyline only exists during the melt)
    if (u >= 1) p.setAttribute('d', el.__morph.rawTo);
    else p.setAttribute('d', morphD(el.__morph.from, el.__morph.to, u, { spin, closed }));
    el.dataset.mp = u.toFixed(3);
  }
}

// Both signatures declare, because a prop read only on the frame path is just as real as one read at
// build time. mergeProps unions them (core/props.js).
export const PROPS = mergeProps(propsOf(build), propsOf(frame));

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a vector mark that DRAWS itself on (stroke dashoffset) and then RESOLVES INTO ITS FILL, the stroke leaving as the solid logo arrives, or MELTS from one path into another (true point-lerp morph, optional spin)";
