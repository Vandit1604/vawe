// scripts/gates/designspec-check.mjs: THE DESIGN-SPEC LOCK (the visual twin of the storyboard gate).
// The storyboard locks the story; this locks the LOOK. A video's design system is its theme
// (themes/<name>.json: the 15-key palette + type roles + motion). This gate treats the theme as the locked
// spec and flags any layer that reaches OUTSIDE it: an off-palette chromatic colour, or a font that isn't
// one of the theme's roles. That is the "looks off but I can't say why" failure, one stray colour, a
// random face, caught before it ships, the same way the direction floor catches flat motion.
//
//   node scripts/gates/designspec-check.mjs <scene.json> [--strict]   ·   make designspec-check D=<file>
// WARN by default (coaching); --strict blocks. What's allowed: any `var(--token)` / color-mix of one;
// near-NEUTRAL tints (white/black/grey scrims: legitimate glass/vignette); a raw colour within tolerance
// of a palette colour (it IS a palette colour, just hardcoded). Flagged: a CHROMATIC colour far from every
// palette entry. Optional radii/shadow lock: declare `"spec": { "radii":[…], "shadows":[…] }` in the scene.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cp from 'node:child_process';
import { snippet, onScreenText as plainText } from '../lib/text.mjs';
import { flattenLayers } from '../lib/layers.mjs';
import { population, LIBRARY, SCENE_DIR } from '../lib/census.mjs';
// THE RULE TABLE IS OURS (scripts/lib/designspec-rules.mjs). This gate is the design-spec lock, the
// theme is the locked look, and the rules there are the second half of the same question: not only
// "is this colour on the spec", but "is this copy, and this effect dose, the thing we would choose".
// They live in one gate under one name because an author should run one command, not two.
import { RULES, runRules } from '../lib/designspec-rules.mjs';
import { parseColorRGB } from '../../core/motion.js';
import { gateFindings } from '../lib/findings.mjs';

/** A scene's text as UNITS. One per layer, one per named fragment. Never joined: a joined blob let a
 *  pattern match across eight layers and invent a finding (see runRules). Fragments are read off
 *  `type:"html"` layers and bg windows, the same rule core/preload.js uses. */
function sceneTextUnits(d) {
  const parts = []; const srcs = new Set();
  for (const l of flattenLayers(d.layers)) {
    if (typeof l.text === 'string') parts.push(plainText(l.text));
    // `html` is a whole fragment carrying its own <style> block, and so is the file behind `src`.
    // plainText used to be the naive strip, so a captured component's CSS and comments arrived here as
    // the film's COPY and the jargon/vague rules ran over selectors. #214's bug, fifth consumer.
    if (typeof l.html === 'string') parts.push(plainText(l.html));
    if (l.type === 'html' && typeof l.src === 'string') srcs.add(l.src);
  }
  for (const b of Array.isArray(d.bg) ? d.bg : []) if (b && typeof b === 'object') {
    if (typeof b.html === 'string') parts.push(plainText(b.html));
    if (typeof b.src === 'string') srcs.add(b.src);
  }
  for (const rel of [...srcs].sort()) {
    try { parts.push(plainText(fs.readFileSync(path.join(ROOT, rel), 'utf8'))); } catch { /* asset-check's question */ }
  }
  return parts;
}

/** The fragment files a scene names, the same `src` rule sceneTextUnits uses. Separate from it because
 *  that one returns plain TEXT, and CSS is exactly what plainText throws away. */
