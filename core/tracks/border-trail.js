// core/tracks/border-trail.js — rotate the orbiting arc of a `borderTrail` by an INLINE transform.
// Inline, in the DOM, so the frame signature sees it and it stays pure in t: a WAAPI animation's state
// is not serialised, which is what broke the render's frame dedup.
//
// It writes a CHILD element, never the layer, so it shares no property with any other track and its
// slot is free. It sits here because the layer's own decoration belongs with the layer's own frame().
export const slot = 'orbit';

export function frame(kit, el, L, units, t) {
  if (!L.borderTrail) return;
  const s = el.querySelector('[data-trail]');
  if (!s) return;
  const per = +(s.dataset.trailPeriod || 4) || 4;
  s.style.transform = `rotate(${(((t / per) * 360) % 360).toFixed(2)}deg)`;
}
