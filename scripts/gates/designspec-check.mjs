// scripts/gates/designspec-check.mjs — THE DESIGN-SPEC LOCK (the visual twin of the storyboard gate).
// The storyboard locks the story; this locks the LOOK. A video's design system is its theme
// (themes/<name>.json: the 15-key palette + type roles + motion). This gate treats the theme as the locked
// spec and flags any layer that reaches OUTSIDE it: an off-palette chromatic colour, or a font that isn't
// one of the theme's roles. That is the "looks off but I can't say why" failure — one stray colour, a
// random face — caught before it ships, the same way the direction floor catches flat motion.
//
//   node scripts/gates/designspec-check.mjs <scene.json> [--strict]   ·   make designspec-check D=<file>
// WARN by default (coaching); --strict blocks. What's allowed: any `var(--token)` / color-mix of one;
// near-NEUTRAL tints (white/black/grey scrims — legitimate glass/vignette); a raw colour within tolerance
// of a palette colour (it IS a palette colour, just hardcoded). Flagged: a CHROMATIC colour far from every
// palette entry. Optional radii/shadow lock: declare `"spec": { "radii":[…], "shadows":[…] }` in the scene.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file || !fs.existsSync(file)) { console.error('usage: node scripts/gates/designspec-check.mjs <scene.json> [--strict]'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

let theme = {};
try { theme = typeof data.theme === 'string' ? JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', data.theme + '.json'), 'utf8')) : (data.theme || {}); } catch {}
const themeName = typeof data.theme === 'string' ? data.theme : (theme.name || 'inline');

// ---- colour maths (small, local) ----
const parseColor = (raw) => {
  const s = String(raw).trim().toLowerCase();
  let m;
  if ((m = /^#([0-9a-f]{3,8})$/.exec(s))) {
    let h = m[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    else if (h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join('');
    else if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  if ((m = /^rgba?\(([^)]+)\)$/.exec(s))) { const p = m[1].split(',').map(parseFloat); if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) return { r: p[0], g: p[1], b: p[2] }; }
  return null;
};
const sat = ({ r, g, b }) => { const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B); if (mx === mn) return 0; const l = (mx + mn) / 2, d = mx - mn; return l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); };
const dist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2) / 441.673;

const palette = theme.palette || {};
const paletteRGB = Object.values(palette).map(parseColor).filter(Boolean);
const gradRGB = (theme.gradient || []).map(parseColor).filter(Boolean);
const allowRGB = [...paletteRGB, ...gradRGB];
const TOL = 0.14, NEUTRAL_SAT = 0.12;

// every colour LITERAL inside a value string that is NOT token-based (var/color-mix skipped whole).
const literalsIn = (val) => {
  const s = String(val);
  if (/var\(--/.test(s)) return []; // token-based (incl color-mix of a var) — on-spec by construction
  return [...s.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((m) => m[0]);
};

// walk one layer object's string values (nested arrays/objects too), yielding [keyPath, string].
function strings(node, keyPath, out) {
  if (typeof node === 'string') { out.push([keyPath, node]); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => strings(v, `${keyPath}[${i}]`, out)); return; }
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) strings(node[k], keyPath ? `${keyPath}.${k}` : k, out); }
}

const flat = []; (function rec(ls) { for (const l of ls || []) if (l && typeof l === 'object') { flat.push(l); if (l.children) rec(l.children); } })(data.layers);
const scanTargets = [...flat, ...(data.bg || [])];

const ROLES = new Set(['sans', 'serif', 'mono']);
const specRadii = data.spec && Array.isArray(data.spec.radii) ? new Set(data.spec.radii.map(String)) : null;
const specShadows = data.spec && Array.isArray(data.spec.shadows) ? new Set(data.spec.shadows.map(String)) : null;

const findings = [];
const label = (l, i) => `${l.type || 'text'}${l.text ? ` "${String(l.text).slice(0, 22)}"` : l.comp ? ` (${l.comp})` : ''}`;

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
if (KNOWN_VARS.size > 8) {   // only run when the derivation actually found the engine's tokens
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
        findings.push({ sev: 'dead-token', msg: `${label(l)} · \`${k}\` reads var(${name}), which nothing defines — CSS answers an undefined custom property by INHERITING, so this renders as whatever the parent was, silently.${near.length ? ` Did you mean var(${near[0]})?` : ' Define it in the theme\'s `vars`, or use a token the engine sets.'}` });
      }
    }
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
      if (sat(rgb) < NEUTRAL_SAT) continue; // neutral scrim (white/black/grey) — allowed overlay
      const near = allowRGB.length ? Math.min(...allowRGB.map((p) => dist(rgb, p))) : 1;
      if (near <= TOL) continue; // ≈ a palette colour (hardcoded, but on-spec)
      const key = lit + '@' + k.replace(/\[\d+\]/g, '');
      if (seen.has(key)) continue; seen.add(key);
      findings.push({ sev: 'off-colour', msg: `${label(l, i)} · \`${k}\` uses ${lit} — a chromatic colour NOT in the ${themeName} palette (nearest is ${(near * 100).toFixed(0)}% away). Use a var(--token) or a color-mix of one, or add it to the theme.` });
    }
  }
  // fonts (the engine's roles). A `font` outside sans/serif/mono is dropped silently or off-system.
  if (typeof l.font === 'string' && !ROLES.has(l.font)) findings.push({ sev: 'off-font', msg: `${label(l, i)} · font "${l.font}" is not a theme role (sans/serif/mono). Map it to a role in themes/${themeName}.json type.` });
  // optional radii / shadow lock (only when the scene declares the spec)
  if (specRadii && l.radius != null && !specRadii.has(String(l.radius))) findings.push({ sev: 'off-radius', msg: `${label(l, i)} · radius ${l.radius} is off the locked scale [${[...specRadii].join(', ')}].` });
  if (specShadows && l.shadow != null && !specShadows.has(String(l.shadow))) findings.push({ sev: 'off-shadow', msg: `${label(l, i)} · shadow "${l.shadow}" is off the locked set.` });
});

// ---- report ----
console.log(`\n  design-spec lock · ${file}  (spec: themes/${themeName} · ${paletteRGB.length} palette colours${specRadii ? ` · ${specRadii.size} radii` : ''})`);
if (!allowRGB.length) console.log(`  ⚠ theme "${themeName}" has no readable palette — colour lock skipped (fonts still checked).`);
if (!findings.length) { console.log(`  ✓ on-spec — every colour is a token or a palette colour, every font a role.\n`); process.exit(0); }
console.log(`  ${findings.length} off-spec value(s):`);
for (const f of findings) console.log(`    ~ [${f.sev}] ${f.msg}`);
console.log(strict ? `\n  ✗ design-spec lock (strict): bring these onto the theme before shipping.\n` : `\n  reach onto the theme: these are the drift the eye reads as "off". (Block them with --strict / STRICT=1.)\n`);
process.exit(strict ? 1 : 0);
