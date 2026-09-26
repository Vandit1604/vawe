// core/timeline/group-clock.js: THE GROUP'S OWN CLOCK. A group layer's `clock` gives its children a
// LOCAL timeline, played inside the group's own [start, start+duration] window on the film's clock,
// exactly the way core/timeline/time.js's `timeRemap` gives ONE layer a local clock, one level up: a
// container's clock rather than a leaf's. `group` was already "a hand-timed sub-timeline" in prose
// (core/layers/index.js LAYER_AKA.composition); this is the missing owner that makes a group SCRUB
// alone, the theatre.js "nested sequence" this repo names in its own doctrine.
//
// FIVE DIALS: `duration` (one cycle, in the group's own local seconds), `rate` (playback speed
// multiplier), `loop` (how many cycles, or a named repeat shape), `pingpong` (alternate direction each
// cycle, folded into `loop`'s named shapes so "loop forever" and "loop forever, alternating" are one
// dial and not two that can disagree), and `hold` (what the children do once the loops run out).
//
// PURE, like time.js: every function here is a remap of one number, so a seek and a forward render
// agree and renderFrame(n) stays pure in n.
import { defineRegistry, withBlurb, blurbsOf } from '../registry/registry.js';

// Named LOOP shapes, the same "a string picks a shape, or state the two numbers yourself" duality
// core/timeline/time.js's TIME_REMAP_REGISTRY already uses for `timeRemap`. `loop: 3` (a plain count)
// bypasses this registry entirely, same as a raw timeRemap key array bypasses TIME_REMAP_REGISTRY.
const LOOP_SHAPES = {
  forever: withBlurb('repeat the cycle without limit, restarting at 0 the instant the previous pass '
    + 'reaches the end of its own local duration, never reversing', { infinite: true, pingpong: false }),
  pingpong: withBlurb('repeat the cycle without limit, but reverse direction every other pass, like a '
    + 'ball bouncing between two walls, so it never jumps back to 0', { infinite: true, pingpong: true }),
};

export const LOOP_REGISTRY = defineRegistry('group clock loop', LOOP_SHAPES, {
  blurbs: blurbsOf('group clock loop', LOOP_SHAPES), slot: 'clock.loop',
  aka: {
    forever: ['loop forever', 'repeat endlessly', 'never stop looping'],
    pingpong: ['bounce back and forth', 'reverse every other loop', 'boomerang loop'],
  },
  catalog: {
    title: 'Group clock loop shapes',
    tag: 'timing',
    intro: 'The `loop` field of a group\'s `clock`. A whole number repeats the cycle that many times '
      + 'then holds (see `hold`); one of these two names repeats without limit, for as long as the '
      + 'group\'s own `duration` keeps it on screen.',
    usage: (n, { j }) => j({ type: 'group', clock: { duration: 1, loop: n }, children: [] }),
    preview: (n, { base, HERO }) => base({ layers: [
      { type: 'group', start: 0, duration: 4, clock: { duration: 1, loop: n },
        children: [ { ...HERO, text: n, x: 160, y: 430,
          motion: [{ t: 0, x: 160 }, { t: 1, x: 1360, ease: 'linear' }] } ] },
    ] }),
  },
});
export const LOOP_NAMES = Object.keys(LOOP_SHAPES);

function normalizeLoop(spec, who) {
  if (spec == null) return { count: 1, infinite: false, pingpong: false };
  if (typeof spec === 'number') {
    if (!Number.isFinite(spec) || spec < 1 || Math.floor(spec) !== spec)
      throw new Error(`clock.loop on ${who}: expected a whole number of repeats (>= 1), or one of `
        + `${LOOP_NAMES.join(', ')}, got ${JSON.stringify(spec)}.`);
    return { count: spec, infinite: false, pingpong: false };
  }
  return { count: Infinity, ...LOOP_REGISTRY.pick(spec) };
}

/**
 * resolveGroupClock(spec, who): validate and normalize a group's raw `clock` JSON into the shape
 * `groupLocalTime` reads. `who` names the layer in every error, the same convention `layerTime` and
 * `resolveRemap` already use.
 */
export function resolveGroupClock(spec, who) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec))
    throw new Error(`clock on ${who}: expected an object {duration, rate?, loop?, hold?}, `
      + `got ${JSON.stringify(spec)}.`);
  const duration = +spec.duration;
  if (!(duration > 0))
    throw new Error(`clock on ${who}: \`duration\` (one cycle, in local seconds) must be a positive `
      + `number, got ${JSON.stringify(spec.duration)}.`);
  const rate = spec.rate ?? 1;
  if (!(rate > 0))
    throw new Error(`clock on ${who}: \`rate\` must be a positive number, got ${JSON.stringify(spec.rate)}.`);
  return Object.freeze({ duration, rate, loop: Object.freeze(normalizeLoop(spec.loop, who)),
    hold: spec.hold ?? true });
}

/**
 * groupLocalTime(gc, elapsed): where a group's children believe they are, in LOCAL seconds inside one
 * cycle [0, gc.duration], given `elapsed` seconds since the group's own outer start. Negative elapsed
 * (before the group starts) reads as its first frame, the same convention `layerTime` uses for `t <=
 * start`.
 *
 * Once the authored `loop` count is spent, `hold: true` (the default) freezes on the pose the last
 * cycle actually ENDED on (its final frame, or its first frame if that cycle was running backwards
 * under `pingpong`); `hold: false` snaps back to the cycle's own rest pose, frame 0, and stays there.
 * Either way this is a single extra branch on the same arithmetic, not a second mechanism.
 */
export function groupLocalTime(gc, elapsed) {
  const e = Math.max(0, elapsed) * gc.rate;
  const { duration, loop, hold } = gc;
  const doneCycles = Math.floor(e / duration);
  const capped = !loop.infinite && doneCycles >= loop.count;
  const cycleIndex = capped ? loop.count - 1 : doneCycles;
  const phase = capped ? (hold ? duration : 0) : (e - doneCycles * duration);
  const reverse = loop.pingpong && (cycleIndex % 2 === 1);
  return reverse ? duration - phase : phase;
}

/**
 * groupClockAbsoluteTime(desc, t): the LOCAL second (inside one cycle, same 0-based basis as the
 * child's own `start`/`duration` under a running clock, see `resolveGroupWindow`) a descendant's own
 * clock should read at film time `t`, given the resolved `{ outerStart, gc }` descriptor baked onto it
 * at build (core/layers/util.js). Kept ONE level up from `layerTime` (which then still applies on top
 * of this, for a child that also carries its own `timeWarp`/`timeRemap`): a group's clock composes
 * with a layer's clock instead of replacing it, exactly like `runTracks` composes the two.
 */
export function groupClockAbsoluteTime(desc, t) {
  return groupLocalTime(desc.gc, t - desc.outerStart);
}
