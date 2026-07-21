// scripts/gates/craft-coverage.mjs — keep the CRAFT decision docs honest against the engine.
//
//   make craft-coverage
//
// Three ways the docs rot, each caught here so a doc can never silently lie to an author:
//   1. COVERAGE — a look (core/looks.js) or sting (core/stings.js SHADER_FX) exists in the engine but
//      no CRAFT doc classifies it, so an author reaching for it finds no guidance. (New effects added
//      to a registry without a doc row trip this.)
//   2. PHANTOMS — a doc names a look/sting the engine no longer has (a rename left a dead reference).
//   3. LINKS + INDEX — a CRAFT cross-link points at a missing file, or a CRAFT guide is orphaned
//      (not linked from README's index, so nobody finds it).
//
// Docs are the source of truth for TASTE; this gate is the backstop for the source-decidable subset,
// exactly the split TASTE-RULES describes. Pure: reads files, no render, no network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOOK_NAMES } from '../../core/looks.js';
import { SHADER_FX } from '../../core/stings.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CRAFT = path.join(ROOT, 'docs', 'CRAFT');

const read = (f) => fs.readFileSync(path.join(CRAFT, f), 'utf8');
const craftDocs = () => fs.readdirSync(CRAFT).filter((f) => f.endsWith('.md'));

// A registry name is "covered" if it appears as a whole word in the doc that owns that vocabulary.
// SELECTION.md classifies every look + sting; we match on a word boundary (a backtick counts as a
// boundary) so a substring (e.g. `warp` inside `crossWarp`, `ripple` inside `rippleGlass`) never
// counts as covering the shorter name.
const nameRe = (n) => new RegExp(`(^|[^A-Za-z0-9_])${n}([^A-Za-z0-9_]|$)`);
const covers = (text, name) => nameRe(name).test(text);

// The two §4 coverage tables, as their table-row lines only (prose like "an `apple` beat" is excluded,
// so profile names are never mistaken for effect names).
function selectionTableRows(selection) {
  const start = selection.indexOf('Looks — the held texture');
  if (start < 0) return [];
  const end = selection.indexOf('\n## ', start);
  const region = selection.slice(start, end < 0 ? undefined : end);
  return region.split('\n').filter((l) => l.trim().startsWith('|'));
}

function coverageErrors() {
  const errs = [];
  const selection = read('SELECTION.md');
  for (const look of LOOK_NAMES) if (!covers(selection, look)) errs.push(`look "${look}" (core/looks.js) is not classified in SELECTION.md`);
  for (const fx of SHADER_FX) if (!covers(selection, fx)) errs.push(`sting "${fx}" (SHADER_FX) is not classified in SELECTION.md`);
  return errs;
}

// Phantom check: a backticked token INSIDE the §4 coverage-table rows that exists in neither registry
// is a stale/renamed reference (a rename left a dead row). Prose is excluded, so profile names never hit.
function phantomErrors() {
  const errs = [];
  const known = new Set([...LOOK_NAMES, ...SHADER_FX]);
  const rows = selectionTableRows(read('SELECTION.md')).join('\n');
  const tokens = new Set((rows.match(/`([a-z][A-Za-z0-9]+)`/g) || []).map((t) => t.slice(1, -1)));
  for (const t of tokens) if (!known.has(t)) errs.push(`SELECTION.md §4 names \`${t}\` — no such look or sting in the engine (renamed/removed?)`);
  return errs;
}

function linkErrors() {
  const errs = [];
  for (const doc of craftDocs()) {
    const text = fs.readFileSync(path.join(CRAFT, doc), 'utf8');
    for (const m of text.matchAll(/\]\(([^)]+\.md)(#[^)]*)?\)/g)) {
      const target = m[1];
      if (target.startsWith('http')) continue;
      const resolved = path.resolve(CRAFT, target); // CRAFT-relative and ../ both resolve here
      if (!fs.existsSync(resolved)) errs.push(`${doc}: broken link → ${target}`);
    }
  }
  return errs;
}

function indexErrors() {
  const errs = [];
  const readme = read('README.md');
  for (const doc of craftDocs()) {
    if (doc === 'README.md') continue;
    if (!readme.includes(`(${doc})`)) errs.push(`${doc} is not linked from README.md — orphaned from the index`);
  }
  return errs;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const groups = [
    ['registry coverage', coverageErrors()],
    ['phantom references', phantomErrors()],
    ['cross-links', linkErrors()],
    ['README index', indexErrors()],
  ];
  const failed = groups.filter(([, e]) => e.length);
  if (failed.length) {
    console.error('✗ craft-coverage: the CRAFT docs are out of sync with the engine\n');
    for (const [name, e] of failed) {
      console.error(`  ${name}:`);
      for (const msg of e) console.error(`    - ${msg}`);
    }
    console.error('\n  Fix: classify new looks/stings in docs/CRAFT/SELECTION.md §4, repair the link, or add the doc to README.');
    process.exit(1);
  }
  console.log(`✓ craft-coverage: ${LOOK_NAMES.length} looks + ${SHADER_FX.length} stings classified · all CRAFT links + index intact`);
}
