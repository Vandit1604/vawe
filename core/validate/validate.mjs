// core/validate/validate.mjs, ENGINE CODE, not tooling: core/engine/boot.js imports it, so the browser must be
// able to resolve it (it ships to the site with the rest of core/). core/validate/cli.mjs's node:fs use
// is a lazy dynamic import reached only from the isMain branch at the bottom, and is never reached in a
// browser.
//
// data + theme validation against a format's schema.json. Runs in TWO places: (1) core/engine/boot.js
// boot() imports validateData/validateTheme and aborts the render pre-first-frame on bad data (clear
// message, no wasted frames); (2) `make validate` (core/validate/cli.mjs runCli) checks data files from
// the shell. Pure + browser-safe: no top-level node imports.
//
// Schema vocabulary (the authoring schema):
//   { type: string|number|boolean|array|object, label, default,
//     required?, hint?, min?, max?, enum?, minLength?, pattern?,  // scalars
//     minItems?, maxItems?, item?,                               // arrays (item = field map)
//     fields? }                                                  // objects (nested field map)
// `hint` is appended to the required/minItems error. "bg is required" tells an author a field is missing;
// it does not tell them what a good answer looks like, and a required field they cannot answer is a wall.
// Only fields PRESENT in the schema are checked; unknown data keys (module, audio, theme, …) pass.
//
// The checks themselves live in sibling modules, one per concern, and are re-exported below so every
// existing importer of this file keeps working unchanged:
//   layout.mjs · captions.mjs · idle-scene-warnings.mjs · seam-warnings.mjs · html-css.mjs ·
//   backgrounds.mjs · fx-knobs.mjs · junctions.mjs · easing.mjs · lint-warnings.mjs · schema-walk.mjs ·
//   count-errors.mjs · util.mjs (isObj/nearest/typeOf, not part of the public API). The CLI itself lives
//   in cli.mjs.

import { isObj } from './util.mjs';
import { onScreenText } from '../type/on-screen-text.js';
import { IDLE } from '../engine/idle.js';
import { themeFileErrors } from '../theme/roles.js';
import { parseColor, colorAlpha, contrastRatio } from '../color/engine.js';
import { TRANSITIONS } from '../transitions/catalog.js';
import { nearMisses } from '../registry/registry.js';
import { BG_NAMES } from '../backgrounds/index.js';
// lookErrors is theme-contract.js's own rule; themeErrors is not used here (theme completeness is
// themeFileErrors' job, core/theme/roles.js).
import { lookErrors } from '../registry/theme-contract.js';

import { layoutErrors } from './layout.mjs';
import { captionErrors } from './captions.mjs';
import { idleErrors } from './idle-scene-warnings.mjs';
import { htmlLayerErrors, cssErrors } from './html-css.mjs';
import { bgErrors } from './backgrounds.mjs';
import { fxErrors, knobErrors, staggerErrors } from './fx-knobs.mjs';
import { seamErrors, durationWordErrors, transitionErrors, authoredJunctionErrors } from './junctions.mjs';
import { handleErrors, easeErrors } from './easing.mjs';
import { walk } from './schema-walk.mjs';
import { countEaseErrors } from './count-errors.mjs';

export { layoutErrors } from './layout.mjs';
export { captionErrors } from './captions.mjs';
export { idleErrors, sceneUnitWarnings } from './idle-scene-warnings.mjs';
export { seamMotionFreezeWarnings, dirWarnings } from './seam-warnings.mjs';
export { htmlLayerErrors, cssErrors, externalHtmlErrors } from './html-css.mjs';
export { bgErrors } from './backgrounds.mjs';
export { fxErrors, knobErrors, staggerErrors } from './fx-knobs.mjs';
export { seamErrors, durationWordErrors, transitionErrors, authoredJunctionErrors } from './junctions.mjs';
export { handleErrors, easeErrors } from './easing.mjs';
export { lintData } from './lint-warnings.mjs';
export { countEaseErrors } from './count-errors.mjs';

// ON-SCREEN TEXT, out of a string that may be MARKUP. The rule lives in core/type/on-screen-text.js and
// is re-exported here so the existing importers keep working: it was the strictest of eight copies, and
// making it the only one is what closes engine-doctrine/MISTAKES.md #214/#216/#217 in the consumers that still
// used the naive `/<[^>]+>/g` form. Every em-dash in ordinary copy is still caught, including inside
// `<b>`/`<em>`, whose TEXT survives.
export { onScreenText, glyphText } from '../type/on-screen-text.js';

