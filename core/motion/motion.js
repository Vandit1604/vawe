// core/motion/motion.js: After Effects style keyframe handles as cubic-bezier easings. Pure, no DOM.
import { cubicBezier } from './curves.js';

// A handle belongs to a KEY and one SIDE of it (out shapes the segment leaving a key, in the segment
// arriving at it), unlike a named easing which shapes a whole segment.
//
//   influence   how far along the segment the handle reaches, 0-100% of duration: x1 = outInfluence/100.
//   speed       how fast the value moves AT the key, as a MULTIPLE of the segment's average velocity.
//               0 = dead stop, 1 = straight line, 4 = rushes out, negative = leaves backwards first.
//
// Speed is a multiple, not units/sec, because AE keys speed per property dimension separately (x,
// scale and rot don't share a scale). Written as a multiple, the substitution
// `y1 = frac * (valueDelta/segDur) * ((influence/100)*segDur) / valueDelta` cancels exactly to
// `frac * influence/100`: no delta, no duration, no division, so one handle pair is correct for every
// property on the key at once. Cost: a per-property speed in real units is not expressible.
const HANDLE_DEFAULT_INFLUENCE = 100 / 3;   // AE's Easy Ease reaches a third of the way in

// A side with no handle is the linear half (influence a third, speed 1): the control point sits on
// the diagonal, matching AE's own default temporal interpolation.
const LINEAR_SIDE = { influence: HANDLE_DEFAULT_INFLUENCE, speed: 1 };

// Peak slope in multiples of average velocity: easyEase 1.50x, easeInOutCubic 3.00x, `hang` on both
// sides 4.00x. `overshoot` needs a NEGATIVE speed: `y2 = 1 - speed*influence`, so a positive speed
// pulls the control point below the key and gives a plain ease-in. 35 / -0.4 are the Lottie medians
// (about 1 per cent past the key against easyEase); `fling` and `long` are the HyperFrames medians.
const HANDLES = {
  easyEase: { influence: HANDLE_DEFAULT_INFLUENCE, speed: 0 },
  linear: { ...LINEAR_SIDE },
  hang: { influence: 75, speed: 0 },
  long: { influence: 60, speed: 0 },
  fling: { influence: 12, speed: 4.8 },
  overshoot: { influence: 35, speed: -0.4 },
};

export const HANDLE_REGISTRY = {
  names: Object.keys(HANDLES),
  pick(name) {
    if (Object.prototype.hasOwnProperty.call(HANDLES, name)) return HANDLES[name];
    throw new Error(`unknown keyframe handle "${name}". Known keyframe handles: ${this.names.join(', ')}.`);
  },
};

/** resolveHandle(h, side, who): a handle spec -> { influence, speed }. A name resolves through the
 * registry; `null` or absent is the linear side. */
export function resolveHandle(h, side, who = '') {
  if (h == null) return LINEAR_SIDE;
  if (typeof h === 'string') return HANDLE_REGISTRY.pick(h);
  if (typeof h !== 'object' || Array.isArray(h))
    throw new Error(`${who ? `${who}: ` : ''}\`${side}\` takes a handle name (${HANDLE_REGISTRY.names.join(', ')}) `
      + `or { "influence": 0-100, "speed": a multiple of the segment's average velocity }, got ${JSON.stringify(h)}.`);
  const influence = h.influence == null ? HANDLE_DEFAULT_INFLUENCE : h.influence;
  const speed = h.speed == null ? 0 : h.speed;
  if (!Number.isFinite(influence) || influence < 0 || influence > 100)
    throw new Error(`${who ? `${who}: ` : ''}\`${side}.influence\` is a PER CENT of the segment's duration, `
      + `0 to 100. Got ${JSON.stringify(h.influence)}.`);
  if (!Number.isFinite(speed))
    throw new Error(`${who ? `${who}: ` : ''}\`${side}.speed\` is a MULTIPLE of the segment's average `
      + `velocity (0 = a dead stop, 1 = a straight line, 4 = a rush). Got ${JSON.stringify(h.speed)}.`);
  // `{influence: 60}` alone asks for a slower Easy Ease key, so speed defaults to 0, not the linear 1.
  return { influence, speed };
}

/** handleCurve(out, into, who): the two handles of ONE segment -> an easing function, or null when
 * neither side authored one. */
export function handleCurve(out, into, who = '') {
  if (out == null && into == null) return null;
  const o = resolveHandle(out, 'easeOut', who), i = resolveHandle(into, 'easeIn', who);
  const x1 = o.influence / 100, x2i = i.influence / 100;
  return cubicBezier(x1, o.speed * x1, 1 - x2i, 1 - i.speed * x2i);
}
