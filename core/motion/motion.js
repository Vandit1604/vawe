// core/motion.js: pure motion math + scene helpers (easing, spring, interpolate,
// transforms, text-fit, colour, formatters). No DOM, no fetch, safe to import in node (lib-test).
// The theme/clock/boot RUNTIME lives in core/boot.js.
// just time->data transforms + the scene boot.

// core/ is self-contained: the validator lives here too (core/validate.mjs), because boot.js
// imports it and the browser must be able to resolve it. It is engine code, not tooling.

import { FEEL, INTERP } from '../registry/vocab.js';
import { defineRegistry, withBlurb, blurbsOf, nearMisses } from '../registry/registry.js';

export const FPS = 30;

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rangeT = (f, s, e) => clamp01((f - s) / (e - s));

// icon(value): an image path (assets/.../x.svg|png, /…, http…) -> <img>; otherwise the
// raw value (emoji / monogram text). Lets formats use real logos/flags or fall back cleanly.
export const icon = (v, fallback = '') => {
  if (!v) return fallback;
  const isImg = /\.(svg|png|jpe?g|webp|gif)$/i.test(v) || /^(assets\/|\/|https?:)/.test(v);
  if (!isImg) return v;
  // If the image fails to load (missing file / 404), swap to the fallback (emoji/monogram)
  // instead of the browser's broken-image placeholder. Empty fallback → the img just disappears.
  const fb = String(fallback).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  return `<img class="icon-img" src="${v}" alt="" onerror="this.outerHTML='${fb}'" />`;
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const punch = (t, amt = 0.14) => 1 + amt * Math.sin(clamp01(t) * Math.PI);
export const easeInCubic = (t) => t * t * t;
export const easeOutElastic = (t) => { if (t <= 0) return 0; if (t >= 1) return 1; const p = 0.3; return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1; };
export const easeInQuart = (t) => t * t * t * t;
// sine family: MOTION-CRAFT / the planning skill prescribe "ambient loops sinusoidal", which was
// unexpressable until now: the registry had no sine curve at all. This is the gentlest ease there
// is (no hard stop), which is exactly what a drifting/breathing loop wants.
export const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
// quint: one notch sharper than quart, softer than expo. The "luxurious settle" for hero moves.
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuart = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

// ---- the complete named-curve set (easings.net / Penner). Every family in In/Out/InOut so an
// author never has to hand-roll a curve or settle for a near-miss. All pure, all guarded by the
// easing-registry contract in lib-test (f(0)=0, f(1)=1, finite, deterministic).
export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInQuint = (t) => t * t * t * t * t;
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
// circ: mechanical/geometric, starts or stops very hard. Good for wipes and mechanical UI.
export const easeInCirc = (t) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const easeOutCirc = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc = (t) => (t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2);
// back: anticipation, dips BELOW 0 before launching (easeIn) / past 1 before settling (easeOut).
export const easeInBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; };
export const easeInOutBack = (t) => { const c1 = 1.70158, c2 = c1 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; };
// elastic: rubber band. Endpoints snapped so it lands exactly (the raw formula rings past 1).
export const easeInElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)));
export const easeInOutElastic = (t) => { const c5 = (2 * Math.PI) / 4.5; return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1; };
// bounce: ball drop. Stays inside [0,1], it never overshoots, it rebounds.
export const easeOutBounce = (t) => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; };
export const easeInBounce = (t) => 1 - easeOutBounce(1 - t);
export const easeInOutBounce = (t) => (t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2);
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));
export const easeInOutExpo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : 1 - Math.pow(2, -20 * t + 10) / 2);

// springStiff: critically-damped settle (NO overshoot); for Creed / restrained brands.
// Complements the existing overshooting spring() below. Pure, terminal at t≥1 → safe for renderFrame(n).
export const springStiff = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * (1 + 6.5 * t));

// springEase({response, dampingFraction}). The iOS/SwiftUI spring as a closed-form EASING FACTORY: a
// damped harmonic oscillator over normalised progress u∈[0,1]. `response` sets snappiness (lower = faster,
// more frequency); `dampingFraction` (ζ) sets bounce. another engine doctrine: ζ=1.0 house default (no
// overshoot), 0.8-0.85 "alive" (a whisper of overshoot), <0.55 don't (visible bounce). Returns a pure
// function of u → seek-safe. This is "the iOS feel" without hand-tuning cubic-beziers.
export function springEase({ response = 0.5, dampingFraction = 1 } = {}) {
  const zeta = Math.max(0.05, dampingFraction);
  const omega = (2 * Math.PI) / Math.max(0.05, response);   // natural frequency over the unit interval
  return (u) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    if (zeta < 1) {                                          // underdamped → settles with overshoot
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * u) * (Math.cos(wd * u) + ((zeta * omega) / wd) * Math.sin(wd * u));
    }
    return 1 - Math.exp(-omega * u) * (1 + omega * u);       // critically/over-damped → no overshoot
  };
}

// ---------- velocity ramping ----------
// accel/decel: pure power curves, k is the acceleration exponent (k=1 linear, k=3 hard launch/brake).
export const accel = (t, k = 2.4) => Math.pow(clamp01(t), k);
export const decel = (t, k = 2.4) => 1 - Math.pow(1 - clamp01(t), k);
// speedRamp(t, {peak, sharp}). The editor's speed ramp: velocity is LOW at both ends and peaks at
// `peak` (0..1); `sharp` is how violent the acceleration is. Use to remap any progress before it
// hits a transform: slow-out → rush → slow-in reads as intentional camera work, not a lerp.
export function speedRamp(t, { peak = 0.5, sharp = 2.4 } = {}) {
  t = clamp01(t);
  if (peak <= 0) return decel(t, sharp);
  if (peak >= 1) return accel(t, sharp);
  return t < peak ? peak * Math.pow(t / peak, sharp) : 1 - (1 - peak) * Math.pow((1 - t) / (1 - peak), sharp);
}

// ---------- THE GRAPH EDITOR: a cubic bezier on the unit square ----------
//
// Every curve above is a fixed shape with a name. This one is the shape an author DRAWS, and it is the
// primitive under After Effects' graph editor: two control points on the unit square, P0 (0,0) and
// P3 (1,1) fixed, P1 = (x1,y1) and P2 = (x2,y2) authored. It is the same maths CSS `cubic-bezier()`
// runs, so a curve copied off a CSS reference or out of AE reproduces here exactly.
//
// THE SOLVE, and why it is not a closed form. The curve is parametric in s, and BOTH axes are cubics
// in s. What an easing needs is y as a function of x, so x(s) = t has to be inverted first.
// Newton-Raphson converges in a handful of steps because x(s) is monotone for x1, x2 in [0,1], and a
// bisection fallback covers the flat spots where the derivative goes to zero and Newton would stall or
// shoot out of range. Deterministic and allocation-free: the returned closure holds four numbers and
// creates nothing per call, which matters because it is sampled once per property per layer per frame.
const bezA = (a1, a2) => 1 - 3 * a2 + 3 * a1;
const bezB = (a1, a2) => 3 * a2 - 6 * a1;
const bezC = (a1) => 3 * a1;
const bezAt = (s, a1, a2) => ((bezA(a1, a2) * s + bezB(a1, a2)) * s + bezC(a1)) * s;
const bezSlope = (s, a1, a2) => 3 * bezA(a1, a2) * s * s + 2 * bezB(a1, a2) * s + bezC(a1);

