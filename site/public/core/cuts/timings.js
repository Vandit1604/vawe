// core/cuts/timings.js: the shared TIMINGS speed dial, moved verbatim out of core/cuts.js. A
// PRESENTATION (./presentations.js) says what a cut looks like; a TIMING says how it accelerates
// through it, chosen separately (`cuts:[{t,style,timing}]`). Same package split as core/stings/ and
// core/backgrounds/: core/cuts.js is now a thin re-export of ./index.js.
import { clamp01, easeInOutCubic, easeOutCubic, easeOutQuart, easeOutBack, accel, decel, speedRamp, easeOutSpring } from '../motion/motion.js';
import { defineRegistry } from '../registry/registry.js';

export const TIMINGS = {
  linear: (p) => clamp01(p),
  smooth: (p) => easeInOutCubic(clamp01(p)),
  out: (p) => easeOutCubic(clamp01(p)),
  snappy: (p) => easeOutQuart(clamp01(p)),
  pop: (p) => easeOutBack(clamp01(p)),
  // velocity ramps: rush accelerates away (exits), brake decelerates in (entrances),
  // ramp is the slow-fast-slow editor's speed ramp (whips, camera throws)
  rush: (p) => accel(clamp01(p)),
  brake: (p) => decel(clamp01(p)),
  ramp: (p) => speedRamp(clamp01(p)),
  // damped-spring: overshoots past 1 around p~0.69 then settles, the one shape a plain ease cannot
  // give a landing. Reach for it on a badge/chip/number arriving with physical life.
  spring: (p) => easeOutSpring(clamp01(p)),
};

// The curve a cut travels on, in the author's terms. Kept beside the registry, which is where every
// other vocabulary in this engine keeps its descriptions, so `make arsenal` finds them with the names.
export const TIMING_BLURBS = {
  linear: 'no easing at all, straight 1:1 progress. A machine, a wipe with no personality, a ticker',
  smooth: 'easeInOutCubic: eases at both ends, cubic in then cubic out. Reads as travel rather than as arrival',
  out: 'easeOutCubic: decelerates into place with no overshoot, the default feel for something appearing on screen',
  snappy: 'easeOutQuart: lands fast and settles crisply, quicker off the mark than cubic and it never overshoots its target',
  pop: 'easeOutBack: overshoots past the mark by about 10% and comes back. Playful, use once',
  rush: 'accel(t, 2.4): a power curve of exponent 2.4, starts slow and keeps speeding up. The exit curve, it leaves faster than it left rest',
  brake: 'decel(t, 2.4): the mirror power curve, fast at the start and slows into the stop. The entrance curve, it arrives slower than it set off',
  ramp: "speedRamp(t): velocity is low at both ends and peaks at the midpoint (sharp=2.4). The editor's slow-fast-slow speed ramp, for a whip or a camera throw",
  spring: 'easeOutSpring: a damped-spring overshoot that settles, physical life for something landing: a badge, a chip, a number',
};

const TIMING_AKA = {
  linear: ['no easing', 'constant speed', 'robotic', 'mechanical timing'],
  smooth: ['gentle both ends', 'ease in and out', 'soft travel'],
  out: ['decelerate in', 'default arrival', 'settles in place'],
  snappy: ['quick and decisive', 'fast no bounce', 'crisp landing'],
  pop: ['overshoot and settle', 'bouncy pop', 'past the mark'],
  rush: ['speeds up leaving', 'accelerating exit', 'takes off'],
  brake: ['slows into place', 'decelerating entrance', 'eases to a stop'],
  ramp: ['slow fast slow', 'editor speed ramp', 'whip pan curve'],
  spring: ['spring physics', 'bounces into place', 'physical landing'],
};

export const TIMING_REGISTRY = defineRegistry('cut timing', TIMINGS, { slot: 'cutTiming', blurbs: TIMING_BLURBS, aka: TIMING_AKA,
  catalog: {
    title: 'Cut timings',
    tag: 'cuts[]/per-layer',
    intro: 'The SPEED CURVE a cut travels on, chosen separately from the cut itself: `cuts:[{ "t":3, "style":"push", "timing":"ramp" }]`, or `cutTiming` on a per-layer cut. The style says what the transition looks like; the timing says how it accelerates. `ramp` is the editor\'s slow-fast-slow speed ramp, for a whip or a camera throw; `rush` accelerates away and suits an exit; `brake` decelerates in and suits an arrival. A scene writes the word and the schema enum is derived from this registry, but the arsenal never listed it.',
    // The timing rides ON a cut, so the usage shows both: a style with a speed curve chosen for it.
    usage: (n, { j }) => j({ cuts: [{ t: 2.4, style: 'push', timing: n }] }),
    // One style throughout, so the only thing moving between these clips is the acceleration. `push`
    // travels far enough that the curve is legible, which `fade` would not be.
    preview: (n, { base, TWO }) => base({ layers: TWO(2.4), cuts: [{ t: 2.4, style: 'push', timing: n }] }),
  },
});
