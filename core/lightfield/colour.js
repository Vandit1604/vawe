// Colour helpers. Six-digit hex only, on purpose: one accepted form means one way to be wrong,
// and the validator can say exactly what it wanted.

const HEX = /^#[0-9a-fA-F]{6}$/;

export const isHex = (v) => typeof v === 'string' && HEX.test(v);

export function toRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
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

