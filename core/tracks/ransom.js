// core/tracks/ransom.js — ransom with `cycle`: re-roll each letter into a different cutout of the same
// glyph, in place, every frame. Stateless and derived from t, so it stays pure in n.
//
// After `split` and not before it: both write the same unit spans, and the reveal is the pose while
// the cycle is the surface. Reversing them would have the reveal overwrite each freshly rolled cutout.
import { ransomTick } from '../ransom.js';

export const slot = 'glyphs';

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(units && L.ransom && L.ransom.cycle && t >= start && t < end)) return;
  ransomTick(units, t - start, { seed: L.ransomSeed ?? L.text ?? '', accent: (kit.theme && kit.theme.accent) || undefined, ...L.ransom });
}
