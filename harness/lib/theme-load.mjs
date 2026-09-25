// harness/lib/theme-load.mjs: expandThemeFile(raw), the one-line adapter every Node script that reads a
// themes/*.json file off disk needs now that a theme is a token store (core/theme/tokens.js,
// core/theme/roles.js), not a hand-written palette/type/gradient object. Old-format input (or an
// object that already looks resolved) passes through unchanged.
import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';

export function expandThemeFile(raw) {
  return isTokenFile(raw) ? expandTheme(raw, { parseColor, colorAlpha }) : raw;
}
