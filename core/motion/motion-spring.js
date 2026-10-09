// The spring and the stagger of the motion library (motion.dev, MIT), as pure functions of time.
// springs.js spring(t, k, d) is the same model with mass 1 and no rest snap; use this module when a
// move must match a motion animate() call: mass, the duration and bounce form, the rest snap, the
// linear() easing that motion hands to WAAPI.
//   motionSpring({ stiffness: 200, damping: 21 }, 100)(t)  progress of a 0 to 100 move, t in seconds
//   motionSpring({ duration: 0.7 })(t)                    duration form: bounce 0.3, ends at 0.7 s
// Supports bounce 0 to 1 (under and critical damping) and any stiffness, damping and mass.

const DEFAULT_PHYSICS = { stiffness: 100, damping: 10, mass: 1 };
const MIN_DAMPING_RATIO = 0.05;
const SAFE_MIN = 0.001;
const NEWTON_ITERATIONS = 12;
const EASING_STEP_MS = 50;
const EASING_RESOLUTION_MS = 10;
const MAX_DURATION_MS = 20000;

function newton(envelope, derivative, guess) {
  let x = guess;
  for (let i = 1; i < NEWTON_ITERATIONS; i++) x -= envelope(x) / derivative(x);
  return x;
}

function stiffnessFromDuration(durationS, bounce) {
  const ratio = Math.max(1 - bounce, MIN_DAMPING_RATIO);
  const angular = (w) => w * Math.sqrt(1 - ratio * ratio);
  const under = ratio < 1;
  const envelope = under
    ? (w) => SAFE_MIN - ((w * ratio) / angular(w)) * Math.exp(-w * ratio * durationS)
    : (w) => -SAFE_MIN + Math.exp(-w * durationS) * (w * durationS + 1);
  const derivative = under
    ? (w) => {
        const factor = -envelope(w) + SAFE_MIN > 0 ? -1 : 1;
        return (factor * -(ratio * ratio * w * w * durationS) * Math.exp(-w * ratio * durationS)) / (w * w * Math.sqrt(1 - ratio * ratio));
      }
    : (w) => Math.exp(-w * durationS) * -w * durationS * durationS;
  const w = newton(envelope, derivative, 5 / durationS);
  return { stiffness: w * w, damping: ratio * 2 * w };
}

function resolve(options) {
  const { stiffness, damping, mass, duration, bounce = 0.3 } = options;
  const physics = stiffness !== undefined || damping !== undefined || mass !== undefined;
  if (physics || duration === undefined) return { ...DEFAULT_PHYSICS, ...definedOnly({ stiffness, damping, mass }), timeMs: null };
  return { mass: 1, ...stiffnessFromDuration(Math.min(Math.max(duration, 0.01), 10), bounce), timeMs: duration * 1000 };
}

const definedOnly = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** next(ms) gives { value, done }: progress 0 to 1 of a move of `distance` units, as motion samples it. */
function generator(options, distance) {
  const { stiffness, damping, mass, timeMs } = resolve(options);
  const ratio = damping / (2 * Math.sqrt(stiffness * mass));
  const w0 = Math.sqrt(stiffness / mass) / 1000;
  const decay = ratio * w0;
  const granular = Math.abs(distance) < 5;
  const restSpeed = options.restSpeed ?? (granular ? 0.01 : 2);
  const restDelta = options.restDelta ?? (granular ? 0.005 : 0.5);
  let position, velocity;
  if (ratio < 1) {
    const wd = w0 * Math.sqrt(1 - ratio * ratio);
    const a = decay / wd;
    const sinC = decay * a + wd, cosC = decay - a * wd;
    position = (t) => 1 - Math.exp(-decay * t) * (a * Math.sin(wd * t) + Math.cos(wd * t));
    velocity = (t) => Math.exp(-decay * t) * (sinC * Math.sin(wd * t) + cosC * Math.cos(wd * t));
  } else if (ratio === 1) {
    position = (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    velocity = (t) => Math.exp(-w0 * t) * w0 * w0 * t;
  } else {
    const df = w0 * Math.sqrt(ratio * ratio - 1);
    const slow = decay - df, fast = decay + df;
    const p = decay / df;
    const s = (1 + p) / 2, f = (1 - p) / 2;
    position = (t) => 1 - s * Math.exp(-slow * t) - f * Math.exp(-fast * t);
    velocity = (t) => slow * s * Math.exp(-slow * t) + fast * f * Math.exp(-fast * t);
  }
  return (ms) => {
    const t = Math.max(ms, 0);
    const value = position(t);
    const done = timeMs !== null
      ? t >= timeMs
      : Math.abs(velocity(t) * distance * 1000) <= restSpeed && Math.abs((1 - value) * distance) <= restDelta;
    return { value: done ? 1 : value, done };
  };
}

/** Progress 0 to 1 at t seconds. `distance` is the size of the move in the units motion animates (100 for a percent, 1 for a mixed string): it only picks the rest thresholds. */
export function motionSpring(options = {}, distance = 1) {
  const next = generator(options, distance);
  return (t) => next(t * 1000).value;
}

/** What motion hands to element.animate() for a spring: { duration (ms), easing: a linear() string }. */
export function motionSpringEasing(options = {}, distance = 100) {
  const next = generator(options, distance);
  let duration = 0;
  while (!next(duration).done && duration < MAX_DURATION_MS) duration += EASING_STEP_MS;
  duration = Math.min(duration, MAX_DURATION_MS);
  const points = Math.max(Math.round(duration / EASING_RESOLUTION_MS), 2);
  const samples = Array.from({ length: points }, (_, i) => Math.round(next((duration * i) / (points - 1)).value * 10000) / 10000);
  return { duration, easing: `linear(${samples.join(', ')})` };
}

/** The delay of item i of total from motion stagger(step, { from }): from is 'first', 'last', 'center' or an index. */
export function motionStagger(step, from, i, total) {
  const origin = typeof from === 'number' ? from : from === 'first' ? 0 : from === 'last' ? total - 1 : (total - 1) / 2;
  return step * Math.abs(origin - i);
}
