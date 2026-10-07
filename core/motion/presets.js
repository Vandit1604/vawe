// Motion defaults for pages: enter, leave, stagger and layer as Web Animations the renderer seeks.
// Times in options are seconds; WAAPI timing is milliseconds. The *Specs functions are pure; the
// verbs only call el.animate on what they return.
import { curveToLinear, rng } from './springs.js';
import { handleCurve } from './motion.js';
import { readSignature } from './signature.js';
import LIMITS from './taste-limits.js';

// taste/rules/speed-bands.md, seconds
const BAND = LIMITS['speed-bands'];
export const BANDS = {
  energy: [BAND.energy_min_s, BAND.energy_max_s],
  professional: [BAND.energy_max_s, BAND.professional_max_s],
  gravity: [BAND.professional_max_s, BAND.gravity_max_s],
  cinematic: [BAND.gravity_max_s, BAND.cinematic_max_s],
};
const ORDER = Object.keys(BANDS);

// The median followed move in 135 library scenes (taste/rules/speed-bands.md).
const EYE_SPEED = BAND.eye_speed_px_per_s;
const LEAVE_SHARE = LIMITS['exits-shorter'].preset_leave_share;
const GAP = LIMITS.stagger;
const STAGGER = { gap: GAP.gap_default_s, min: GAP.gap_min_s, max: GAP.gap_max_s, total: GAP.total_max_s, jitter: 0.25 };

// A dial the page chose in its signature (core/motion/signature.js), else the engine default.
const signed = (dial, fallback) => readSignature()[dial] ?? fallback;
const signedGap = () => (Number(signed('stagger')) > 0 ? Number(signed('stagger')) / 1000 : STAGGER.gap);

// After Effects handle pairs [out, in] of one segment, named by what the move does (core/motion/README.md).
// A handle is a name from HANDLE_REGISTRY or { influence, speed }.
export const EASE_HANDLES = {
  land: ['fling', 'hang'],
  landSoft: [{ influence: 20, speed: 2.5 }, 'hang'],
  settle: ['long', 'long'],
  swap: ['hang', 'hang'],
  glide: ['easyEase', { influence: 33, speed: 0.1 }],
  carry: ['easyEase', 'fling'],
  leave: ['easyEase', 'long'],
  launch: ['easyEase', { influence: 25, speed: 3 }],
  pop: ['fling', { influence: 35, speed: -1.5 }],
  nudge: ['fling', { influence: 35, speed: -0.8 }],
};

const LINEAR_TOLERANCE = 0.002;
const linearOf = (out, into) => curveToLinear(handleCurve(out, into), { tolerance: LINEAR_TOLERANCE });

/** The named eases as CSS linear() strings for `easing:`. */
export const EASE = Object.fromEntries(Object.entries(EASE_HANDLES).map(([name, [out, into]]) => [name, linearOf(out, into)]));

/** The same named ease as a function of u in 0..1, for `vawe.onFrame` and `window.seek`, where a `linear()` string cannot run. */
export function easeFn(name) {
  if (!EASE_HANDLES[name]) throw new Error(`presets: unknown ease "${name}"; valid: ${Object.keys(EASE).join(' ')}`);
  return handleCurve(...EASE_HANDLES[name]);
}

function easeOf(name) {
  if (!EASE[name]) throw new Error(`presets: unknown ease "${name}"; valid: ${Object.keys(EASE).join(' ')}`);
  return EASE[name];
}

/** The mid duration of a band, in seconds. Throws on an unknown name. */
export function bandSeconds(name) {
  const b = BANDS[name];
  if (!b) throw new Error(`presets: unknown band "${name}"; valid: ${ORDER.join(' ')}`);
  return +((b[0] + b[1]) / 2).toFixed(3);
}

/** The band a duration falls in; under 0.15 s is energy, over 2 s cinematic. */
export function bandOf(seconds) {
  return ORDER.find((name) => seconds <= BANDS[name][1]) || 'cinematic';
}

/** The band for a move of `px` at the speed an eye follows. */
export function pickBand(px) {
  return bandOf(Math.abs(px) / EYE_SPEED);
}

function nextSlower(name) {
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(name) + 1)];
}

function durationOf({ band = signed('band', 'gravity'), duration }) {
  return duration ?? bandSeconds(band);
}

const ms = (s) => Math.round(s * 1000);

// The fade finishes in the first 40% of the move, so the thing is there at once and then settles.
const FADE_SHARE = 0.4;

/** Pure: the keyframes and timing enter() hands to el.animate. */
export function enterSpecs({ at = 0, from = '0 0.5em', scale = 0.96, blur = 0, ease = signed('ease', 'land'), ...rest } = {}) {
  const d = durationOf(rest);
  const start = { translate: from, scale: String(scale) }, end = { translate: '0 0', scale: '1' };
  if (blur) {
    start.filter = `blur(${blur}px)`;
    end.filter = 'blur(0px)';
  }
  const timing = { delay: ms(at), easing: easeOf(ease), fill: 'both' };
  return [
    { keyframes: [start, end], timing: { ...timing, duration: ms(d), id: 'enter' } },
    { keyframes: [{ opacity: 0 }, { opacity: 1 }], timing: { ...timing, duration: ms(d * FADE_SHARE), id: 'enter-fade' } },
  ];
}