/**
 * cubicBezier(x1, y1, x2, y2) → (t) => y. `x1`/`x2` are clamped to [0,1] because they are TIME and a
 * control point outside the segment makes x(s) non-monotone, which has no inverse. `y1`/`y2` are NOT
 * clamped: a y outside [0,1] is an overshoot, which is a real and wanted shape.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const a1 = clamp01(x1), a2 = clamp01(x2);
  if (a1 === y1 && a2 === y2) return (t) => t;   // the identity line, exactly, with no solve
  return (t) => {
    if (!(t > 0)) return 0;
    if (t >= 1) return 1;
    // Newton first, from t itself: for a curve near the diagonal that is already close.
    let s = t;
    for (let i = 0; i < 8; i++) {
      const d = bezSlope(s, a1, a2);
      if (!(Math.abs(d) > 1e-6)) break;
      const e = bezAt(s, a1, a2) - t;
      if (Math.abs(e) < 1e-9) return bezAt(s, y1, y2);
      s -= e / d;
      if (!(s >= 0) || !(s <= 1)) break;          // out of range, hand it to bisection
    }
    let lo = 0, hi = 1;
    s = t;
    for (let i = 0; i < 40; i++) {
      const x = bezAt(s, a1, a2);
      if (Math.abs(x - t) < 1e-9) break;
      if (x < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return bezAt(s, y1, y2);
  };
}

// ---------- KEYFRAME HANDLES: influence AND speed, on the unit square ----------
//
// A named easing shapes a segment from OUTSIDE it: one curve for the whole gap, the same curve
// whatever the keys either side are doing. A HANDLE belongs to a KEY and to one SIDE of it, which is
// what a graph editor actually gives you and what the rest of this engine could not express.
//
//   easeOut on key a   shapes the segment LEAVING a
//   easeIn  on key b   shapes the segment ARRIVING at b
//   so the segment a -> b is drawn by a.easeOut and b.easeIn, one handle each.
//
// A handle carries TWO numbers, and the second one is the reason this is a feature rather than a
// second spelling of `ease`:
//
//   influence   how far along the segment the handle reaches, 0 to 100 per cent of its DURATION.
//               This is the x of the control point: x1 = outInfluence/100, x2 = 1 - inInfluence/100.
//   speed       how fast the value is moving AT the key, as a MULTIPLE of the segment's own average
//               velocity. 0 is a dead stop, 1 is "exactly the average" (a straight line), 4 rushes
//               out, and a negative number leaves backwards before turning round.
//
// WHY SPEED IS A MULTIPLE AND NOT UNITS PER SECOND, which is the whole design decision here.
// After Effects keys speed in real units (pixels/sec, degrees/sec, per cent/sec) and pays for it by
// keying every property dimension SEPARATELY: x, scale and rot do not share a scale, so one handle
// pair cannot serve all three with an absolute speed on it. Putting speed on the unit square needs
//
//     y1 = (outSpeed * influenceSeconds) / valueDelta
//
// and that expression carries the property's own delta, so it divides by zero on a property that does
// not change across the segment and gives a different curve to x than to scale for the same authored
// number. Written as a multiple of the average velocity, outSpeed = frac * (valueDelta / segDur), the
// substitution cancels EXACTLY:
//
//     y1 = frac * (valueDelta / segDur) * ((influence/100) * segDur) / valueDelta = frac * influence/100
//
// No delta, no duration, no division. One handle pair is therefore correct for every property on the
// key at once, a zero delta is not a special case because nothing is divided by it, and the authoring
// surface stays flat: `{ "influence": 20, "speed": 4 }` and not a map keyed by property name. It is
// also what an author reasons in ("leave at a quarter speed, arrive at twice"), which is the
// secondary reason, not the deciding one. The deciding one is that the arithmetic is exact.
//
// The cost, stated plainly: a per-property speed in real units is not expressible. A move whose x
// should leave at 400 px/s while its scale leaves at rest needs two layers or two tracks. That is the
// trade for one handle pair that is always right instead of five that each need a delta.
const HANDLE_DEFAULT_INFLUENCE = 100 / 3;   // AE's Easy Ease reaches a third of the way in

// A side with NO handle contributes the LINEAR half of the curve, which is AE's own default temporal
// interpolation: influence a third, speed equal to the average, so the control point sits on the
// diagonal and that half of the segment is a straight line. It is what makes a one-sided handle mean
// what it says: `easeOut: "easyEase"` alone gives (1/3, 0, 2/3, 2/3), eased out of the key and linear
// into the next, exactly as applying Easy Ease Out to a single keyframe does.
const LINEAR_SIDE = { influence: HANDLE_DEFAULT_INFLUENCE, speed: 1 };

// THE SYMMETRIC FLAT-ENDS, STEEP-MIDDLE CURVE ALREADY EXISTS. `speedRamp` (below) owns it and is
// exposed as `ease: "ramp"`, so a named handle preset that reproduced it on both sides would be a
// second spelling of a shipped curve. Measured: a symmetric handle pair at influence 55, speed 0
// reproduces `ramp` to within 0.0037 over the whole segment. `hang` is not that curve at a different
// name, it is the SIDE of it, and the side is what a named easing cannot give you: the swap the
// velocity-hidden cut describes is `hang` leaving one key and something else arriving at the next.
//
// The doses, measured as peak slope in multiples of the segment's average velocity, so the choice is
// not by feel: easyEase 1.50x, `ramp` 2.40x, easeInOutCubic (the engine default) 3.00x, `hang` on
// both sides 4.00x. Note the order: the DEFAULT is already steeper than `ramp`, so reaching for
// `ramp` to make a move snappier makes it softer.
const HANDLES = {
  easyEase: withBlurb('AE\'s Easy Ease: reaches a third of the way in and arrives at a DEAD STOP. The default handle, and the one to use when you just want a key to stop being mechanical', { influence: HANDLE_DEFAULT_INFLUENCE, speed: 0 }),
  linear: withBlurb('the straight line, written down: the handle sits on the diagonal so this side of the segment has constant speed. Use it to make one side explicit while the other is shaped', { ...LINEAR_SIDE }),
  hang: withBlurb('influence 75 at a dead stop: the value HANGS at this key and the movement is crushed away from it. On BOTH sides of a segment this is the flat-ended, near-vertical speed graph a snappy swap is cut on. 75 is the number practitioners state', { influence: 75, speed: 0 }),
  fling: withBlurb('a short handle at four times the average speed: the value leaves (or arrives) FAST and the segment spends its length recovering. The steep half of a snappy move', { influence: 18, speed: 4 }),
  // A NEGATIVE arriving speed is the whole trick, and shipping this with a positive one made the name a
  // lie: `y2 = 1 - speed * influence`, so a positive speed pulls the control point BELOW the key and the
  // curve peaks at exactly 1.000000, measured over 20,001 samples. It was a plain ease-in wearing an
  // overshoot's blurb. Negative lifts the control point past the key, which is what sailing past means.
  // -0.8 at influence 62 peaks at 1.1008, the 10 per cent practitioners state for a snappy overshoot.
  overshoot: withBlurb('arrives from BEYOND its key and settles back: the value sails about 10 per cent past and returns. The handle version of a back ease, and it needs the far side to stop it', { influence: 62, speed: -0.8 }),
};

export const HANDLE_REGISTRY = defineRegistry('keyframe handle', HANDLES, {
  blurbs: blurbsOf('keyframe handle', HANDLES), slot: 'easeOut',
  catalog: {
    title: 'Keyframe handles (the graph editor)',
    tag: 'motion key',
    intro: 'On a `motion` or `camera` key, per SIDE: `easeOut` shapes the segment LEAVING the key, `easeIn` the segment ARRIVING at it, so one segment is drawn by two handles. A named easing is one stock curve for the whole gap; a handle is a control point you place. Each carries an `influence` (how far along the segment it reaches, 0-100 per cent of the DURATION) and a `speed` (how fast the value moves AT the key, as a MULTIPLE of the segment\'s own average velocity: 0 is a dead stop, 1 is a straight line, 4 rushes out). A multiple and not px/sec, so one handle pair is correct for x, scale and rot at once. The names below are ONE SIDE each and the slot picks the side: `{ "t":0.6, "x":400, "easeOut":"fling", "easeIn":"easyEase" }`, or the long form `{ "influence": 18, "speed": 4 }`. Refused beside `ease` on the same segment.',
    // A HANDLE is one SIDE of one key, and the slot says which side, so the form has to show both
    // sides of a segment at once or the name reads as a whole-segment easing, which is the thing it
    // is not. Written as a name here; the long form is { influence, speed }.
    usage: (n, { text }) => text({ anim: 'none', motion: [{ t: 0, x: -300, easeOut: n }, { t: 0.9, x: 300, easeIn: n }] }),
    noPreview: 'a handle is half the shape of a segment, so it has the same problem a mode has: a still frame is one point on the curve and says nothing about the curve. The playground card draws the curve itself with both handles on dials.',
  },
});

/**
 * resolveHandle(h, side, who): a handle spec -> { influence, speed }. A NAME resolves through the
 * registry (which refuses an unknown one rather than substituting); `null`/absent is the linear side.
 */
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
  // A handle spec that names influence and nothing else means Easy Ease at that reach, not linear:
  // an author writing `{influence: 60}` is asking for a slower key, and speed 1 would give them the
  // straight line they already had. `speed` defaults to 0 for that reason, and the ABSENT-HANDLE
  // default (LINEAR_SIDE) is a different question with a different answer.
  return { influence, speed };
}