// validateData(schema, data) -> string[] of human-readable errors ([] = valid).
export function validateData(schema, data) {
  const errors = [];
  if (!schema || !isObj(schema.fields)) return errors; // no/blank schema → nothing to check
  walk(schema.fields, data || {}, '', errors);
  noEmdash(data, '', errors); // voice rule: no em-dashes in any on-screen copy (schema or not)
  errors.push(...easeErrors(data)); // engine-driven fields take an EASINGS name, not a GSAP one (#367)
  errors.push(...handleErrors(data || {})); // a keyframe handle and a named ease cannot both shape a segment
  errors.push(...durationWordErrors(data || {})); // a timing slot's word must be one the engine knows
  errors.push(...layoutErrors(data || {})); // a centring keyword must have something to centre
  errors.push(...seamErrors(data || {}));   // seam windows must land inside the video
  errors.push(...transitionErrors(data || {})); // unified transitions must route to a real mechanism
  errors.push(...authoredJunctionErrors(data || {})); // cuts/stings/seams are internal now, not authored
  errors.push(...fxErrors(data || {}));     // named GSAP fx must be a real effect
  errors.push(...knobErrors(data || {}));   // a dial set on a preset that does not read it is dead config
  errors.push(...staggerErrors(data || {})); // a stagger object names three dials, in both slots that take one
  errors.push(...countEaseErrors(data || {})); // a counter must never overshoot its own value
  errors.push(...bgErrors(data || {}));     // each bg window names one backdrop, and can be rendered purely
  errors.push(...htmlLayerErrors(data || {})); // hand-authored layers hit the same dead-CSS trap
  errors.push(...cssErrors(data || {}));    // css passthrough must not name a prop the engine rewrites every frame
  errors.push(...captionErrors(data || {})); // a caption the renderer would silently never draw
  errors.push(...idleErrors(data || {}, IDLE)); // a scaling idle re-rasterises glyphs every frame
  return errors;
}

// Em-dashes are banned in all rendered text (brand voice rule). Checks the RENDERED text of every
// string VALUE in the data (schema labels are internal and exempt). Use a comma, period, or · instead.
function noEmdash(v, path, errors) {
  if (typeof v === 'string') {
    const seen = onScreenText(v);
    const at = seen.indexOf(String.fromCharCode(0x2014));
    // Quote the RENDERED text around the offence, not the head of the source: an em-dash 900
    // characters into a fragment was reported with a 48-character snippet that did not contain it.
    if (at >= 0) errors.push(`${path || 'data'} contains an em-dash: "${seen.slice(Math.max(0, at - 24), at + 25).trim()}". Use , . or ·`);
  }
  else if (Array.isArray(v)) v.forEach((x, i) => noEmdash(x, `${path}[${i}]`, errors));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) { if (k === 'module' || k === 'theme') continue; noEmdash(x, path ? `${path}.${k}` : k, errors); }
}

// validateTheme(theme): shape-check a theme spec. A data JSON MUST declare its theme (name or
// inline object). There is no default look (core/registry/theme-contract.js). Inline objects are
// completeness-checked here; named themes are completeness-checked by the CLI (it can read the
// file) and again at boot by applyTheme.
export function validateTheme(spec) {
  const errors = [];
  if (spec == null) return ['data.theme is required (a theme name, e.g. "vawe", or an inline theme object): there is no default look, so the render refuses to start until this is fixed. Add "theme": "<a name under themes/>" or an inline theme object.'];
  if (typeof spec === 'string') return errors;
  if (!isObj(spec)) return [`theme must be a string name or an object, got a ${typeof spec} (${JSON.stringify(spec)}): the render refuses to start until this is fixed. Use a theme name (e.g. "vawe") or an inline {"tokens":..., "roles":...} object.`];
  // A theme is now a token file (`tokens` + a required `roles` map, core/theme/tokens.js,
  // core/theme/roles.js). themeFileErrors names the retired palette/type/gradient shape by itself when
  // it sees one, pointing at migrate-themes.mjs, so there is nothing left for this function to check
  // about that shape directly.
  errors.push(...themeFileErrors(spec, { parseColor, colorAlpha, contrastRatio }).map((m) => `theme incomplete: ${m}`));
  if ('vars' in spec && !isObj(spec.vars)) errors.push('theme.vars must be an object');
  if ('motion' in spec) {
    if (!isObj(spec.motion)) errors.push('theme.motion must be an object');
    else for (const k of ['bounce', 'settle', 'enter', 'durationScale', 'stagger']) {
      if (k in spec.motion && typeof spec.motion[k] !== 'number') errors.push(`theme.motion.${k} must be a number`);
    }
  }
  if ('look' in spec) errors.push(...lookErrors(spec.look, { bgNames: BG_NAMES, transitionNames: TRANSITIONS.map((t) => t.name), nearMisses }));
  return errors;
}

// validateAll(schema, data): data errors + theme errors, combined.
export function validateAll(schema, data) {
  return [...validateData(schema, data), ...validateTheme(data?.theme)];
}

// ---------- CLI: `node core/validate/validate.mjs [data.json ...]` (make validate) ----------
// No args → validate every authored scene. Browser never runs this branch. The CLI itself lives in
// cli.mjs, loaded with a dynamic import so it (and its node:fs/node:path use) is only ever touched
// from here. validateAll is passed in rather than let cli.mjs import it back: a static import from
// cli.mjs to this file would close a circular graph across this very top-level await and deadlock
// node's ESM loader instead of erroring.
const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { runCli } = await import('./cli.mjs');
  await runCli(validateAll);
}
