// Motion defaults for pages: enter, leave, stagger and layer as Web Animations the renderer seeks.
// Times in options are seconds; WAAPI timing is milliseconds. The *Specs functions are pure; the
// verbs only call el.animate on what they return.
import { curveToLinear, rng } from './springs.js';
import { handleCurve } from './motion.js';

// engine-doctrine/RULES/speed-bands.md, seconds
export const BANDS = {
  energy: [0.15, 0.3],
  professional: [0.3, 0.5],
  gravity: [0.5, 0.8],
  cinematic: [0.8, 2.0],
};
const ORDER = Object.keys(BANDS);

// The median followed move in 135 library scenes (engine-doctrine/MOTION-CRAFT.md, speed numbers).
const EYE_SPEED = 700;
const LEAVE_SHARE = 0.6;
const STAGGER = { gap: 0.05, min: 0.03, max: 0.08, total: 0.5, jitter: 0.25 };

// After Effects handle pairs [out, in] of one segment, named by what the move does (core/motion/README.md).
// A handle is a name from HANDLE_REGISTRY or { influence, speed }.
export const EASE_HANDLES = {
  land: ['fling', 'hang'],
  settle: ['long', 'long'],
  swap: ['hang', 'hang'],
  glide: ['easyEase', { influence: 33, speed: 0.1 }],
  carry: ['easyEase', 'fling'],
  leave: ['easyEase', 'long'],
  launch: ['easyEase', 'fling'],
};

const LINEAR_TOLERANCE = 0.002;
const linearOf = (out, into) => curveToLinear(handleCurve(out, into), { tolerance: LINEAR_TOLERANCE });

/** The named eases as CSS linear() strings for `easing:`. */
export const EASE = Object.fromEntries(Object.entries(EASE_HANDLES).map(([name, [out, into]]) => [name, linearOf(out, into)]));

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

function durationOf({ band = 'gravity', duration }) {
  return duration ?? bandSeconds(band);
}

const ms = (s) => Math.round(s * 1000);

// The fade finishes in the first 40% of the move, so the thing is there at once and then settles.
const FADE_SHARE = 0.4;

/** Pure: the keyframes and timing enter() hands to el.animate. */
export function enterSpecs({ at = 0, from = '0 0.5em', scale = 0.96, blur = 0, ease = 'land', ...rest } = {}) {
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
export function staggerTimes(n, { at = 0, gap = STAGGER.gap, seed = 1 } = {}) {
  const fit = n > 1 ? Math.min(gap, STAGGER.total / (n - 1)) : gap;
  const rand = rng(seed);
  const times = [];
  let t = at;
  for (let i = 0; i < n; i++) {
    times.push(+t.toFixed(4));
    const step = fit * (1 + STAGGER.jitter * (rand() * 2 - 1));
    t += Math.min(STAGGER.max, Math.max(STAGGER.min, step));
  }
  return times;
}

/** enter() on each element in order, on staggerTimes. opts: enter's, plus gap and seed. */
export function stagger(els, opts = {}) {
  const list = [...els];
  return staggerTimes(list.length, opts).flatMap((at, i) => enter(list[i], { ...opts, at }));
}

/** Pure: when the secondary starts and which band it speaks in. It starts `overlap` of the lead's move before the lead lands. */
export function layerTiming({ at = 0, overlap = 0.3, band = 'gravity', duration, secondary = {} } = {}) {
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