/**
 * handleCurve(out, into, who): the two handles of ONE segment -> an easing function, or null when
 * neither side authored one and the segment belongs to the named-easing path exactly as before.
 */
export function handleCurve(out, into, who = '') {
  if (out == null && into == null) return null;
  const o = resolveHandle(out, 'easeOut', who), i = resolveHandle(into, 'easeIn', who);
  const x1 = o.influence / 100, x2i = i.influence / 100;
  // y1 = speed * x1 and y2 = 1 - speed * (1 - x2): the cancellation derived above, written once.
  return cubicBezier(x1, o.speed * x1, 1 - x2i, 1 - i.speed * x2i);
}

// easing registry: lets a theme name its easing as a string (motion.easing) that the scene
// resolves to a function. resolveEasing() also accepts a function (passthrough).
export const EASINGS = {
  linear: (t) => t, easeInCubic, easeOutCubic, easeInOutCubic,
  easeOutQuart, easeOutExpo, easeOutBack, easeOutElastic,
  easeInQuart, easeInExpo, easeInOutExpo,
  easeInSine, easeOutSine, easeInOutSine, easeOutQuint, easeInOutQuart,
  easeInQuad, easeOutQuad, easeInOutQuad, easeInQuint, easeInOutQuint,
  easeInCirc, easeOutCirc, easeInOutCirc, easeInBack, easeInOutBack,
  easeInElastic, easeInOutElastic, easeInBounce, easeOutBounce, easeInOutBounce,
  // velocity-ramp aliases: rush = accelerate away, brake = decelerate in, ramp = slow-fast-slow
  rush: (t) => accel(t), brake: (t) => decel(t), ramp: (t) => speedRamp(t),
  // spring physics (another engine-style): premium settle by default, springStiff = no overshoot
  spring: (t) => spring(t), springStiff: (t) => springStiff(t),
  // A HOLD, the one interpolation in AE's set this table had no name for: the value does not travel,
  // it JUMPS at the far key. A stepped swap is a real motion-graphics move (a counter that ticks, a
  // label that changes without sliding, anything cut rather than animated) and it had to be written as
  // two keys a frame apart, which reads as a 33ms move and is a different thing. Returns 0 through the
  // whole segment so the FROM value holds, and 1 exactly at the end.
  hold: (t) => (t >= 1 ? 1 : 0),
};

// THE CATALOGUE AND THE SEARCH ONLY. NOTHING RESOLVES THROUGH THIS.
//
// `resolveEasing` below must keep its own refusal, and the reason is that the valid set of the `ease`
// field is WIDER than this table: it is EASINGS + FEEL + INTERP, `isEasingName` is the one membership
// test over that union, and resolveEasing accepts a feel word by design. A `pick()` here would refuse
// `ease: "snappy"`, which is a shipped spelling. It also carries a cross-registry hint of its own for
// GSAP ease names, which are real in this engine but only on GSAP-driven fields.
//
// What the registry is for: the section in docs/EFFECTS.md, which was hand-listed in
// scripts/site/effects-catalog.mjs with its usage form and its no-preview reason a file further on.
// `skip` stays, and it is a DECISION, not a gap: 41 curves named by mechanism are better served by the
// feel table in docs/MOTION-CRAFT.md than by 41 near-identical sentences about acceleration.
export const EASING_REGISTRY = defineRegistry('easing', EASINGS, { slot: 'ease',
  // EVERY CURVE CARRIES ITS OWN LINE NOW, and the opt-out that used to sit here is gone with the
  // mechanism that allowed it. The argument for skipping them was that 41 near-identical sentences
  // about acceleration would match every query about slowing down and therefore distinguish nothing.
  // That is a real risk and it is a reason to write them WELL, not a reason to leave 42 capabilities
  // reachable only by someone who already knows the name. So none of these says merely 'starts slow':
  // each names its DEGREE against its siblings (quad is the mildest, expo the most violent) and what
  // it is FOR, which is the thing an author is actually choosing between.
  blurbs: {
      "linear": "no acceleration at all, constant speed start to finish. Right for a loop or a marquee, wrong for anything a viewer watches arrive",
      "easeInQuad": "leaves gently and keeps gathering pace, the mildest departure here. For an exit that should not feel yanked",
      "easeOutQuad": "comes in quickly then rolls to a stop, the gentlest landing of the power curves. Small elements, short distances",
      "easeInOutQuad": "soft at both ends with an even middle, the least dramatic way to carry something across the frame",
      "easeInCubic": "gathers pace with real commitment, stronger than quad. A departure that should read as decided",
      "easeOutCubic": "the everyday landing: quick off the mark, unhurried into place. Reach for it when nothing argues otherwise",
      "easeInOutCubic": "the everyday travel curve, soft at both ends. A layer crossing from one place to another on screen",
      "easeInQuart": "builds speed hard before it clears frame, a departure with weight behind it",
      "easeOutQuart": "lands fast and settles crisply, snappier than cubic and it never passes its target. Good on an element arriving",
      "easeInOutQuart": "unhurried at both ends, fast through the middle. A long journey that should read as deliberate",
      "easeInQuint": "almost still, then gone. The most extreme departure short of exponential",
      "easeOutQuint": "covers nearly all the distance at once then creeps the last of it, a very sharp arrival",
      "easeInOutQuint": "lingers at both ends and hurries the middle, dramatic across a long journey",
      "easeInExpo": "barely stirs, then clears frame all at once. The most violent departure available",
      "easeOutExpo": "the most violent arrival: effectively there on the first frames, then a long quiet settle",
      "easeInOutExpo": "held, flung, held. The most theatrical of the symmetric curves and the easiest to overuse",
      "easeInSine": "the softest pick-up there is, barely perceptible as gathering pace",
      "easeOutSine": "the softest landing there is, closer to speed fading away than to stopping",
      "easeInOutSine": "the quietest way to shift anything. Ambient drift, backdrops, anything not asking to be watched",
      "easeInCirc": "creeps, then whips away on a curve that turns hard at the last moment",
      "easeOutCirc": "comes in at speed and flattens off almost immediately, a machined landing rather than a living one",
      "easeInOutCirc": "flat, sudden, flat. Reads as machinery, not as anything with muscle",
      "easeInBack": "pulls the opposite way first, a wind-up, before it goes",
      "easeOutBack": "passes its target and returns, a small pop of emphasis on something landing",
      "easeInOutBack": "winds up, crosses, passes the mark and comes back. Playful at both ends and loud",
      "easeInElastic": "swings in place with growing wobble before it leaves. The loudest departure here",
      "easeOutElastic": "passes its target repeatedly with a decaying wobble, the springiest landing available",
      "easeInOutElastic": "wobbles at both ends. Almost always more than a film wants",
      "easeInBounce": "bounces in place before it departs, like a ball gathering itself",
      "easeOutBounce": "drops and bounces to rest, a ball meeting a floor",
      "easeInOutBounce": "bounces at both ends. Cartoon physics, and it reads as exactly that",
      "rush": "holds back for most of the span then covers the distance late. The exit curve: it leaves in a hurry",
      "brake": "half the distance in the first quarter, then a long decline to a stop",
      "ramp": "mild and symmetric: gathers pace, crosses the middle at full speed, tails off",
      "spring": "passes the mark by a little and falls back, a physical landing with some give in it",
      "springStiff": "tight and quick with no visible pass beyond the mark, for something that must not look playful",
      "hold": "does nothing whatever until the last instant, then jumps. Parks a value across a span rather than moving it",
      "spring-bouncy": "visibly passes the mark and swings back, the playful one. One per film at most",
      "spring-stiff": "most of the journey early, then a firm settle with no wobble at all",
      "springEase": "spring shaped but damped flat: nearly arrived at once, then creeping the last fraction",
      "settle": "most of the move happens immediately, then it eases the remainder and stops dead",
      "snap": "covers the distance almost at once with a hair of overshoot, the fastest landing that still reads as movement"
  },
  catalog: {
    title: 'Easings',
    tag: 'timing',
    intro: '`ease` on a motion key, a count, a camera leg. Entrances decelerate, exits accelerate; springs carry velocity.',
    skip: 'named by curve; pick by FEELING from the table in docs/MOTION-CRAFT.md',
    usage: (n, { j }) => j({ motion: [{ t: 0, x: 160 }, { t: 1.2, x: 460, ease: n }] }),
    noPreview: 'a curve is a feeling over time. Read the table in docs/MOTION-CRAFT.md, then feel it in the editor.',
  },
});
// GSAP's easing vocabulary, which this engine also carries: `parts[].ease` and `morph.ease` go
// straight to gsap.fromTo and never arrive here. Detected only to give a WRONG-SLOT name a useful
// error instead of a list of 41 names it is not in. Same cross-registry hint as core/type.js.
const GSAP_EASE = /^(power[0-4]|back|elastic|bounce|circ|expo|sine|steps|none|rough|slow)\b/;

