// core/tracks/units.js, kinetic split-text on the layer's LOCAL clock: the clip appears at once and
// the units reveal themselves. presetOpts spreads any per-preset knob (gradient c1/c2, highlight
// colour, blur px, tilt deg…).
//
// Yields to two other owners of the same glyphs, and the conditions are the declaration: `circle` lays
// the units out on a ring and rotates the ring instead, and a named GSAP effect (`L.fx`) drives them
// from its own timeline. Two writers on one span is a fight nothing would report.
import { animateUnits, unitProgress, staggerStep, PRESET_REGISTRY } from '../type/type.js';
import { resolveEasing } from '../motion/motion.js';

export const slot = 'split';

// `units` exist only where the layer asked to be split, so every knob below is guarded on `split`, with
// `ransom` beside it, because scene.js implies a char split for a ransom layer and the reveal then runs
// on those units. `circle` implies a split too and is deliberately NOT here: it lays the units out on a
// ring and this track yields to it, so a preset on a circle layer is inert for the opposite reason.
const SPLIT = ['split', 'ransom'];
export const PROPS = {
  preset: { when: SPLIT }, stagger: { when: SPLIT }, each: { when: SPLIT }, loop: { when: SPLIT },
  dist: { when: SPLIT }, speed: { when: SPLIT }, phaseStep: { when: SPLIT }, presetOpts: { when: SPLIT },
  smoothness: { when: SPLIT }, exit: { when: SPLIT },
  circle: {}, fx: {}, ransom: {},
};

// A split group's whole arrival must read as ONE beat, not a typewriter: engine-doctrine/RULES caps the total
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
  const local = t - start;
  // `stagger` may be a NUMBER (the per-unit delay, as always) or the object form { each, from, amount }.
  // The theme's own default has to survive the object form too: `{ from: "center" }` alone still means
  // "the theme's delay, ordered from the centre", so it is spread OVER the default rather than past it.
  const stagger = L.stagger && typeof L.stagger === 'object'
    ? { each: kit.M.stagger, ...L.stagger }
    : (L.stagger ?? defaultStaggerStep(L.ransom ? 0.08 : kit.M.stagger, units.length));
  const each = L.each ?? 0.5;
  animateUnits(units, local, { preset: L.preset || (L.ransom ? 'fall' : 'up'), stagger, each, smoothness: L.smoothness, loop: L.loop, dist: L.dist, speed: L.speed, phaseStep: L.phaseStep, ...(L.presetOpts || {}) });
  exitFrame(kit, L, units, local, each, stagger);
}

// EXITS RUSH. An owner rule: an exit reads as more emphatic than the entrance it mirrors, never a
// same-speed rewind, so a departure lands as a decision rather than an afterthought. RUSH is the one
// dial that rule costs: left unconfigured, `each`/`stagger` scale DOWN from the entrance's own numbers
// (never a flat constant), so a slow, stately entrance still exits proportionally quicker, and `ease`
// defaults to an ACCELERATING curve. That default composes with a preset's own reversed easing rather
// than replacing it: `easeOutCubic` run backwards (`fn(1-u,...)`, below) already front-loads the slow
// part of the curve, and easeInCubic warping `ue` before the reversal makes the back half rush harder
// still, so the two read as one exit gathering pace, not two competing decelerations.
const EXIT_RUSH = 0.6;
const EXIT_EASE = 'easeInCubic'; // core/motion/motion.js: "gathers pace with real commitment... a departure that should read as decided"

// WORD-BY-WORD EXIT. `L.exit: { preset, at, each, stagger, from, ease, presetOpts }` runs a SECOND
// staggered pass over the same units, starting `at` seconds after the layer's own start. It is not a new
// visual vocabulary: `fn(1 - ease(ue), ...)` plays the chosen preset with its progress reversed (and
// rushed), which undoes whatever that preset does as an entrance (up sinks back down and fades, blur
// resolves back into blur), so every existing preset is an exit for free. Nothing writes here before
// `exit.at`, so a unit sits at its own entrance's settled (u=1) style for as long as `animateUnits` above
// already holds it.
function exitFrame(kit, L, units, local, entranceEach, entranceStagger) {
  if (!L.exit) return;
  const ex = L.exit;
  const exitLocal = local - (ex.at ?? 0);
  if (exitLocal < 0) return;
  const fn = PRESET_REGISTRY.pick(ex.preset || 'fade');
  const each = ex.each ?? entranceEach * EXIT_RUSH;
  // Same stagger vocabulary as the entrance (a number, or `{ each, from }`). Unconfigured, it derives
  // from the entrance's OWN resolved step (`staggerStep`, core/type.js), not a fresh theme default, so
  // an author who already tightened or loosened the entrance's rhythm gets that same rhythm back, rushed.
  const exitStagger = ex.stagger != null
    ? (typeof ex.stagger === 'object' ? { from: ex.from, ...ex.stagger } : { each: ex.stagger, from: ex.from ?? 'first' })
    : { each: staggerStep(entranceStagger, units.length, kit.M.stagger) * EXIT_RUSH, from: ex.from ?? 'first' };
  const ease = resolveEasing(ex.ease || EXIT_EASE);
  units.forEach((el2, i) => {
    const ue = unitProgress(exitLocal, i, units.length, { each, stagger: exitStagger });
    Object.assign(el2.style, fn(1 - ease(ue), ex.presetOpts || {}, i));
  });
}
