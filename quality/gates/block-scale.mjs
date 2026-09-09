// quality/gates/block-scale.mjs: how much of the block library sits on the shared scales.
//
//   node quality/gates/block-scale.mjs           report adoption, exit 0
//   node quality/gates/block-scale.mjs --strict  exit 1 on any off-scale value
//   node quality/gates/block-scale.mjs --sites   print every off-scale site, worst family first
//
// WHY THIS EXISTS. 155 blocks were each made to look right on their own, so improving the library cost
// 155 separate decisions and every new block started from nothing. Measured before the scales landed:
// gap carried 20 distinct values across 232 emissions, pad 25 across 277, and SIZE 29 across 452, of
// which 19/22/18/20/17/21 alone accounted for 316. Six adjacent integers carrying 316 type sizes is
// one decision nudged 316 times, not six decisions.
//
// A scale turns "what number looks right here" into "which step", and a step is CHECKABLE. That is the
// whole point: taste stops being an opinion per block and becomes a diff.
//
// IT REPORTS AND DOES NOT BLOCK, on purpose. The scales are new and nothing has been swept onto them
// yet, so a blocking gate here would fail most of the library for a rule it has never been given a
// chance to follow. Same reasoning `author-check` uses for its REPORTS tier. `--strict` is how the
// sweep will be driven, family by family, and how it stays clean afterwards.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKS } from '../../blocks/index.mjs';
import { SPACE_STEPS, TYPE_STEPS, R_STEPS } from '../../blocks/kit.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STRICT = process.argv.includes('--strict');
const SITES = process.argv.includes('--sites');
const f = gateFindings();

// The four props a scale governs, and the steps each one answers to.
const SCALES = {
  gap: SPACE_STEPS,
  pad: SPACE_STEPS,
  size: TYPE_STEPS,
  radius: R_STEPS,
};

// A `pad` may be a CSS shorthand string ("16px 22px"), so every number in it is a site.
const numbersIn = (v) => (typeof v === 'number' ? [v]
  : typeof v === 'string' ? (v.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  : []);

const tally = {};
for (const k of Object.keys(SCALES)) tally[k] = { on: 0, off: 0, values: {} };
const offSites = [];

for (const [name, f] of Object.entries(BLOCKS)) {
  if (typeof f !== 'function') continue;
  let out;
  try { out = f({ x: 0, y: 0, start: 0, dur: 4 }); } catch { continue; }
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (SCALES[k]) {
        for (const n of numbersIn(v)) {
          const t = tally[k];
          if (SCALES[k].includes(n)) t.on++;
          else { t.off++; t.values[n] = (t.values[n] || 0) + 1; offSites.push({ block: name, prop: k, value: n }); }
        }
      }
      if (v && typeof v === 'object') walk(v);
    }
  })(out);
}

const pct = (on, off) => (on + off ? Math.round((on / (on + off)) * 100) : 100);
console.log('block-scale: adoption of the shared scales (blocks/kit.mjs)\n');
let totalOff = 0;
for (const [k, t] of Object.entries(tally)) {
  totalOff += t.off;
  const worst = Object.entries(t.values).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([v, n]) => `${v}×${n}`).join(' ');
  console.log(`  ${k.padEnd(7)} ${String(pct(t.on, t.off)).padStart(3)}% on scale   (${t.on} on, ${t.off} off)`);
  if (t.off) console.log(`          off-scale: ${worst}`);
}

if (SITES) {
  const byBlock = offSites.reduce((m, s) => { (m[s.block] ||= []).push(`${s.prop}:${s.value}`); return m; }, {});
  console.log('\n  off-scale sites, worst block first:');
  for (const [b, list] of Object.entries(byBlock).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
    console.log(`    ${b.padEnd(20)} ${list.length.toString().padStart(3)}  ${[...new Set(list)].slice(0, 10).join(' ')}`);
  }
}

console.log(`\n  ${totalOff} off-scale value(s) across ${new Set(offSites.map((s) => s.block)).size} block(s).`);

// One finding per scale that carries off-values. WARN by default (this gate REPORTS on purpose, see the
// header comment); `--strict` is a caller flag, not a fixed severity, so it decides error vs warn here.
for (const [k, t] of Object.entries(tally)) {
  if (!t.off) continue;
  f.finding({ severity: STRICT ? 'error' : 'warn', code: `block-scale-${k}`,
    summary: `${t.off} off-scale ${k} value(s), ${pct(t.on, t.off)}% on scale`,
    fix: '--sites names every one; see blocks/kit.mjs for the shared scale' });
}

if (!STRICT) console.log('  Reporting only. `--strict` exits non-zero; `--sites` names every one.');
else if (totalOff) console.log(`\nblock-scale: FAIL under --strict. See ${path.relative(repoRoot, fileURLToPath(import.meta.url))}`);

f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
