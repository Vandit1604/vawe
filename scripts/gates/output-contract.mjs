// scripts/gates/output-contract.mjs: every REPORTING gate renders its findings through
// scripts/lib/findings.mjs, so it gets tight prose by default and --json for free. This gate counts the
// ones that still print ad-hoc prose and ratchets that number down. See docs/CRAFT/COMMAND-OUTPUT.md.
//
// WHY A RATCHET, NOT A REFUSAL AT THE WRITE SITE. The 52 non-conforming gates predate the contract, and
// rewriting all of them at once is the big-bang break the migration plan warns against. A ratchet lets
// the number fall one batch at a time and never rise, which is the same shape as verify/rung-ratchet.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GATES = path.join(ROOT, 'scripts/gates');
const RATCHET = path.join(ROOT, 'verify/output-contract-ratchet.json');

// Named, not silently skipped: a test runner tallies pass/fail (not finding-shaped), and this gate
// measures the others so it does not measure itself.
// compare.mjs streams live render progress (not pass/fail findings): routing it through findings.mjs
// would defer all output to one flush at the end and kill the progress feedback it exists to give.
const EXEMPT = new Set(['lib-test.mjs', 'output-contract.mjs', 'compare.mjs']);

/** A gate CONFORMS when it renders through findings.mjs. It is a MIGRATION TARGET when it prints its own
 * prose without that contract. A gate that prints nothing reports nothing, so it is neither. */
function classify() {
  const conforming = [], targets = [], silent = [];
  for (const file of fs.readdirSync(GATES).filter((f) => f.endsWith('.mjs')).sort()) {
    if (EXEMPT.has(file)) continue;
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
    at: `scripts/gates/${file}`,
    doc: 'docs/CRAFT/COMMAND-OUTPUT.md',
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
  console.error('    render through findings.mjs (docs/CRAFT/COMMAND-OUTPUT.md), so it gets --json for free.');
  console.error('    If this is deliberate, raise the bar on purpose: node scripts/gates/output-contract.mjs --stamp\n');
  process.exit(1);
}
if (prior && n < prior.adHoc) {
  console.error(`  ~ ${prior.adHoc - n} fewer ad-hoc gate(s) than the ratchet allows. Lower it:`
    + ' node scripts/gates/output-contract.mjs --stamp\n');
}
console.error('  ✓ no new ad-hoc reporting gate\n');
