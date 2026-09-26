// theme-contract.js: the look a theme MUST fully define. There are no fallback look values
// anywhere in the engine: tokens.css registers fonts + geometry only, and every color/font the
// scene consumes comes from the theme. A theme missing any required key fails LOUD (at
// `make check GATE=validate` and again at boot) instead of rendering a wrong-looking video.
// Pure data + one pure function: importable from node (validate) and the browser (motion.js/boot.js) alike.
//
// A THEME ON DISK IS NOW A TOKEN FILE (core/theme/tokens.js, core/theme/roles.js: `tokens` + a required
// `roles` map), not a hand-written palette/type/gradient object. `themeErrors` below is unchanged and
// still grades the palette/type/gradient SHAPE, because that shape is still exactly what applyTheme and
// every other consumer reads: `core/theme/roles.js` `expandTheme` is the ONE adapter that turns a token
// file into it, so REQUIRED/ON_INK/themeErrors never had to move. What changed is upstream of this file:
// a theme missing a REQUIRED role (`roles.ground`, not `palette.bg`) is refused by `core/theme/roles.js`
// `roleErrors`/`themeFileErrors`, before this file's own checks ever run against the expanded object.

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
  // onLight/onDark: the ink to use on a literal white or black surface (a card of the OPPOSITE
  // polarity from the theme's own ground), replacing the retired `theme.vars['--on-light'/'--on-dark']`
  // free-form passthrough. No `fill` names a real palette key (there is no "light"/"dark" fill, only a
  // literal ffffff/000000 ground), so both carry a `fallback` and skip the ON_INK-entry self-check above.
  // A theme with its own opinion sets `palette.onLight`/`palette.onDark` and wins, same as the other four.
  { on: 'onLight', fill: 'onLightGround', cssVar: '--on-light', fallback: '#ffffff' },
  { on: 'onDark', fill: 'onDarkGround', cssVar: '--on-dark', fallback: '#000000' },
];

// ON_INK IS OUR OWN DATA, and that is the one place a wrong name can live forever: no author will ever
// type `fill: 'upp'` and report it. So the table is checked against the contract at IMPORT, and neither
// the writer nor the validator below ever has to answer a wrong name with a default, they answer only
// ABSENCE, which is the line quality/gates/silent-fallback.mjs draws.
for (const e of ON_INK) {
  if (e.fallback == null && !REQUIRED.palette.includes(e.fill))
    throw new Error(`ON_INK entry "${e.on}" names palette.${e.fill}, which is neither in REQUIRED.palette nor defaulted`);
}

// themeErrors(theme) → [] when complete, else a list of missing keys (human-readable).
// THE COLOUR CHECK IS INJECTED, NOT IMPORTED. This module is deliberately pure data plus one pure
// function (see the header) so node and the browser can both take it, and importing core/motion/motion.js for
// `parseColor` would end that. Re-implementing a hex parser here would be worse still: a second colour
// parser is a second thing to drift, which is the failure this whole pass exists to remove. So the
// caller hands its own parser in. The createKit(ctx) shape the layer builders already use.
//
// Without it the check is presence-only, exactly as before, so no existing caller changes behaviour.
// WITH it, a palette value that is not a colour is refused where it is WRITTEN, instead of becoming
// pure black in `parseColor(hex) || [0,0,0]` (core/backgrounds.js) and rendering an off-brand backdrop
// with every gate green.
// A NON-EMPTY STRING IS NOT A COLOUR. This checked only presence, so a typo'd hex ("#0ea5e", seven
// digits) passed clean and then `parseColor(hex) || [0,0,0]` in core/backgrounds.js turned every mix
// built from it into PURE BLACK. A background visibly off-brand, with every gate green. The value is
// consumed as a colour, so it is validated as one here, where it is written.
function paletteRequiredErrors(P, parseColor) {
  const errs = [];
  for (const k of REQUIRED.palette) {
    if (P[k] == null || P[k] === '') { errs.push(`palette.${k}`); continue; }
    if (parseColor && parseColor(P[k]) == null) errs.push(`palette.${k} is not a colour (${JSON.stringify(P[k])})`);
  }
  return errs;
}

