// core/time.js: THE LAYER'S OWN CLOCK. One owner, three dials, and every track downstream reads the
// number this file returns.
//
// After Effects calls this family Time Remapping, and its whole point is that the CLOCK moves, not a
// property. Ease a motion track and you bend one property across one segment: the `count` underneath
// still counts at an even rate, the `typing` still types at its own speed, the idle still breathes.
// Warp the clock and everything the layer does slows and speeds TOGETHER, because there is only one
// `t` and every track takes it from here.
//
// TWO DIALS, and the reason there are two rather than one:
//
//   timeWarp   an easing NAME over the whole span. One curve, monotone. `"easeInQuint"` starts slow
//              and whips to the end. It predates this file and stays, because it is one word and it
//              covers the common case.
//   timeRemap  KEYFRAMES on the clock: `[{t, at}]`, where `t` is the layer's elapsed second and `at`
//              is the second the layer believes it is. This is the thing an easing cannot express:
//              fast, HOLD, fast. It also gives the freeze (two keys with the same `at`) and the
//              reverse (`at` going down) out of the same mechanism, with no second vocabulary.
//
// THE THIRD DIAL IS NOT HERE, and that is deliberate. Posterize Time, the hand-drawn "on twos" look,
// is already `step` on a layer: core/motion.js stepClock quantises the clock and films/scene/scene.js
// hands runTracks the stepped second, so the entrance is stepped by the same number inside clipStyleAt.
// A `stepFps` beside it would have been a second spelling of a shipped capability, which is the fork
// this repo logs more than any other defect.
//
// timeWarp and timeRemap are REFUSED TOGETHER. They are two spellings of one decision, and a layer
// carrying both would have one of them silently win.
//
// PURE IN t, which is the constraint the whole design is written around. Every function here is a
// remap of one number: no accumulator, no "where was I last frame", nothing that would make a seek
// disagree with a forward render. A layer's window never moves either, only where inside it the layer
// believes it is, so `start` and `duration` still mean what they say.
import { resolveEasing, handleCurve } from '../motion/motion.js';
import { defineRegistry, withBlurb, blurbsOf } from '../registry/registry.js';
import { groupLocalTime } from './group-clock.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---- THE NAMED SHAPES -------------------------------------------------------------------------
//
// Keys here are NORMALISED on both axes: `t` is the fraction of the layer's span, `at` is the fraction
// of its source time. So one shape fits a 2s layer and a 12s one, and the ratios (which ARE the speed)
// hold either way. An author's own `timeRemap` array is in SECONDS instead, because that is what a
// `motion` key's `t` already means, and two units for one field is a trap.
//
// The numbers are the ones practitioners use, not invented ones: a whip is normal to roughly 400-800%
// and back with an ease on every key, and a slow-motion hold ramps down to about 30-35% of speed, sits
// there, and ramps out at the same pace.
const SHAPES = {
  whip: withBlurb('SPEED RAMP: crawls at 20% speed, whips through the middle at about 530%, lands slow. The AE three-key ramp, for a dull passage you want crossed fast', [
    { t: 0, at: 0 }, { t: 0.40, at: 0.08, ease: 'easeInCubic' },
    { t: 0.55, at: 0.88, ease: 'easeOutCubic' }, { t: 1, at: 1 },
  ]),
  hold: withBlurb('the slow-motion HOLD: in fast, down to 30% speed across the middle half, out fast. The part you want the eye to actually read sits in the slow part', [
    { t: 0, at: 0 }, { t: 0.25, at: 0.35, ease: 'easeOutCubic' },
    { t: 0.75, at: 0.50, ease: 'linear' }, { t: 1, at: 1, ease: 'easeInCubic' },
  ]),
  freeze: withBlurb('FREEZE FRAME: the layer plays out over the first 60% of its window, then holds dead still on its own last pose for the rest of it', [
    { t: 0, at: 0 }, { t: 0.6, at: 1 }, { t: 1, at: 1 },
  ]),
  rewind: withBlurb('plays to the end at double speed, then runs itself BACKWARDS to where it started. One layer, one window, and the return is the same motion reversed', [
    { t: 0, at: 0 }, { t: 0.5, at: 1, ease: 'easeOutCubic' }, { t: 1, at: 0, ease: 'easeInCubic' },
  ]),
};

