// core/color/parse.js: string -> {r,g,b,a} object, the shape authoring tools want to read named
// channels off. Reuses the engine's one colour grammar (core/motion.js's parseColor/colorAlpha)
// rather than a second regex; this file only adds the alpha channel in one object and a THROW on
// garbage, which the engine's own parser deliberately skips (it returns null so a caller can fall
// back). This package refuses instead: a silent bad colour is the exact failure this engine avoids.
import { parseColor as parseColorRGB, colorAlpha } from '../motion.js';

/** parse(str): hex (#rgb/#rrggbb/#rgba/#rrggbbaa) or rgb()/rgba() -> {r,g,b,a}. Throws on garbage. */
export function parse(c) {
  const rgb = parseColorRGB(c);
  if (!rgb) throw new Error(`color.parse: not a colour: ${JSON.stringify(c)}`);
  const [r, g, b] = rgb;
  return { r, g, b, a: colorAlpha(c) };
}

/** format({r,g,b}): {r,g,b} -> "#rrggbb". Channels are rounded and clamped to 0..255 first. */
export function format({ r, g, b }) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** asColor(c): accept either a colour string or an already-parsed {r,g,b[,a]} object; always
 *  returns {r,g,b,a}. Every function below takes "colour-like" input through this, so a caller
 *  can pass a hex string OR a previous function's output without converting by hand. */
export function asColor(c) {
  return typeof c === 'string' ? parse(c) : { a: 1, ...c };
}
