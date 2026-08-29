// core/motion.js: pure motion math + scene helpers (easing, spring, interpolate,
// transforms, text-fit, colour, formatters). No DOM, no fetch, safe to import in node (lib-test).
// The theme/clock/boot RUNTIME lives in core/boot.js.
// just time->data transforms + the scene boot.

// core/ is self-contained: the validator lives here too (core/validate.mjs), because boot.js
// imports it and the browser must be able to resolve it. It is engine code, not tooling.

import { FEEL } from './vocab.js';
import { nearMisses } from './registry.js';

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
};
// GSAP's easing vocabulary, which this engine also carries: `parts[].ease` and `morph.ease` go
// straight to gsap.fromTo and never arrive here. Detected only to give a WRONG-SLOT name a useful
// error instead of a list of 41 names it is not in. Same cross-registry hint as core/type.js.
const GSAP_EASE = /^(power[0-4]|back|elastic|bounce|circ|expo|sine|steps|none|rough|slow)\b/;

// isEasingName(n): would resolveEasing accept this string? The ONE membership test, so a gate can ask
// instead of re-deriving it. core/validate.mjs held its own copy and it was already one registry behind.
export const isEasingName = (n) => typeof n === 'string'
  && (Object.prototype.hasOwnProperty.call(EASINGS, n) || Object.prototype.hasOwnProperty.call(FEEL, n));

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
Object.assign(EASINGS, {
  spring: springWindow({ bounce: 0.35, settle: 0.92 }),
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
 *  There were two answers and they disagreed on 5.8% of the sRGB cube. `core/boot.js` and
 *  `core/produce.js` both weighted the GAMMA-ENCODED channels, `0.2126r + 0.7152g + 0.0722b` on the
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
// or an exit. That asymmetry was the bug: `clipStyleAt` computes an entrance ramp and an exit ramp and
// has NO branch for the middle, so stillness was never a decision anyone made, it was the shape of the
// data model. Measured: the reference films in refs/ are still for 13-24% of their frames and ours for
// 84%. The default is live, and `idle: "none"` on a theme, a scene or a layer is the opt-out.
// THE DEFAULT EASE IS THE STRONG ONE, and the change is one word with a measurable reason behind it.
// The outside standards argue the built-in CSS curves are too weak and name a custom ease-out,
// `cubic-bezier(0.23, 1, 0.32, 1)`. Sampled at 21 points against all 41 of our easings, the nearest is
// `easeOutQuint` at a mean error of 0.0044: we have shipped their curve under another name the whole
// time and defaulted to `easeOutCubic`, which is the weaker built-in they specifically argue against
// (docs/CRAFT/MOTION-STANDARDS.md).
//
// `stagger` 0.045 is 45ms, mid-band of their 30 to 80. `exitRatio` defaults to 1 and is the one knob
// here a theme should almost always override; the seven themes behind shipped films now do.
export const DEFAULT_MOTION = { easing: 'easeOutQuint', bounce: 0.3, settle: 0.6, enter: 48, durationScale: 1, stagger: 0.045, idle: 'breathe' };

// motionDefaults(theme): the theme's motion personality with `easing` resolved to a function.
// Scenes pass these into primitives, e.g. interpolate(t, inR, outR, { easing: M.easing }),
// spring(t, M), or translateY(M.enter * (1 - eased)). durationScale lets a theme stretch/tighten
// pacing; stagger is the per-item delay step.
export function motionDefaults(theme) {
  const m = (theme && theme.motion) || DEFAULT_MOTION;
  return {
    easing: resolveEasing(m.easing),
    bounce: m.bounce ?? DEFAULT_MOTION.bounce,
    settle: m.settle ?? DEFAULT_MOTION.settle,
    enter: m.enter ?? DEFAULT_MOTION.enter,
    durationScale: m.durationScale ?? 1,
    stagger: m.stagger ?? DEFAULT_MOTION.stagger,
    // The theme's answer to "how does a layer behave once it has arrived". Read by
    // formats/scene/scene.js as the third rung of layer -> scene -> theme -> engine default, and
    // normalized there so a misspelled name is refused at boot rather than on a later frame.
    idle: m.idle ?? DEFAULT_MOTION.idle,
    // THINGS SHOULD LEAVE FASTER THAN THEY ARRIVE. An entrance is an introduction and deserves its
    // time; an exit is over. The exemplar states this per layer (a scrim that fades in over 0.32 and
    // out over 0.07, a hook that types at 33cps and erases at 60), and every other film in this library
    // leaves everything at the same speed it arrived because a single symmetric constant is the
    // default. `exitRatio` moves that decision to the theme, where a brand's snap belongs.
    // Defaults to 1 so no existing theme changes until it opts in (docs/CRAFT/KEYED-MOTION.md).
    exitRatio: m.exitRatio ?? 1,
  };
}