/** Arrive fast, land soft: opts { at, band | duration, from (a CSS translate), scale, blur (px), ease (an EASE name) }. */
export function enter(el, opts) {
  return enterSpecs(opts).map(({ keyframes, timing }) => el.animate(keyframes, timing));
}

/** Pure: an exit about 0.6 of `entrance` seconds, accelerating. Ends at `end` when given, else starts at `at`. */
export function leaveSpecs({ at, end, entrance, to = '0 -0.3em', blur = 0, ease = 'launch', ...rest } = {}) {
  const d = +(LEAVE_SHARE * (entrance ?? durationOf(rest))).toFixed(3);
  const start = end != null ? end - d : at ?? 0;
  const from = { translate: '0 0', opacity: 1 }, gone = { translate: to, opacity: 0 };
  if (blur) {
    from.filter = 'blur(0px)';
    gone.filter = `blur(${blur}px)`;
  }
  // forwards, never both: a backwards fill would cover the entrance's held end state before the exit starts
  return [{ keyframes: [from, gone], timing: { delay: ms(Math.max(0, start)), duration: ms(d), easing: easeOf(ease), fill: 'forwards', id: 'leave' } }];
}

/** Leaves faster than it came: 0.6 of the element's enter() when it has one. opts { at | end, to, blur, ease: 'launch' | 'leave' }. */
export function leave(el, opts = {}) {
  const came = (el.getAnimations ? el.getAnimations() : []).find((a) => a.id === 'enter');
  const entrance = opts.entrance ?? (came ? came.effect.getTiming().duration / 1000 : undefined);
  return leaveSpecs({ ...opts, entrance }).map(({ keyframes, timing }) => el.animate(keyframes, timing));
}

/** Pure: the start second of each of n items. Gaps sit in 30 to 80 ms, seeded jitter, and the run fits 0.5 s. */
export function staggerTimes(n, { at = 0, gap = signedGap(), seed = 1 } = {}) {
  const [lo, hi] = [Math.min(STAGGER.min, gap), Math.max(STAGGER.max, gap)];
  const fit = n > 1 ? Math.min(gap, STAGGER.total / (n - 1)) : gap;
  const rand = rng(seed);
  const times = [];
  let t = at;
  for (let i = 0; i < n; i++) {
    times.push(+t.toFixed(4));
    const step = fit * (1 + STAGGER.jitter * (rand() * 2 - 1));
    t += Math.min(hi, Math.max(lo, step));
  }
  return times;
}

// Every nth arrival (the nth, 2nth, ...) overshoots by about 6 per cent; the reference films overshoot 21 to 41 per cent of theirs.
const springs = (nudgeEvery, i, ease) => (nudgeEvery > 0 && (i + 1) % nudgeEvery === 0 ? 'nudge' : ease);

/** enter() on each element in order, on staggerTimes. opts: enter's, plus gap, seed and nudgeEvery (every nth element lands on EASE.nudge). */
export function stagger(els, { nudgeEvery = 0, ...opts } = {}) {
  const list = [...els];
  return staggerTimes(list.length, opts).flatMap((at, i) => enter(list[i], { ...opts, at, ease: springs(nudgeEvery, i, opts.ease) }));
}

/** Pure: when the secondary starts and which band it speaks in. It starts `overlap` of the lead's move before the lead lands. */
export function layerTiming({ at = 0, overlap = 0.3, band = signed('band', 'gravity'), duration, secondary = {} } = {}) {
  const lead = duration ?? bandSeconds(band);
  return { at: +(at + lead * (1 - overlap)).toFixed(4), band: secondary.band ?? nextSlower(band) };
}

/** A lead entrance and a quieter, slower secondary that overlaps it. secondary may be one element or a list. */
export function layer(main, secondary, opts = {}) {
  const { at, band } = layerTiming(opts);
  const second = { from: '0 0.25em', ...opts.secondary, at, band };
  const rest = typeof secondary.animate === 'function' ? enter(secondary, second) : stagger(secondary, second);
  return [...enter(main, opts), ...rest];
}

const keyHandle = (h, side) => (h && typeof h === 'object' && ('in' in h || 'out' in h) ? h[side] : h);

/** Pure: keyframes and timing for a key table [[t, value, handle?], ...] in seconds. A handle shapes both sides of its key, or { in, out } one each; none is linear. */
export function keysSpec(prop, table) {
  if (table.length < 2) throw new Error('keys: a table needs at least two keys');
  const [first, last] = [table[0][0], table[table.length - 1][0]];
  if (!(last > first)) throw new Error('keys: key times must increase');
  const keyframes = table.map(([t, value, handle], i) => {
    const frame = { offset: (t - first) / (last - first), [prop]: value };
    if (i < table.length - 1) {
      const out = keyHandle(handle, 'out'), into = keyHandle(table[i + 1][2], 'in');
      frame.easing = out == null && into == null ? 'linear' : linearOf(out, into);
    }
    return frame;
  });
  return { keyframes, timing: { delay: ms(first), duration: ms(last - first), fill: 'both' } };
}