export const TIME_REMAP_REGISTRY = defineRegistry('time remap', SHAPES, {
  blurbs: blurbsOf('time remap', SHAPES), slot: 'timeRemap',
  // "play the layer backwards" found nothing. `rewind`'s blurb says BACKWARDS, but nobody types the
  // one word a blurb happens to use, and `reverse` and `boomerang` are what this shape is called
  // everywhere else. Never printed: the blurb already reads well.
  aka: {
    rewind: ['reverse', 'backwards', 'boomerang', 'ping-pong', 'play in reverse'],
    whip: ['speed ramp', 'crawl then whip', 'fast-slow-fast clock'],
    hold: ['slow motion hold', 'slo-mo dip', 'ramp down to slow'],
    freeze: ['freeze frame', 'hold the last pose', 'stop on the last frame'],
  },
  catalog: {
    title: 'Time remaps (the layer\'s own clock)',
    tag: 'timing',
    intro: '`timeRemap` on a layer. After Effects\' Time Remapping: the CLOCK accelerates, brakes, holds or reverses, so everything the layer does moves with it (its motion, its size, its idle, its typing, its count). An easing on a motion track cannot do this: it bends one property across one segment while the counter underneath still counts at an even rate. Name one of these shapes, or write your own keys `[{"t":0,"at":0},{"t":1.4,"at":0.3}]`, where `t` is the layer\'s elapsed second and `at` is the second it believes it is. The neighbouring dials: `timeWarp` is the one-easing form of the same idea, and `stepFps` posterizes the clock to a lower rate (15 in a 30fps film is the hand-drawn "on twos" look).',
    // A remap is one word on the layer whose clock it warps, and the motion track is there to say what
    // the clock is FOR: the same three keys read as a whip, a hold, a freeze or a rewind depending on
    // this one field, which is the whole argument for it being a clock and not a fourth easing.
    usage: (n, { j }) => j({ timeRemap: n, motion: [{ t: 0, x: -420 }, { t: 4, x: 420, ease: 'linear' }] }),
    // The subject travels the frame at an even rate under a `linear` track, so everything the eye reads
    // as speed here comes from the remap alone: `whip` crawls then bolts, `hold` sits in the middle,
    // `freeze` stops dead, `rewind` comes back. The counter rides along to show the clock reaching a
    // primitive, which is the part an easing on the motion track could never do.
    preview: (n, { base, HERO }) => base({ layers: [
        { ...HERO, text: n, y: 380, timeRemap: n, motion: [{ t: 0, x: -520 }, { t: 5.4, x: 520, ease: 'linear' }] },
        { type: 'count', to: 100, x: 160, y: 640, w: 1600, align: 'center', size: 200, weight: 800,
          start: 0.3, duration: 5.4, timeRemap: n },
      ] }),
  },
});
export const TIME_REMAP_NAMES = Object.keys(SHAPES);
export const TIME_REMAP_BLURBS = TIME_REMAP_REGISTRY.blurbs;

// ---- THE READ ----------------------------------------------------------------------------------

