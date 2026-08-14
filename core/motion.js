// core/motion.js — pure motion math + scene helpers (easing, spring, interpolate,
// transforms, text-fit, colour, formatters). No DOM, no fetch — safe to import in node (lib-test).
// The theme/clock/boot RUNTIME lives in core/boot.js.
// just time->data transforms + the scene boot.

// core/ is self-contained: the validator lives here too (core/validate.mjs), because boot.js
// imports it and the browser must be able to resolve it. It is engine code, not tooling.

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
// sine family — MOTION-CRAFT / the planning skill prescribe "ambient loops sinusoidal", which was
// unexpressable until now: the registry had no sine curve at all. This is the gentlest ease there
// is (no hard stop), which is exactly what a drifting/breathing loop wants.
export const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
// quint: one notch sharper than quart, softer than expo — the "luxurious settle" for hero moves.
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
// circ: mechanical/geometric — starts or stops very hard. Good for wipes and mechanical UI.
export const easeInCirc = (t) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const easeOutCirc = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc = (t) => (t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2);
// back: anticipation — dips BELOW 0 before launching (easeIn) / past 1 before settling (easeOut).
export const easeInBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; };
export const easeInOutBack = (t) => { const c1 = 1.70158, c2 = c1 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; };
// elastic: rubber band. Endpoints snapped so it lands exactly (the raw formula rings past 1).
export const easeInElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)));
export const easeInOutElastic = (t) => { const c5 = (2 * Math.PI) / 4.5; return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1; };
// bounce: ball drop. Stays inside [0,1] — it never overshoots, it rebounds.
export const easeOutBounce = (t) => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; };
export const easeInBounce = (t) => 1 - easeOutBounce(1 - t);
export const easeInOutBounce = (t) => (t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2);
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));
export const easeInOutExpo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : 1 - Math.pow(2, -20 * t + 10) / 2);

// springStiff — critically-damped settle (NO overshoot); for Creed / restrained brands.
// Complements the existing overshooting spring() below. Pure, terminal at t≥1 → safe for renderFrame(n).
export const springStiff = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * (1 + 6.5 * t));

// springEase({response, dampingFraction}) — the iOS/SwiftUI spring as a closed-form EASING FACTORY: a
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
// accel/decel: pure power curves — k is the acceleration exponent (k=1 linear, k=3 hard launch/brake).
export const accel = (t, k = 2.4) => Math.pow(clamp01(t), k);
export const decel = (t, k = 2.4) => 1 - Math.pow(1 - clamp01(t), k);
// speedRamp(t, {peak, sharp}) — the editor's speed ramp: velocity is LOW at both ends and peaks at
// `peak` (0..1); `sharp` is how violent the acceleration is. Use to remap any progress before it
// hits a transform: slow-out → rush → slow-in reads as intentional camera work, not a lerp.
export function speedRamp(t, { peak = 0.5, sharp = 2.4 } = {}) {
  t = clamp01(t);
  if (peak <= 0) return decel(t, sharp);
  if (peak >= 1) return accel(t, sharp);
  return t < peak ? peak * Math.pow(t / peak, sharp) : 1 - (1 - peak) * Math.pow((1 - t) / (1 - peak), sharp);
}

// easing registry — lets a theme name its easing as a string (motion.easing) that the scene
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
// resolveEasing — an easing name or a function → a pure easing function. An unknown name used to fall
// back to easeOutCubic SILENTLY, so a typo (`ease:"eastOutQuart"`) rendered the wrong curve with no
// error — the silent-substitution the doctrine forbids. Now it WARNS once per bad name, then falls back.
const _easeWarned = new Set();
export const resolveEasing = (e) => {
  if (typeof e === 'function') return e;
  if (e == null || e === '') return easeOutCubic;
  if (EASINGS[e]) return EASINGS[e];
  if (!_easeWarned.has(e)) { _easeWarned.add(e); console.warn(`ease: unknown easing "${e}" — using easeOutCubic. Valid names: ${Object.keys(EASINGS).join(', ')}.`); }
  return easeOutCubic;
};

