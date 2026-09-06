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
// function (see the header) so node and the browser can both take it, and importing core/motion/motion.js for
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

// ---------------------------------------------------------------------------------------------------
// LOOK: the whole-FILM look a theme fixes, so a scaffold and an author read it instead of re-deciding
// it per video. Unlike REQUIRED.palette/type this is OPTIONAL: a theme with no `look` behaves exactly
// as it did before this block existed. Kept small on purpose, only the things AGENTS.md already names
// as re-decided per film: which bg presets the brand turns through, its type scale, its layout anchor,
// its mark sizes, its cut family, its audio cues, its field (grain/vignette) defaults.
//
// LOOK_KEYS is a real registry, not a bare array: an author types these as keys of `theme.look`, so a
// typo deserves the same near-word hint every other named vocabulary gets (core/registry/registry.js), rather
// than a hand-rolled second implementation of the same lookup. `defineRegistry` is pure JS (no node
// imports), so pulling it in here does not cost this file its node+browser purity.
import { defineRegistry } from './registry.js';

const LOOK_KEY_ENTRIES = { backdrop: 'backdrop', scale: 'scale', layout: 'layout', marks: 'marks', cuts: 'cuts', cues: 'cues', field: 'field' };
export const LOOK_KEY_REGISTRY = defineRegistry('theme look key', LOOK_KEY_ENTRIES, {
  slot: 'theme.look',
  blurbs: {
    backdrop: 'ordered bg preset names the brand turns through, one window per beat',
    scale: 'type sizes at 16:9 for hook / headline / body / caption',
    layout: 'the anchor band (left/center/right) and margin every beat composes against',
    marks: 'the logo path plus its end-card and headline-adjacent sizes',
    cuts: 'the default and accent cut/transition names the brand favours',
    cues: 'the audio cue names the brand reaches for',
    field: 'grain and vignette defaults for the backdrop',
  },
  catalog: {
    title: 'Theme look keys', tag: 'theme', intro: 'A theme (`themes/<name>.json`) may carry a `look` '
      + 'block: the whole-film default a brand fixes so a scaffold does not re-decide it per video '
      + '(docs/CRAFT/THEME-LOOK.md). These are the seven keys it accepts.',
    usage: (n) => ({ theme: { look: { [n]: '…' } } }),
    noPreview: 'a theme key, not a per-video effect: see `make theme-sheet THEME=<name>` for the rendered picture of one theme\'s whole look',
  },
});
export const LOOK_KEYS = LOOK_KEY_REGISTRY.names;
// The remaining four are fixed sub-object SHAPES (which keys `look.scale`/`look.layout`/`look.marks`/
// `look.cuts`/`look.field` accept), not a vocabulary an author picks a capability from the way an
// effect or a bg preset is picked, so they stay plain arrays (same treatment as REQUIRED.palette/type
// above, already baselined in verify/vocabulary-baseline.json).
export const LOOK_SCALE_KEYS = ['hook', 'headline', 'body', 'caption'];
export const LOOK_LAYOUT_ANCHORS = ['left', 'center', 'right'];
export const LOOK_MARK_KEYS = ['logo', 'endCardSize', 'headlineSize'];
export const LOOK_CUT_SLOTS = ['default', 'accent'];
export const LOOK_FIELD_KEYS = ['grain', 'vignette'];

const isObj = (o) => o != null && typeof o === 'object' && !Array.isArray(o);

