// core/validate.mjs — ENGINE CODE, not tooling: core/boot.js imports it, so the browser must be
// able to resolve it (it ships to the site with the rest of core/). The node:fs use below is a lazy
// dynamic import in the CLI branch and is never reached in a browser.
//
// (was) data + theme validation against a format's schema.json.
// Runs in TWO places: (1) core/boot.js boot() imports validateData/validateTheme and aborts the
// render pre-first-frame on bad data (clear message, no wasted frames); (2) `make validate` (the
// CLI main below) checks data files from the shell. Pure + browser-safe: no top-level node imports.
//
// Schema vocabulary (the authoring schema):
//   { type: string|number|boolean|array|object, label, default,
//     required?, min?, max?, enum?, minLength?, pattern?,        // scalars
//     minItems?, maxItems?, item?,                               // arrays (item = field map)
//     fields? }                                                  // objects (nested field map)
// Only fields PRESENT in the schema are checked; unknown data keys (module, audio, theme, …) pass.

import { themeErrors } from '../core/theme-contract.js';

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
// nearest(val, options) → " Did you mean 'x'?" for the closest valid value (edit distance), else ''.
// Kills the "guessed a wrong preset/cut/fx name" trap: the error tells you the right one immediately.
function nearest(val, opts) {
  const ed = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } } return d[b.length]; };
  const s = String(val).toLowerCase();
  let best = null, bd = Infinity;
  for (const o of opts) { const d = ed(s, String(o).toLowerCase()); if (d < bd) { bd = d; best = o; } }
  return best && bd <= Math.max(2, Math.ceil(best.length / 3)) ? ` Did you mean '${best}'?` : '';
}
const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

// validateData(schema, data) -> string[] of human-readable errors ([] = valid).
export function validateData(schema, data) {
  const errors = [];
  if (!schema || !isObj(schema.fields)) return errors; // no/blank schema → nothing to check
  walk(schema.fields, data || {}, '', errors);
  noEmdash(data, '', errors); // voice rule: no em-dashes in any on-screen copy (schema or not)
  return errors;
}

// Em-dashes are banned in all rendered text (brand voice rule). Checks every string VALUE in the
// data (schema labels are internal and exempt). Use a comma, period, or · instead.
function noEmdash(v, path, errors) {
  if (typeof v === 'string') { if (v.includes('\u2014')) errors.push(`${path || 'data'} contains an em-dash (—): "${v.slice(0, 48)}…" — use , . or ·`); }
  else if (Array.isArray(v)) v.forEach((x, i) => noEmdash(x, `${path}[${i}]`, errors));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) { if (k === 'module' || k === 'theme') continue; noEmdash(x, path ? `${path}.${k}` : k, errors); }
}

// lintData(data) → warnings[]: authoring smells the schema can't express. Non-failing (CLI prints ⚠;
// boot never calls this). Each rule below maps to a real bug that shipped this session and slipped
// every existing gate. Pure. Scene layers only.
export function lintData(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  const name = (L, i) => `layer[${i}] (${L.type || 'text'}${typeof L.text === 'string' ? ` "${L.text.replace(/<[^>]+>/g, '').slice(0, 24)}"` : ''})`;

  // (1) MISSING WINDOW — a layer with no `duration` renders for the ENTIRE video (engine default). Almost
  //     always a slip (the "+" gutter that leaked for 53s). Full-bleed backdrops opt out with track:0.
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    if (L.duration == null && L.track !== 0) warns.push(`${name(L, i)} has no "duration" — renders for the whole video. Add start+duration (or track:0 for an intentional backdrop).`);
  });

  // (2) TYPING + MARKUP — `typing` reveals characters LITERALLY, so <b>/<em> show as visible tags
  //     ("Block <b>7 to 11am</b>" bug). Drop the tags on typed text.
  layers.forEach((L, i) => {
    if (isObj(L) && L.typing && typeof L.text === 'string' && /<(b|em)\b/i.test(L.text)) warns.push(`${name(L, i)} uses "typing" with <b>/<em> markup — typing renders tags literally.`);
  });

  // (3) SCENE COLLISION — two CONTENT layers overlapping in BOTH space and time, not in a
  //     containment/group/anchor relationship = one scene bleeding into the next (the Preferences↔agents
  //     overlap). Pure geometry; needs an explicit w to bound a box (numeric starts only).
  const CONTENT = new Set(['text', 'count', 'doc', 'image', 'group', 'board', 'html']);
  const box = (L) => {
    if (typeof L.start === 'string' || L.x == null || L.y == null || L.w == null) return null;
    const h = L.h != null ? L.h : (L.size ?? 40) * 1.3;
    const s = L.start ?? 0;
    return { x0: L.x, y0: L.y, x1: L.x + L.w, y1: L.y + h, s, e: s + (L.duration ?? 2) };
  };
  const cand = layers.map((L, i) => ({ L, i, b: isObj(L) && CONTENT.has(L.type || 'text') ? box(L) : null })).filter((o) => o.b);
  for (let a = 0; a < cand.length; a++) {
    for (let b = a + 1; b < cand.length; b++) {
      const A = cand[a], B = cand[b];
      if (A.L.group || B.L.group || (A.L.anchor && A.L.anchor === B.L.id) || (B.L.anchor && B.L.anchor === A.L.id)) continue;
      const t0 = Math.max(A.b.s, B.b.s), t1 = Math.min(A.b.e, B.b.e);
      if (t1 - t0 <= 0.3) continue; // time windows barely/never overlap
      const ix = Math.min(A.b.x1, B.b.x1) - Math.max(A.b.x0, B.b.x0);
      const iy = Math.min(A.b.y1, B.b.y1) - Math.max(A.b.y0, B.b.y0);
      if (ix <= 0 || iy <= 0) continue; // boxes disjoint in space
      const frac = (ix * iy) / Math.min((A.b.x1 - A.b.x0) * (A.b.y1 - A.b.y0), (B.b.x1 - B.b.x0) * (B.b.y1 - B.b.y0));
      // full containment (chip inside a card) is intentional; flag the PARTIAL-overlap band only.
      if (frac >= 0.3 && frac <= 0.95) warns.push(`${name(A.L, A.i)} and ${name(B.L, B.i)} overlap ~${Math.round(frac * 100)}% in space and ${(t1 - t0).toFixed(1)}s in time (t=${t0.toFixed(1)}-${t1.toFixed(1)}) — a scene may be colliding with the next.`);
    }
  }
  return warns;
}

