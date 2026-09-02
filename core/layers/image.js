// core/layers/image.js. An <img> layer: ken-burns slow zoom (clipped) + edgeFade edge dissolve.
// `canvasFx` (halftone/dither/mosaic/…) is baked to a static PNG in boot.js; swap the src to it here.
import { canvasFxKey } from '../canvas-fx.js';
import { mergeProps, propsOf } from '../props.js';
import { attachResample, PROPS as RESAMPLE_PROPS } from '../resample.js';

// `edgeFadeColor` paints the plate the fade dissolves toward and means nothing alone, so it keeps a
// guarded hand-written entry; every other prop is read off build()/frame() below (propsOf, core/props.js).
export function build(kit, el, L, { src, w, h, radius, ken, canvasFx, edgeFade } = L) {
  el.innerHTML = kit.icon(src, '');
  const im = el.querySelector('img'); if (im) { im.className = 'hs-img'; if (h) im.style.height = h + 'px'; if (w) im.style.width = w + 'px'; }
  // baked canvas FX: replace the source with the pre-processed static image (deterministic)
  if (canvasFx && im && typeof window !== 'undefined' && window.__canvasFx) {
    const baked = window.__canvasFx[canvasFxKey(src, canvasFx)];
    if (baked) im.src = baked;
  }
  if (ken || radius != null) clipBox(el, im, { w, h, radius, ken });
  if (edgeFade && im) edgeMask(el, im, edgeFade, L.edgeFadeColor);
  attachResample(kit, el, L);
}

// `radius` used to be honoured ONLY under `ken`, so a plain image with radius rendered square and said
// nothing. An author asking for a circle got a rectangle. That shipped tpot (a brand whose entire motif
// is circular avatars) with square faces. Radius now clips ANY image; cover-fit rides along so a
// non-square source fills the shape instead of letter-boxing or distorting inside it.
function clipBox(el, im, { w, h, radius, ken }) {
  if (!im) return;
  Object.assign(el.style, { overflow: 'hidden', borderRadius: (radius ?? 18) + 'px' });
  if (w) el.style.width = w + 'px';
  if (h) el.style.height = h + 'px';
  // Cover-fit ONLY when the layer actually defines a box to fill. With no explicit height the wrapper
  // has nothing for `height:100%` to resolve against and the image collapses to zero, which is what a
  // width-only mascot layer (w:420, no h) would have done.
  if (ken || (w && h)) { im.style.objectFit = 'cover'; im.style.width = '100%'; im.style.height = '100%'; }
}

// a horizontal dissolve at both edges, over a plate the fade resolves toward
function edgeMask(el, im, edgeFade, color) {
  const fw = typeof edgeFade === 'number' ? edgeFade : 14;
  const mask = `linear-gradient(90deg, transparent 0%, #000 ${fw}%, #000 ${(100 - fw)}%, transparent 100%)`;
  im.style.webkitMaskImage = mask; im.style.maskImage = mask;
  el.style.background = color || '#ffffff';
}
// ken burns zoom (continuous over the whole window, identity outside)
// The pattern sits AFTER every argument the dispatcher passes, and that position is load-bearing.
// core/layers/index.js calls frame(kit, el, L, t, scene) with five arguments, so a pattern in the
// fifth slot destructures `scene` and every prop reads undefined. lib-test asserts the arity.
export function frame(kit, el, L, t, scene, { ken } = L) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const active = t >= start && t < end;
  if (ken) {
    // Memoised on the element: the <img> comes from build() and is never swapped (core/resample.js
    // hides it and appends a canvas beside it, it does not replace it), so re-finding it every frame
    // buys nothing. Taken here rather than in build() because a group child reaches this frame()
    // through core/layers/util.js, which has a fallback path that does not call this build() at all.
    // A memo written there would be missing exactly where ken already had to be fixed once.
    if (el.__kenImg === undefined) el.__kenImg = el.querySelector('img');
    const im = el.__kenImg;
    if (im) Object.assign(im.style, active
      ? kit.kenBurns(t - start, L.duration ?? 2, ken === true ? {} : ken)
      : { transform: 'scale(1)', transformOrigin: '50% 50%' });
  }
  // NOTE ken + resample do not compose: ken is a CSS transform on the <img>, and the texture is the
  // img's own pixels, which a CSS transform does not touch. Rejected at validate rather than
  // rendered as a silently-ignored ken (docs/MISTAKES.md, silence is the worst failure).
  // The resample TICK is core/tracks/resample.js now, one slot later, so every layer type gets one.
}

export const PROPS = mergeProps(
  propsOf(build), propsOf(frame), { edgeFadeColor: { when: 'edgeFade' } }, RESAMPLE_PROPS);

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "an <img> with cover-fit, radius, a ken-burns slow zoom and an edge dissolve; `canvasFx` bakes a per-pixel pass into it at boot";
