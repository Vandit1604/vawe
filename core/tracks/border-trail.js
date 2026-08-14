// core/tracks/border-trail.js — rotate the orbiting arc of a `borderTrail` by an INLINE transform.
// Inline, in the DOM, so the frame signature sees it and it stays pure in t: a WAAPI animation's state
// is not serialised, which is what broke the render's frame dedup.
//
// It writes a CHILD element, never the layer, so it shares no property with any other track and its
// slot is free. It sits here because the layer's own decoration belongs with the layer's own frame().
export const slot = 'orbit';

export const PROPS = { borderTrail: {} };

// The arc node is found ONCE and remembered on the element. A track has no build hook (core/tracks/
// index.js: a track is frame() and nothing else), so the memo is taken on the first frame instead —
// which is the same thing, because the node is written by the layer's build() and the DOM under a
// layer does not change after that. `undefined` is the "not looked yet" sentinel and `null` a real
// answer, so a layer that declares `borderTrail` and has no arc stops searching too.
// core/layers/text.js is the pattern: measure at build, read the measurement in frame().
export function frame(kit, el, L, units, t) {
  if (!L.borderTrail) return;
  if (el.__trail === undefined) el.__trail = el.querySelector('[data-trail]');
  const s = el.__trail;
  if (!s) return;
  const per = +(s.dataset.trailPeriod || 4) || 4;
  s.style.transform = `rotate(${(((t / per) * 360) % 360).toFixed(2)}deg)`;
}
