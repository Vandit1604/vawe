// core/layers/image.js — an <img> layer: ken-burns slow zoom (clipped) + edgeFade edge dissolve.
// `canvasFx` (halftone/dither/mosaic/…) is baked to a static PNG in boot.js; swap the src to it here.
import { canvasFxKey } from '../canvas-fx.js';
import { mergeProps } from '../props.js';
import { attachResample, tickResample, PROPS as RESAMPLE_PROPS } from '../resample.js';

// `radius` and `ken` are the two ways an image opts into a clipped cover-fit box, so each unlocks the
// other's geometry; `edgeFadeColor` paints the plate the fade dissolves toward and means nothing alone.
export const PROPS = mergeProps({
  src: {}, w: {}, h: {}, radius: {}, ken: {}, canvasFx: {},
  edgeFade: {}, edgeFadeColor: { when: 'edgeFade' },
}, RESAMPLE_PROPS);

export function build(kit, el, L) {
  el.innerHTML = kit.icon(L.src, '');
  const im = el.querySelector('img'); if (im) { im.className = 'hs-img'; if (L.h) im.style.height = L.h + 'px'; if (L.w) im.style.width = L.w + 'px'; }
  // baked canvas FX: replace the source with the pre-processed static image (deterministic)
  if (L.canvasFx && im && typeof window !== 'undefined' && window.__canvasFx) {
    const baked = window.__canvasFx[canvasFxKey(L.src, L.canvasFx)];
    if (baked) im.src = baked;
  }
  // `radius` used to be honoured ONLY under `ken`, so a plain image with radius rendered square and
  // said nothing — an author asking for a circle got a rectangle. That shipped tpot (a brand whose
  // entire motif is circular avatars) with square faces. Radius now clips ANY image; cover-fit rides
  // along so a non-square source fills the shape instead of letter-boxing or distorting inside it.
  if ((L.ken || L.radius != null) && im) {
    Object.assign(el.style, { overflow: 'hidden', borderRadius: (L.radius ?? 18) + 'px' });
    if (L.w) el.style.width = L.w + 'px';
    if (L.h) el.style.height = L.h + 'px';
    // Cover-fit ONLY when the layer actually defines a box to fill. With no explicit height the
    // wrapper has nothing for `height:100%` to resolve against and the image collapses to zero —
    // which is what a width-only mascot layer (w:420, no h) would have done.
    if (L.ken || (L.w && L.h)) { im.style.objectFit = 'cover'; im.style.width = '100%'; im.style.height = '100%'; }
  }
  if (L.edgeFade && im) {
    const fw = typeof L.edgeFade === 'number' ? L.edgeFade : 14;
    const mask = `linear-gradient(90deg, transparent 0%, #000 ${fw}%, #000 ${(100 - fw)}%, transparent 100%)`;
    im.style.webkitMaskImage = mask; im.style.maskImage = mask;
    el.style.background = L.edgeFadeColor || '#ffffff';
  }
  attachResample(kit, el, L);
}
// ken burns zoom (continuous over the whole window, identity outside) + resample tick
export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const active = t >= start && t < end;
  if (L.ken) {
    // Memoised on the element: the <img> comes from build() and is never swapped (core/resample.js
    // hides it and appends a canvas beside it, it does not replace it), so re-finding it every frame
    // buys nothing. Taken here rather than in build() because a group child reaches this frame()
    // through core/layers/util.js, which has a fallback path that does not call this build() at all —
    // a memo written there would be missing exactly where ken already had to be fixed once.
    if (el.__kenImg === undefined) el.__kenImg = el.querySelector('img');
    const im = el.__kenImg;
    if (im) Object.assign(im.style, active
      ? kit.kenBurns(t - start, L.duration ?? 2, L.ken === true ? {} : L.ken)
      : { transform: 'scale(1)', transformOrigin: '50% 50%' });
  }
  // NOTE ken + resample do not compose: ken is a CSS transform on the <img>, and the texture is the
  // img's own pixels, which a CSS transform does not touch. Rejected at validate rather than
  // rendered as a silently-ignored ken (docs/MISTAKES.md — silence is the worst failure).
  tickResample(el, L, t, active);
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "an <img> with cover-fit, radius, a ken-burns slow zoom and an edge dissolve; `canvasFx` bakes a per-pixel pass into it at boot";
