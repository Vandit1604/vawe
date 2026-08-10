// scripts/gates/block-schema.mjs · does every block family DECLARE its options, and does the
// declaration match the code?
//
//   node scripts/gates/block-schema.mjs
//
// WHY: a JS default is a value, not a contract. `w = 560` carries no floor, `color = SERIES[0]`
// carries no "this is a colour", `tone = 'info'` carries no list of the spellings that paint. So no
// control panel can be built from a factory and no caller can be validated. blocks/schema.mjs fixes
// that with one table per family, mirroring core/lightfield/options.js.
//
// A table is a second source of truth about the same function, and a second source of truth drifts.
// This gate is the thing that stops it. It reads the FACTORY SOURCE, not the table's own claims:
//
//   1. every family in blocks/catalog.mjs has a table, and every table names a real family
//   2. every key in a table is a parameter the factory actually destructures
//   3. every parameter the factory destructures is declared, passed through (x·y·start·dur) or
//      listed in OMIT with a reason. A schema can rot by omission as easily as by error.
//   4. every `def` deep-equals the factory's REAL default, and a parameter the factory leaves
//      undefined declares no `def` at all
//   5. every rule is well formed: a known kind, bounds on the numbers, values on the enums
//   6. every `def` passes its own rule, and every example row in the catalog passes the whole table
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../../blocks/catalog.mjs';
import { BLOCKS } from '../../blocks/index.mjs';
import { TOKENS, SERIES, R, HAIR } from '../../blocks/kit.mjs';
import { SCHEMA, KINDS, PASSTHROUGH, checkValue, resolve } from '../../blocks/schema.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Parameters that are real, and are not dials. Each one needs a reason, because "it is not a dial"
// is a judgement and an unexplained omission is indistinguishable from a hole.
const OMIT = {
  'browserFrame.children': 'a content slot: an array of scene layers the caller draws inside the chrome, not a value',
  'phoneFrame.children': 'a content slot: an array of scene layers the caller draws on the screen, not a value',
  'loadingBar.color': 'DEAD: destructured and never read. The fill paints with `settle`. Reported, not fixed here.',
  'toast.body': 'DEAD: destructured and never rendered, though the file states the alert family shares title+body. Reported, not fixed here.',
};

// ── reading a factory's real parameters ─────────────────────────────────────────────────────────
// Not a regex: a default can carry braces, brackets and commas (`colors = ['#4338E8', …]`), and a
// string default can carry a colon (`time = '10:24'`), so the split has to know about depth and
// quotes. The regex version of this in blocks-audit.mjs stops at the first `}` it sees.
function destructured(fn) {
  const src = fn.toString();
  const open = src.indexOf('{', src.indexOf('('));
  if (open < 0) return null;
  let depth = 0, quote = null, end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  return src.slice(open + 1, end);
}

function splitTop(body) {
  const parts = []; let depth = 0, quote = null, at = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(body.slice(at, i)); at = i + 1; }
  }
  parts.push(body.slice(at));
  return parts.map((p) => p.trim()).filter(Boolean);
}

// The scope a default expression is evaluated in. Every module-level name a block default reaches
// for is a kit export; a default that needs anything else is reported rather than guessed at.
const SCOPE = { T: TOKENS, TOKENS, SERIES, R, HAIR };
const MISSING = Symbol('no default');
const UNREADABLE = Symbol('unreadable default');

function params(fn) {
  const body = destructured(fn);
  if (body == null) return null;
  const out = new Map();
  for (const part of splitTop(body)) {
    // `name`, `name = expr`, `key: local`, `key: local = expr`. Split at the FIRST top-level `=`
    // (never `==`), then at the first top-level `:` in what is left of the head.
    let depth = 0, quote = null, eq = -1, colon = -1;
    for (let i = 0; i < part.length; i++) {
      const c = part[i];
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') depth--;
      else if (depth === 0 && eq < 0 && c === '=' && part[i + 1] !== '=' && part[i - 1] !== '=') eq = i;
      else if (depth === 0 && eq < 0 && colon < 0 && c === ':') colon = i;
    }
    const head = eq < 0 ? part : part.slice(0, eq);
    const name = (colon >= 0 ? head.slice(0, colon) : head).trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;   // rest elements and the like: nothing to dial
    if (eq < 0) { out.set(name, MISSING); continue; }
    const expr = part.slice(eq + 1).trim();
    try {
      // eslint-disable-next-line no-new-func
      out.set(name, new Function(...Object.keys(SCOPE), `return (${expr});`)(...Object.values(SCOPE)));
    } catch { out.set(name, UNREADABLE); }
  }
  return out;
}

const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
const show = (v) => (v === MISSING ? '(no default)' : v === UNREADABLE ? '(unreadable)' : JSON.stringify(v));