// isEasingName(n): would resolveEasing accept this string? The ONE membership test, so a gate can ask
// instead of re-deriving it. core/validate.mjs held its own copy and it was already one registry behind.
// INTERPOLATION MODES COUNT AS VALID HERE AND NOWHERE ELSE. `through` is not a curve and
// `resolveEasing` must never be asked for it (core/sequence.js dispatches it first), but it IS a legal
// value of the `ease` field, so the one membership test has to say so or the validator refuses a
// working scene. Kept in this predicate rather than added to EASINGS, because a mode in the easing
// table would be resolvable, and something would eventually resolve it.
export const isEasingName = (n) => typeof n === 'string'
  && (Object.prototype.hasOwnProperty.call(EASINGS, n) || Object.prototype.hasOwnProperty.call(FEEL, n)
      || Object.prototype.hasOwnProperty.call(INTERP, n));

// gsapEase(e, fallback, where): an author-supplied easing for a GSAP-DRIVEN field → something GSAP
// will actually honour.
//
// WHY THIS EXISTS. `parts[].ease`, `parts[].exitEase`, `morph.ease` and the sting/motion-path eases go
// straight into `gsap.fromTo`, and GSAP does not refuse a name it does not know: `parseEase` returns
// undefined and the tween silently runs on GSAP's default. So the two vocabularies were asymmetric.
// resolveEasing (below) throws on a GSAP name and even explains that GSAP eases are real on these
// fields, while these fields accepted an ENGINE name and quietly rendered a different curve.
// `blocks/camera-chrome.mjs` names `easeOutCubic` twice and has been running on GSAP's default ever
// since it was written. Measured: gsap.parseEase('easeOutCubic') is undefined, exactly like
// gsap.parseEase('totalNonsenseXYZ').
//
// An ENGINE name resolves to its own FUNCTION rather than to a GSAP look-alike, because GSAP accepts a
// function as an ease. So the author gets the curve they named, not the nearest approximation, there
// is no mapping table to maintain and none to drift.
export const gsapEase = (e, fallback, where = '') => {
  if (typeof e === 'function') return e;
  if (e == null || e === '') return fallback;
  // GSAP's own vocabulary, asked of GSAP itself when it is loaded (authoritative), and matched by
  // shape when it is not. This module is imported by tools that never boot a browser.
  const g = typeof window !== 'undefined' && window.gsap;
  if (g ? !!g.parseEase(e) : GSAP_EASE.test(String(e))) return e;
  if (EASINGS[e]) return EASINGS[e];
  if (Object.prototype.hasOwnProperty.call(FEEL, e)) return EASINGS[FEEL[e]];
  const near = nearMisses(String(e), [...Object.keys(EASINGS), ...Object.keys(FEEL)]);
  throw new Error(`${where ? `${where}: ` : ''}unknown easing ${JSON.stringify(e)} on a GSAP-driven field.`
    + `${near.length ? ` Did you mean ${near.map((n) => `"${n}"`).join(', ')}?` : ''}`
    + ` Take a GSAP ease (power1..4/back/elastic/bounce/circ/expo/sine + .in/.out/.inOut),`
    + ` or an engine easing: ${Object.keys(EASINGS).join(', ')}.`
    + ' GSAP returns undefined for a name it does not know and then runs its DEFAULT curve, so an'
    + ' unchecked name here renders a plausible frame that is not the one asked for.');
};

// resolveEasing: an easing name or a function → a pure easing function.
//
// ABSENT → easeOutCubic. A WRONG NAME → throw. Those are different questions and this used to answer
// them the same way: first silently, then (after the typo `ease:"eastOutQuart"` rendered the wrong
// curve) with a warn-once-and-substitute. But a warning printed once per process, from one of eight
// render workers, into a log nobody reads, is the same as silence, the argument this repo already
// makes at formats/scene/scene.js about `fx`. The frame still rendered on the wrong curve.
//
// core/fx/progress.js saw this and hand-rolled its own membership test above its call, with the note
// that warn-and-substitute is "right for a prop authored in a hundred scenes and wrong for this
// registry". That fear was measurable and it was unfounded: across 151 scene files and 35 themes,
// 22 distinct easing names are in use and NOT ONE is unknown. The only two odd values in the library
// are `power2.inOut` and `power3.inOut`, and both sit on GSAP-driven fields that never reach here.
// So the check is one copy again, and it lives where the vocabulary does. docs/MISTAKES.md #367.
export const resolveEasing = (e) => {
  if (typeof e === 'function') return e;
  if (e == null || e === '') return easeOutCubic;
  if (EASINGS[e]) return EASINGS[e];
  // A FEEL WORD is a spelling of a curve this registry already holds, so it resolves here and not in
  // a pass above: the words have to be accepted wherever the value is, or reaching for the right
  // curve still costs a document read and the default stays `fade`. core/vocab.js.
  if (Object.prototype.hasOwnProperty.call(FEEL, e)) return EASINGS[FEEL[e]];
  const hint = GSAP_EASE.test(String(e))
    ? ` "${e}" is a GSAP ease, and GSAP eases are real here but only on GSAP-driven fields `
      + '(`parts[].ease`, `morph.ease`, `fx:{ease}`). This field is driven by the engine\'s own '
      + 'interpolator, so it takes an engine easing.'
    : '';
  const near = nearMisses(String(e), [...Object.keys(EASINGS), ...Object.keys(FEEL)]);
  throw new Error(`unknown easing ${JSON.stringify(e)}.${hint}`
    + `${near.length ? ` Did you mean ${near.map((n) => `"${n}"`).join(', ')}?` : ''}`
    + ` One of: ${Object.keys(EASINGS).join(', ')}.`
    + ` Or a feel word: ${Object.keys(FEEL).join(', ')}.`
    + ' A curve quietly swapped for another renders a plausible frame that is not the one asked for, '
    + 'so it is refused rather than substituted.');
};

// ---------- motion primitives: all PURE in their input (no state); safe for the purity probe ----------

// interpolate(t, inRange, outRange, {easing, clamp}): multi-stop value mapping. Replaces the
// repeated `lerp(a, b, clamp01((f - s) / (e - s)))` pattern. easing is applied within each segment.
export function interpolate(t, inR, outR, { easing = (x) => x, clamp = true } = {}) {
  const n = inR.length;
  if (n < 2 || n !== outR.length) return outR[0];
  if (clamp) { if (t <= inR[0]) return outR[0]; if (t >= inR[n - 1]) return outR[n - 1]; }
  let i = 1; while (i < n - 1 && t > inR[i]) i++;
  const a = inR[i - 1], b = inR[i];
  return lerp(outR[i - 1], outR[i], easing(clamp01(b === a ? 0 : (t - a) / (b - a))));
}

// spring(t, {bounce, settle}): analytic underdamped step response (closed-form, PURE in t-seconds).
// Returns 0 → ~1 with natural overshoot. bounce∈[0,1): 0 = no overshoot, higher = bouncier.
export function spring(t, { bounce = 0.3, settle = 0.6 } = {}) {
  if (t <= 0) return 0;
  const omega = (Math.PI * 2) / settle, zeta = Math.min(0.999, Math.max(0.0001, 1 - bounce));
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta), env = Math.exp(-zeta * omega * t);
  return 1 - env * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t));
}