// EVERY `palette.on*` IS OPTIONAL: boot.js computes one per theme from that theme's own fill, and
// these are only the escape hatch for a brand that holds its own opinion. An opinion that cannot be
// read is not an opinion, it is the defect the token was added to remove, so an override is graded
// where it is WRITTEN rather than shipped as unreadable text on a coloured chip.
function onInkErrors(P, parseColor, contrastRatio) {
  const errs = [];
  for (const { on, fill, fallback } of ON_INK) {
    if (P[on] == null || P[on] === '') continue;
    const bg = Object.hasOwn(P, fill) ? P[fill] : fallback;   // `fill` is contract-checked at import (see ON_INK)
    if (parseColor && parseColor(P[on]) == null) { errs.push(`palette.${on} is not a colour (${JSON.stringify(P[on])})`); continue; }
    if (bg == null || (parseColor && parseColor(bg) == null)) continue;   // the fill itself is already reported above
    if (contrastRatio && contrastRatio(P[on], bg) < ON_INK_MIN)
      errs.push(`palette.${on} (${P[on]}) reads ${contrastRatio(P[on], bg).toFixed(2)}:1 on palette.${fill} (${bg}). Needs ${ON_INK_MIN}:1. Drop it and the engine computes a readable one.`);
  }
  return errs;
}

function typeRequiredErrors(T) {
  const errs = [];
  for (const k of REQUIRED.type) if (typeof T[k] !== 'string' || !T[k]) errs.push(`type.${k}`);
  return errs;
}

function gradientStopErrors(theme) {
  if (!Array.isArray(theme.gradient) || theme.gradient.length < REQUIRED.gradientStops)
    return [`gradient (needs ${REQUIRED.gradientStops} stops)`];
  return [];
}

export function themeErrors(theme, { parseColor, contrastRatio } = {}) {
  if (!theme || typeof theme !== 'object') return ['data.theme is required (a name or an inline object), there is no default look'];
  const P = theme.palette || {}, T = theme.type || {};
  return [
    ...paletteRequiredErrors(P, parseColor),
    ...onInkErrors(P, parseColor, contrastRatio),
    ...typeRequiredErrors(T),
    ...gradientStopErrors(theme),
  ];
}

// ---------------------------------------------------------------------------------------------------
// LOOK: the whole-FILM look a theme fixes, so a scaffold and an author read it instead of re-deciding
// it per video. Unlike REQUIRED.palette/type this is OPTIONAL: a theme with no `look` behaves exactly
// as it did before this block existed. Kept small on purpose, only the things AGENTS.md already names
// as re-decided per film: which bg presets the brand turns through, its type scale, its layout anchor,
// its mark sizes, its cut family, its field (grain/vignette) defaults.
//
// LOOK_KEYS is a real registry, not a bare array: an author types these as keys of `theme.look`, so a
// typo deserves the same near-word hint every other named vocabulary gets (core/registry/registry.js), rather
// than a hand-rolled second implementation of the same lookup. `defineRegistry` is pure JS (no node
// imports), so pulling it in here does not cost this file its node+browser purity.
import { defineRegistry } from './registry.js';
import { SURFACE_LOOK_NAMES, SURFACE_TOKEN_KEYS } from '../theme/surface-looks.js';