// ── rule shape ──────────────────────────────────────────────────────────────────────────────────
function checkRule(rule, at, issues, { needDef }) {
  if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) {
    issues.push({ kind: 'bad-rule', at, detail: 'a rule must be an object like { kind, def, … }.' });
    return;
  }
  if (!KINDS.includes(rule.kind)) {
    issues.push({ kind: 'unknown-kind', at, detail: `kind "${rule.kind}" is not one of ${KINDS.join(', ')}.` });
    return;
  }
  if ((rule.kind === 'int' || rule.kind === 'num') && (typeof rule.min !== 'number' || typeof rule.max !== 'number')) {
    issues.push({ kind: 'unbounded-number', at, detail: `a ${rule.kind} must declare min and max. A number with no range is the JS default again, in a longer form.` });
  }
  if (rule.kind === 'int' || rule.kind === 'num') {
    if (typeof rule.min === 'number' && typeof rule.max === 'number' && rule.min > rule.max) {
      issues.push({ kind: 'inverted-range', at, detail: `min ${rule.min} is above max ${rule.max}.` });
    }
  }
  if (rule.kind === 'enum' && (!Array.isArray(rule.of) || !rule.of.length)) {
    issues.push({ kind: 'empty-enum', at, detail: 'an enum must name its values in `of`.' });
  }
  if (rule.kind === 'list') {
    if (!rule.of || typeof rule.of !== 'object' || Array.isArray(rule.of)) {
      issues.push({ kind: 'listless-list', at, detail: 'a list must declare its element rule in `of`.' });
    } else checkRule(rule.of, `${at}[]`, issues, { needDef: false });
  }
  if (rule.kind === 'oneOf') {
    if (!Array.isArray(rule.of) || rule.of.length < 2) {
      issues.push({ kind: 'empty-oneof', at, detail: 'a oneOf must list at least two accepted shapes in `of`.' });
    } else rule.of.forEach((alt, i) => checkRule(alt, `${at}|${i}`, issues, { needDef: false }));
  }
  if (rule.kind === 'row' || rule.kind === 'group') {
    if (!rule.fields || typeof rule.fields !== 'object') {
      issues.push({ kind: 'fieldless-row', at, detail: `a ${rule.kind} must declare its keys in \`fields\`.` });
    } else for (const [k, r] of Object.entries(rule.fields)) checkRule(r, `${at}.${k}`, issues, { needDef: rule.kind === 'group' });
  }
  if (!needDef) {
    if ('def' in rule) issues.push({ kind: 'nested-def', at, detail: 'a nested element rule carries no default: an absent field stays absent rather than being invented.' });
    return;
  }
  // A `def` must pass its own rule. Null is the "absent" sentinel the factories use and is exempt.
  if ('def' in rule && rule.def !== null) {
    try { checkValue(rule, rule.def, at); }
    catch (e) { issues.push({ kind: 'def-out-of-range', at, detail: `the declared default fails its own rule. ${e.message}` }); }
  }
}

// ── the run ─────────────────────────────────────────────────────────────────────────────────────
const issues = [];
const families = [...new Set(CATALOG.map((e) => e.family))].sort();

for (const family of families) {
  const table = SCHEMA[family];
  if (!table) {
    issues.push({ kind: 'no-schema', at: family, detail: `catalog family "${family}" declares no option table. An empty table is a statement; a missing one is a hole.` });
    continue;
  }
  const fn = BLOCKS[family];
  if (typeof fn !== 'function') { issues.push({ kind: 'no-factory', at: family, detail: 'the registry has no factory by this name.' }); continue; }
  const real = params(fn);
  if (!real) { issues.push({ kind: 'unreadable-signature', at: family, detail: 'cannot read the factory signature, so its options are unchecked.' }); continue; }

  for (const [key, rule] of Object.entries(table)) {
    const at = `${family}.${key}`;
    if (!real.has(key)) {
      issues.push({ kind: 'dead-key', at, detail: `declared, but \`${family}\` does not accept it. Anything set here is silently dropped.` });
      continue;
    }
    checkRule(rule, at, issues, { needDef: true });
    const actual = real.get(key);
    if (actual === UNREADABLE) { issues.push({ kind: 'unreadable-default', at, detail: 'the factory default could not be evaluated, so the declared `def` is unchecked.' }); continue; }
    if (actual === MISSING) {
      if ('def' in rule) issues.push({ kind: 'invented-default', at, detail: `declares def ${JSON.stringify(rule.def)}, but the factory leaves this undefined. Declare no \`def\` rather than invent one.` });
      continue;
    }
    if (!('def' in rule)) { issues.push({ kind: 'undeclared-default', at, detail: `the factory defaults to ${show(actual)} and the table declares no \`def\`.` }); continue; }
    if (!same(rule.def, actual)) {
      issues.push({ kind: 'wrong-default', at, detail: `declares def ${JSON.stringify(rule.def)}, but \`${family}\` really defaults to ${show(actual)}.` });
    }
  }

  for (const key of real.keys()) {
    if (key in table || PASSTHROUGH.includes(key) || `${family}.${key}` in OMIT) continue;
    issues.push({ kind: 'undeclared-key', at: `${family}.${key}`, detail: `the factory accepts it and nothing declares it. Add a rule, or add it to OMIT with the reason it is not a dial.` });
  }
}

for (const family of Object.keys(SCHEMA)) {
  if (!families.includes(family)) issues.push({ kind: 'orphan-schema', at: family, detail: 'a table for a family no catalog entry names.' });
}

// Every example row in the manifest is a caller. If the ranges are real, the shipped examples pass.
for (const e of CATALOG) {
  if (!SCHEMA[e.family]) continue;
  try { resolve(e.family, e.props || {}); }
  catch (err) { issues.push({ kind: 'catalog-fails-schema', at: e.name, detail: err.message }); }
}

const byKind = issues.reduce((m, i) => { (m[i.kind] ||= []).push(i); return m; }, {});
console.log(`block-schema: ${families.length} families, ${Object.keys(SCHEMA).length} tables, ` +
  `${Object.values(SCHEMA).reduce((n, t) => n + Object.keys(t).length, 0)} declared keys.`);
if (!issues.length) { console.log('block-schema: PASS'); process.exit(0); }
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`\n  ${kind} (${list.length})`);
  for (const i of list) console.log(`    ${i.at}: ${i.detail}`);
}
console.log(`\nblock-schema: FAIL (${issues.length} issue${issues.length === 1 ? '' : 's'}). See ${path.relative(repoRoot, fileURLToPath(import.meta.url))}`);
process.exit(1);
