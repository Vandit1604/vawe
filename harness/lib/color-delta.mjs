// harness/lib/color-delta.mjs: CSS colour strings to hex, and the perceptual distance between two colours.
// dE is CIE76 in Lab (D65): 2 is a difference nobody sees, about 10 a viewer sees side by side, 20+ is another colour.
import { parseColor, colorAlpha, srgbToLinear } from '../../core/color/index.js';

const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** A computed CSS colour ("rgb(37, 99, 235)", "rgba(...)", "#2563eb") to { hex, alpha }, or null. */
export function cssColor(str) {
  const rgb = parseColor(str);
  return rgb ? { hex: toHex(rgb), alpha: colorAlpha(str) } : null;
}

function lab(hex) {
  const [r, g, b] = parseColor(hex).map(srgbToLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function deltaE(hexA, hexB) {
  const a = lab(hexA), b = lab(hexB);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