// lookErrors(look, opts) → [] when clean, else human-readable messages, "look.<key> ...".
// SAME INJECTION SHAPE AS themeErrors: `bgNames`/`transitionNames`/`cueNames` are handed in rather than
// imported, so this file never has to know how a bg preset or a cut is named (registry.js already owns
// that lookup and its near-word hint). `nearMisses` is core/registry/registry.js's own helper; when omitted, a
// bad name is still refused, just without the "did you mean" suggestion. Any check whose list was not
// handed in is SKIPPED, never defaulted to "assume it's fine": `themes/*.json` (the write site, checked
// by `make validate`) hands in every list; `core/engine/boot.js`'s browser-side theme check does too, since
// backgrounds and transitions are already browser-safe imports there. Only `cueNames` is commonly
// omitted, because its source (core/audio/kit.mjs) imports `node:fs` and must stay out of the bundle
// the browser loads: see core/validate/validate.mjs's CLI branch for where it IS checked.
export function lookErrors(look, { bgNames, transitionNames, cueNames, nearMisses } = {}) {
  if (look == null) return [];
  if (!isObj(look)) return ['look must be an object'];
  const near = (word, known) => (nearMisses ? nearMisses(String(word), known) : []);
  const errs = [];
  for (const k of Object.keys(look)) {
    if (!LOOK_KEYS.includes(k)) {
      const s = near(k, LOOK_KEYS);
      errs.push(`look.${k} is not a known look key${s.length ? `, did you mean "${s[0]}"?` : ''}. Known: ${LOOK_KEYS.join(', ')}`);
    }
  }
  if ('backdrop' in look) {
    if (!Array.isArray(look.backdrop) || !look.backdrop.length) errs.push('look.backdrop must be a non-empty array of bg preset names');
    else if (bgNames) for (const name of look.backdrop) {
      if (!bgNames.includes(name)) {
        const s = near(name, bgNames);
        errs.push(`look.backdrop names "${name}", which is not a real bg preset${s.length ? `, did you mean "${s[0]}"?` : ''}. Known: ${bgNames.join(', ')}`);
      }
    }
  }
  if ('scale' in look) {
    if (!isObj(look.scale)) errs.push('look.scale must be an object');
    else for (const k of LOOK_SCALE_KEYS) if (k in look.scale && typeof look.scale[k] !== 'number') errs.push(`look.scale.${k} must be a number`);
  }
  if ('layout' in look) {
    if (!isObj(look.layout)) errs.push('look.layout must be an object');
    else {
      if ('anchor' in look.layout && !LOOK_LAYOUT_ANCHORS.includes(look.layout.anchor))
        errs.push(`look.layout.anchor must be one of ${LOOK_LAYOUT_ANCHORS.join(', ')} (got ${JSON.stringify(look.layout.anchor)})`);
      if ('margin' in look.layout && typeof look.layout.margin !== 'number') errs.push('look.layout.margin must be a number (px)');
    }
  }
  if ('marks' in look) {
    if (!isObj(look.marks)) errs.push('look.marks must be an object');
    else {
      if ('logo' in look.marks && typeof look.marks.logo !== 'string') errs.push('look.marks.logo must be a path string');
      for (const k of ['endCardSize', 'headlineSize']) if (k in look.marks && typeof look.marks[k] !== 'number') errs.push(`look.marks.${k} must be a number (px)`);
    }
  }
  if ('cuts' in look) {
    if (!isObj(look.cuts)) errs.push('look.cuts must be an object');
    else for (const slot of LOOK_CUT_SLOTS) {
      if (!(slot in look.cuts)) continue;
      const name = look.cuts[slot];
      if (typeof name !== 'string' || !name) { errs.push(`look.cuts.${slot} must be a transition name (a non-empty string)`); continue; }
      if (transitionNames && !transitionNames.includes(name)) {
        const s = near(name, transitionNames);
        errs.push(`look.cuts.${slot} names "${name}", which is not a real transition${s.length ? `, did you mean "${s[0]}"?` : ''}.`);
      }
    }
  }
  if ('cues' in look) {
    if (!Array.isArray(look.cues) || !look.cues.length) errs.push('look.cues must be a non-empty array of audio cue names');
    else if (cueNames) for (const name of look.cues) {
      if (!cueNames.includes(name)) {
        const s = near(name, cueNames);
        errs.push(`look.cues names "${name}", which is not a real audio cue${s.length ? `, did you mean "${s[0]}"?` : ''}. Known: ${cueNames.join(', ')}`);
      }
    }
  }
  if ('field' in look) {
    if (!isObj(look.field)) errs.push('look.field must be an object');
    else for (const k of LOOK_FIELD_KEYS) if (k in look.field && typeof look.field[k] !== 'number') errs.push(`look.field.${k} must be a number`);
  }
  return errs;
}
