// core/color/hsl.js: RGB <-> HSL, hand-rolled (the standard cylindrical transform: max/min channel
// gives lightness, chroma gives saturation, and hue comes off which channel led). Operates on sRGB
// bytes directly, same convention as CSS hsl(), not gamma-aware like mix.js.
import { asColor } from './parse.js';

/** toHsl(color): -> {h: 0..360, s: 0..100, l: 0..100}. Accepts a hex/rgb() string or {r,g,b}. */
export function toHsl(color) {
  let { r, g, b } = asColor(color);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

/** fromHsl({h,s,l}): -> {r,g,b}, 0..255. Inverse of toHsl. */
export function fromHsl({ h, s, l }) {
  h = (((h % 360) + 360) % 360) / 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hue(h + 1 / 3) * 255),
    g: Math.round(hue(h) * 255),
    b: Math.round(hue(h - 1 / 3) * 255),
  };
}
