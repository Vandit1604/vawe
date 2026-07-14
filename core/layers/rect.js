// core/layers/rect.js — a panel / card / pill: pure box, no text (put text on a higher track).
export function build(kit, el, L) {
  if (L.h != null) el.style.height = L.h + 'px';
  if (L.bg == null && !L.elevation) el.style.background = '#fff';
  kit.chipBox(el, L);
}