// ---------- motion primitives — all PURE in their input (no state); safe for the purity probe ----------

// interpolate(t, inRange, outRange, {easing, clamp}) — multi-stop value mapping. Replaces the
// repeated `lerp(a, b, clamp01((f - s) / (e - s)))` pattern. easing is applied within each segment.
export function interpolate(t, inR, outR, { easing = (x) => x, clamp = true } = {}) {
  const n = inR.length;
  if (n < 2 || n !== outR.length) return outR[0];
  if (clamp) { if (t <= inR[0]) return outR[0]; if (t >= inR[n - 1]) return outR[n - 1]; }
  let i = 1; while (i < n - 1 && t > inR[i]) i++;
  const a = inR[i - 1], b = inR[i];
  return lerp(outR[i - 1], outR[i], easing(clamp01(b === a ? 0 : (t - a) / (b - a))));
}

// spring(t, {bounce, settle}) — analytic underdamped step response (closed-form, PURE in t-seconds).
// Returns 0 → ~1 with natural overshoot. bounce∈[0,1): 0 = no overshoot, higher = bouncier.
export function spring(t, { bounce = 0.3, settle = 0.6 } = {}) {
  if (t <= 0) return 0;
  const omega = (Math.PI * 2) / settle, zeta = Math.min(0.999, Math.max(0.0001, 1 - bounce));
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta), env = Math.exp(-zeta * omega * t);
  return 1 - env * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t));
}

// spring as a t→t EASING (settles by t=1), so any keyframe track — `motion[].ease`, count `ease`,
// cut timing — can overshoot-and-settle organically. Same idea as another engine's Easing.spring /
// another engine' springEase, pure in t. Overshoots >1 mid-way (that's the point); lands exactly at 1.
//
// spring() is a damped oscillator in SECONDS, and it has not stopped ringing at t=1 — sampling it
// directly over [0,1] made `spring-bouncy` land at 0.96 and STAY there, i.e. an element eased with
// it never actually reached its keyframe (breaking MOTION-CRAFT rule 5, "settle and hold"). Map t
// onto each spring's own settle window so the ring completes inside [0,1], and snap the endpoints
// exactly the way easeOutSettle does. Guarded by the easing-registry contract in lib-test.
// springWindow — maps the seconds-based spring() into its own settle window so the ring completes inside
// [0,1] (distinct from the exported springEase({response,dampingFraction}) factory above, which is the
// iOS-parameterised spring). Renamed off `springEase` to free that name for the public API.
const springWindow = (o) => { const T = springSettle(o); return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : spring(clamp01(t) * T, o)); };
Object.assign(EASINGS, {
  spring: springWindow({ bounce: 0.35, settle: 0.92 }),
  'spring-bouncy': springWindow({ bounce: 0.55, settle: 0.94 }),
  'spring-stiff': springWindow({ bounce: 0.12, settle: 0.72 }),
  // iOS-parameterised spring, house default (ζ=1, no overshoot) — usable by name in any `ease:` slot.
  springEase: springEase(),
});
// easeOutSettle — the DEFAULT entrance feel: a SMOOTH decelerate with just a whisper of settle (premium,
// not bouncy). Low bounce (0.08) so type glides to rest instead of overshooting/wobbling — a visible
// bounce on every word reads as "too much movement". Endpoints are SNAPPED exactly (0 and 1) so the held
// state sits at true rest — no sub-pixel residual that would blur text on hold.
export const easeOutSettle = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : spring(t, { bounce: 0.08, settle: 0.7 }));
EASINGS.settle = easeOutSettle;
// easeOutSnap — the default LAYER entrance feel: a touch more overshoot than easeOutSettle so a card
// or headline visibly snaps-past-and-settles (the single most recognizable motion-graphics tell)
// instead of gliding in floaty. Bounce stays modest (0.16) so it reads premium, not toy, and it is
// used ONLY by the layer-level `rise` — the per-unit type presets keep easeOutSettle so a whole line
// of words does not wobble. Endpoints snapped exactly (true rest on hold, no sub-pixel text blur).
export const easeOutSnap = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : spring(t, { bounce: 0.2, settle: 0.58 }));
EASINGS.snap = easeOutSnap;
// springSettle(opts) — seconds for the spring's envelope to decay below eps (size your holds with this).
export function springSettle({ bounce = 0.3, settle = 0.6, eps = 0.02 } = {}) {
  const omega = (Math.PI * 2) / settle, zeta = Math.min(0.999, Math.max(0.0001, 1 - bounce));
  return -Math.log(eps) / (zeta * omega);
}