// spring as a t→t EASING (settles by t=1), so any keyframe track, `motion[].ease`, count `ease`,
// cut timing, can overshoot-and-settle organically. Same idea as another engine's Easing.spring /
// another engine' springEase, pure in t. Overshoots >1 mid-way (that's the point); lands exactly at 1.
//
// spring() is a damped oscillator in SECONDS, and it has not stopped ringing at t=1, sampling it
// directly over [0,1] made `spring-bouncy` land at 0.96 and STAY there, i.e. an element eased with
// it never actually reached its keyframe (breaking MOTION-CRAFT rule 5, "settle and hold"). Map t
// onto each spring's own settle window so the ring completes inside [0,1], and snap the endpoints
// exactly the way easeOutSettle does. Guarded by the easing-registry contract in lib-test.
// springWindow: maps the seconds-based spring() into its own settle window so the ring completes inside
// [0,1] (distinct from the exported springEase({response,dampingFraction}) factory above, which is the
// iOS-parameterised spring). Renamed off `springEase` to free that name for the public API.
const springWindow = (o) => { const T = springSettle(o); return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : spring(clamp01(t) * T, o)); };
// easeOutSpring: the house overshoot-and-settle curve as a plain t->eased function (mirrors
// easeOutBack / speedRamp's shape: one argument, pure). Overshoots to ~1.07 near t~0.69, lands
// exactly at 1 by t=1. Exported by name so a cut/seam TIMING (core/cuts.js) can reach it directly
// instead of a second spring curve getting hand-rolled there; EASINGS.spring below is this same value.
export const easeOutSpring = springWindow({ bounce: 0.35, settle: 0.92 });
Object.assign(EASINGS, {
  spring: easeOutSpring,
  'spring-bouncy': springWindow({ bounce: 0.55, settle: 0.94 }),
  'spring-stiff': springWindow({ bounce: 0.12, settle: 0.72 }),
  // iOS-parameterised spring, house default (ζ=1, no overshoot). Usable by name in any `ease:` slot.
  springEase: springEase(),
});
// easeOutSettle. The DEFAULT entrance feel: a SMOOTH decelerate with just a whisper of settle (premium,
// not bouncy). Low bounce (0.08) so type glides to rest instead of overshooting/wobbling, a visible
// bounce on every word reads as "too much movement". Endpoints are SNAPPED exactly (0 and 1) so the held
// state sits at true rest. No sub-pixel residual that would blur text on hold.
export const easeOutSettle = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : spring(t, { bounce: 0.08, settle: 0.7 }));
EASINGS.settle = easeOutSettle;
// easeOutSnap. The default LAYER entrance feel: a touch more overshoot than easeOutSettle so a card
// or headline visibly snaps-past-and-settles (the single most recognizable motion-graphics tell)
// instead of gliding in floaty. Bounce stays modest (0.16) so it reads premium, not toy, and it is
// used ONLY by the layer-level `rise`. The per-unit type presets keep easeOutSettle so a whole line
// of words does not wobble. Endpoints snapped exactly (true rest on hold, no sub-pixel text blur).
export const easeOutSnap = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : spring(t, { bounce: 0.2, settle: 0.58 }));
EASINGS.snap = easeOutSnap;
// springSettle(opts): seconds for the spring's envelope to decay below eps (size your holds with this).
export function springSettle({ bounce = 0.3, settle = 0.6, eps = 0.02 } = {}) {
  const omega = (Math.PI * 2) / settle, zeta = Math.min(0.999, Math.max(0.0001, 1 - bounce));
  return -Math.log(eps) / (zeta * omega);
}

// track(n, fps, beats): given [{name, dur(seconds)}], return the active beat + its progress.
// Replaces hand-rolled PER/FLIP/ENTER/EXIT window math. t01 = normalized [0..1] within the beat.
export function track(n, fps, beats) {
  const t = n / fps; let acc = 0;
  for (let i = 0; i < beats.length; i++) {
    const d = beats[i].dur, end = acc + d;
    if (t < end || i === beats.length - 1) {
      return { name: beats[i].name, index: i, t01: d > 0 ? clamp01((t - acc) / d) : 1, localT: t - acc, elapsed: t, start: acc, dur: d };
    }
    acc = end;
  }
  return { name: null, index: -1, t01: 0, localT: 0, elapsed: t, start: 0, dur: 0 };
}

// ---------- THE ENTRANCE WARP: anticipation and the overshoot dial ----------
//
// Both are one idea. An entrance moves a layer from an offset to rest, and the SHAPE of that travel is
// its easing. Anticipation is that curve dipping BELOW 0 for two or three frames (the layer winds back
// along its own travel axis before it comes forward); an overshoot is the same curve passing 1 and
// ringing down. Neither needs a new transform, a new layer or a new track: they are the ease.
//
// So an entrance takes an optional WARP, a function of its OWN easing, and every directional entrance
// resolves it through `warpEase` below. The warp receives the anim's own curve because the anim is the
// only thing that knows it: `rise` settles on easeOutSnap and `slide` on easeOutCubic, and a caller
// that had to name the curve to wind it up would be a second owner of that fact.
//
// PURE, and terminal at both ends: every warp here returns exactly 0 at u<=0 and exactly 1 at u>=1, so
// the resting keys the clip pipeline writes are unchanged and a warped layer holds at true rest.
export const warpEase = (own, warp) => (typeof warp === 'function' ? warp(own) : own);

// anticipateEase(ease, {amount, windup}). The wind-up, after the Disney principle as motion designers
// apply it: the layer travels `amount` of its distance BACKWARDS over `windup` of the entrance, then
// goes straight into the main move with no hold between them. 10 to 20% over 2 to 4 frames is the band
// practitioners quote; `amount` is a fraction of the travel, `windup` a fraction of the enter ramp.
//
// The wind-back rides easeOutSine, which arrives at the turn with its speed already bled off, so the
// reversal reads as a hinge rather than a bounce off a wall. The main move then launches on the anim's
// own curve over the remaining window, rescaled by (1 + amount) so it still lands exactly at rest.
export function anticipateEase(ease = easeOutCubic, { amount = 0.15, windup = 0.25 } = {}) {
  const a = Math.min(0.6, Math.max(0.01, amount));
  const w = Math.min(0.6, Math.max(0.05, windup));
  return (u) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    if (u < w) return -a * easeOutSine(u / w);
    return -a + (1 + a) * ease((u - w) / (1 - w));
  };
}

// overshootEase(amount). The dial the presets bake. `amount` is the FIRST overshoot, as a fraction of
// the travel: 0.12 passes the target by 12% and rings down to rest inside the entrance window. Every
// overshooting entrance in this engine picks a `bounce` and takes whatever peak that produces; this
// inverts the relation instead, so an author states the number they can see.
//
// The inversion is the standard second-order step response, Mp = exp(-pi*zeta / sqrt(1 - zeta^2)),
// solved for zeta. spring() below is that step response and `bounce` is 1 - zeta, so the amount an
// author asks for is the amount the curve delivers rather than a number fitted by eye.
//
// The SETTLE TIME is deliberately not a second dial here. It is `enterDur`, which already exists, is
// already the window this curve is mapped into, and is already what an author sets to make an entrance
// take 0.4s. A `settle` prop beside it would be two ways to say one thing, which is the drift this
// codebase logs most.
export function overshootEase(amount = 0.12) {
  const a = Math.min(0.6, Math.max(0.01, amount));
  const L = Math.log(a);
  const zeta = -L / Math.sqrt(Math.PI * Math.PI + L * L);
  return springWindow({ bounce: 1 - zeta, settle: 0.6 });
}

// stepClock(t, rate, start): quantise a clock to `rate` updates per second, anchored on the layer's own
// start so its first frame is exact. "Animate on twos" is 15 in a 30fps film, "on threes" is 10.
// Pure in t, which is the whole reason a layer may have a clock of its own at all.
export function stepClock(t, rate, start = 0) {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new Error(`step: rate must be a positive number of updates per second, got ${JSON.stringify(rate)}.`);
  return start + Math.floor((t - start) * rate) / rate;
}

