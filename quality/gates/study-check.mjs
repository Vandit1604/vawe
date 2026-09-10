// quality/gates/study-check.mjs: is a study COMPLETE, or does it still have something UNSEEN or
// UNEXPLAINED? The owner's own bar for "foolproof": a study cannot finish with a unique frame nobody
// looked at, a page nobody described, or a shot whose onScreen/moves/trigger is still null.
//
//   node quality/gates/study-check.mjs <name>
//   make study-check NAME=<name>
//
// This never re-measures (that is `make study`'s job); it reads what `make study` already wrote
// (refs/<name>/pages.json, refs/<name>/pages.md, grammar/<name>.json) and reports EXACTLY what is
// still missing, by number, never a bare "incomplete". `make ideate` (built in parallel, reads
// grammar/<name>.json) refuses a study whose coverage.ledger is not "complete"; this is what sets it,
// so re-running this after filling pages.md is what turns a study from incomplete to complete.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAME = process.argv[2];
const f = gateFindings();
if (!NAME) { console.error('usage: node quality/gates/study-check.mjs <name>'); process.exit(2); }

const refDir = path.join(ROOT, 'refs', NAME);
const grammarFile = path.join(ROOT, 'grammar', `${NAME}.json`);
if (!fs.existsSync(grammarFile)) {
  console.error(`✗ no grammar/${NAME}.json: run \`make study VIDEO=… NAME=${NAME}\` first`);
  process.exit(2);
}
const grammar = JSON.parse(fs.readFileSync(grammarFile, 'utf8'));

const missing = [];

// 1. coverage: study.mjs refuses to write a frame-count mismatch it cannot explain, so this only
//    checks the block survived and carries real numbers.
if (!grammar.coverage) missing.push('coverage: study.mjs did not write a coverage block (this grammar predates it). Re-run `make study`');
else {
  const { frames, unique, pages } = grammar.coverage;
  if (!(frames > 0)) missing.push('coverage.frames: not recorded');
  if (!(unique > 0)) missing.push('coverage.unique: not recorded');
  if (!(pages > 0)) missing.push('coverage.pages: not recorded');
}

// 2. every unique frame is on a page, and every page's ledger line is filled.
const pagesJsonFile = path.join(refDir, 'pages.json');
const pagesMdFile = path.join(refDir, 'pages.md');
if (!fs.existsSync(pagesJsonFile)) missing.push(`pages.json: missing (refs/${NAME}/pages.json). Re-run \`make study\``);
else {
  const pj = JSON.parse(fs.readFileSync(pagesJsonFile, 'utf8'));
  const paged = (pj.pages || []).reduce((n, p) => n + p.cells.length, 0);
  if (paged < pj.uniqueFrames)
    missing.push(`pages.json: ${pj.uniqueFrames} unique frame(s) but only ${paged} appear on a page`);
}

const unfilledPages = [];
if (!fs.existsSync(pagesMdFile)) missing.push(`pages.md: missing (refs/${NAME}/pages.md). Re-run \`make study\``);
else {
  for (const line of fs.readFileSync(pagesMdFile, 'utf8').split('\n')) {
    // Non-greedy up to the FIRST "): ", not the last ": " in the line: the fill placeholder itself
    // contains a colon ("<fill: what happens…"), and a greedy match swallowed it into the prefix.
    const m = /^page (\d+) \([^)]*\):\s*(.*)$/.exec(line.trim());
    if (m && /<fill/i.test(m[2])) unfilledPages.push(Number(m[1]));
  }
  if (unfilledPages.length) missing.push(`pages.md: page(s) ${unfilledPages.join(', ')} still say "<fill…>"`);
}

// 3. every shot's authored prose is written, not null.
const nullShots = { onScreen: [], moves: [], trigger: [] };
for (const s of grammar.shots || []) {
  if (s.onScreen == null) nullShots.onScreen.push(s.i);
  if (s.moves == null) nullShots.moves.push(s.i);
  if (s.trigger == null) nullShots.trigger.push(s.i);
}
for (const [field, ids] of Object.entries(nullShots))
  if (ids.length) missing.push(`shot ${field} is null for shot(s) ${ids.join(', ')}`);

// 4. no joint left unstated. The equal-slice fallback is deleted from study.mjs; a grammar that still
//    carries its old name is stale and must be re-studied, not patched.
if (grammar.measured && grammar.measured.shotDetection === 'fixed-sampling')
  missing.push('measured.shotDetection: "fixed-sampling" is the deleted silent fallback. Re-run a current `make study`');

const complete = missing.length === 0;
grammar.coverage = { ...(grammar.coverage || {}), ledger: complete ? 'complete' : 'incomplete' };
fs.writeFileSync(grammarFile, JSON.stringify(grammar, null, 1) + '\n');

console.log(`\n  STUDY-CHECK · ${NAME}\n`);
if (complete) {
  console.log(`  ✓ complete: every unique frame is paged, every page is filled, every shot's prose is written.`);
} else {
  for (const m of missing) { console.log(`  ✗ ${m}`); f.fail('incomplete', m); }
}
console.log('');
process.exit(complete ? 0 : 1);
