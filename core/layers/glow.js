// core/layers/glow.js — soft light: radial centre-glow, or a directional beam. Pure gradient div.
export function build(kit, el, L) {
  const c = L.color === true || L.color == null ? 'var(--accent-glow)' : kit.hexA(L.color, L.intensity ?? 0.25);
  if (L.h != null) el.style.height = L.h + 'px';
  const ang = { right: '90deg', left: '270deg', up: '0deg', down: '180deg' }[L.beam];
  el.style.background = ang ? `linear-gradient(${ang}, transparent, ${c})`
                            : `radial-gradient(50% 50% at 50% 50%, ${c}, transparent 72%)`;
  el.style.pointerEvents = 'none';
}
