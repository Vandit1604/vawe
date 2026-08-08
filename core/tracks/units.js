// core/tracks/units.js — kinetic split-text on the layer's LOCAL clock: the clip appears at once and
// the units reveal themselves. presetOpts spreads any per-preset knob (gradient c1/c2, highlight
// colour, blur px, tilt deg…).
//
// Yields to two other owners of the same glyphs, and the conditions are the declaration: `circle` lays
// the units out on a ring and rotates the ring instead, and a named GSAP effect (`L.fx`) drives them
// from its own timeline. Two writers on one span is a fight nothing would report.
import { animateUnits } from '../type.js';

export const slot = 'split';

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(units && !L.circle && !L.fx && t >= start && t < end)) return;
  animateUnits(units, t - start, { preset: L.preset || (L.ransom ? 'fall' : 'up'), stagger: L.stagger ?? (L.ransom ? 0.08 : kit.M.stagger), each: L.each ?? 0.5, loop: L.loop, dist: L.dist, speed: L.speed, phaseStep: L.phaseStep, ...(L.presetOpts || {}) });
}