function walk(fields, obj, path, errors) {
  for (const [key, spec] of Object.entries(fields)) {
    if (!isObj(spec)) continue;
    const val = obj?.[key];
    const at = `${path}${key}`;
    if (val == null) {
      if (spec.required) errors.push(`${at} is required`);
      continue;
    }
    // `type` may be a union like "number|string" (relative coords: 40 or "50%"). Any member matches.
    if (spec.type && !spec.type.split('|').includes(typeOf(val))) {
      errors.push(`${at} must be a ${spec.type} (got ${typeOf(val)})`);
      continue; // type wrong → skip deeper checks
    }
    checkField(spec, val, at, errors);
  }
}

function checkField(spec, val, at, errors) {
  switch (spec.type) {
    case 'number':
      if (Number.isNaN(val)) errors.push(`${at} must be a number (got NaN)`);
      if (spec.min != null && val < spec.min) errors.push(`${at} must be ≥ ${spec.min} (got ${val})`);
      if (spec.max != null && val > spec.max) errors.push(`${at} must be ≤ ${spec.max} (got ${val})`);
      break;
    case 'string':
      if (spec.minLength != null && val.length < spec.minLength) errors.push(`${at} must be ≥ ${spec.minLength} chars`);
      if (spec.enum && !spec.enum.includes(val)) errors.push(`${at} "${val}" is not valid.${nearest(val, spec.enum)} One of: ${spec.enum.join(', ')}`);
      if (spec.pattern && !new RegExp(spec.pattern).test(val)) errors.push(`${at} must match /${spec.pattern}/ (got "${val}")`);
      break;
    case 'array':
      if (spec.minItems != null && val.length < spec.minItems) errors.push(`${at} needs ≥ ${spec.minItems} item(s) (got ${val.length})`);
      if (spec.maxItems != null && val.length > spec.maxItems) errors.push(`${at} allows ≤ ${spec.maxItems} item(s) (got ${val.length})`);
      if (isObj(spec.item)) val.forEach((el, i) => walk(spec.item, el, `${at}[${i}].`, errors));
      break;
    case 'object':
      if (isObj(spec.fields)) walk(spec.fields, val, `${at}.`, errors);
      break;
  }
}

// validateTheme(theme): shape-check a theme spec. A data JSON MUST declare its theme (name or
// inline object) — there is no default look (core/theme-contract.js). Inline objects are
// completeness-checked here; named themes are completeness-checked by the CLI below (it can read
// the file) and again at boot by applyTheme.
export function validateTheme(spec) {
  const errors = [];
  if (spec == null) return ['data.theme is required (a theme name or an inline theme object) — no default look exists'];
  if (typeof spec === 'string') return errors;
  if (!isObj(spec)) return [`theme must be a string name or an object (got ${typeOf(spec)})`];
  errors.push(...themeErrors(spec).map((m) => `theme incomplete: ${m}`));
  if ('palette' in spec && !isObj(spec.palette)) errors.push('theme.palette must be an object');
  if ('type' in spec && !isObj(spec.type)) errors.push('theme.type must be an object');
  if ('vars' in spec && !isObj(spec.vars)) errors.push('theme.vars must be an object');
  if ('gradient' in spec && !Array.isArray(spec.gradient)) errors.push('theme.gradient must be an array of colors');
  if ('motion' in spec) {
    if (!isObj(spec.motion)) errors.push('theme.motion must be an object');
    else for (const k of ['bounce', 'settle', 'enter', 'durationScale', 'stagger']) {
      if (k in spec.motion && typeof spec.motion[k] !== 'number') errors.push(`theme.motion.${k} must be a number`);
    }
  }
  return errors;
}