// transition helpers → {opacity, transform} (compositor-friendly only). Object.assign onto el.style.
// rise uses easeOutSnap (not easeOutSettle): the modest overshoot carries the translate slightly
// PAST its rest point and settles back, which is what makes a default entrance read as directed
// rather than floaty. The overshoot is deterministic and lands exactly at rest by t=1.
export const rise = (t, dist = 48, warp = null) => ({ opacity: clamp01(t), transform: `translateY(${((1 - warpEase(easeOutSnap, warp)(clamp01(t))) * dist).toFixed(2)}px)` });
export const fade = (t) => ({ opacity: clamp01(t), transform: 'none' });
export const pop = (t, from = 0.86, warp = null) => ({ opacity: clamp01(t * 3), transform: `scale(${from + (1 - from) * warpEase(easeOutBack, warp)(clamp01(t))})` });
// lift: the entrance for things that should feel ALIVE arriving (faces, cards, chips) rather than
// merely appearing. `pop` scales from 0.86, a 14% change that reads as flat at avatar size; this
// travels further (0.68), rises as it grows, and settles with a small overshoot, so a staggered row
// reads as a wave rather than a checklist. Pure in t like every other entrance.
export const lift = (t, { from = 0.68, dist = 30, warp = null } = {}) => {
  const u = clamp01(t), e = warpEase(easeOutBack, warp)(u), r = warpEase(easeOutSettle, warp)(u);
  return { opacity: clamp01(u * 2.2),
    transform: `translateY(${((1 - r) * dist).toFixed(2)}px) scale(${(from + (1 - from) * e).toFixed(4)})` };
};
// defocus: enters/leaves through focus rather than through space. Paired with `out:"defocus"` it
// gives the blur exit that reads as "this is done" without moving anything, which is what you want
// when the layer is a card or a face and sliding it would fight the content.
export const defocus = (t, { max = 14 } = {}) => {
  const u = clamp01(t);
  // At rest this MUST be `none`, not `blur(0px)`. A zero-radius blur is still a filter, so the
  // compositor promotes the layer and rasterizes it through the filter pipeline every frame, with
  // ~50 image layers carrying a resting defocus that alone pushed frames past the render timeout.
  // Identity has to be free, because the resting value is written on every frame of the scene.
  if (u >= 1) return { opacity: 1, filter: 'none' };
  return { opacity: u, filter: `blur(${((1 - easeOutCubic(u)) * max).toFixed(2)}px)` };
};
export const slide = (t, dir = 'left', dist = 60, warp = null) => {
  const k = 1 - warpEase(easeOutCubic, warp)(clamp01(t));
  const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist;
  const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist;
  return { opacity: clamp01(t), transform: `translate(${x}px, ${y}px)` };
};
export const applyT = (el, styles) => { if (el) Object.assign(el.style, styles); };

// ---------- seeded, deterministic randomness (another engine `random()` parity, safe for purity) ----------
// hashSeed: number|string -> uint32. random(seed) -> [0,1). Same seed always yields the same value,
// so per-item jitter/scatter stays byte-identical across render order.
export function hashSeed(seed) {
  if (typeof seed === 'number') {
    let s = (seed >>> 0) || 1;
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s >>> 0;
  }
  return seedFrom(String(seed)); // FNV-1a for strings (defined below, hoisted)
}
export const random = (seed) => hashSeed(seed) / 4294967296;
// value noise in 1D: smooth deterministic wander in [0,1), good for organic drift/parallax.
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = random(`${seed}:${i}`), b = random(`${seed}:${i + 1}`);
  return a + (b - a) * (f * f * (3 - 2 * f)); // smoothstep interpolation
}
// stagger(i, step): delay in seconds for item i (step defaults to a gentle 60ms).
export const stagger = (i, step = 0.06) => i * step;

// shake(t, {amp, freq, decay, seed}). Deterministic camera/impact shake: two incommensurate
// noise() channels, exponentially decaying from t=0. Returns {x, y} px offsets. Apply on impact
// beats: `translate(${s.x}px, ${s.y}px)` where s = shake(t - hitT, {...}) (zero before the hit).
export function shake(t, { amp = 14, freq = 11, decay = 3.2, seed = 0 } = {}) {
  if (t <= 0) return { x: 0, y: 0 };
  const env = amp * Math.exp(-decay * t);
  return {
    x: (noise(t * freq, seed + 1) * 2 - 1) * env,
    y: (noise(t * freq * 1.37, seed + 2) * 2 - 1) * env,
  };
}
// pulse(t, {period, amt}): continuous breathing scale for idle chrome (logos, badges, CTAs).
export const pulse = (t, { period = 2.4, amt = 0.03 } = {}) => 1 + amt * Math.sin((t / period) * Math.PI * 2);

// trackingFor(px, dark). Optical letter-spacing: display type tightens as it grows (measured off
// linear.app's real ramp: −0.008em body → −0.022em hero). Themes opt in via type.optical.
//
// `dark` is the POLARITY of the type: true when light ink sits on a dark ground. That is not a taste
// dial, it is an optics fact about the eye and about the encoder. A light glyph on a dark ground
// spreads (the bright form irradiates into the dark counters around it) so it reads heavier and the
// gaps between letters read smaller than the identical pair inverted. The ramp above was measured on
// dark-on-light type, so on a dark ground it is already too tight before the size term is applied.
// The correction OPENS the tracking again, and it grows with the type: 0 at 14px body, the full
// +0.010em the rule names by 120px hero. Body is left alone on purpose, the source fixes body for a
// dark ground with weight and line-height, not with tracking.
//
// The lift rides the SAME knots as the base ramp, and rises more slowly than the base falls, so dark
// tracking is still monotone: bigger type is still tighter type. A flat +0.010em above 32px is the
// obvious first shape and it is wrong. The base only travels 0.010em across that whole span, so a
// flat lift cancels it and re-expands it, and 64px type came out LOOSER than 32px type. That reads as
// a size ramp with a dent in it.
//
// The one-argument form is byte-identical to the ramp it always was: the `dark` branch is not taken,
// so no caller that has not opted in can move a single glyph. That is deliberate, 21 of 37 themes
// here carry a dark palette, and a silent global re-tracking of the library is not a bug fix.
const DARK_TRACK_LIFT = (px) => interpolate(px, [14, 32, 64, 120], [0, 0.002, 0.006, 0.010]);
export const trackingFor = (px, dark = false) => {
  const base = interpolate(px, [14, 32, 64, 120], [-0.008, -0.012, -0.017, -0.022]);
  return (dark ? base + DARK_TRACK_LIFT(px) : base).toFixed(4) + 'em';
};

// kenBurns(t, dur, {from, to, fx, fy, easing}). The tasteful photo/image zoom: a slow continuous
// scale from → to over the layer's window, anchored at focus point (fx, fy in 0..1). Rules that
// keep it tasteful: total travel ≤ 8% (from 1.0, to ≤ 1.08), NEVER reverses mid-window, eased
// inOut so velocity is invisible at both ends. Returns {transform, transformOrigin}.
export function kenBurns(t, dur, { from = 1.0, to = 1.07, fx = 0.5, fy = 0.42, easing = easeInOutCubic } = {}) {
  const p = easing(clamp01(dur > 0 ? t / dur : 1));
  return { transform: `scale(${lerp(from, to, p).toFixed(4)})`, transformOrigin: `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%` };
}

// ---------- text measuring (another engine measureText/fitText parity, browser only) ----------
// measureText: pixel width of `text` in CSS `font` shorthand. fitText: largest px size (stepping
// down) whose rendered width fits maxWidth. Call at build time (fonts already loaded in boot).
let _measureCtx;
export function measureText(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}
export function fitText(text, maxWidth, { font = (px) => `800 ${px}px Inter`, max = 168, min = 24, step = 2 } = {}) {
  let px = max;
  while (px > min && measureText(text, font(px)) > maxWidth) px -= step;
  return px;
}
// fitBox(el, {maxW, maxH, max, min}): MULTI-LINE overflow-safe fit (another engine fitTextOnNLines parity).
// `el` must be in-DOM. Binary-searches the largest font-size where the element (wrapping at maxW) fits
// within maxH AND no word overflows the width. Layout-only → deterministic at build time. Sets + returns px.
export function fitBox(el, { maxW, maxH, max = 168, min = 24 }) {
  el.style.width = maxW + 'px';
  let lo = min, hi = max, best = min;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    el.style.fontSize = mid + 'px';
    if (el.scrollHeight <= maxH + 1 && el.scrollWidth <= maxW + 1) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  el.style.fontSize = best + 'px';
  return best;
}