// `cues` used to be an eighth key here (a fixed per-theme audio-cue list). Deleted: `buildSfx`
// (films/scene/scene.js:1593-1602) already derives every cue from `CUT_CUE`/`SEAM_CUE`, keyed on the
// transition actually used at each joint, so a fixed list cannot say which cue replaces which. A film
// changes its cut family beat to beat; the cue has to follow the cut, not a brand-wide preference.
const LOOK_KEY_ENTRIES = { backdrop: 'backdrop', scale: 'scale', layout: 'layout', marks: 'marks', cuts: 'cuts', field: 'field', bgDefault: 'bgDefault', bgPalette: 'bgPalette', surface: 'surface' };
const LOOK_KEY_AKA = {
  backdrop: ['brand background rotation', 'which bg presets to use'],
  scale: ['type scale', 'named text sizes'],
  layout: ['anchor and margin', 'where content sits on the frame'],
  marks: ['logo settings', 'brand mark sizes'],
  cuts: ['default transition style', 'brand cut preference'],
  field: ['backdrop texture defaults', 'grain and vignette settings'],
  bgDefault: ['the theme own backdrop', 'bg use:"theme" default', 'brand bg rotation at render'],
  bgPalette: ['bg preset colour ramp', 'the palette bg presets paint with'],
  surface: ['block shape', 'skinnable blocks', 'reskin every block at once'],
};
export const LOOK_KEY_REGISTRY = defineRegistry('theme look key', LOOK_KEY_ENTRIES, {
  slot: 'theme.look',
  aka: LOOK_KEY_AKA,
  blurbs: {
    // PLANNING-ONLY, not read at render: `bg` is a REQUIRED authoring field (core/engine/produce.js:14-16),
    // written precisely so the engine never picks the backdrop for an author again (engine-doctrine/MISTAKES.md
    // #159: "the engine PICKED the background, so nobody ever designed one"). `backdrop` here is only
    // the theme's own suggested rotation, for the storyboard's `bg[]` plan; a film's own `bg`
    // array is what actually renders, and the engine will not fall back to this list on your behalf.
    backdrop: 'ordered bg preset names the brand turns through, one window per beat: planning-only, seeds a storyboard\'s `bg[]` plan, never read at render (bg is required, engine-doctrine/MISTAKES.md #159)',
    scale: 'how big text should be: named px sizes for the hook / headline / body / caption roles at '
      + '16:9, so a layer writes `"size": "headline"` instead of guessing a number',
    layout: 'the anchor band (left/center/right) and margin every beat composes against',
    marks: 'the logo path plus its end-card and headline-adjacent sizes, both named pixel numbers',
    cuts: 'the default and accent cut/transition names the brand favours, one for almost every boundary and one reserved for its peak-energy beat',
    field: 'grain and vignette numbers layered over the backdrop, both 0..1 strengths',
    // NOT planning-only, unlike backdrop above: this IS read at render, by a `bg` window that writes
    // `{use:"theme"}` (films/scene/scene.js). Replaces the retired top-level `theme.bgDefault` field,
    // moved here so a theme file has one place for what it fixes about a film, `look`, rather than a
    // second top-level field with no other look key beside it.
    bgDefault: 'a bg preset spec (or an array of 2+, a rotation) the theme paints when a beat opts in '
      + 'with `bg:[{"use":"theme"}]`; the one look key actually read at render time',
    // ALSO read at render (core/backgrounds/presets.js `build(P, ...)`), unlike `backdrop`: the
    // 15-key colour ramp (accent/tint/paperBase/accentBase/...) a bg PRESET paints with. Optional: a
    // theme with none gets `bgPaletteFrom(theme.palette)` derived instead (core/backgrounds/palette.js),
    // the same floor every theme used before this key existed. A brand with its own bg-preset colours
    // that the derivation does not reproduce (a hand-tuned pastel accentBase, say) sets this and wins.
    bgPalette: 'the 15-key colour ramp bg presets paint with (accent/tint/paperBase/accentBase/darkMesh/...); optional, derived from the theme\'s own palette when absent',
    surface: 'a named shape look (glass/soft/outlined/brutalist/editorial/neon/playful/print/cinematic/'
      + 'industrial, `core/theme/surface-looks.js`) every block reads instead of its own literal corner '
      + 'rounding, rule weight and drop shadow',
  },
  catalog: {
    title: 'Theme look keys', tag: 'theme', intro: 'A theme (`themes/<name>.json`) may carry a `look` '
      + 'block: the whole-film default a brand fixes so a scaffold does not re-decide it per video '
      + '(engine-doctrine/CRAFT/THEME-LOOK.md). These are the eight keys it accepts.',
    usage: (n) => ({ theme: { look: { [n]: '…' } } }),
    noPreview: 'a theme key, not a per-video effect: see `make theme-sheet THEME=<name>` for the rendered picture of one theme\'s whole look',
  },
});
export const LOOK_KEYS = LOOK_KEY_REGISTRY.names;
// The remaining four are fixed sub-object SHAPES (which keys `look.scale`/`look.layout`/`look.marks`/
// `look.cuts`/`look.field` accept), not a vocabulary an author picks a capability from the way an
// effect or a bg preset is picked, so they stay plain arrays and are waived in quality/gates/
// arsenal-check.mjs's WAIVED map, same treatment as REQUIRED.palette/type above.
export const LOOK_SCALE_KEYS = ['hook', 'headline', 'body', 'caption'];
export const LOOK_LAYOUT_ANCHORS = ['left', 'center', 'right'];
export const LOOK_MARK_KEYS = ['logo', 'endCardSize', 'headlineSize'];
export const LOOK_CUT_SLOTS = ['default', 'accent'];
export const LOOK_FIELD_KEYS = ['grain', 'vignette'];