function fragmentSrcs(d) {
  const srcs = new Set();
  for (const l of flattenLayers(d.layers)) if (l.type === 'html' && typeof l.src === 'string') srcs.add(l.src);
  for (const b of Array.isArray(d.bg) ? d.bg : []) if (b && typeof b.src === 'string') srcs.add(b.src);
  return [...srcs].sort();
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const strict = process.argv.includes('--strict');

// EVERY RULE PROVES ITSELF BEFORE IT IS TRUSTED. `fires` must produce a finding, `clean` must not. The
// second half is the one that matters: a rule that flags everything is not strict, it is broken, and
// that is how 21 false findings shipped from the detector this replaces (docs/MISTAKES.md #338).
if (process.argv.includes('--self-test')) {
  let bad = 0;
  console.log(`\n  designspec rules · self-test · ${RULES.length} rule(s)\n`);
  for (const r of RULES) {
    const s = (v) => (typeof v === 'string' ? plainText(v) : v);
    const fired = r.test(s(r.fires));
    const quiet = r.test(s(r.clean));
    if (!fired || quiet) bad++;
    console.log(`  ${!fired || quiet ? '✗' : '✓'} ${r.id.padEnd(26)} fires:${fired ? 'yes' : 'NO '}  clean:${quiet ? 'FIRED' : 'quiet'}`);
    if (!fired) console.log(`      its own \`fires\` sample produced nothing: ${JSON.stringify(r.fires)}`);
    if (quiet) console.log(`      its \`clean\` sample was flagged (${quiet}): ${JSON.stringify(r.clean)}`);
  }
  console.log(bad ? `\n  ✗ ${bad} rule(s) cannot demonstrate themselves\n` : '\n  ✓ every rule fires on its sample and stays quiet on its counter-sample\n');
  process.exit(bad ? 1 : 0);
}

if (process.argv.includes('--census')) {
  // WAS `git ls-files`, which sees only TRACKED scenes: films are gitignored here, so this census read
  // 40 of the 135 in the same directory and printed a confident tick over the rest.
  const files = population('designspec census', { filter: LIBRARY, quiet: true })
    .names.map((f) => `${SCENE_DIR}/${f}`);
  console.log(`\n  designspec rules · census · ${RULES.length} rule(s) over ${files.length} scene(s)\n`);
  let hit = 0;
  for (const f of files) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { continue; }
    const found = runRules(sceneTextUnits(d), { allow: d.authoring?.allow || [], scene: d });
    if (!found.length) continue;
    hit++;
    console.log(`  ${f.split('/').pop().replace('.json', '').padEnd(30)} ${found.map((x) => `[${x.id}] ${x.snippet}`).join('\n' + ' '.repeat(33))}`);
  }
  console.log(`\n  ${hit} of ${files.length} scene(s) with a finding\n`);
  process.exit(0);
}

if (!file || !fs.existsSync(file)) { console.error('usage: node scripts/gates/designspec-check.mjs <scene.json> [--strict] | --self-test | --census'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

let theme = {};
try { theme = typeof data.theme === 'string' ? JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', data.theme + '.json'), 'utf8')) : (data.theme || {}); } catch {}
const themeName = typeof data.theme === 'string' ? data.theme : (theme.name || 'inline');

// ---- colour maths ----
// The gate reads colours through the ENGINE's parser (core/motion.js), not a local copy. It used to
// keep its own, and that is how a gate could pass a colour the renderer then read as null.
const parseColor = parseColorRGB;
const sat = ({ r, g, b }) => { const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B); if (mx === mn) return 0; const l = (mx + mn) / 2, d = mx - mn; return l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); };
const dist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2) / 441.673;

const palette = theme.palette || {};
const paletteRGB = Object.values(palette).map(parseColor).filter(Boolean);
const gradRGB = (theme.gradient || []).map(parseColor).filter(Boolean);
const allowRGB = [...paletteRGB, ...gradRGB];

// PER-SCENE WAIVERS, the repo's own mechanism ({"authoring":{"allow":["off-colour"]}}), which this gate
// never read. It matters now that the gate BLOCKS: some scenes are legitimately off the brand and
// saying so in the file is better than keeping the gate toothless for all of them. The two real cases
// today are a depicted macOS window chrome (#FF5F57 is the traffic-light red, and a brand token there
// would be a lie about the UI being shown) and a generator fitted to a photograph, whose palette is a
// measurement of that photo rather than a choice. A waiver still has to be written down per scene.
const allowed = new Set(data.authoring?.allow || []);
const TOL = 0.14, NEUTRAL_SAT = 0.12;

// every colour LITERAL inside a value string that is NOT token-based (var/color-mix skipped whole).
const literalsIn = (val) => {
  const s = String(val);
  if (/var\(--/.test(s)) return []; // token-based (incl color-mix of a var), on-spec by construction
  return [...s.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((m) => m[0]);
};

// walk one layer object's string values (nested arrays/objects too), yielding [keyPath, string].
function strings(node, keyPath, out) {
  if (typeof node === 'string') { out.push([keyPath, node]); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => strings(v, `${keyPath}[${i}]`, out)); return; }
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) strings(node[k], keyPath ? `${keyPath}.${k}` : k, out); }
}