// track(n, fps, beats) — given [{name, dur(seconds)}], return the active beat + its progress.
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

// transition helpers → {opacity, transform} (compositor-friendly only). Object.assign onto el.style.
// rise uses easeOutSnap (not easeOutSettle): the modest overshoot carries the translate slightly
// PAST its rest point and settles back, which is what makes a default entrance read as directed
// rather than floaty. The overshoot is deterministic and lands exactly at rest by t=1.
export const rise = (t, dist = 48) => ({ opacity: clamp01(t), transform: `translateY(${((1 - easeOutSnap(clamp01(t))) * dist).toFixed(2)}px)` });
export const fade = (t) => ({ opacity: clamp01(t), transform: 'none' });
export const pop = (t, from = 0.86) => ({ opacity: clamp01(t * 3), transform: `scale(${from + (1 - from) * easeOutBack(clamp01(t))})` });
// lift — the entrance for things that should feel ALIVE arriving (faces, cards, chips) rather than
// merely appearing. `pop` scales from 0.86, a 14% change that reads as flat at avatar size; this
// travels further (0.68), rises as it grows, and settles with a small overshoot, so a staggered row
// reads as a wave rather than a checklist. Pure in t like every other entrance.
export const lift = (t, { from = 0.68, dist = 30 } = {}) => {
  const u = clamp01(t), e = easeOutBack(u);
  return { opacity: clamp01(u * 2.2),
    transform: `translateY(${((1 - easeOutSettle(u)) * dist).toFixed(2)}px) scale(${(from + (1 - from) * e).toFixed(4)})` };
};
// defocus — enters/leaves through focus rather than through space. Paired with `out:"defocus"` it
// gives the blur exit that reads as "this is done" without moving anything, which is what you want
// when the layer is a card or a face and sliding it would fight the content.
export const defocus = (t, { max = 14 } = {}) => {
  const u = clamp01(t);
  // At rest this MUST be `none`, not `blur(0px)`. A zero-radius blur is still a filter, so the
  // compositor promotes the layer and rasterizes it through the filter pipeline every frame — with
  // ~50 image layers carrying a resting defocus that alone pushed frames past the render timeout.
  // Identity has to be free, because the resting value is written on every frame of the scene.
  if (u >= 1) return { opacity: 1, filter: 'none' };
  return { opacity: u, filter: `blur(${((1 - easeOutCubic(u)) * max).toFixed(2)}px)` };
};
export const slide = (t, dir = 'left', dist = 60) => {
  const k = 1 - easeOutCubic(clamp01(t));
  const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist;
  const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist;
  return { opacity: clamp01(t), transform: `translate(${x}px, ${y}px)` };
};
export const applyT = (el, styles) => { if (el) Object.assign(el.style, styles); };

// ---------- seeded, deterministic randomness (another engine `random()` parity — safe for purity) ----------
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
// value noise in 1D: smooth deterministic wander in [0,1) — good for organic drift/parallax.
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = random(`${seed}:${i}`), b = random(`${seed}:${i + 1}`);
  return a + (b - a) * (f * f * (3 - 2 * f)); // smoothstep interpolation
}
// stagger(i, step): delay in seconds for item i (step defaults to a gentle 60ms).
export const stagger = (i, step = 0.06) => i * step;

// shake(t, {amp, freq, decay, seed}) — deterministic camera/impact shake: two incommensurate
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
// pulse(t, {period, amt}) — continuous breathing scale for idle chrome (logos, badges, CTAs).
export const pulse = (t, { period = 2.4, amt = 0.03 } = {}) => 1 + amt * Math.sin((t / period) * Math.PI * 2);