const isObj = (o) => o != null && typeof o === 'object' && !Array.isArray(o);

// lookErrors(look, opts) → [] when clean, else human-readable messages, "look.<key> ...".
// SAME INJECTION SHAPE AS themeErrors: `bgNames`/`transitionNames` are handed in rather than
// imported, so this file never has to know how a bg preset or a cut is named (registry.js already owns
// that lookup and its near-word hint). `nearMisses` is core/registry/registry.js's own helper; when omitted, a
// bad name is still refused, just without the "did you mean" suggestion. Any check whose list was not
// handed in is SKIPPED, never defaulted to "assume it's fine": `themes/*.json` (the write site, checked
// by `make check GATE=validate`) hands in every list; `core/engine/boot.js`'s browser-side theme check does too, since
// backgrounds and transitions are already browser-safe imports there.
function unknownLookKeyErrors(look, near) {
  const errs = [];
  for (const k of Object.keys(look)) {
    if (!LOOK_KEYS.includes(k)) {
      const s = near(k, LOOK_KEYS);
      errs.push(`look.${k} is not a known look key${s.length ? `, did you mean "${s[0]}"?` : ''}. Known: ${LOOK_KEYS.join(', ')}`);
    }
  }
  return errs;
}

function backdropErrors(look, bgNames, near) {
  if (!('backdrop' in look)) return [];
  if (!Array.isArray(look.backdrop) || !look.backdrop.length) return ['look.backdrop must be a non-empty array of bg preset names'];
  if (!bgNames) return [];
  const errs = [];
  for (const name of look.backdrop) {
    if (!bgNames.includes(name)) {
      const s = near(name, bgNames);
      errs.push(`look.backdrop names "${name}", which is not a real bg preset${s.length ? `, did you mean "${s[0]}"?` : ''}. Known: ${bgNames.join(', ')}`);
    }
  }
  return errs;
}

function scaleErrors(look) {
  if (!('scale' in look)) return [];
  if (!isObj(look.scale)) return ['look.scale must be an object'];
  const errs = [];
  for (const k of LOOK_SCALE_KEYS) if (k in look.scale && typeof look.scale[k] !== 'number') errs.push(`look.scale.${k} must be a number`);
  return errs;
}