/** One animation of `prop` through an After Effects key table: keys(el, 'translate', [[0, '0 0'], [0.6, '0 40px', 'easyEase'], [1.2, '0 0', { in: 'hang' }]]). */
export function keys(el, prop, table) {
  const { keyframes, timing } = keysSpec(prop, table);
  return el.animate(keyframes, timing);
}

// from and to are scales; drift also slides the frame by `slide` per cent of its size.
const CAMERA = {
  push: { from: 1, to: 1.12, ease: 'glide' },
  pull: { from: 1.15, to: 1, ease: 'settle' },
  drift: { from: 1, to: 1.03, ease: 'glide', slide: [-1.5, -0.8] },
};
const WHIP_BLUR_PX = 16;
const deeper = (scale, strength) => +(1 + (scale - 1) * strength).toFixed(4);
const percent = (x, y) => `${+x.toFixed(3)}% ${+y.toFixed(3)}%`;

function whipSpec({ kind, dir, travel, strength, ease }) {
  const out = kind === 'whipOut';
  const home = { translate: '0% 0%', filter: 'blur(0px)' };
  const gone = { translate: percent(-dir * travel * strength * (out ? 1 : -1), 0), filter: `blur(${WHIP_BLUR_PX * strength}px)` };
  return { keyframes: out ? [home, gone] : [gone, home], easing: easeOf(ease ?? (out ? 'launch' : 'land')) };
}

/**
 * Pure: the keyframes and timing of one camera move on a wrapper that holds a whole world.
 * kind push | pull | drift | whipOut | whipIn. opts { at, band | duration, from, to (scales), origin, strength, dir (1 or -1), travel (% of the frame) }.
 * `strength` is the depth of a layer: 1 is the camera, under 1 moves less (ground), over 1 moves more (front).
 */
export function cameraSpecs({ kind = 'push', at = 0, origin, strength = 1, dir = 1, travel = 100, ease, ...rest } = {}) {
  const timing = { delay: ms(at), fill: 'both', id: 'camera' };
  if (kind === 'whipOut' || kind === 'whipIn') {
    const { keyframes, easing } = whipSpec({ kind, dir, travel, strength, ease });
    return [{ keyframes, timing: { ...timing, easing, duration: ms(rest.duration ?? bandSeconds('energy')) } }];
  }
  const c = CAMERA[kind];
  if (!c) throw new Error(`presets: unknown camera "${kind}"; valid: ${[...Object.keys(CAMERA), 'whipOut', 'whipIn'].join(' ')}`);
  const frame = (scale, slide) => ({ scale: String(deeper(scale, strength)), ...(slide ? { translate: percent(slide[0] * strength, slide[1] * strength) } : {}), ...(origin ? { transformOrigin: origin } : {}) });
  const keyframes = [frame(rest.from ?? c.from, c.slide && [0, 0]), frame(rest.to ?? c.to, c.slide)];
  return [{ keyframes, timing: { ...timing, easing: easeOf(ease ?? c.ease), duration: ms(rest.duration ?? bandSeconds(rest.band ?? 'cinematic')) } }];
}

/** One camera move on one wrapper: camera(world, { kind: 'push', at: 1, duration: 2, origin: '34% 46%' }). A wrapper takes one scale animation at a time: chain moves with `from` set to where the last one ended. */
export function camera(el, opts) {
  return cameraSpecs(opts).map(({ keyframes, timing }) => el.animate(keyframes, timing));
}

/** The same camera move on ground, mid and front layers, each moving by its depth: parallax([[ground, 0.3], [mid, 1], [front, 1.8]], { kind: 'push', at: 1, duration: 2 }). */
export function parallax(layers, opts) {
  return layers.flatMap(([el, depth]) => camera(el, { ...opts, strength: depth }));
}

/** Pure: a blur that clears, optionally from smaller and fainter, on a settle that never overshoots. */
export function focusSpecs({ at = 0, blur = 10, scale = 1, opacity = 1, ease = 'settle', ...rest } = {}) {
  const d = durationOf({ band: 'cinematic', ...rest });
  const start = { filter: `blur(${blur}px)`, scale: String(scale), opacity: String(opacity) }, end = { filter: 'blur(0px)', scale: '1', opacity: '1' };
  return [{ keyframes: [start, end], timing: { delay: ms(at), duration: ms(d), easing: easeOf(ease), fill: 'both', id: 'focus' } }];
}

/** A focus pull: focus(far, { at: 1.4, blur: 8, scale: 0.85, opacity: 0.6 }) makes far words small and soft until the camera arrives, then resolves them. */
export function focus(el, opts) {
  return focusSpecs(opts).map(({ keyframes, timing }) => el.animate(keyframes, timing));
}