const flat = flattenLayers(data.layers);
const scanTargets = [...flat, ...(data.bg || [])];

// The engine's four type roles, not three. `num` is first-class everywhere that matters, declared in
// core/theme-contract.js, emitted as `--font-num` by core/boot.js, dispatched by core/layers/util.js,
// and listed in the scene schema's `font` enum, and every shipped theme sets it. Leaving it out here
// made this gate report a correctly-themed tabular-figures layer as off-spec, which is a gate inventing
// a finding: the only way to satisfy it was to put the numbers in the wrong face. docs/MISTAKES.md #245.
const ROLES = new Set(['sans', 'serif', 'mono', 'num']);
const specRadii = data.spec && Array.isArray(data.spec.radii) ? new Set(data.spec.radii.map(String)) : null;
const specShadows = data.spec && Array.isArray(data.spec.shadows) ? new Set(data.spec.shadows.map(String)) : null;

const findings = [];
const label = (l, i) => `${l.type || 'text'}${l.text ? ` "${snippet(l.text, 22)}"` : l.comp ? ` (${l.comp})` : ''}`;

// ---- the token lock: a `var(--x)` the engine never defines ----
// CSS answers an undefined custom property by inheriting, so `var(--text2)` (the engine defines
// `--text-2`) renders as whatever the parent happened to be. No error, no warning, and this lock passed
// it clean because the reference is not a literal colour. 37 references across 22 files were sitting on
// it, three of them inside the GENERATORS (blueprints/beats.mjs, showcase-build.mjs, rules-build.mjs),
// so every new blueprint minted the typo again. Documented input, silently ignored: the worst failure
// mode in this codebase.
//
// The legal set is DERIVED from the engine, never restated here, for the same reason the continuity gate
// imports SOLO_BLIND: a hand-copied list is a second source of truth that rots without telling anyone.
const KNOWN_VARS = (() => {
  const set = new Set();
  try {                                                   // whatever core/boot.js writes onto :root
    const boot = fs.readFileSync(path.join(ROOT, 'core/boot.js'), 'utf8');
    for (const m of boot.matchAll(/set\(\s*'(--[a-z0-9-]+)'/gi)) set.add(m[1]);
    if (/--g\$\{i\}|`--g\$\{i\}`/.test(boot)) for (let i = 0; i < 10; i++) set.add(`--g${i}`);
  } catch { /* unreadable: fall through, the css pass below still contributes */ }
  try {                                                   // ...and whatever core/tokens.css declares
    const css = fs.readFileSync(path.join(ROOT, 'core/tokens.css'), 'utf8');
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) set.add(m[1]);
  } catch { /* ditto */ }
  return set;
})();
// ...plus the ones this scene defines for itself. `theme.vars` is a documented raw passthrough
// (core/boot.js: `for (const [k, v] of Object.entries(theme.vars)) set(k, v)`), and it is where the vawe
// theme defines --em, --paper, --muted, --border and --accent-soft. Reading only an INLINE theme object
// missed all of them, because `data.theme` is normally the theme's NAME; the resolved theme file is what
// has to be asked. Getting this wrong turns the lock into noise on five tokens that are perfectly real.
const sceneVars = new Set();
for (const k of Object.keys((theme && theme.vars) || {})) sceneVars.add(k);
for (const l of flat) for (const k of Object.keys((l && l.vars) || {})) sceneVars.add(k);
// `--t` and `--p` are written per frame by the html layer and background, not by the theme.
for (const k of ['--t', '--p']) sceneVars.add(k);
// A DERIVATION THAT FAILED MUST NOT LOOK LIKE A CHECK THAT PASSED. Both reads above catch and continue,
// so an unreadable core/boot.js or core/tokens.css silently retires the whole dead-token lock while the
// scene still prints `✓ on-spec`.
const tokenLockRan = KNOWN_VARS.size > 8;
if (tokenLockRan) {
  const seenVar = new Set();
  for (const l of scanTargets) {
    const kv = []; strings(l, '', kv);
    // A hand-authored fragment routinely declares its own custom properties inline
    // (`style="--a:12px"` … `stroke-width:var(--a)`), which is self-contained CSS and correct. Collect
    // every `--name:` DEFINED anywhere in this layer before judging what it reads, or the lock fires on
    // exactly the careful authoring it should leave alone: the first draft of this check reported 13
    // such definitions in one SVG as dead tokens.
    const selfDefined = new Set();
    for (const [, v] of kv) for (const m of String(v).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) selfDefined.add(m[1]);
    for (const [k, v] of kv) {
      for (const m of String(v).matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
        const name = m[1];
        if (KNOWN_VARS.has(name) || sceneVars.has(name) || selfDefined.has(name) || seenVar.has(name)) continue;
        seenVar.add(name);
        // nearest known token, so the message names the fix rather than the problem
        const near = [...KNOWN_VARS].filter((n) => n.replace(/-/g, '') === name.replace(/-/g, ''));
        findings.push({ sev: 'dead-token', msg: `${label(l)} · \`${k}\` reads var(${name}), which nothing defines. CSS answers an undefined custom property by INHERITING, so this renders as whatever the parent was, silently.${near.length ? ` Did you mean var(${near[0]})?` : ' Define it in the theme\'s `vars`, or use a token the engine sets.'}` });
      }
    }
  }
}

