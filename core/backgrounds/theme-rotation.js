// core/backgrounds/theme-rotation.js: widens the ALREADY-OPT-IN `bg:[{use:"theme"}]` door
// (formats/scene/scene.js) so a jointed film gets the brand's own backdrop ROTATION, one window per
// shot, instead of one flat window for the whole runtime.
//
// Measured across formats/scene/: 85 of 119 films (71%) paint exactly one bg window for the whole
// film. The fix is NOT the engine choosing a different preset per shot (that is exactly the mistake
// engine-doctrine/MISTAKES.md #159 names: "the engine PICKED the background, so nobody ever designed one again",
// which is why `bg` stays a REQUIRED authoring field, core/engine/produce.js). It is applying a
// decision the THEME already made, only when the author explicitly asked for the theme's own backdrop
// (`use:"theme"`) and only across the joints the film itself already declared.
//
// `theme.look.backdrop` is NOT this rotation, on purpose: engine-doctrine/CRAFT/THEME-LOOK.md and
// core/registry/theme-contract.js both say three times over that `look.backdrop` is scaffold-only and
// never read at render. `theme.bgDefault` is the one field already documented as "the one engine-owned
// bg default" and already read at render (scene.js's `use:"theme"` branch); this file only teaches that
// SAME field to hold an ARRAY (a rotation) as well as the single spec it always could.

import { shotWindows } from '../timeline/junctions.js';

/**
 * expandThemeRotation(bg, theme, table, duration) → the `bg` array a film actually renders.
 *
 * Expands ONLY when every one of these holds:
 *   - `bg` is exactly one window (no rotation was already authored by hand)
 *   - that window is `{use:"theme"}` with no `from`/`to` of its own (nothing to override)
 *   - `theme.bgDefault` is an array of 2+ specs (the brand declared a rotation, not one backdrop)
 *   - the film has 2+ shots (`shotWindows`, core/timeline/junctions.js): a jointless film has nowhere
 *     for a second window to live, so it stays one shot, which is a true answer, not a fallback
 *
 * Any other shape passes `bg` through untouched: an authored-windows film, a jointless film, and a
 * theme with a single `bgDefault` all render exactly as they did before this existed.
 */
export function expandThemeRotation(bg, theme, table, duration) {
  if (!Array.isArray(bg) || bg.length !== 1) return bg;
  const w = bg[0];
  if (!w || w.use !== 'theme' || w.from != null || w.to != null) return bg;
  const rotation = theme && theme.bgDefault;
  if (!Array.isArray(rotation) || rotation.length < 2) return bg;
  const shots = shotWindows(table, duration);
  if (shots.length < 2) return bg;
  return shots.map((_, i) => ({ ...rotation[i % rotation.length] }));
}
