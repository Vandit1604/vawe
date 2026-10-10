// harness/lib/color-delta.mjs: CSS colour strings to hex, and the perceptual distance between two colours.
// dE is CIE76 in Lab (D65): 2 is a difference nobody sees, about 10 a viewer sees side by side, 20+ is another colour.
import { parseColor, colorAlpha } from '../../core/color/index.js';
import { deltaE as labDistance, labOf } from './ref-measure/colour.mjs';

const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** A computed CSS colour ("rgb(37, 99, 235)", "rgba(...)", "#2563eb") to { hex, alpha }, or null. */
export function cssColor(str) {
  const rgb = parseColor(str);
  return rgb ? { hex: toHex(rgb), alpha: colorAlpha(str) } : null;
}

export function deltaE(hexA, hexB) {
  return labDistance(labOf(parseColor(hexA)), labOf(parseColor(hexB)));
}
