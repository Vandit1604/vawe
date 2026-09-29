// core/color/mix.js: blend colours in LINEAR light, not naive sRGB averaging. sRGB bytes are
// gamma-encoded, so lerping them directly darkens the midpoint: white/black at t=0.5 comes out
// #808080, a full stop darker than it should read. Converting to linear, blending, converting
// back keeps the perceived midpoint honest (white/black at t=0.5 is ~#bcbcbc). This is the same
// class of bug the WCAG threshold in linear.js exists to fix, applied to blending instead of contrast.
import { srgbToLinear, linearToSrgb } from './linear.js';
import { asColor } from './parse.js';

/** mix(a, b, t): blend two colours in linear light. t=0 -> a, t=1 -> b. Returns {r,g,b}. */
export function mix(a, b, t) {
  const ca = asColor(a), cb = asColor(b);
  const lerp = (ch) => linearToSrgb(srgbToLinear(ca[ch]) + (srgbToLinear(cb[ch]) - srgbToLinear(ca[ch])) * t);
  return { r: lerp('r'), g: lerp('g'), b: lerp('b') };
}

/** lighten(c, amt): mix toward white in linear light. amt is 0..1. */
export function lighten(c, amt) { return mix(c, { r: 255, g: 255, b: 255 }, amt); }

/** darken(c, amt): mix toward black in linear light. amt is 0..1. */
export function darken(c, amt) { return mix(c, { r: 0, g: 0, b: 0 }, amt); }

/** withAlpha(c, a): a colour plus an alpha channel, 0..1. Returns {r,g,b,a}. */
export function withAlpha(c, a) { const { r, g, b } = asColor(c); return { r, g, b, a }; }
