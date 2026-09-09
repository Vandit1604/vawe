// theme-bg.mjs: the `bg` block every background preset reads (core/backgrounds.js), derived from a
// finished palette. Extracted from scripts/brand/theme-remix.mjs when a second theme WRITER appeared
// (harness/author/invent-look.mjs): two copies of this mapping is how a theme ends up rendering fine
// under `plain` and crashing under `spotlight`, because one copy forgot a key.
//
// BOTH grounds always exist, whatever the theme's dominance. A scene may pick ANY bg preset, and a
// dark preset reading P.deep[0] of a light-only block throws at render time rather than at author time.

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

/** bgBlock(palette, light) → the full theme.bg map. `light` is the theme's dominance. */
export function bgBlock(palette, light) {
  const lightGround = light ? [palette.bg, palette.bg2] : ['#ffffff', '#f4f5f8'];
  const darkA = light ? '#0f1620' : palette.bg;
  const darkGround = [darkA, darken(darkA, 0.35)];
  return {
    accent: rgbStr(palette.accent), tint: rgbStr(mix(palette.bg, palette.accent, 0.12)), tint2: rgbStr(mix(palette.bg, palette.accent, 0.22)),
    dotLight: rgbStr(palette.line),
    paperBase: lightGround, light: lightGround, paper: lightGround[0],
    softBase: [lighten(lightGround[0], 0.0), darken(lightGround[1], 0.02)],
    accentBase: [mix(lightGround[0], palette.accent, 0.08), lightGround[1]],
    border: palette.line,
    dark: darkGround, deep: [darkGround[0], darken(darkGround[0], 0.5)], ink: [darken(darkGround[0], 0.2), darken(darkGround[0], 0.6)],
    inkBase: darkGround, darkMesh: [mix(darkGround[0], palette.accent, 0.1), darkGround[1]],
  };
}
