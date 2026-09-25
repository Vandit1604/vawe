// THIS ENGINE HAS TWO EASING VOCABULARIES and the field decides which one is in force. `parts[].ease`,
// `morph.ease`, `fx:{ease}`, `splitText.ease` and `motionPath.ease` are handed straight
// to gsap.fromTo, so they take GSAP names (`power2.inOut`). Everything else is driven by the engine's
// own interpolator and takes an EASINGS name. Both are correct, and a name from one in a field of the
// other is the #355 wrong-slot mistake, which is the single most-repeated defect in this log.
//
// resolveEasing now throws on an unknown name (#367), so this is not about catching it at all, it is
// about catching it in a second at author-check instead of mid-render on whichever frame first samples
// that key. The exclusion list below is the whole rule: get it wrong in the other direction and this
// invents findings on `showcase-lumen` and `showcase-type-labour`, which name GSAP eases correctly.
import { isObj, nearest } from './util.mjs';
import { EASINGS, isEasingName } from '../motion/motion.js';
import { FEEL } from '../registry/vocab.js';
import { keyHandleErrors } from '../timeline/sequence.js';

const GSAP_OWNED_EASE = new Set(['parts', 'morph', 'fx', 'splitText', 'motionPath', 'physics']);
const EASE_KEYS = new Set(['ease', 'easing', 'settleEase']);

function easeNames(v, path, errors, underGsap = false) {
  if (Array.isArray(v)) return v.forEach((x, i) => easeNames(x, `${path}[${i}]`, errors, underGsap));
  if (!isObj(v)) return;
  for (const [k, x] of Object.entries(v)) {
    const at = path ? `${path}.${k}` : k;
    const gsap = underGsap || GSAP_OWNED_EASE.has(k);
    // `varsEase` takes a string OR a per-channel map, so check the leaves either way.
    const leaves = (EASE_KEYS.has(k) || k === 'varsEase')
      ? (typeof x === 'string' ? [x] : (isObj(x) ? Object.values(x).filter((s) => typeof s === 'string') : []))
      : [];
    if (!gsap) for (const nm of leaves) {
      // ASK THE RESOLVER'S OWN PREDICATE. This used to test `EASINGS[nm]` by hand, which is a second
      // copy of the membership rule, and the day feel words became resolvable, the copy would have
      // reported every one of them as unknown while the renderer accepted it. Same argument as #367.
      if (isEasingName(nm)) continue;
      errors.push(`${at}: unknown easing "${nm}". This field is driven by the engine's own interpolator, `
        + `so it takes an EASINGS name.${/^(power[0-4]|back|elastic|bounce|circ|expo|sine|steps|none|rough|slow)\b/.test(nm)
          ? ` "${nm}" is a GSAP ease, real here, but only on a GSAP-driven field (parts[].ease, morph.ease, fx:{ease}).`
          : nearest(nm, [...Object.keys(EASINGS), ...Object.keys(FEEL)])}`);
    }
    easeNames(x, at, errors, gsap);
  }
}

/**
 * handleErrors(data) → messages[]: per-key `easeIn`/`easeOut` handles that contradict something else
 * on the same segment. It CALLS core/timeline/sequence.js keyHandleErrors rather than restating the rule,
 * because the renderer already refuses these at boot and a second copy here would be free to drift
 * into saying something different from the thing that actually throws.
 */
export function handleErrors(data) {
  const out = [];
  out.push(...keyHandleErrors(data.camera, 'camera'));
  const walkLayers = (ls, path) => (ls || []).forEach((L, i) => {
    if (!isObj(L)) return;
    out.push(...keyHandleErrors(L.motion, `${path}[${i}] (${L.type || 'text'})`));
    if (Array.isArray(L.timeRemap)) out.push(...keyHandleErrors(L.timeRemap, `${path}[${i}].timeRemap`));
    if (Array.isArray(L.children)) walkLayers(L.children, `${path}[${i}].children`);
  });
  walkLayers(data.layers, 'layers');
  return out;
}

/** easeErrors(cfg) → messages[]. Exported so the exclusion list is testable on its own, it is the
 *  half of this rule that can rot silently, because getting it wrong reads as a stricter gate. */
export function easeErrors(cfg) { const out = []; easeNames(cfg, '', out); return out; }
