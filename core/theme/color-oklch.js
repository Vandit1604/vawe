// core/theme/color-oklch.js: OKLCH <-> sRGB, the one place this engine converts a perceptual colour
// (Bjorn Ottosson's OKLab, https://bottosson.github.io/posts/oklab/) into the hex strings
// core/color/engine.js's parseColor already understands. Pure math, no imports, node+browser safe,
// same purity contract as core/registry/theme-contract.js (see that file's header).
//
// WHY THIS EXISTS: a theme token may be authored `"oklch(0.7 0.12 250)"` because OKLCH mixes and scales
// PERCEPTUALLY (a token-derived tint stays a believable colour at any lightness); nothing downstream of
// the theme (shaders, backgrounds, `parseColor`) reads OKLCH, so it is normalised to a hex string here,
// at the one seam between "how a designer writes a colour" and "how the engine consumes one".

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// linear sRGB [0..1] -> OKLab [L,a,b]
function linearToOklab([r, g, b]) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

// OKLab [L,a,b] -> linear sRGB [0..1]
function oklabToLinear([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

export function rgbToOklab([r, g, b]) {
  return linearToOklab([srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)]);
}

export function oklabToRgb(lab) {
  return oklabToLinear(lab).map((c) => Math.round(clamp01(linearToSrgb(c)) * 255));
}

const toLch = ([L, a, b]) => [L, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI];
const toLab = ([L, C, H]) => [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];

export function rgbToOklch(rgb) { return toLch(rgbToOklab(rgb)); }
export function oklchToRgb(lch) { return oklabToRgb(toLab(lch)); }

// parseOklch("oklch(0.7 0.12 250)" | "oklch(70% 0.12 250)" | "... / 0.5") -> [r,g,b] 0-255, or null.
// The alpha channel (after "/") is accepted syntactically and dropped, same posture as parseColor's own
// rgba() branch (core/color/engine.js): a caller that needs alpha reads the source string itself.
const OKLCH_RE = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+%?\s*)?\)$/i;
export function parseOklch(s) {
  const m = OKLCH_RE.exec(String(s ?? '').trim());
  if (!m) return null;
  const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const C = parseFloat(m[2]), H = parseFloat(m[3]);
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(H)) return null;
  return oklchToRgb([L, C, H]);
}

const toHex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export const rgbToHex = ([r, g, b]) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;

// normalizeColor(raw, {parseColor}): any colour grammar this engine accepts (hex, rgb()/rgba(), OKLCH)
// -> a canonical colour string parseColor/colorAlpha already understand: "#rrggbb" when opaque,
// "rgba(r,g,b,a)" when it carries a real alpha (accentDim/accentGlow, every shipped theme, e.g.
// themes/vawe.json's "rgba(37,99,235,0.10)"). Returns null, never throws: the caller (tokens.js) is the
// one place a bad colour becomes a message, per the fail-loud-at-the-write-site rule this repo follows
// everywhere (core/registry/theme-contract.js's own header).
//
// ALPHA IS PRESERVED, NOT DROPPED: parseColor's own contract drops it (its callers all want opaque
// channels), but this is the WRITE path for a theme value blocks consume as `rgba(...)`, and rounding
// that to an opaque hex would visibly change every translucent chip and glow a theme declares.
export function normalizeColor(raw, { parseColor, colorAlpha } = {}) {
  if (typeof raw !== 'string') return null;
  const viaEngine = parseColor ? parseColor(raw) : null;
  const rgb = viaEngine || parseOklch(raw);
  if (!rgb) return null;
  const a = colorAlpha ? colorAlpha(raw) : 1;
  return a < 1 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})` : rgbToHex(rgb);
}

// mix(a, b, t, {parseColor}): perceptual mix in OKLab, t=0 -> a, t=1 -> b. This is the "OKLCH mixing"
// every derived, undeclared legacy palette key (bg2, line, text2, dim, ...) uses (core/theme/roles.js):
// a straight hex/RGB lerp drifts hue on the way between two saturated colours, OKLab does not.
export function mix(a, b, t, { parseColor } = {}) {
  const ca = normalizeColor(a, { parseColor }), cb = normalizeColor(b, { parseColor });
  if (!ca || !cb) return null;
  const rgbA = parseColor(ca), rgbB = parseColor(cb);
  const labA = rgbToOklab(rgbA), labB = rgbToOklab(rgbB);
  const lerped = labA.map((v, i) => v + (labB[i] - v) * t);
  return rgbToHex(oklabToRgb(lerped));
}

// withAlpha(hex, a, {parseColor}) -> "rgba(r,g,b,a)", the shape every shipped theme already writes for
// accentDim/accentGlow (e.g. themes/vawe.json: "rgba(37,99,235,0.10)").
export function withAlpha(hex, a, { parseColor } = {}) {
  const rgb = parseColor ? parseColor(hex) : null;
  if (!rgb) return null;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}
