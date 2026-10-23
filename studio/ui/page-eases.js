// studio/ui/page-eases.js: the named eases (core/motion/presets.js) as the studio reads and writes them.
// A name is the kebab form of EASE_VARS (land-soft). The same ease sits in a page in four forms:
//   css    var(--ease-land)            a CSS animation shorthand or animation-timing-function
//   code   EASE.land                   an element.animate easing, when the script imports EASE
//   curve  'linear(0, 0.2 ...)'        an element.animate easing, when it does not (WAAPI cannot resolve var())
//   name   'landSoft'                  a table that holds ease names
import { EASE_VARS, easeFn } from '../../core/motion/presets.js';
import { JOBS } from '../../core/motion/ease-jobs.js';

export const NAMED = Object.keys(EASE_VARS);

const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const unquote = (text) => text.trim().replace(/^(['"`])(.*)\1$/s, '$2');

/** The named ease a source text or a live easing string stands for, or null. */
export function easeNameOf(text, easeLocal = 'EASE') {
  const t = unquote(String(text ?? ''));
  const v = /^var\(--ease-([\w-]+)\)$/.exec(t)?.[1];
  if (v) return NAMED.includes(v) ? v : null;
  const code = new RegExp(`^${easeLocal}\\.(\\w+)$`).exec(t)?.[1];
  if (code) return NAMED.find((n) => camel(n) === code) ?? null;
  if (NAMED.includes(kebab(t))) return kebab(t);
  const stops = linearStops(t);
  return stops ? NAMED.find((n) => sameCurve(stops, linearStops(EASE_VARS[n]))) ?? null : null;
}

// A browser reads a live linear() back with every position spelled out, so compare the curves, not the text.
function linearStops(text) {
  const body = /^linear\((.*)\)$/s.exec(text.trim())?.[1];
  if (!body) return null;
  const stops = body.split(',').map((s) => { const [v, p] = s.trim().split(/\s+/); return { v: Number(v), p: p ? parseFloat(p) / 100 : null }; });
  stops[0].p ??= 0;
  stops[stops.length - 1].p ??= 1;
  stops.forEach((s, i) => {
    if (s.p != null) return;
    const lo = stops.slice(0, i).reverse().find((x) => x.p != null), hiAt = stops.findIndex((x, j) => j > i && x.p != null);
    s.p = lo.p + ((stops[hiAt].p - lo.p) * (i - stops.indexOf(lo))) / (hiAt - stops.indexOf(lo));
  });
  return stops;
}

function valueAt(stops, u) {
  const i = stops.findIndex((s) => s.p >= u);
  if (i <= 0) return stops[0].v;
  const [a, b] = [stops[i - 1], stops[i]];
  return b.p === a.p ? b.v : a.v + ((b.v - a.v) * (u - a.p)) / (b.p - a.p);
}

const sameCurve = (a, b) => Array.from({ length: 21 }, (_, i) => i / 20).every((u) => Math.abs(valueAt(a, u) - valueAt(b, u)) < 0.002);

/** The source text that sets ease `name` at an edit target: kind css | animate | name. `lit` is the literal it replaces. */
export function easeSource(name, kind, { easeLocal = null, lit = null } = {}) {
  if (kind === 'css') return `var(--ease-${name})`;
  if (kind === 'animate') return easeLocal ? `${easeLocal}.${camel(name)}` : `'${EASE_VARS[name]}'`;
  const q = lit && /^["']/.test(lit.text) ? lit.text[0] : "'";
  return `${q}${camel(name)}${q}`;
}

/** The jobs an ease is for, e.g. "exit" or "title, panel, also stagger": the one table in core/motion/ease-jobs.js. */
export function easeHint(name) {
  const own = JOBS.filter((j) => j.ease === name).map((j) => j.id);
  const alt = JOBS.filter((j) => j.also?.includes(name)).map((j) => j.id);
  if (!own.length && !alt.length) return 'no job in the table';
  return [own.join(', '), alt.length ? `also ${alt.join(', ')}` : ''].filter(Boolean).join(', ');
}

/** The menu: every named ease with its hint, then the page's own current value when it is not one of them. */
export function easeOptions(current) {
  const cur = unquote(String(current ?? '')) || 'linear';
  const named = easeNameOf(cur);
  const options = NAMED.map((name) => ({ value: name, label: `${name}: ${easeHint(name)}`, selected: name === named }));
  if (!named) options.unshift({ value: cur, label: `${cur.length > 28 ? `${cur.slice(0, 25)}...` : cur} (not a named ease)`, selected: true, custom: true });
  return options;
}

/** A hue per ease, so the same ease reads as the same colour down the timeline. */
export const easeHue = (name) => (NAMED.indexOf(name) * 360) / NAMED.length;

const SIZE = { w: 72, h: 30, pad: 3 };

/** `n + 1` points [u, ease(u)] of a named ease, from easeFn: the same curve the page's seek functions run. */
export function curveSamples(name, n = 60) {
  const f = easeFn(camel(name));
  return Array.from({ length: n + 1 }, (_, i) => [i / n, f(i / n)]);
}

/** The value range a plot must cover: 0 to 1, wider when the ease overshoots or undershoots. */
export const curveRange = (samples) => ({ lo: Math.min(0, ...samples.map((s) => s[1])), hi: Math.max(1, ...samples.map((s) => s[1])) });

/** Where progress `u` and value `v` fall in a plot of the given range: x runs with u, y is flipped so up is more. */
export function plotAt(u, v, { lo, hi }, { w, h, pad } = SIZE) {
  return [pad + u * (w - 2 * pad), pad + ((hi - v) / (hi - lo)) * (h - 2 * pad)];
}

export const curvePath = (samples, size = SIZE) => {
  const range = curveRange(samples);
  return samples.map(([u, v], i) => `${i ? 'L' : 'M'}${plotAt(u, v, range, size).map((n) => n.toFixed(1)).join(' ')}`).join('');
};

/** Progress 0 to 1 of a loop that runs `durationS`, then holds `holdS`, from a clock in seconds. */
export const loopProgress = (nowS, durationS, holdS = 0.5) => Math.min(1, (nowS % (durationS + holdS)) / durationS);
