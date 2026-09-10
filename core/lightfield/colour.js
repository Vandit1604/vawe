// Colour helpers. Six-digit hex only, on purpose: one accepted form means one way to be wrong,
// and the validator can say exactly what it wanted.

import { parseColorRGB } from '../color/engine.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

export const isHex = (v) => typeof v === 'string' && HEX.test(v);

// A NARROW wrapper over the engine's one parser (core/motion.js), not a fifth grammar. The shared
// parser also reads #rgb, #rgba, #rrggbbaa and rgb(), and this file deliberately reads none of
// them: the reason in the header still holds, so the gate stays here and only the maths is shared.
// options.js already rejects anything non-hex with a message naming the field, so a throw here is a
// backstop that should never fire, and it fires loudly rather than returning NaN channels, which
// is how a bad lightfield colour used to reach a gradient string as "rgba(NaN,NaN,NaN,1)".
export function toRgb(hex) {
  if (!isHex(hex)) throw new Error(`lightfield colour: expected a 6-digit hex like "#ee7c56". Got ${JSON.stringify(hex)}.`);
  return parseColorRGB(hex);
}

// A CSS rgba() string from a hex plus an alpha. Alpha is rounded so output text is stable.
export function rgba(hex, alpha) {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r},${g},${b},${Number(alpha.toFixed(3))})`;
}

// The same colour at zero alpha. Safari renders `transparent` as transparent BLACK inside a
// gradient, which greys every ramp. Always fade a colour to its own zero-alpha form.
export const fade = (hex) => rgba(hex, 0);

// Mix two hex colours. t = 0 gives a, t = 1 gives b.
export function mix(a, b, t) {
  const x = toRgb(a);
  const y = toRgb(b);
  const c = (p, q) => Math.round(p + (q - p) * t);
  const h = (v) => v.toString(16).padStart(2, '0');
  return `#${h(c(x.r, y.r))}${h(c(x.g, y.g))}${h(c(x.b, y.b))}`;
}

