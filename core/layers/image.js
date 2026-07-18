// core/layers/image.js — an <img> layer: ken-burns slow zoom (clipped) + edgeFade edge dissolve.
// `canvasFx` (halftone/dither/mosaic/…) is baked to a static PNG in boot.js; swap the src to it here.
import { canvasFxKey } from '../canvas-fx.js';

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
}
// ken burns zoom (continuous over the whole window, identity outside)
export function frame(kit, el, L, t) {
  if (!L.ken) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const im = el.querySelector('img'); if (!im) return;
  Object.assign(im.style, t >= start && t < end
    ? kit.kenBurns(t - start, L.duration ?? 2, L.ken === true ? {} : L.ken)
    : { transform: 'scale(1)', transformOrigin: '50% 50%' });
}