// remapAt(keys, lt): the source time at elapsed time `lt`, both in the same unit. Holds the first and
// last key outside the keyed range, exactly as motionAt does, so a remap that stops short of the
// layer's end freezes there rather than falling off a cliff.
function remapAt(keys, lt) {
  if (lt <= keys[0].t) return keys[0].at;
  const last = keys[keys.length - 1];
  if (lt >= last.t) return last.at;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (lt >= a.t && lt <= b.t) {
      const seg = b.t - a.t;
      if (!(seg > 0)) return b.at;
      // HANDLES ON THE CLOCK, the same mechanism a motion key has, and the units land better here
      // than anywhere else in the engine. `speed` is a multiple of the segment's average velocity,
      // and this segment's velocity IS a playback rate, so `{"speed": 4}` on a timeRemap key means
      // four times speed at that instant, which is what a speed graph has always meant. `speed: 0`
      // stops the clock dead at the key, which is the freeze, reachable without a second key.
      //
      // IT IS THE SAME SOLVER, not a second one. The argument for handles on a position is that a
      // named easing shapes a segment from outside it and cannot say what the value is doing AT the
      // key; a clock has exactly that problem and had exactly one answer for it, `linear`.
      const p = (handleCurve(a.easeOut, b.easeIn) || resolveEasing(b.ease || 'linear'))(clamp01((lt - a.t) / seg));
      return a.at + (b.at - a.at) * p;
    }
  }
  return last.at;
}

// resolveRemap(spec, span, who): this layer's keys, in SECONDS. A name is scaled by the span here,
// which is the one place a normalised shape and a real duration meet.
//
// A BAKED LIST IS RETURNED UNTOUCHED, and that is the whole reason `bakeTimeRemap` exists. This used
// to run on EVERY frame, from inside `layerTime`, whose own docstring says it is called once per
// layer per frame: so every frame re-validated every key, and a NAMED shape allocated a fresh array
// through `.map()` on the way. The output was right and the work was wasted, and it grew with the
// layer count. Handles make it worse, because a handled key carries more to check than a bare one.
function resolveRemap(spec, span, who) {
  if (spec && spec.baked) return spec;
  if (typeof spec === 'string')
    return TIME_REMAP_REGISTRY.pick(spec).map((k) => ({ t: k.t * span, at: k.at * span, ease: k.ease }));
  if (!Array.isArray(spec) || spec.length < 2)
    throw new Error(`timeRemap on ${who}: expected a shape name (${TIME_REMAP_NAMES.join(', ')}) or at `
      + `least two keys like [{"t":0,"at":0},{"t":1,"at":2}], where \`t\` is the layer's elapsed second `
      + `and \`at\` is the second it believes it is. Got ${JSON.stringify(spec)}.`);
  for (let i = 0; i < spec.length; i++) {
    const k = spec[i];
    if (!k || !Number.isFinite(k.t) || !Number.isFinite(k.at))
      throw new Error(`timeRemap on ${who}: key ${i} needs a numeric \`t\` (elapsed) and \`at\` (source), `
        + `got ${JSON.stringify(k)}.`);
    if (i > 0 && k.t < spec[i - 1].t)
      throw new Error(`timeRemap on ${who}: key ${i} has t=${k.t}, before key ${i - 1} at t=${spec[i - 1].t}. `
        + `\`t\` is the layer's own elapsed time and only ever goes forward. It is \`at\` that may go `
        + `backwards, which is how a rewind is written.`);
  }
  return spec;
}

/**
 * bakeTimeRemap(L): resolve this layer's `timeRemap` ONCE, at boot, into seconds keys.
 *
 * Two things it buys. The per-frame path stops validating and stops allocating (see resolveRemap).
 * And a bad key list now fails at BOOT with the layer named, rather than on whichever frame first
 * samples it, which is the same trade `bakeCameraMove` and `bakeDepth` already make.
 *
 * The span it bakes against is `L.duration ?? 2`, which is exactly what `layerTime` computes from the
 * `start`/`end` runTracks hands it, so the baked list is the list the read would have produced.
 *
 * The `baked` mark is NON-ENUMERABLE and sits on the ARRAY, not on the layer: a new layer property
 * would be a schema-drift finding and a thing every prop walker has to learn about, and this is
 * neither. Same construction as `withBlurb` in core/registry.js, for the same reason.
 */
export function bakeTimeRemap(L) {
  if (!L || L.timeRemap == null || L.timeRemap.baked) return;
  const keys = resolveRemap(L.timeRemap, L.duration ?? 2, L.id || L.type || 'a layer');
  L.timeRemap = Object.defineProperty(keys.slice(), 'baked', { value: true });
}

