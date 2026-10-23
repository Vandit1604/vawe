// studio/ui/page-eases.js: the named eases (core/motion/presets.js) as the studio reads and writes them.
// A name is the kebab form of EASE_VARS (land-soft). The same ease sits in a page in four forms:
//   css    var(--ease-land)            a CSS animation shorthand or animation-timing-function
//   code   EASE.land                   an element.animate easing, when the script imports EASE
//   curve  'linear(0, 0.2 ...)'        an element.animate easing, when it does not (WAAPI cannot resolve var())
//   name   'landSoft'                  a table that holds ease names
import { EASE_VARS } from '../../core/motion/presets.js';
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
  return NAMED.find((n) => EASE_VARS[n] === t) ?? null;
}

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
