// core/color/linear.js: sRGB <-> linear light conversion, plus WCAG relative luminance/contrast.
// srgbToLinear/linearToSrgb/relativeLuminance are hand-rolled here because core/motion.js's own
// copy of this maths (inside isLightBg) is a private, unexported closure. contrastRatio and
// readableOn are NOT a second implementation of the WCAG threshold: they delegate to
// core/motion.js's canonical contrastRatio/isLightBg, so a colour never grades differently twice.
import { contrastRatio as engineContrastRatio, isLightBg as engineIsLightBg } from '../motion.js';
import { asColor } from './parse.js';

/** srgbToLinear(v): one 0..255 sRGB channel -> 0..1 linear light (IEC 61966-2-1). */
export function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** linearToSrgb(v): one 0..1 linear channel -> 0..255 sRGB. Inverse of srgbToLinear. */
export function linearToSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

/** relativeLuminance(color): WCAG relative luminance, 0 (black) .. 1 (white). Accepts a hex/rgb()
 *  string or a {r,g,b} object. */
export function relativeLuminance(color) {
  const { r, g, b } = asColor(color);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

const toArr = (c) => { const { r, g, b } = asColor(c); return [r, g, b]; };

/** contrastRatio(a, b): WCAG contrast ratio between two colours, 1..21. */
export function contrastRatio(a, b) { return engineContrastRatio(toArr(a), toArr(b)); }

/** readableOn(bg): the ink with higher contrast on this background, '#000000' or '#ffffff'. */
export function readableOn(bg) { return engineIsLightBg(toArr(bg)) ? '#000000' : '#ffffff'; }