function layoutErrors(look) {
  if (!('layout' in look)) return [];
  if (!isObj(look.layout)) return ['look.layout must be an object'];
  const errs = [];
  if ('anchor' in look.layout && !LOOK_LAYOUT_ANCHORS.includes(look.layout.anchor))
    errs.push(`look.layout.anchor must be one of ${LOOK_LAYOUT_ANCHORS.join(', ')} (got ${JSON.stringify(look.layout.anchor)})`);
  if ('margin' in look.layout && typeof look.layout.margin !== 'number') errs.push('look.layout.margin must be a number (px)');
  return errs;
}

function marksErrors(look) {
  if (!('marks' in look)) return [];
  if (!isObj(look.marks)) return ['look.marks must be an object'];
  const errs = [];
  if ('logo' in look.marks && typeof look.marks.logo !== 'string') errs.push('look.marks.logo must be a path string');
  for (const k of ['endCardSize', 'headlineSize']) if (k in look.marks && typeof look.marks[k] !== 'number') errs.push(`look.marks.${k} must be a number (px)`);
  return errs;
}

function cutSlotError(slot, cuts, transitionNames, near) {
  if (!(slot in cuts)) return null;
  const name = cuts[slot];
  if (typeof name !== 'string' || !name) return `look.cuts.${slot} must be a transition name (a non-empty string)`;
  if (transitionNames && !transitionNames.includes(name)) {
    const s = near(name, transitionNames);
    return `look.cuts.${slot} names "${name}", which is not a real transition${s.length ? `, did you mean "${s[0]}"?` : ''}.`;
  }
  return null;
}

function cutsErrors(look, transitionNames, near) {
  if (!('cuts' in look)) return [];
  if (!isObj(look.cuts)) return ['look.cuts must be an object'];
  return LOOK_CUT_SLOTS
    .map((slot) => cutSlotError(slot, look.cuts, transitionNames, near))
    .filter((e) => e != null);
}

// bgDefaultErrors: a single spec `{preset, value?}` or an array of 2+ (a rotation), each preset name
// checked against `bgNames` the same way `backdropErrors` above checks `look.backdrop`. Unlike
// `backdrop`, a bare preset NAME (a string, no object) is also accepted: `themes/glassatmos.json` and
// `themes/lumen.json` carried exactly that shape before this field moved under `look`, and scene.js's
// own consumer (`{...theme.look.bgDefault, from, to}`) only spreads an object, so a bare string is
// normalised to `{preset: name}` there, not here (this function only grades what was written).
function bgSpecErrors(spec, bgNames, near, where) {
  if (typeof spec === 'string') return spec ? bgSpecErrors({ preset: spec }, bgNames, near, where) : [`${where} names no preset`];
  if (!isObj(spec)) return [`${where} must be a preset name or a {preset, value?} object`];
  if (spec.preset == null) return [`${where} names no preset`];
  if (bgNames && !bgNames.includes(spec.preset)) {
    const s = near(spec.preset, bgNames);
    return [`${where} names "${spec.preset}", which is not a real bg preset${s.length ? `, did you mean "${s[0]}"?` : ''}. Known: ${bgNames.join(', ')}`];
  }
  return [];
}

function bgDefaultErrors(look, bgNames, near) {
  if (!('bgDefault' in look)) return [];
  const v = look.bgDefault;
  if (Array.isArray(v)) {
    if (v.length < 2) return ['look.bgDefault as an array needs at least 2 specs (a rotation); write a single spec instead'];
    return v.flatMap((spec, i) => bgSpecErrors(spec, bgNames, near, `look.bgDefault[${i}]`));
  }
  return bgSpecErrors(v, bgNames, near, 'look.bgDefault');
}

// bgPaletteErrors: shape-only, same treatment as `marks`. The 15 keys it may carry are
// core/backgrounds/palette.js's own vocabulary (accent/tint/tint2/dotLight/paperBase/softBase/
// accentBase/inkBase/border/dark/darkMesh/deep/light/ink/paper), a colour-maths shape rather than a
// named registry an author picks a value from, so it is waived in quality/gates/arsenal-check.mjs's
// WAIVED map the same way REQUIRED.palette/type is.
function bgPaletteErrors(look) {
  if (!('bgPalette' in look)) return [];
  if (!isObj(look.bgPalette)) return ['look.bgPalette must be an object'];
  return [];
}