// trackingFor(px) — optical letter-spacing: display type tightens as it grows (measured off
// linear.app's real ramp: −0.008em body → −0.022em hero). Themes opt in via type.optical.
export const trackingFor = (px) => interpolate(px, [14, 32, 64, 120], [-0.008, -0.012, -0.017, -0.022]).toFixed(4) + 'em';

// kenBurns(t, dur, {from, to, fx, fy, easing}) — the tasteful photo/image zoom: a slow continuous
// scale from → to over the layer's window, anchored at focus point (fx, fy in 0..1). Rules that
// keep it tasteful: total travel ≤ 8% (from 1.0, to ≤ 1.08), NEVER reverses mid-window, eased
// inOut so velocity is invisible at both ends. Returns {transform, transformOrigin}.
export function kenBurns(t, dur, { from = 1.0, to = 1.07, fx = 0.5, fy = 0.42, easing = easeInOutCubic } = {}) {
  const p = easing(clamp01(dur > 0 ? t / dur : 1));
  return { transform: `scale(${lerp(from, to, p).toFixed(4)})`, transformOrigin: `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%` };
}

// ---------- text measuring (another engine measureText/fitText parity — browser only) ----------
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
// fitBox(el, {maxW, maxH, max, min}) — MULTI-LINE overflow-safe fit (another engine fitTextOnNLines parity).
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

// ---------- sequencing (another engine Sequence/TransitionSeries parity) — pure in n ----------
// sequence(n, fps, segments): like track() but with cross-segment transition windows. Each segment
// = { name, dur, transition? }. Returns the active segment plus `enter` (0→1 over the leading
// transition) and `exit` (0→1 over the trailing transition), so a scene can drive an in/out
// transition on each segment. `active` = combined visibility (enter × (1 − exit)).
// holdLast (default true): the LAST segment never exits — there is no next scene to hand off to,
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
 *  `core/produce.js` both weighted the GAMMA-ENCODED channels — `0.2126r + 0.7152g + 0.0722b` on the
 *  raw 0-1 values — while the four copies that grade contrast linearise first, as WCAG requires. The
 *  disagreement is concentrated exactly where it hurts: SATURATED colours. `#ef720b`, a hot orange,
 *  reads 0.522 gamma (dark) and 0.304 linear (light), so a brand shipping an orange backdrop got the
 *  producer choosing dark ink for a surface the auditor then graded as light. Neutrals agree, which is
 *  why nothing had surfaced: 0 of the 78 background colours across every theme in this repo changes
 *  classification under this fix.
 *
 *  The threshold is 0.26 because that is where the old ones already sat. Gamma 0.55 and 140/255 = 0.549
 *  are the same point, and 0.55 in sRGB linearises to ≈0.26 — so this is the SAME line, drawn in the
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
  const c = m[dir] || m.left;
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
// A theme is data and OWNS the entire look — there is no default look and no merge-over-defaults.
// Named themes (themes/<name>.json) are brand kits; an inline object on data.theme is the one-off
// escape hatch. A theme missing required keys (core/theme-contract.js) throws at boot, so a video
// can never render with fallback CSS. Motion personality alone keeps engine defaults — it tunes
// HOW primitives move, not what the video looks like.
export const DEFAULT_MOTION = { easing: 'easeOutCubic', bounce: 0.3, settle: 0.6, enter: 48, durationScale: 1, stagger: 0.045 };

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
    // THINGS SHOULD LEAVE FASTER THAN THEY ARRIVE. An entrance is an introduction and deserves its
    // time; an exit is over. The exemplar states this per layer (a scrim that fades in over 0.32 and
    // out over 0.07, a hook that types at 33cps and erases at 60), and every other film in this library
    // leaves everything at the same speed it arrived because a single symmetric constant is the
    // default. `exitRatio` moves that decision to the theme, where a brand's snap belongs.
    // Defaults to 1 so no existing theme changes until it opts in (docs/CRAFT/KEYED-MOTION.md).
    exitRatio: m.exitRatio ?? 1,
  };
}
