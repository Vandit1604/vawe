// core/backgrounds/palette.js: the palette a preset paints WITH. PAL_PLINTH is the built-in default
// (plinthai.xyz's real CSS tokens); bgPaletteFrom(palette) derives the same shape out of a theme's own
// colours pack so one colours-pack reskins every preset (the universal brand rule).
import { parseColor, isLightBg } from '../motion.js';

// PAL_PLINTH. The REAL plinthai.xyz palette (from CSS tokens). WHITE-dominant: paper #fff /
// surface #f4f4f1 · ink #181815 · accent #1f3bff · accentSoft #ebedff · border #e6e6e1 · muted #6e6e68.
export const PAL_PLINTH = {
  accent: '31,59,255', tint: '110,110,104', tint2: '31,59,255', dotLight: '150,150,142',
  // light-first bases (paper): the MAIN look
  paperBase: ['#ffffff', '#f4f4f1'], softBase: ['#eef0ff', '#e6e9ff'], accentBase: ['#2946ff', '#1631d6'],
  inkBase: ['#232320', '#161613'], border: '#e6e6e1',
  // legacy dark bases (kept for the dark presets / other brands)
  dark: ['#3b43a6', '#262c72'], darkMesh: ['#3f47a2', '#2a3070'], deep: ['#333a80', '#242a63'],
  light: ['#ffffff', '#f4f4f1'], ink: ['#2f37a8', '#242a72'], paper: '#ffffff',
};
export const PAL = PAL_PLINTH; // back-compat

// bgPaletteFrom(palette): build the background palette OUT OF the theme's own palette.
//
// WHY THIS EXISTS. The presets are palette-driven so that one colours-pack reskins every background,
// and most themes in this repo hand-author a `bg` block to supply it. A theme that does not falls
// through to `PAL_PLINTH` (one specific brand's blue), including `default`, the theme an author gets
// when they declare nothing. Reaching for the defaults gave you another brand's colours (docs/MISTAKES.md #352).
//
// Derived, not hand-written, because themes/default.json's own note says "Copy this file to start a
// new brand kit". A second palette that must be kept in sync with the first is a palette that drifts.
// A theme may still declare `bg` explicitly and it wins; this is only the floor.
const _rgb = (hex) => parseColor(hex) || [0, 0, 0];
const _hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const _mix = (a, b, t) => { const x = _rgb(a), y = _rgb(b); return _hex(x.map((v, i) => v + (y[i] - v) * t)); };
const _s = (hex) => _rgb(hex).join(',');

export function bgPaletteFrom(palette) {
  const p = palette;
  if (!p || !p.bg || !p.text || !p.accent) return null;   // not a palette we can read; caller falls back
  const accent = p.accent, text = p.text, bg = p.bg;
  const bg2 = p.bg2 || bg, surface = p.surface || bg2, surface2 = p.surface2 || surface;
  const light = isLightBg(bg);
  // The DARK end and the LIGHT end of the theme, whichever way round the theme itself is. A light
  // theme still needs somewhere for `dark`/`deep`/`ink` to go, and a dark theme still needs `paper`
  // to be paper. The preset names describe the FIELD, not the brand's dominance.
  const deepEnd = light ? (p.ink || p.text) : bg;
  const paleEnd = light ? bg : text;
  return {
    accent: _s(accent),
    tint: _s(p.text2 || text),
    tint2: _s(p.accent2 || accent),
    dotLight: _s(p.dim || p.text2 || text),
    // dark bases, from the theme's own shadows
    inkBase: [light ? _mix(deepEnd, accent, 0.06) : surface, deepEnd],
    dark: [light ? _mix(deepEnd, paleEnd, 0.08) : bg2, deepEnd],
    deep: [deepEnd, _mix(deepEnd, '#000000', 0.45)],
    darkMesh: [_mix(light ? deepEnd : surface, accent, 0.12), light ? deepEnd : bg2],
    ink: [_mix(light ? deepEnd : surface, accent, 0.07), deepEnd],
    // light bases: paper is paper on any theme
    paperBase: [paleEnd, _mix(paleEnd, deepEnd, 0.05)],
    light: [paleEnd, _mix(paleEnd, deepEnd, 0.05)],
    softBase: [_mix(paleEnd, accent, 0.10), _mix(paleEnd, accent, 0.04)],
    accentBase: [accent, _mix(accent, deepEnd, 0.42)],
  };
}