function fieldErrors(look) {
  if (!('field' in look)) return [];
  if (!isObj(look.field)) return ['look.field must be an object'];
  const errs = [];
  for (const k of LOOK_FIELD_KEYS) if (k in look.field && typeof look.field[k] !== 'number') errs.push(`look.field.${k} must be a number`);
  return errs;
}

// surfaceErrors(look): `look.surface` is EITHER a preset name (a string, one of SURFACE_LOOK_NAMES)
// OR an object `{ preset?, ...token overrides }` (core/theme/surface-looks.js resolveSurfaceLook does
// the actual resolving; this only grades the shape so a typo is refused at validate, not at render).
function surfaceErrors(look, near) {
  if (!('surface' in look)) return [];
  const s = look.surface;
  if (typeof s === 'string') {
    if (SURFACE_LOOK_NAMES.includes(s)) return [];
    const hint = near(s, SURFACE_LOOK_NAMES);
    return [`look.surface names "${s}", which is not a known surface look${hint.length ? `, did you mean "${hint[0]}"?` : ''}. Known: ${SURFACE_LOOK_NAMES.join(', ')}`];
  }
  if (!isObj(s)) return ['look.surface must be a preset name (string) or an object'];
  const errs = [];
  if ('preset' in s && !SURFACE_LOOK_NAMES.includes(s.preset)) errs.push(`look.surface.preset "${s.preset}" is not a known surface look. Known: ${SURFACE_LOOK_NAMES.join(', ')}`);
  for (const k of Object.keys(s)) {
    if (k === 'preset') continue;
    if (!SURFACE_TOKEN_KEYS.includes(k)) errs.push(`look.surface.${k} is not a known surface token. Known: ${SURFACE_TOKEN_KEYS.join(', ')}`);
  }
  return errs;
}

export function lookErrors(look, { bgNames, transitionNames, nearMisses } = {}) {
  if (look == null) return [];
  if (!isObj(look)) return ['look must be an object'];
  const near = (word, known) => (nearMisses ? nearMisses(String(word), known) : []);
  return [
    ...unknownLookKeyErrors(look, near),
    ...backdropErrors(look, bgNames, near),
    ...scaleErrors(look),
    ...layoutErrors(look),
    ...marksErrors(look),
    ...cutsErrors(look, transitionNames, near),
    ...fieldErrors(look),
    ...bgDefaultErrors(look, bgNames, near),
    ...bgPaletteErrors(look),
    ...surfaceErrors(look, near),
  ];
}

