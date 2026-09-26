import { expandTheme } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';

export function expandThemeFile(raw) {
  return expandTheme(raw, { parseColor, colorAlpha });
}
