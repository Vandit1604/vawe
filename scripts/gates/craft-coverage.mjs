// scripts/gates/craft-coverage.mjs, keep the docs honest: against the engine, and against each other.
//
//   make craft-coverage
//
// Four ways the docs rot, each caught here so a doc can never silently lie to an author:
//   1. COVERAGE. A look (core/looks.js) or sting (core/stings.js SHADER_FX) exists in the engine but
//      no CRAFT doc classifies it, so an author reaching for it finds no guidance. (New effects added
//      to a registry without a doc row trip this.)
//   2. PHANTOMS. A doc names a look/sting the engine no longer has (a rename left a dead reference).
//   3. LINKS + INDEX. A CRAFT cross-link points at a missing file, or a CRAFT guide is orphaned
//      (not linked from README's index, so nobody finds it).
//   4. THE DOC MAP (scripts/gates/doc-map.mjs), repo-wide, not CRAFT-only: every indexed doc carries
//      the `when:`/`answers:` frontmatter the map is generated from, every generated view is current,
//      every markdown link anywhere resolves, and nothing is written and left unreachable. Checks 3
//      and 4 overlap on purpose: 3 is the CRAFT-local rule, 4 is the same rule for the other 90 docs.
//
// Docs are the source of truth for TASTE; this gate is the backstop for the source-decidable subset,
// exactly the split TASTE-RULES describes. Pure: reads files, no render, no network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOOK_NAMES } from '../../core/looks.js';
import { SHADER_FX } from '../../core/stings.js';
import { run as runDocMap } from './doc-map.mjs';

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
// so profile names are never mistaken for effect names). `from`/`to` bound ONE of the two tables so the
// looks rows and the stings rows can be read apart, see registersOf for why that matters.
function selectionTableRows(selection, from = 'Looks: the held texture', to = '\n## ') {
  const start = selection.indexOf(from);
  if (start < 0) return [];
  const end = selection.indexOf(to, start + from.length);
  const region = selection.slice(start, end < 0 ? undefined : end);
  return region.split('\n').filter((l) => l.trim().startsWith('|'));
}

