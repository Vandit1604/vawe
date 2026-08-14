// core/tracks/react.js — AUDIO REACT: modulate a property from the baked per-frame band energy, read
// from a table indexed by the integer frame. The frame never analyses audio, so purity is untouched.
//
// Composed BEFORE `transform` so an authored choreography still wins the outer transform. Two further
// consequences of that order were never written down, and both are live behaviour rather than
// accidents to tidy away here:
//   - OPACITY COMPOUNDS. This writes `baseOpacity(el) * val`; the motion track then reads the element
//     again and writes `baseOpacity(el) * m.opacity`. A layer with both gets the product of the two,
//     which is what you want and what nobody stated.
//   - BLUR DOES NOT. The motion track strips every blur() off `filter` and rewrites it from its own
//     numbers, so on a layer that has a motion track, `react: { prop: "blur" }` is computed here and
//     then thrown away. Preserved exactly as it was; recorded so the next author reads it as a defect
//     with a name rather than as a mystery.
import { sampleAt } from '../spectrum.js';
import { baseOpacity } from './util.js';

export const slot = 'react';

export const PROPS = { react: {} };

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(L.react && window.__spectrum && t >= start && t < end)) return;
  const rs = Array.isArray(L.react) ? L.react : [L.react];
  for (const r of rs) {
    const v = sampleAt(window.__spectrum, f, r.band || 'low');   // f IS the frame index
    const [lo, hi] = r.range || [0, 1];
    const val = lo + (hi - lo) * Math.max(0, Math.min(1, v));
    if (r.prop === 'opacity') el.style.opacity = (baseOpacity(el) * val).toFixed(3);
    else if (r.prop === 'blur') {
      // Guarded exactly as core/tracks/motion.js guards the same strip, and for the same reason: the
      // write below is authoritative and stays unconditional, while the scan for a previous blur() only
      // has to run when there is one to find. `replace` with no match returns its input unchanged.
      const cur = el.style.filter || '';
      const fb = (cur.includes('blur(') ? cur.replace(/blur\([^)]*\)/g, '') : cur).trim();
      el.style.filter = val > 0.4 ? (fb ? fb + ' ' : '') + `blur(${val.toFixed(2)}px)` : (fb || 'none');
    } else { // default: scale
      const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
      el.style.transform = `scale(${val.toFixed(4)})${base}`;
    }
  }
}