// validateAll(schema, data): data errors + theme errors, combined.
export function validateAll(schema, data) {
  return [...validateData(schema, data), ...validateTheme(data?.theme)];
}

// ---------- CLI: `node core/validate.mjs [data.json ...]` (make validate) ----------
// No args → validate every formats/*/sample.json. Browser never runs this branch.
const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

  const strict = process.argv.includes('--strict'); // treat lint warnings as failures
  let targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  // No args used to mean "formats/*/sample.json" — with one format, that is ONE file, while 60
  // authored scenes and every theme pack went unchecked. So a scene could carry an anim name that
  // never existed (silently resolving to fade) and a theme could be missing half the contract, for
  // as long as nobody happened to re-render it by hand. Default is now EVERY authored scene and
  // EVERY theme, because a validator nobody points at the real files validates nothing (#48).
  let themeTargets = [];
  if (targets.length === 0) {
    const fdir = path.join(root, 'formats');
    for (const fmt of fs.readdirSync(fdir)) {
      const dir = path.join(fdir, fmt);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const n of fs.readdirSync(dir)) {
        if (!n.endsWith('.json') || n === 'schema.json') continue;
        // only actual scenes: a formats/ dir also holds planning artifacts (*.intent.json carries
        // beats, not layers). "Declares a module" is the honest test for "the renderer would read it".
        const fp = path.join(dir, n);
        try { if (!JSON.parse(fs.readFileSync(fp, 'utf8')).module) continue; } catch { }
        targets.push(fp);
      }
    }
    targets.sort();
    const tdir = path.join(root, 'themes');
    if (fs.existsSync(tdir)) themeTargets = fs.readdirSync(tdir).filter((n) => n.endsWith('.json')).sort().map((n) => path.join(tdir, n));
  }

  let failed = 0;
  for (const file of targets) {
    let data, schema;
    try { data = readJSON(file); } catch (e) { console.error(`✗ ${file}: unreadable JSON — ${e.message}`); failed++; continue; }
    const mod = data.module;
    const schemaPath = mod && path.join(root, 'formats', mod, 'schema.json');
    try { schema = schemaPath && fs.existsSync(schemaPath) ? readJSON(schemaPath) : null; } catch (e) { schema = null; }
    const errors = validateAll(schema, data);
    // build-time sugar must be expanded before render — the engine's layer registry has no
    // `block`/`comp` type, so a leftover one renders as NOTHING. Fail loud → run `make expand`.
    (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
      if (isObj(L) && (L.type === 'block' || L.type === 'comp'))
        errors.push(`layer[${i}] is an un-expanded ${L.type} ("${L.block || L.ref}") — run \`make expand D=${path.relative(root, file)}\` and render the .expanded.json.`);
    });
    // named themes: the CLI can read the file, so completeness-check it here (boot re-checks).
    if (typeof data.theme === 'string') {
      const tp = path.join(root, 'themes', data.theme + '.json');
      if (!fs.existsSync(tp)) errors.push(`theme "${data.theme}" not found (themes/${data.theme}.json)`);
      else { try { errors.push(...themeErrors(readJSON(tp)).map((m) => `theme "${data.theme}" incomplete: ${m}`)); }
        catch (e) { errors.push(`theme "${data.theme}" unreadable: ${e.message}`); } }
    }
    if (errors.length) {
      failed++;
      console.error(`✗ ${path.relative(root, file)} (${mod || 'no module'})`);
      for (const e of errors) console.error(`    • ${e}`);
    } else {
      console.log(`✓ ${path.relative(root, file)} (${mod})`);
    }
    // lint warnings (non-failing unless --strict) — authoring smells the schema can't express
    const warns = lintData(data);
    if (warns.length) {
      if (strict) failed++;
      for (const w of warns) console.error(`    ⚠ ${w}`);
    }
  }
  // Themes are checked directly, not only via a scene that happens to name one. A pack sitting in
  // themes/ half-written is a landmine for whoever authors the next video against that brand.
  let themeFailed = 0;
  for (const tf of themeTargets) {
    let errs;
    try { errs = themeErrors(readJSON(tf)); } catch (e) { errs = [`unreadable: ${e.message}`]; }
    if (errs.length) { themeFailed++; console.error(`✗ ${path.relative(root, tf)}`); for (const e of errs) console.error(`    • ${e}`); }
  }
  if (themeTargets.length) console.log(`themes: ${themeTargets.length - themeFailed} ok, ${themeFailed} incomplete`);
  failed += themeFailed;
  console.log(`\nvalidate: ${targets.length - (failed - themeFailed)} ok, ${failed} ${strict ? 'failed (incl. lint --strict)' : 'failed'}`);
  process.exit(failed ? 1 : 0);
}
