// theme-contract.js — the look a theme MUST fully define. There are no fallback look values
// anywhere in the engine: tokens.css registers fonts + geometry only, and every color/font the
// scene consumes comes from the theme. A theme missing any required key fails LOUD (at
// `make validate` and again at boot) instead of rendering a wrong-looking video.
// Pure data + one pure function — importable from node (validate) and the browser (motion.js/boot.js) alike.

export const REQUIRED = {
  palette: ['bg', 'bg2', 'surface', 'surface2', 'line', 'lineStrong',
    'text', 'text2', 'dim', 'ink', 'accent', 'accentDim', 'accentGlow', 'up', 'down'],
  type: ['sans', 'num', 'serif', 'mono'], // a brand without a serif maps serif to its sans — explicitly
  gradientStops: 3,                        // bg presets + --g0/1/2 consumers
};

// themeErrors(theme) → [] when complete, else a list of missing keys (human-readable).
// THE COLOUR CHECK IS INJECTED, NOT IMPORTED. This module is deliberately pure data plus one pure
// function (see the header) so node and the browser can both take it, and importing core/motion.js for
// `parseColor` would end that. Re-implementing a hex parser here would be worse still: a second colour
// parser is a second thing to drift, which is the failure this whole pass exists to remove. So the
// caller hands its own parser in — the createKit(ctx) shape the layer builders already use.
//
// Without it the check is presence-only, exactly as before, so no existing caller changes behaviour.
// WITH it, a palette value that is not a colour is refused where it is WRITTEN, instead of becoming
// pure black in `parseColor(hex) || [0,0,0]` (core/backgrounds.js) and rendering an off-brand backdrop
// with every gate green.
export function themeErrors(theme, { parseColor } = {}) {
  if (!theme || typeof theme !== 'object') return ['data.theme is required (a name or an inline object) — there is no default look'];
  const errs = [];
  const P = theme.palette || {}, T = theme.type || {};
  // A NON-EMPTY STRING IS NOT A COLOUR. This checked only presence, so a typo'd hex ("#0ea5e", seven
  // digits) passed clean and then `parseColor(hex) || [0,0,0]` in core/backgrounds.js turned every mix
  // built from it into PURE BLACK — a background visibly off-brand, with every gate green. The value is
  // consumed as a colour, so it is validated as one here, where it is written.
  for (const k of REQUIRED.palette) {
    if (P[k] == null || P[k] === '') { errs.push(`palette.${k}`); continue; }
    if (parseColor && parseColor(P[k]) == null) errs.push(`palette.${k} is not a colour (${JSON.stringify(P[k])})`);
  }
  for (const k of REQUIRED.type) if (typeof T[k] !== 'string' || !T[k]) errs.push(`type.${k}`);
  if (!Array.isArray(theme.gradient) || theme.gradient.length < REQUIRED.gradientStops)
    errs.push(`gradient (needs ${REQUIRED.gradientStops} stops)`);
  return errs;
}