// ---- the ruled grid: a blueprint canvas nobody asked for ----
// The write site for the engine's own grid is `core/backgrounds.js` (a softwash `grid: true`), and it
// is opt-in there. Hand-written CSS has NO single write site: any fragment can rule its own lines with
// two crossed gradients, so this is the one place the rule has to be a check.
// NARROW ON PURPOSE. It wants two gradients on PERPENDICULAR axes in one declaration, which is the
// ruled-grid idiom and nothing else. One axis is scanlines (core/looks.js, blocks/terminal-html.mjs and
// core/ransom.js all do that deliberately), and a crossed pair with no repeat and no tiling is two
// washes. Waive it with {"authoring":{"allow":["ruled-grid"],"_why":{"ruled-grid":"..."}}}.
const GRID_AXIS = (dir) => {
  const d = dir.trim().toLowerCase();
  if (/^to\s+(top|bottom)$/.test(d)) return 'v';      // rules stacked down the frame
  if (/^to\s+(left|right)$/.test(d)) return 'h';
  const deg = /^(-?[\d.]+)deg$/.exec(d);
  if (!deg) return null;
  const a = ((+deg[1] % 180) + 180) % 180;
  if (a < 12 || a > 168) return 'v';
  if (Math.abs(a - 90) < 12) return 'h';
  return null;                                        // a diagonal is a hatch, not a grid
};
// TWO SCOPES, AND THE SPLIT IS THE WHOLE ACCURACY OF THIS RULE.
// `repeating-linear-gradient` RULES LINES, so it is judged over the whole fragment: a film that rules
// horizontals on one element and verticals on another has drawn a grid, and `showcase-type-labour`
// does exactly that with a `.rows` div and a `.ruler` div. One axis alone is scanlines and stays quiet.
// A PLAIN `linear-gradient` rules nothing on its own, it needs `background-size` to tile, so that half
// is judged per DECLARATION. Pooling it across a file paired a hero scrim's `180deg` with an unrelated
// `background-size` two rules down and reported a grid in `_arcfall.html`, which has none.
function ruledGrid(css) {
  const text = String(css);
  const ruled = new Set();
  for (const m of text.matchAll(/repeating-linear-gradient\(\s*([^,)]+)/g)) {
    const ax = GRID_AXIS(m[1]);
    if (ax) ruled.add(ax);
  }
  if (ruled.size === 2) return 'repeating-linear-gradients ruling both axes';
  for (const block of text.split('}')) {
    if (!/background-size\s*:/.test(block)) continue;
    for (const decl of block.split(';')) {
      const plain = new Set();
      for (const m of decl.matchAll(/(?<!repeating-)linear-gradient\(\s*([^,)]+)/g)) {
        const ax = GRID_AXIS(m[1]);
        if (ax) plain.add(ax);
      }
      if (plain.size === 2) return 'two linear-gradients tiled by background-size on perpendicular axes';
    }
  }
  return null;
}
if (!allowed.has('ruled-grid')) {
  const gridSeen = new Set();
  const gridSay = (where, how) => {
    if (gridSeen.has(where)) return; gridSeen.add(where);
    findings.push({ sev: 'ruled-grid', msg: `${where} · ${how}. A ruled line grid is a design tool's canvas: `
      + `it makes the film read as a mock-up of itself. Nothing in the engine draws one unless asked, so either `
      + `delete it or waive it with a \`_why\` saying what the grid is doing.` });
  };
  for (const l of scanTargets) {
    const kv = []; strings(l, '', kv);
    for (const [k, v] of kv) { const how = ruledGrid(v); if (how) gridSay(`${label(l)} · \`${k}\``, how); }
  }
  for (const rel of fragmentSrcs(data)) {
    let txt; try { txt = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { continue; }
    const how = ruledGrid(txt);
    if (how) gridSay(rel, how);
  }
}

scanTargets.forEach((l, i) => {
  // colours
  const seen = new Set();
  const kv = []; strings(l, '', kv);
  for (const [k, v] of kv) {
    for (const lit of literalsIn(v)) {
      const rgb = parseColor(lit);
      if (!rgb) continue;
      if (sat(rgb) < NEUTRAL_SAT) continue; // neutral scrim (white/black/grey), allowed overlay
      const near = allowRGB.length ? Math.min(...allowRGB.map((p) => dist(rgb, p))) : 1;
      if (near <= TOL) continue; // ≈ a palette colour (hardcoded, but on-spec)
      const key = lit + '@' + k.replace(/\[\d+\]/g, '');
      if (seen.has(key)) continue; seen.add(key);
      if (allowed.has('off-colour')) continue;
      findings.push({ sev: 'off-colour', msg: `${label(l, i)} · \`${k}\` uses ${lit}. A chromatic colour NOT in the ${themeName} palette (nearest is ${(near * 100).toFixed(0)}% away). Use a var(--token) or a color-mix of one, or add it to the theme.` });
    }
  }
  // fonts (the engine's roles). A `font` outside sans/serif/mono is dropped silently or off-system.
  if (typeof l.font === 'string' && !ROLES.has(l.font)) findings.push({ sev: 'off-font', msg: `${label(l, i)} · font "${l.font}" is not a theme role (sans/serif/mono/num). Map it to a role in themes/${themeName}.json type.` });
  // optional radii / shadow lock (only when the scene declares the spec)
  if (specRadii && l.radius != null && !specRadii.has(String(l.radius))) findings.push({ sev: 'off-radius', msg: `${label(l, i)} · radius ${l.radius} is off the locked scale [${[...specRadii].join(', ')}].` });
  if (specShadows && l.shadow != null && !specShadows.has(String(l.shadow))) findings.push({ sev: 'off-shadow', msg: `${label(l, i)} · shadow "${l.shadow}" is off the locked set.` });
});

// The copy + effect-dose rules, over this scene's words and the fragments it names. Same `findings`
// array, same waiver mechanism, so one gate speaks once.
for (const f of runRules(sceneTextUnits(data), { allow: [...allowed], scene: data })) {
  findings.push({ sev: f.id, msg: `${f.snippet}\n        → ${f.why}` });
}

// ---- report ----
console.log(`\n  design-spec lock · ${file}  (spec: themes/${themeName} · ${paletteRGB.length} palette colours${specRadii ? ` · ${specRadii.size} radii` : ''})`);
if (!tokenLockRan) console.log(`  ~ dead-token lock SKIPPED: only ${KNOWN_VARS.size} engine token(s) could be derived from `
  + `core/boot.js + core/tokens.css (needs > 8). Undefined var(--x) reads are NOT checked in this run.`);
if (!allowRGB.length) console.log(`  ⚠ theme "${themeName}" has no readable palette, colour lock skipped (fonts still checked).`);
if (!findings.length) { console.log(`  ✓ on-spec: every colour is a token or a palette colour, every font a role.`
    + `${tokenLockRan ? '' : ' (dead-token lock did not run, see above.)'}\n`); process.exit(0); }
console.log(`  ${findings.length} off-spec value(s):`);
// `sev` here has always been the finding CODE, not a severity. It is recorded under its real name so
// author-check can read the code off a structure instead of the printed line (docs/MISTAKES.md #401).
const F = gateFindings({ scene: file, indent: '    ' });
for (const f of findings) F.warn(f.sev, f.msg);
F.emit();
console.log(strict ? `\n  ✗ design-spec lock (strict): bring these onto the theme before shipping.\n` : `\n  reach onto the theme: these are the drift the eye reads as "off". (Block them with --strict / STRICT=1.)\n`);
process.exit(strict ? 1 : 0);