// ---------- sequencing (another engine Sequence/TransitionSeries parity), pure in n ----------
// sequence(n, fps, segments): like track() but with cross-segment transition windows. Each segment
// = { name, dur, transition? }. Returns the active segment plus `enter` (0→1 over the leading
// transition) and `exit` (0→1 over the trailing transition), so a scene can drive an in/out
// transition on each segment. `active` = combined visibility (enter × (1 − exit)).
// holdLast (default true): the LAST segment never exits, there is no next scene to hand off to,
// so the ending (usually the CTA) holds at full visibility through the final frame.
// Pass { holdLast: false } for looping content that should fade back out.
// ---------- colour parsing (THE one parser) ----------
// THE colour parser for the whole engine. Everything that reads a colour string reads it here:
// core/filters.js (grade stops, glow flood), the WCAG maths below, core/lightfield/colour.js, and
// the designspec gate. It is exported from motion.js because motion.js is the pure, DOM-free module
// every other one may import without pulling in a browser.
//
// WHY IT LIVES IN ONE PLACE NOW. There used to be four copies with three axes of drift, and the
// damage was the usual shape: a colour the GATE accepted, the ENGINE rejected, and nothing said so.
//   · core/filters.js          #rgb · #rrggbb · rgb()/rgba() with INTEGER parts → [r,g,b]
//   · core/motion.js           the same, plus an array passthrough, and its rgb() form was
//                              UNANCHORED, so "foo rgb(1,2,3)" parsed and filters.js said null
//   · core/lightfield/colour.js 6-digit hex ONLY, deliberately (see that file)
//   · scripts/gates/designspec-check.mjs  #rgb · #rgba · #rrggbb · #rrggbbaa · rgb()/rgba() with
//                              FLOAT parts → {r,g,b}. The gate alone understood 8-digit hex, so a
//                              scene could carry "#0b0b0fcc", be graded against the palette, and
//                              then reach a grade or a glow that read null and silently fell back.
// This accepts the UNION of those grammars and is ANCHORED at both ends. The unanchored form was a
// bug, not a feature: it made a typo ("colour: #fff rgb(1,2,3)") parse as a colour instead of
// failing, which is exactly the silent substitution docs/MISTAKES.md keeps warning about.
//
// Return shape is [r,g,b], because that is what the engine's own call sites already destructure.
// Channels are NOT rounded: the gate measures palette distance on floats, and rounding here would
// move its numbers. `parseColorRGB` is the thin {r,g,b} adapter for the gate and the lightfield.
//
// Grammar, exactly:
//   [r,g,b]        passed through untouched (a caller that already resolved a colour)
//   #rgb  #rgba    each digit doubled; the alpha digit is parsed and dropped
//   #rrggbb  #rrggbbaa   the alpha pair is parsed and dropped
//   rgb()/rgba()   3+ finite numbers separated by commas, whitespace or a slash; alpha dropped
// Anything else → null. Alpha is dropped everywhere because every consumer wants opaque channels;
// a caller that needs the alpha must read it off the source string itself.
export function parseColor(c) {
  if (Array.isArray(c)) return c;
  const s = String(c ?? '').trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((d) => d + d).join('');
    else if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6) return null; // 5 and 7 digits are a typo, not a colour
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) return p.slice(0, 3);
  }
  return null;
}

// The alpha parseColor deliberately drops, for the one caller that needs it: an SVG filter cannot use
// a CSS colour, so a tint written `rgba(255,60,60,0.75)` has to arrive as components AND a weight.
// Same grammar as above, read off the source string exactly as that header instructs. 1 when absent.
export function colorAlpha(c) {
  const s = String(c ?? '').trim();
  const hex = /^#([0-9a-f]{4}|[0-9a-f]{8})$/i.exec(s);
  if (hex) {
    const h = hex[1];
    const a = h.length === 4 ? h[3] + h[3] : h.slice(6, 8);
    return parseInt(a, 16) / 255;
  }
  const m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length >= 4 && Number.isFinite(p[3])) return Math.max(0, Math.min(1, p[3]));
  }
  return 1;
}

// {r,g,b} adapter. The gate and the lightfield read named channels; the engine reads the tuple.
// One parser, two shapes, so neither side had to be rewritten to share the grammar.
export function parseColorRGB(c) {
  const t = parseColor(c);
  return t ? { r: t[0], g: t[1], b: t[2] } : null;
}

// ---------- color contrast (WCAG) ----------
// contrastRatio >= 1 (21 = black/white).
// ensureContrast: keep fg if it clears min against bg, else return whichever of light/dark reads.
/** Is this background LIGHT? One answer, in linear light, for every consumer that has to choose
 *  between dark ink and light ink.
 *
 *  There were two answers and they disagreed on 5.8% of the sRGB cube. `core/engine/boot.js` and
 *  `core/engine/produce.js` both weighted the GAMMA-ENCODED channels, `0.2126r + 0.7152g + 0.0722b` on the
 *  raw 0-1 values, while the four copies that grade contrast linearise first, as WCAG requires. The
 *  disagreement is concentrated exactly where it hurts: SATURATED colours. `#ef720b`, a hot orange,
 *  reads 0.522 gamma (dark) and 0.304 linear (light), so a brand shipping an orange backdrop got the
 *  producer choosing dark ink for a surface the auditor then graded as light. Neutrals agree, which is
 *  why nothing had surfaced: 0 of the 78 background colours across every theme in this repo changes
 *  classification under this fix.
 *
 *  The threshold is 0.26 because that is where the old ones already sat. Gamma 0.55 and 140/255 = 0.549
 *  are the same point, and 0.55 in sRGB linearises to ≈0.26, so this is the SAME line, drawn in the
 *  space where the weights mean something. */
export const isLightBg = (c) => {
  const rgb = parseColor(c);
  return rgb ? relLum(rgb) > 0.26 : true;   // unreadable → light, the white-first common case
};

const relLum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrastRatio(fg, bg) {
  const a = parseColor(fg), b = parseColor(bg);
  if (!a || !b) return 21;
  const [hi, lo] = relLum(a) > relLum(b) ? [relLum(a), relLum(b)] : [relLum(b), relLum(a)];
  return (hi + 0.05) / (lo + 0.05);
}
export function ensureContrast(fg, bg, { min = 3, light = '#ffffff', dark = '#141414' } = {}) {
  if (contrastRatio(fg, bg) >= min) return fg;
  return contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
}

export function sequence(n, fps, segments, { transition = 0.4, holdLast = true } = {}) {
  const cur = track(n, fps, segments);
  const trans = segments[cur.index]?.transition ?? transition;
  const isLast = cur.index === segments.length - 1;
  const enter = trans > 0 ? clamp01(cur.localT / trans) : 1;
  const exit = (trans > 0 && !(holdLast && isLast)) ? clamp01((cur.localT - (cur.dur - trans)) / trans) : 0;
  return { ...cur, enter, exit, active: enter * (1 - exit) };
}

// transition helpers → {clipPath, WebkitClipPath} (compositor-friendly; t: 0 hidden → 1 revealed).
// wipe: directional inset reveal. circleWipe: iris from a point. clockWipe: radial sweep from 12 o'clock.
export function wipe(t, dir = 'left') {
  const p = (1 - clamp01(t)) * 100;
  const m = { left: `inset(0 ${p}% 0 0)`, right: `inset(0 0 0 ${p}%)`, up: `inset(0 0 ${p}% 0)`, down: `inset(${p}% 0 0 0)` };
  // `m[dir] || m.left` silently wiped leftward for any unrecognised direction. core/cuts.js owns the
  // vocabulary; this is the same rule at the other call site (docs/MISTAKES.md #360).
  const c = m[dir];
  if (!c) throw new Error(`wipe: unknown direction "${dir}", one of: ${Object.keys(m).join(', ')}`);
  return { clipPath: c, WebkitClipPath: c };
}
export function circleWipe(t, cx = 50, cy = 50) {
  const c = `circle(${(clamp01(t) * 72).toFixed(1)}% at ${cx}% ${cy}%)`;
  return { clipPath: c, WebkitClipPath: c };
}
function boxEdge(aDeg) { // point on the 100×100 box perimeter at angle aDeg (0 = up, clockwise)
  const rad = (aDeg * Math.PI) / 180, dx = Math.sin(rad), dy = -Math.cos(rad);
  const tx = dx === 0 ? Infinity : (dx > 0 ? 50 / dx : -50 / dx);
  const ty = dy === 0 ? Infinity : (dy > 0 ? 50 / dy : -50 / dy);
  const t = Math.min(tx, ty);
  return [50 + t * dx, 50 + t * dy];
}
export function clockWipe(t) {
  const a = clamp01(t) * 360;
  const pts = [[50, 50], [50, 0]];
  for (const c of [45, 135, 225, 315]) if (c <= a) pts.push(boxEdge(c));
  if (a > 0 && a < 360) pts.push(boxEdge(a)); else if (a >= 360) pts.push([50, 0]);
  const poly = 'polygon(' + pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ') + ')';
  return { clipPath: poly, WebkitClipPath: poly };
}