// registersOf(selection), §4's classification as DATA: { look: {name → register}, sting: {…} }.
//
// The rows were already parsed here and then thrown away by a `.join('\n')`, so the one place in this
// repo that knows a `vhs` is analog nostalgia and a `lens` is premium glamour could not tell anyone.
// docs/EFFECTS.md renders 31 looks and 35 stings as bare names for exactly that reason, and a quiz or an
// MCP client asking "what IS this" gets nothing. Returning the map costs a split and buys 66 entries.
//
// KEYED BY KIND, not flat, because `thermal` is BOTH a look (sci-fi/data/digital) and a sting (premium
// glamour/product), verified against the registries, and the only such collision. A flat map would
// silently give one of them the other's meaning, which is worse than the blank it replaces.
export function registersOf(selection) {
  const parse = (rows) => {
    const out = {};
    for (const line of rows) {
      if (/^\|\s*-+/.test(line.trim())) continue;                       // the |---|---| separator
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 2) continue;
      // Two header rows exist with DIFFERENT first-column labels ("Register / era" and "The seam should
      // read as…"), because each table titles its own axis. A header carries no backticked member, so
      // the member scan below drops both without either label being hardcoded here.
      const members = [...cells[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      for (const m of members) out[m] = cells[0];
    }
    return out;
  };
  // The looks table ends at the next BOLD SUB-HEADER, found structurally, not by naming the sting one.
  // Bounding it with the literal `'**Stings'` was the one asymmetry here and it failed in the worst
  // direction: retitle that header so the literal no longer matches and `indexOf` returns -1, the region
  // runs to end-of-file, and the stings rows are parsed as LOOKS. `flash` then carries the look-register
  // "punctuation / a hit". That is a wrong answer where the whole point of this map is to replace a blank
  // with a right one, so the terminator must not depend on the other table's wording.
  const nextBold = (from) => {
    const at = selection.indexOf(from);
    if (at < 0) return '\n## ';
    const m = /\n\*\*/.exec(selection.slice(at + from.length));
    return m ? selection.slice(at + from.length + m.index, at + from.length + m.index + 3) : '\n## ';
  };
  const LOOKS = 'Looks: the held texture';
  const reg = {
    look: parse(selectionTableRows(selection, LOOKS, nextBold(LOOKS))),
    sting: parse(selectionTableRows(selection, 'Stings, the shader AT the seam')),
  };
  // …and prove the split landed where it was meant to. A key that is not a member of the registry its
  // table is FOR means the region boundaries slipped, which no missing-key check can see: `coverageErrors`
  // looks for absent names and this failure ADDS names. Loud beats subtly wrong.
  const stray = [
    ...Object.keys(reg.look).filter((n) => !LOOK_NAMES.includes(n)).map((n) => `look table names "${n}", which is not a look`),
    ...Object.keys(reg.sting).filter((n) => !SHADER_FX.includes(n)).map((n) => `sting table names "${n}", which is not a sting`),
  ];
  if (stray.length) throw new Error(`SELECTION.md §4 did not parse into two tables, ${stray.join(' · ')}. `
    + `Did a bold sub-header get retitled, or a row move between tables?`);
  return reg;
}

function coverageErrors() {
  const errs = [];
  const selection = read('SELECTION.md');
  // Ask the MAP, not the whole file. `covers()` tested for the name anywhere in SELECTION.md, so a look
  // named once in a profile paragraph counted as classified while its §4 row was missing, the check
  // could pass on prose. Reading the table means "classified" means what it says.
  const reg = registersOf(selection);
  for (const look of LOOK_NAMES) if (!reg.look[look]) errs.push(`look "${look}" (core/looks.js) is not classified in SELECTION.md §4's LOOKS table`);
  for (const fx of SHADER_FX) if (!reg.sting[fx]) errs.push(`sting "${fx}" (SHADER_FX) is not classified in SELECTION.md §4's STINGS table`);
  return errs;
}

// Phantom check: a backticked token INSIDE the §4 coverage-table rows that exists in neither registry
// is a stale/renamed reference (a rename left a dead row). Prose is excluded, so profile names never hit.
function phantomErrors() {
  const errs = [];
  const known = new Set([...LOOK_NAMES, ...SHADER_FX]);
  const rows = selectionTableRows(read('SELECTION.md')).join('\n');
  const tokens = new Set((rows.match(/`([a-z][A-Za-z0-9]+)`/g) || []).map((t) => t.slice(1, -1)));
  for (const t of tokens) if (!known.has(t)) errs.push(`SELECTION.md §4 names \`${t}\`. No such look or sting in the engine (renamed/removed?)`);
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
    if (!readme.includes(`(${doc})`)) errs.push(`${doc} is not linked from README.md, orphaned from the index`);
  }
  return errs;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const docmap = runDocMap();
  const groups = [
    ['registry coverage', coverageErrors()],
    ['phantom references', phantomErrors()],
    ['cross-links', linkErrors()],
    ['README index', indexErrors()],
    ['doc map', docmap.fails],
  ];
  // Named on every run, never silently absent: an incomplete index must announce itself.
  for (const msg of docmap.pending) console.warn(`  ⚠ doc map: ${msg}`);
  const failed = groups.filter(([, e]) => e.length);
  if (failed.length) {
    console.error('✗ craft-coverage: the docs are out of sync\n');
    for (const [name, e] of failed) {
      console.error(`  ${name}:`);
      for (const msg of e) console.error(`    - ${msg}`);
    }
    console.error('\n  Fix: classify new looks/stings in docs/CRAFT/SELECTION.md §4, repair the link, add the doc to README,');
    console.error('  or give the doc `when:`/`answers:`/`group:` frontmatter and run `make doc-index`.');
    process.exit(1);
  }
  console.log(`✓ craft-coverage: ${LOOK_NAMES.length} looks + ${SHADER_FX.length} stings classified · all CRAFT links + index intact`);
  console.log(`✓ doc map: ${docmap.entries.length} docs indexed · every link resolves · every generated view current`);
}
