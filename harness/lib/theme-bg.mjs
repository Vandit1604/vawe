
const hx = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export function parseHex(c) {
  const m = String(c).trim().replace('#', '');
  const s = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
export const toHex = ([r, g, b]) => `#${hx(r)}${hx(g)}${hx(b)}`;
export const mix = (a, b, t) => { const A = parseHex(a), B = parseHex(b); return toHex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t)); };
export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#000000', t);
export const rgbStr = (c) => parseHex(c).join(',');
export const relLum = (c) => { const s = parseHex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.114 * s[2]; };
export const contrast = (a, b) => { const L1 = relLum(a), L2 = relLum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };

// `bgBlock(palette, light)`, which built the full `theme.bg` map by hand, is retired along with the
// field it fed: `core/backgrounds/palette.js` `bgPaletteFrom(palette)` derives the same shape from a
// theme's own tokens/roles, and `core/theme/roles.js` refuses a theme that still writes `bg` by hand
// (RETIRED_FIELDS). A theme with an opinion the derivation does not reproduce sets `look.bgPalette`.
