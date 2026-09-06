// core/tracks/units.js, kinetic split-text on the layer's LOCAL clock: the clip appears at once and
// the units reveal themselves. presetOpts spreads any per-preset knob (gradient c1/c2, highlight
// colour, blur px, tilt deg…).
//
// Yields to two other owners of the same glyphs, and the conditions are the declaration: `circle` lays
// the units out on a ring and rotates the ring instead, and a named GSAP effect (`L.fx`) drives them
// from its own timeline. Two writers on one span is a fight nothing would report.
import { animateUnits } from '../type/type.js';

export const slot = 'split';

// `units` exist only where the layer asked to be split, so every knob below is guarded on `split`, with
// `ransom` beside it, because scene.js implies a char split for a ransom layer and the reveal then runs
// on those units. `circle` implies a split too and is deliberately NOT here: it lays the units out on a
// ring and this track yields to it, so a preset on a circle layer is inert for the opposite reason.
const SPLIT = ['split', 'ransom'];
export const PROPS = {
  preset: { when: SPLIT }, stagger: { when: SPLIT }, each: { when: SPLIT }, loop: { when: SPLIT },
  dist: { when: SPLIT }, speed: { when: SPLIT }, phaseStep: { when: SPLIT }, presetOpts: { when: SPLIT },
  smoothness: { when: SPLIT },
  circle: {}, fx: {}, ransom: {},
};

// A split group's whole arrival must read as ONE beat, not a typewriter: docs/RULES caps the total
// stagger (last unit's delay) at 0.5s. A flat per-unit theme delay was authored for short headlines and
// silently blew past that on a long one (a 20-char headline at the theme's 0.05s/unit already runs 0.95s
// of pure delay before its last glyph even starts moving). Only the UNAUTHORED case is scaled: an author
// who writes a number or object has said what they mean, and validate.mjs warns them instead of the
// engine second-guessing a decision on their behalf.
const STAGGER_BUDGET = 0.5;
function defaultStaggerStep(rawDefault, n) {
  return n > 1 ? Math.min(rawDefault, STAGGER_BUDGET / (n - 1)) : rawDefault;
}

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(units && !L.circle && !L.fx && t >= start && t < end)) return;
  // `stagger` may be a NUMBER (the per-unit delay, as always) or the object form { each, from, amount }.
  // The theme's own default has to survive the object form too: `{ from: "center" }` alone still means
  // "the theme's delay, ordered from the centre", so it is spread OVER the default rather than past it.
  const stagger = L.stagger && typeof L.stagger === 'object'
    ? { each: kit.M.stagger, ...L.stagger }
    : (L.stagger ?? defaultStaggerStep(L.ransom ? 0.08 : kit.M.stagger, units.length));
  animateUnits(units, t - start, { preset: L.preset || (L.ransom ? 'fall' : 'up'), stagger, each: L.each ?? 0.5, smoothness: L.smoothness, loop: L.loop, dist: L.dist, speed: L.speed, phaseStep: L.phaseStep, ...(L.presetOpts || {}) });
}
