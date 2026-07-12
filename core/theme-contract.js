// theme-contract.js — the look a theme MUST fully define. There are no fallback look values
// anywhere in the engine: tokens.css registers fonts + geometry only, and every color/font the
// scene consumes comes from the theme. A theme missing any required key fails LOUD (at
// `make validate` and again at boot) instead of rendering a wrong-looking video.
// Pure data + one pure function — importable from node (validate) and the browser (lib.js) alike.

export const REQUIRED = {
  palette: ['bg', 'bg2', 'surface', 'surface2', 'line', 'lineStrong',
    'text', 'text2', 'dim', 'ink', 'accent', 'accentDim', 'accentGlow', 'up', 'down'],
  type: ['sans', 'num', 'serif', 'mono'], // a brand without a serif maps serif to its sans — explicitly
  gradientStops: 3,                        // bg presets + --g0/1/2 consumers
};

// themeErrors(theme) → [] when complete, else a list of missing keys (human-readable).
export function themeErrors(theme) {
  if (!theme || typeof theme !== 'object') return ['data.theme is required (a name or an inline object) — there is no default look'];
  const errs = [];
  const P = theme.palette || {}, T = theme.type || {};
  for (const k of REQUIRED.palette) if (P[k] == null || P[k] === '') errs.push(`palette.${k}`);
  for (const k of REQUIRED.type) if (typeof T[k] !== 'string' || !T[k]) errs.push(`type.${k}`);
  if (!Array.isArray(theme.gradient) || theme.gradient.length < REQUIRED.gradientStops)
    errs.push(`gradient (needs ${REQUIRED.gradientStops} stops)`);
  return errs;
}
