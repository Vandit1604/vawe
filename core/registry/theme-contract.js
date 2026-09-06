// theme-contract.js: the look a theme MUST fully define. There are no fallback look values
// anywhere in the engine: tokens.css registers fonts + geometry only, and every color/font the
// scene consumes comes from the theme. A theme missing any required key fails LOUD (at
// `make validate` and again at boot) instead of rendering a wrong-looking video.
// Pure data + one pure function: importable from node (validate) and the browser (motion.js/boot.js) alike.

export const REQUIRED = {
  palette: ['bg', 'bg2', 'surface', 'surface2', 'line', 'lineStrong',
    'text', 'text2', 'dim', 'ink', 'accent', 'accentDim', 'accentGlow', 'up', 'down'],
  type: ['sans', 'num', 'serif', 'mono'], // a brand without a serif maps serif to its sans, explicitly
  gradientStops: 3,                        // bg presets + --g0/1/2 consumers
};

// The floor an override has to clear. WCAG AA for body text; an `--on-*` ink exists to be READ.
export const ON_INK_MIN = 4.5;

// `palette.warn` is NOT in REQUIRED.palette: boot.js defaults it, because no brand has to hold an
// opinion about amber. The default lives HERE rather than in boot.js so the writer and the validator
// grade `palette.onWarn` against the same fill; a second copy in boot.js is a second thing to drift.
export const WARN_DEFAULT = '#F6A417';

// THE STATUS FILLS A BLOCK PUTS TEXT ON, and the palette key that overrides the ink for each.
// `--on-accent` was the first, and the hole it named is not specific to the accent: `--up`, `--down`
// and `--warn` are fills too, and white on `--up` measures 2.5:1 on linear and 1.25:1 on higgsfield.
// A block only ever holds `var(--up)`, a string with no value until the browser resolves it, so the
// choice cannot be made in a factory. It is made here, once per theme, from the theme's own colour.
// One table so nothing enumerates these four twice: boot.js writes off it, themeErrors grades off it.
export const ON_INK = [
  { on: 'onAccent', fill: 'accent', cssVar: '--on-accent' },
  { on: 'onUp', fill: 'up', cssVar: '--on-up' },
  { on: 'onDown', fill: 'down', cssVar: '--on-down' },
  { on: 'onWarn', fill: 'warn', cssVar: '--on-warn', fallback: WARN_DEFAULT },
];

// ON_INK IS OUR OWN DATA, and that is the one place a wrong name can live forever: no author will ever
// type `fill: 'upp'` and report it. So the table is checked against the contract at IMPORT, and neither
// the writer nor the validator below ever has to answer a wrong name with a default, they answer only
// ABSENCE, which is the line scripts/gates/silent-fallback.mjs draws.
for (const e of ON_INK) {
  if (e.fallback == null && !REQUIRED.palette.includes(e.fill))
    throw new Error(`ON_INK entry "${e.on}" names palette.${e.fill}, which is neither in REQUIRED.palette nor defaulted`);
}

// themeErrors(theme) → [] when complete, else a list of missing keys (human-readable).
// THE COLOUR CHECK IS INJECTED, NOT IMPORTED. This module is deliberately pure data plus one pure
// function (see the header) so node and the browser can both take it, and importing core/motion.js for
// `parseColor` would end that. Re-implementing a hex parser here would be worse still: a second colour
// parser is a second thing to drift, which is the failure this whole pass exists to remove. So the
// caller hands its own parser in. The createKit(ctx) shape the layer builders already use.
//
// Without it the check is presence-only, exactly as before, so no existing caller changes behaviour.
// WITH it, a palette value that is not a colour is refused where it is WRITTEN, instead of becoming
// pure black in `parseColor(hex) || [0,0,0]` (core/backgrounds.js) and rendering an off-brand backdrop
// with every gate green.
export function themeErrors(theme, { parseColor, contrastRatio } = {}) {
  if (!theme || typeof theme !== 'object') return ['data.theme is required (a name or an inline object), there is no default look'];
  const errs = [];
  const P = theme.palette || {}, T = theme.type || {};
  // A NON-EMPTY STRING IS NOT A COLOUR. This checked only presence, so a typo'd hex ("#0ea5e", seven
  // digits) passed clean and then `parseColor(hex) || [0,0,0]` in core/backgrounds.js turned every mix
  // built from it into PURE BLACK. A background visibly off-brand, with every gate green. The value is
  // consumed as a colour, so it is validated as one here, where it is written.
  for (const k of REQUIRED.palette) {
    if (P[k] == null || P[k] === '') { errs.push(`palette.${k}`); continue; }
    if (parseColor && parseColor(P[k]) == null) errs.push(`palette.${k} is not a colour (${JSON.stringify(P[k])})`);
  }
  // EVERY `palette.on*` IS OPTIONAL: boot.js computes one per theme from that theme's own fill, and
  // these are only the escape hatch for a brand that holds its own opinion. An opinion that cannot be
  // read is not an opinion, it is the defect the token was added to remove, so an override is graded
  // where it is WRITTEN rather than shipped as unreadable text on a coloured chip.
  for (const { on, fill, fallback } of ON_INK) {
    if (P[on] == null || P[on] === '') continue;
    const bg = Object.hasOwn(P, fill) ? P[fill] : fallback;   // `fill` is contract-checked at import (see ON_INK)
    if (parseColor && parseColor(P[on]) == null) { errs.push(`palette.${on} is not a colour (${JSON.stringify(P[on])})`); continue; }
    if (bg == null || (parseColor && parseColor(bg) == null)) continue;   // the fill itself is already reported above
    if (contrastRatio && contrastRatio(P[on], bg) < ON_INK_MIN)
      errs.push(`palette.${on} (${P[on]}) reads ${contrastRatio(P[on], bg).toFixed(2)}:1 on palette.${fill} (${bg}). Needs ${ON_INK_MIN}:1. Drop it and the engine computes a readable one.`);
  }
  for (const k of REQUIRED.type) if (typeof T[k] !== 'string' || !T[k]) errs.push(`type.${k}`);
  if (!Array.isArray(theme.gradient) || theme.gradient.length < REQUIRED.gradientStops)
    errs.push(`gradient (needs ${REQUIRED.gradientStops} stops)`);
  return errs;
}