export function formatNumber(n, { currency = false, decimals = 0, compact = false } = {}) {
  let s;
  if (compact) {
    const a = Math.abs(n);
    if (a >= 1e12) s = (n / 1e12).toFixed(decimals === 0 ? 2 : decimals) + 'T';
    else if (a >= 1e9) s = (n / 1e9).toFixed(decimals === 0 ? 1 : decimals) + 'B';
    else if (a >= 1e6) s = (n / 1e6).toFixed(decimals === 0 ? 1 : decimals) + 'M';
    else if (a >= 1e3) s = (n / 1e3).toFixed(decimals === 0 ? 1 : decimals) + 'K';
    else s = n.toFixed(decimals);
    s = s.replace(/\.0+([TBMK])$/, '$1'); // 40.0M -> 40M
  } else {
    s = Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return (currency ? '$' : '') + s;
}

// returns { num, unit } so the scene can style the unit smaller/dim
export function formatValue(n, unit) {
  if (unit === '$' || unit === 'USD') return { num: formatNumber(n, { currency: true, decimals: 0, compact: Math.abs(n) >= 1e6 }), unit: '' };
  if (unit && unit.length > 1 && unit[0] === '$') return { num: '$' + formatNumber(n, { decimals: 0 }), unit: unit.slice(1) };
  const compact = Math.abs(n) >= 1e6;
  return { num: formatNumber(n, { decimals: 0, compact }), unit: unit || '' };
}

// deterministic digit scramble (redacted cold-open bait).
// Large salted seed so frame 0 is already varied (never all-zeros / broken-looking).
function lcg01(seed) { const s = (Math.imul(seed >>> 0, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }
export function scrambleDigits(frame, sample) {
  let out = '';
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    out += ch >= '0' && ch <= '9'
      ? String(Math.floor(lcg01(0x9e3779b1 + frame * 2654435761 + (i + 1) * 40503) * 10))
      : ch;
  }
  return out;
}

// deterministic per-data duration in [58,62]s so uploads vary but a given video is stable
export function seedFrom(str) {
  let h = 2166136261 >>> 0; const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function pickDuration(seed, min = 58.2, max = 61.8) {
  const steps = Math.round((max - min) / 0.1);
  return +(min + ((seed >>> 0) % (steps + 1)) * 0.1).toFixed(2);
}

// ---------- taste: swappable theme (palette + gradient + fonts + motion personality) ----------
// A theme is data and OWNS the entire look. There is no default look and no merge-over-defaults.
// Named themes (themes/<name>.json) are brand kits; an inline object on data.theme is the one-off
// escape hatch. A theme missing required keys (core/theme-contract.js) throws at boot, so a video
// can never render with fallback CSS. Motion personality alone keeps engine defaults, it tunes
// HOW primitives move, not what the video looks like.
// `idle` is the ONLY key here that describes how a layer LIVES; the other six all govern an entrance
// or an exit. THE OWNER'S CALL (2026-09): a default that induces motion nobody authored is a bug, not
// a taste choice, so `idle` defaults to `none`. It was briefly `'breathe'` (measured: the reference
// films in refs/ are still for 13-24% of their frames and ours for 84%, and that number is real), but
// shipping it as the SILENT default meant static text pulsed a 1.5% scale nobody asked for. The
// argument for authored idle stands, it just has to be authored: `idle: "breathe"` on a theme, a
// scene, or a layer opts in (core/engine/idle.js, which has said `none` is the default in its own
// blurb the whole time; this line was the one place that disagreed with it).
// THE DEFAULT EASE IS THE STRONG ONE, and the change is one word with a measurable reason behind it.
// The outside standards argue the built-in CSS curves are too weak and name a custom ease-out,
// `cubic-bezier(0.23, 1, 0.32, 1)`. Sampled at 21 points against all 41 of our easings, the nearest is
// `easeOutQuint` at a mean error of 0.0044: we have shipped their curve under another name the whole
// time and defaulted to `easeOutCubic`, which is the weaker built-in they specifically argue against
// (docs/CRAFT/MOTION-STANDARDS.md).
//
// `stagger` 0.045 is 45ms, mid-band of their 30 to 80.
// `bounce`, `settle` and `enter` are resolved here but NOT currently read by any entrance: `rise`
// (core/motion.js) is hardcoded to `easeOutSnap` (bounce 0.2), `pop`/`lift` to `easeOutBack`/
// `easeOutSettle`, none of them take `M`. Left as documented, inert knobs rather than wired up here:
// wiring them into the entrance registry is a real change to what every `anim:"rise"` looks like, and
// this pass is about removing motion nobody asked for, not adding a new one. `bounce` still defaults
// to 0 below so the field reads correctly if a future change wires it in.
export const DEFAULT_MOTION = { easing: 'easeOutQuint', bounce: 0, settle: 0.6, enter: 48, durationScale: 1, stagger: 0.045, idle: 'none' };

// exitRatioFromMotion(durationScale): `exitRatio` DERIVED from the theme's own overall pace, the same
// axis `core/registry/theme-contract.js` already reads for the default cut tier (`durationScale` < 1
// is a brisk brand, > 1 is cinematic). A theme that already runs fast should also leave fast: half its
// own pace, anchored so the engine's own pace (durationScale 1) lands on 0.5, the exact value
// `themes/default.json` names "the house default: half, the middle of the band" and `themes/plinth.json`
// (durationScale 1) also authors by hand. Checked against the 11 themes that hand-author `exitRatio`:
// this formula is within 0.05 of 8 of them (exact on plinth) and its one clear miss, `themes/
// plainyear.json` (durationScale 0.9, hand-authored 0.6), is a calm brand that happens to also be
// paced fast, which durationScale alone cannot see; an author who wants that split still states it
// and wins (see below). Clamped to the authored band with a little headroom either side, so a custom
// theme's `durationScale` outside 0.8-1.05 cannot compute an exit slower than its own entrance or one
// so fast it reads as a glitch.
export const exitRatioFromMotion = (durationScale) => Math.min(0.7, Math.max(0.3, 0.5 * durationScale));

// motionDefaults(theme): the theme's motion personality with `easing` resolved to a function.
// Scenes pass these into primitives, e.g. interpolate(t, inR, outR, { easing: M.easing }),
// spring(t, M), or translateY(M.enter * (1 - eased)). durationScale lets a theme stretch/tighten
// pacing; stagger is the per-item delay step.
export function motionDefaults(theme) {
  const m = (theme && theme.motion) || DEFAULT_MOTION;
  const durationScale = m.durationScale ?? 1;
  return {
    easing: resolveEasing(m.easing),
    bounce: m.bounce ?? DEFAULT_MOTION.bounce,
    settle: m.settle ?? DEFAULT_MOTION.settle,
    enter: m.enter ?? DEFAULT_MOTION.enter,
    durationScale,
    stagger: m.stagger ?? DEFAULT_MOTION.stagger,
    // The theme's answer to "how does a layer behave once it has arrived". Read by
    // formats/scene/scene.js as the third rung of layer -> scene -> theme -> engine default, and
    // normalized there so a misspelled name is refused at boot rather than on a later frame.
    idle: m.idle ?? DEFAULT_MOTION.idle,
    // THINGS SHOULD LEAVE FASTER THAN THEY ARRIVE. An entrance is an introduction and deserves its
    // time; an exit is over. The exemplar states this per layer (a scrim that fades in over 0.32 and
    // out over 0.07, a hook that types at 33cps and erases at 60), and every other film in this library
    // leaves everything at the same speed it arrived because a single symmetric constant is the
    // default. `exitRatio` moves that decision to the theme, where a brand's snap belongs. An explicit
    // `exitRatio` still wins outright; only the 30 of 41 themes that never say it now get a real number
    // (`exitRatioFromMotion` above) instead of 1 (symmetric, which is what "no rule" actually shipped).
    exitRatio: m.exitRatio ?? exitRatioFromMotion(durationScale),
  };
}