// ---------------------------------------------------------------------------------------------------
// COMPUTED LOOK: only 7 of 44 themes carry a `look` block, so an engine default that reads `theme.look`
// does nothing for the other 37 (including `themes/default.json`) unless one can be derived. The first
// cut of this function filled every theme with the SAME four numbers and the SAME two cut names
// (`themes/vawe.json`'s own look, copy-pasted into every theme with no look of its own): a calm brand
// and a loud one got identical type scale and identical cuts, which is a default that SUPPLIES A
// CONSTANT, not one that DERIVES. `scale` and `cuts` below instead read `theme.motion`, which every
// theme already carries an opinion about (even themes with none fall back to the engine's own
// `DEFAULT_MOTION`, `core/motion/motion.js`), so a calm theme and a punchy one compute different looks.
//
// `field` already derived from light-vs-dark; unchanged, just re-verified against the wider library
// (see `make theme-look-spread` below): every light-bg theme still reads `{grain:0,vignette:0}`, every
// dark-bg one nonzero.
//
// `layout` STAYS A CONSTANT, on purpose, and this is the sentence that says why: no field ANY theme
// carries (palette, type, motion, look.bgDefault) correlates with anchor or margin across the 7 themes
// that DID author one by hand (a24/apple/duolingo/vercel center, bloomberg/nike/vawe left, with no
// split on dominance, contrast, bounce or a distinct display face that survives more than 4 of the 7
// points). Margin is also structurally a CANVAS decision (how much a 16:9 frame needs on the sides)
// that no theme file has an opinion about at all. Inventing a formula to fit 7 hand-placed points would
// be curve-fitting, not derivation, so `layout` keeps `themes/vawe.json`'s own values and waits for a
// real signal (a theme-level density field, if one is ever added) rather than a fake one.
//
// TWO KEYS ARE DELIBERATELY LEFT UNCOMPUTED (unchanged from before):
//   - `backdrop` (which bg preset a film turns through) is a TASTE decision, never the engine's to
//     pick for an author (engine-doctrine/MISTAKES.md #159: the engine used to choose the background and nobody
//     ever designed one again; `bg` is a required authoring field now, core/engine/produce.js's own
//     header explains why). `look.bgDefault` (a sibling look key, not this one) stays the one
//     engine-owned bg default; `look.backdrop` is a storyboard-planning seed only, never read by the
//     renderer (see its blurb above).
//   - `marks` needs a real logo PATH. No theme-agnostic default exists (a made-up path 404s at
//     render), so a theme with no marks stays without one until it declares its own.
// (`cues` used to be a third: deleted from LOOK_KEYS entirely, see the comment beside LOOK_KEY_ENTRIES.)
//
// SAME INJECTION SHAPE as themeErrors/lookErrors above: `isLightBg` decides only the light/dark field
// default and is handed in rather than imported, so this file stays free of core/motion/motion.js (see
// the file header: node+browser purity is the whole point). Omit it and `field` stays the light
// default, an under-estimate (no grain on what might be a dark brand) rather than a guess this file
// has no business making on its own.
const DEFAULT_LAYOUT = { anchor: 'left', margin: 160 };
const DEFAULT_FIELD_LIGHT = { grain: 0, vignette: 0 };
const DEFAULT_FIELD_DARK = { grain: 0.08, vignette: 0.15 };

// `theme.motion` is optional (one shipped theme, `themes/plinth-auto.json`, has none at all), so every
// read below falls back to the SAME numbers `core/motion/motion.js`'s own `DEFAULT_MOTION` uses for a
// missing field (`easeOutQuint`/0/0.6/48/1/0.045), quoted here rather than imported so this file keeps
// its node+browser purity (see the file header). A theme this sparse gets the engine's own house
// motion, never a second, disagreeing default.
const MOTION_FALLBACK = { bounce: 0, settle: 0.6, enter: 48, durationScale: 1 };

// `scale`: DERIVED from `motion.enter`, the pixel distance a theme's own layers already travel on
// entrance. The base regression (hook ~= 55 + 1.12*enter, headline/body/caption at 0.70x/0.41x/0.27x
// of hook) tracked 7 hand-authored looks within 7px, but those looks were themselves undersized for a
// 1920px canvas watched on a phone: two agent-authored films both shipped a "hook" role around 90-110px,
// which reads as small, empty type on a real screen (engine-doctrine/MISTAKES.md, judge scores 5/10 and
// 6/10 the same week). Never gate on how big an object looks; the fix is a bigger DEFAULT, not a check.
// Rescaled so `hook` lands 120-180px on a 1920-wide landscape canvas across the shipped themes' `enter`
// range (24-52) and 150-220px on a 1080-wide portrait one (9:16/4:5): a phone-legible hero step by
// default, still deriving from the theme's own motion so a calm brand and a punchy one keep different
// looks. The three smaller ratios are re-fit to the same phone-legible target (body ~36-48px,
// caption floored at MIN_VIDEO_TEXT_PX below), not re-measured off new authored looks, so treat them as
// tuned constants same as before, not a fresh regression.
const PORTRAIT_SCALE = 1.2; // 9:16/4:5 hold the phone closer: bump the whole scale, not just the hook
const scaleFromMotion = (m, portrait) => {
  const base = (95 + 1.7 * m.enter) * (portrait ? PORTRAIT_SCALE : 1);
  const r = (mul, lo) => Math.max(lo, Math.round(base * mul));
  return { hook: Math.round(base), headline: r(0.66, 60), body: r(0.27, 32), caption: r(0.20, 28) };
};