/**
 * layerTime(L, t, start, end): where this layer believes it is, in the film's own seconds. `t` may
 * already be quantised by the layer's `step`; a warp of a stepped clock is still stepped.
 * Called ONCE per layer per frame, by runTracks, and applied nowhere else: that is what makes this a
 * clock rather than a fifteenth effect. Doing it inside motionAt would have warped the position and
 * left the typing behind.
 */
export function layerTime(L, t, start, end) {
  let out = t;
  if (L.timeWarp || L.timeRemap) {
    const who = L.id || L.type || 'a layer';
    if (L.timeWarp && L.timeRemap)
      throw new Error(`${who} declares BOTH \`timeWarp\` and \`timeRemap\`. They are two spellings of `
        + `one decision, a curve on this layer's clock, so one of them would silently win. `
        + `\`timeRemap\` is the general form: [{"t":0,"at":0},…]. Keep one.`);
    const span = end - start;
    if (span > 0 && t > start) {
      const u = clamp01((t - start) / span);
      out = L.timeWarp ? start + resolveEasing(L.timeWarp)(u) * span
        : start + remapAt(resolveRemap(L.timeRemap, span, who), u * span);
    }
  }
  // `drive.loop` composes AFTER any warp, on the already-warped clock: it is a separate decision (loop
  // this layer's OWN keyframes past a point) from timeWarp/timeRemap (bend the speed across one pass),
  // so the two stack rather than being refused together the way timeWarp/timeRemap refuse each other.
  if (L.drive && L.drive.loop) out = applyDriveLoop(L, out, start);
  return out;
}

const DRIVE_LOOP_MODES = ['cycle', 'pingpong', 'continue'];

function validateDriveLoop(spec, who) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec))
    throw new Error(`drive.loop on ${who}: expected an object like { "mode": "cycle", "to": 1.4 }, `
      + `got ${JSON.stringify(spec)}.`);
  const mode = spec.mode ?? 'cycle';
  if (!DRIVE_LOOP_MODES.includes(mode))
    throw new Error(`drive.loop on ${who}: \`mode\` must be one of ${DRIVE_LOOP_MODES.join(', ')}, `
      + `got ${JSON.stringify(spec.mode)}.`);
  const from = spec.from ?? 0;
  if (typeof from !== 'number' || !Number.isFinite(from) || from < 0)
    throw new Error(`drive.loop on ${who}: \`from\` must be a non-negative number of seconds, got `
      + `${JSON.stringify(spec.from)}.`);
  if (typeof spec.to !== 'number' || !(spec.to > from))
    throw new Error(`drive.loop on ${who}: \`to\` must be a number of seconds greater than \`from\` `
      + `(${from}), got ${JSON.stringify(spec.to)}. This is the ONE cycle of the layer's own `
      + `keyframes that repeats.`);
  return { mode, from, to: spec.to };
}

// applyDriveLoop(L, t, start): `drive.loop` reuses groupLocalTime, the SAME cycle/pingpong arithmetic a
// group's own clock already runs (core/timeline/group-clock.js), so a layer's OWN keyframes repeat
// past `to` exactly the way a group repeats its children: restart at `from` (cycle) or bounce
// (pingpong). `continue` is a no-op here, the pass-through motionAt already gives for free by holding
// the last keyframe once time runs past it.
function applyDriveLoop(L, t, start) {
  const spec = validateDriveLoop(L.drive.loop, L.id || L.type || 'a layer');
  const elapsed = t - start;
  if (spec.mode === 'continue' || elapsed <= spec.from) return t;
  const dur = spec.to - spec.from;
  const local = groupLocalTime(
    { duration: dur, rate: 1, loop: { count: Infinity, infinite: true, pingpong: spec.mode === 'pingpong' }, hold: true },
    elapsed - spec.from);
  return start + spec.from + local;
}
