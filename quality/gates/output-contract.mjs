// quality/gates/output-contract.mjs: every REPORTING gate renders its findings through
// harness/lib/findings.mjs, so it gets tight prose by default and --json for free. This gate counts the
// ones that still print ad-hoc prose and ratchets that number down. See engine-doctrine/CRAFT/COMMAND-OUTPUT.md.
//
// WHY A RATCHET, NOT A REFUSAL AT THE WRITE SITE. The 52 non-conforming gates predate the contract, and
// rewriting all of them at once is the big-bang break the migration plan warns against. A ratchet lets
// the number fall one batch at a time and never rise, which is the same shape as quality/baselines/rung-ratchet.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GATES = path.join(ROOT, 'quality/gates');
const RATCHET = path.join(ROOT, 'quality/baselines/output-contract-ratchet.json');

// Named, not silently skipped: a test runner tallies pass/fail (not finding-shaped), and this gate
// measures the others so it does not measure itself.
// compare.mjs streams live render progress (not pass/fail findings): routing it through findings.mjs
// would defer all output to one flush at the end and kill the progress feedback it exists to give.
// next.mjs and stage.mjs print the ONE next command for a film, or where it is in the eight stages:
// navigation, not a finding about a scene.
// rubric.mjs is a library the vision judge imports for its prompt text; its own console.log calls sit
// behind a --self-test guard on the module, not a report a person runs to learn something about a film.
// legacy-fold.mjs's twin: legacy-unfold.mjs is a one-time migration script, run once to unwind 562
// machine-written waivers, not a check run again and again.
// contrast-regression.mjs and measure-regression.mjs are self-tests of quality/audit.mjs's own
// measurement logic (proving it still catches a fixture it caught before), the same shape as
// lib-test.mjs: a pass/fail tally over this repo's own gates, not a finding about a scene.
// review.mjs runs each check with `stdio: 'inherit'` so a person watching sees every check's own live
// output as it runs, the same reason compare.mjs is exempt: capturing that through findings.mjs would
// defer it all to one flush at the end, and a child's inherited output could not be silenced under
// --json anyway, so the contract's own "nothing but JSON on stdout" rule could not hold for it.
// gate-classification.mjs REGENERATES engine-doctrine/GATE-CLASSIFICATION.md (the doc-map.mjs/
// effects-catalog.mjs pattern); its one printed line reports what it wrote, not a finding about a
// film, the same reason next.mjs and stage.mjs are exempt for navigation instead of a verdict.
// hook-report-check.mjs is a self-test of harness/lib/hook-report.mjs's own shrinking logic (a
// pass/fail tally against a scratch dir), the same shape as lib-test.mjs and contrast-regression.mjs:
// not a finding about a scene.
// e2e-check.mjs runs `make e2e` with `stdio: 'inherit'` when a push touches the engine, the same
// reason review.mjs is exempt: a child's own live output can't be deferred through findings.mjs or
// silenced under --json.
const EXEMPT = new Set([
  'output-contract.mjs', 'compare.mjs', 'gate-mutation.mjs',
  'next.mjs', 'stage.mjs', 'rubric.mjs', 'legacy-unfold.mjs',
  'contrast-regression.mjs', 'measure-regression.mjs', 'review.mjs',
  'gate-classification.mjs', 'hook-report-check.mjs', 'e2e-check.mjs',
]);

/** A gate CONFORMS when it renders through findings.mjs. It is a MIGRATION TARGET when it prints its own
 * prose without that contract. A gate that prints nothing reports nothing, so it is neither. */
function classify() {
  const conforming = [], targets = [], silent = [];
  for (const file of fs.readdirSync(GATES).filter((f) => f.endsWith('.mjs')).sort()) {
    if (EXEMPT.has(file)) continue;
    // A *.test.mjs file is a test runner for one gate, tallying pass/fail like lib-test.mjs: not
    // finding-shaped, so it is out of scope the same way lib-test.mjs is, without listing each by name.
    if (file.endsWith('.test.mjs')) continue;
    const src = fs.readFileSync(path.join(GATES, file), 'utf8');
    const usesFindings = /findings\.mjs|gateFindings|emitJson/.test(src);
    const prints = /console\.(log|error)/.test(src);
    if (usesFindings) conforming.push(file);
    else if (prints) targets.push(file);
    else silent.push(file);
  }
  return { conforming, targets, silent };
}

const { conforming, targets, silent } = classify();
const n = targets.length;

// The 52 targets are recorded as findings so --json and the VAWE_FINDINGS_OUT aggregator get the whole
// worklist; prose mode stays quiet (just the ratchet line below), because listing 52 every run is the
// noise this whole effort exists to remove. findings.mjs flushes the records on exit (JSON under --json).
const f = gateFindings({ line: (r) => r.summary });
for (const file of targets) {
  f.warn('ad-hoc-output', `${file} prints its own prose; render through findings.mjs (tight prose + --json)`, {
    at: `quality/gates/${file}`,
    doc: 'engine-doctrine/CRAFT/COMMAND-OUTPUT.md',
  });
}

const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();

console.error(`\n  OUTPUT CONTRACT · ${conforming.length} conforming · ${n} still ad-hoc · ${silent.length} non-reporting\n`);

if (process.argv.includes('--stamp')) {
  fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
  fs.writeFileSync(RATCHET, `${JSON.stringify({ adHoc: n }, null, 1)}\n`);
  console.error(`  ✓ ratchet stamped at ${n} ad-hoc gate(s)${prior ? `, ${n <= prior.adHoc ? 'down' : 'UP'} from ${prior.adHoc}` : ''}\n`);
  process.exit(0);
}

if (prior && n > prior.adHoc) {
  console.error(`  ✗ ${n} gate(s) print ad-hoc prose, up from ${prior.adHoc}. A new reporting gate must`);
  console.error('    render through findings.mjs (engine-doctrine/CRAFT/COMMAND-OUTPUT.md), so it gets --json for free.');
  console.error('    If this is deliberate, raise the bar on purpose: node quality/gates/output-contract.mjs --stamp\n');
  process.exit(1);
}
if (prior && n < prior.adHoc) {
  console.error(`  ~ ${prior.adHoc - n} fewer ad-hoc gate(s) than the ratchet allows. Lower it:`
    + ' node quality/gates/output-contract.mjs --stamp\n');
}
console.error('  ✓ no new ad-hoc reporting gate\n');
