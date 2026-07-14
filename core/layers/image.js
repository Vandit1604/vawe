// core/layers/image.js — an <img> layer: ken-burns slow zoom (clipped) + edgeFade edge dissolve.
export function build(kit, el, L) {
  el.innerHTML = kit.icon(L.src, '');
  const im = el.querySelector('img'); if (im) { im.className = 'hs-img'; if (L.h) im.style.height = L.h + 'px'; if (L.w) im.style.width = L.w + 'px'; }
  if (L.ken && im) {
    Object.assign(el.style, { overflow: 'hidden', borderRadius: (L.radius ?? 18) + 'px' });
    im.style.objectFit = 'cover'; im.style.width = '100%'; im.style.height = '100%';
    if (L.h) el.style.height = L.h + 'px';
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
