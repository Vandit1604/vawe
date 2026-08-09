// core/tracks/circle.js — spinning circular text: rotate the whole ring. The characters are laid out
// on the circle at build, so the only per-frame job is the ring's angle. Pure in t.
//
// It OVERWRITES the layer transform rather than composing onto it, which is why the docs tell you to
// pair `circle` with `anim:"fade"` or `anim:"none"` — an enter that moves would be thrown away here.
// That single fact fixes its slot from both sides: after `enter` and `primitive`, whose transforms it
// is entitled to discard, and before `react` and `transform`, which compose onto the ring's angle.
export const slot = 'spin';

export const PROPS = { circle: {} };

export function frame(kit, el, L, units, t) {
  if (!L.circle) return;
  const per = (typeof L.circle === 'object' ? (L.circle.period ?? 8) : 8) || 8;
  el.style.transform = `rotate(${(((t / per) * 360) % 360).toFixed(2)}deg)`;
}
