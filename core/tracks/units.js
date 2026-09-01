// core/tracks/units.js, kinetic split-text on the layer's LOCAL clock: the clip appears at once and
// the units reveal themselves. presetOpts spreads any per-preset knob (gradient c1/c2, highlight
// colour, blur px, tilt deg…).
//
// Yields to two other owners of the same glyphs, and the conditions are the declaration: `circle` lays
// the units out on a ring and rotates the ring instead, and a named GSAP effect (`L.fx`) drives them
// from its own timeline. Two writers on one span is a fight nothing would report.
import { animateUnits } from '../type.js';

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

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(units && !L.circle && !L.fx && t >= start && t < end)) return;
  animateUnits(units, t - start, { preset: L.preset || (L.ransom ? 'fall' : 'up'), stagger: L.stagger ?? (L.ransom ? 0.08 : kit.M.stagger), each: L.each ?? 0.5, smoothness: L.smoothness, loop: L.loop, dist: L.dist, speed: L.speed, phaseStep: L.phaseStep, ...(L.presetOpts || {}) });
}
