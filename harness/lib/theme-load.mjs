import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';

export function expandThemeFile(raw) {
  return isTokenFile(raw) ? expandTheme(raw, { parseColor, colorAlpha }) : raw;
}
