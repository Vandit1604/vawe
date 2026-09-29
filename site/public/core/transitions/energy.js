// core/energy.js: the film's ENERGY, one top-level word that sets the DEFAULT speed curve for every
// cut and seam that names no `timing` of its own. AE motion design gives a whole piece one velocity
// personality: a calm brand film and a hype launch reel do not accelerate the same way. `energy` is
// that personality as a single field, and core/transitions-lower.js resolves it to a `timing` default.
//
// It is a DEFAULT, never an override. An explicit `timing` on a cut/seam always wins, and a film that
// names no `energy` is untouched, so every existing film re-lowers byte-identical. Energy adds no new
// curve: the words below map to timings that already live in core/cuts/timings.js.
import { defineRegistry } from '../registry/registry.js';

// energy word -> the timing (speed curve) it makes the film's default. Every value is a TIMINGS key,
// asserted in lib-test so a rename there cannot leave energy pointing at a curve that no longer exists.
export const ENERGY = {
  calm: 'out', // decelerate into place, unhurried, premium
  brand: 'ramp', // the house slow-fast-slow speed ramp, directed and confident
  hype: 'snappy', // decisive, lands and stops, launch-reel energy
  tense: 'rush', // accelerate away, urgent and restless
};

// The mood each word gives the whole film, in the words a person would search with. Kept beside the
// registry, which is where every other vocabulary keeps its descriptions, so `make arsenal` finds them.
export const ENERGY_BLURBS = {
  calm: 'unhurried: every cut decelerates into place. Premium, editorial, a film with room to breathe',
  brand: 'the house slow-fast-slow speed ramp on every cut. Directed and confident, the default to reach for',
  hype: 'decisive: cuts land and stop with no drift. Launch-reel energy, product drops, announcements',
  tense: 'restless: cuts accelerate away. Urgency, countdowns, a film that will not sit still',
};

// okEnergy(e): validate the field. Null when absent (the film keeps the per-fx defaults). Throws on an
// unknown word rather than defaulting, exactly like okDir: a junction is the worst place to guess.
export function okEnergy(e) {
  if (e == null) return null;
  if (Object.prototype.hasOwnProperty.call(ENERGY, e)) return e;
  throw new Error(`unknown energy "${e}", one of: ${Object.keys(ENERGY).join(', ')}. energy sets the `
    + 'film-wide default speed curve, and an explicit `timing` on a cut always wins.');
}

const ENERGY_AKA = {
  calm: ['unhurried film', 'editorial pace', 'premium slow cuts'],
  brand: ['house speed ramp', 'default film energy', 'confident directed pace'],
  hype: ['launch-reel energy', 'decisive cuts', 'product drop energy'],
  tense: ['restless film', 'urgent cuts', 'countdown energy'],
};

export const ENERGY_REGISTRY = defineRegistry('energy', ENERGY, { slot: 'energy', blurbs: ENERGY_BLURBS, aka: ENERGY_AKA,
  catalog: {
    title: 'Film energy',
    tag: 'top-level',
    intro: 'One word at the top of the scene sets the default speed curve for every cut and seam that '
      + 'names no `timing`. `energy:"brand"` gives the whole film the house speed ramp; `calm`, `hype` '
      + 'and `tense` shift the whole film\'s velocity at once. An explicit `timing` on a cut always wins.',
    usage: (n, { j }) => j({ energy: n }),
    preview: (n, { base, TWO }) => base({ energy: n, layers: TWO(2.4), cuts: [{ t: 2.4, style: 'push' }] }),
  },
});
