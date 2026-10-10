// studio/ui/page-edit.js: turns one gesture (move a key, change a duration) into text edits at the source
// ranges studio/page-source.mjs reported. An edit is {start, end, expect, text}: replace [start, end),
// which must still read `expect`. Each helper returns an edit list, or null when the page's own source
// leaves no literal to change (the value is computed, or the option is not written).

export const fmt = (n, digits = 4) => String(+Number(n).toFixed(digits));
const replace = (lit, text) => ({ start: lit.start, end: lit.end, expect: lit.text, text });
const insert = (pos, text) => ({ start: pos, end: pos, expect: '', text });

const timeLike = (seconds, like) => (/ms$/.test(like) ? `${fmt(seconds * 1000, 1)}ms` : `${fmt(seconds, 3)}s`);
const quoted = (lit, text) => `${lit.text[0] === '"' ? '"' : "'"}${text}${lit.text[0] === '"' ? '"' : "'"}`;

export const moveTableKey = (entry, num) => [replace(entry.key, fmt(num))];
export const setTableValue = (entry, text) => [replace(entry.value, text)];
export const moveCssStop = (token, offset) => [replace(token, `${fmt(offset * 100, 2)}%`)];
export const moveCue = (cue, seconds) => (cue.at ? [replace(cue.at, fmt(seconds, 3))] : null);
export const moveSpectacle = (spec, seconds) => [replace(spec, fmt(seconds, 3))];
export const setVar = (v, text) => [replace(v, text)];
export const setText = (t, text) => [{ start: t.start, end: t.end, expect: t.raw, text: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }];

// field: 'duration' | 'delay' | 'easing'. value: seconds, or the easing text.
export function setCssTiming(rule, field, value) {
  const at = rule[field];
  if (field === 'easing') {
    if (at) return [replace(at, value)];
    return rule.insertAt ? [insert(rule.insertAt.end, ` ${value}`)] : null;
  }
  if (at) return [replace(at, timeLike(value, at.text))];
  if (field === 'delay' && rule.duration && rule.insertAt?.afterDuration != null) {
    return [insert(rule.duration.end, ` ${timeLike(value, rule.duration.text)}`)];
  }
  return null;
}

export const setAnimateOffset = (kf, offset) => (kf.offset ? [replace(kf.offset, fmt(offset))] : [insert(kf.insertAt, ` offset: ${fmt(offset)},`)]);

// field: 'duration' | 'delay' | 'easing'. value: milliseconds, or the easing text.
export function setAnimateOption(anim, field, value) {
  const o = anim.options;
  const text = field === 'easing' ? quoted(o.easing || { text: "'" }, value) : fmt(value, 1);
  if (o[field]) return [replace(o[field], text)];
  if (o.insertAt != null) return [insert(o.insertAt, ` ${field}: ${text},`)];
  return null;
}

export function cssToHex(css) {
  const el = document.createElement('i');
  el.style.color = css;
  document.body.append(el);
  const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
  el.remove();
  return `#${m.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
}

export const quoteLike = (lit, text) => (lit.text[0] === '"' || lit.text[0] === "'" ? quoted(lit, text) : text);