// `cuts`: DERIVED from `motion.durationScale` (the theme's overall pace: >1 is slower/more cinematic,
// <1 is faster) for the DEFAULT cut, which fires on almost every boundary and so should read as the
// brand's ordinary pace, and from `motion.bounce` (the theme's own overshoot, 0..~0.5) for the ACCENT
// cut, which fires rarely and should read as the brand's peak energy. Every name below is a real entry
// in `core/transitions/catalog.js` (checked by `lookErrors` when `transitionNames` is injected, which
// `make check GATE=validate` and the new gate both do); a theme missing `motion` reads the engine's own pace (1)
// and its own stillness (0), which lands it on the calmest tier of each, not a guess.
const CUT_DEFAULT_TIERS = [ // ordered fast -> slow; each `max` is the upper edge of `durationScale` for that tier
  { max: 0.85, name: 'whip' },       // faster than the house pace: a brisk, no-ceremony default cut
  { max: 0.95, name: 'fade' },       // the house pace itself (engine default motion is 1, vawe is 0.88)
  { max: 1.05, name: 'dissolve' },   // a touch slower: softer than a fade, still unremarkable
  { max: Infinity, name: 'riseBlur' }, // deliberately slow (a24 1.25, apple 1.15): cuts read as cinematic
];
const CUT_ACCENT_TIERS = [ // ordered still -> bouncy; each `max` is the upper edge of `motion.bounce`
  { max: 0.05, name: 'letterbox' },    // near-zero overshoot: the loud beat still arrives composed
  { max: 0.15, name: 'cinematicZoom' }, // vawe's own accent: a little life, nothing showy
  { max: 0.30, name: 'zoom' },
  { max: Infinity, name: 'punch' },    // duolingo (0.5) territory: the brand visibly overshoots everywhere
];
const pickTier = (tiers, v) => (tiers.find((t) => v <= t.max) || tiers[tiers.length - 1]).name;

export function computedLook(theme, { isLightBg, portrait = false } = {}) {
  const bg = theme && theme.palette && theme.palette.bg;
  const light = isLightBg && bg != null ? isLightBg(bg) : true; // unknown bg reads as light, the harmless side
  const m = { ...MOTION_FALLBACK, ...(theme && theme.motion) };
  return {
    scale: scaleFromMotion(m, portrait),
    layout: { ...DEFAULT_LAYOUT },
    cuts: { default: pickTier(CUT_DEFAULT_TIERS, m.durationScale), accent: pickTier(CUT_ACCENT_TIERS, m.bounce) },
    field: light ? { ...DEFAULT_FIELD_LIGHT } : { ...DEFAULT_FIELD_DARK },
  };
}

// resolveLook(theme, opts): the look a film actually gets. An authored `theme.look` wins KEY BY KEY
// over the computed one (engine-doctrine/CRAFT/THEME-LOOK.md: "the theme is a DEFAULT, never a constraint an
// author cannot override"), so a brand that fixes only `backdrop` still gets a computed `scale`/
// `layout`/`cuts`/`field` for the rest instead of losing them to an all-or-nothing merge.
export function resolveLook(theme, opts) {
  const computed = computedLook(theme, opts);
  const authored = (theme && isObj(theme.look)) ? theme.look : {};
  return { ...computed, ...authored };
}
