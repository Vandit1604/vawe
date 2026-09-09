// quality/gates/transitions-catalog.mjs: print THE TRANSITION DATABASE (core/transitions.js).
//   make transitions            → the full catalog, grouped by mechanism, basics marked ★
//   make transitions BASIC=1    → just the basics (the fundamentals every tool has)
// The catalog is DERIVED from the four source registries, so this is always in sync, its only failure
// mode is a name the family classifier didn't recognise (family "other"), which it reports at the end.
import { TRANSITIONS, MECHANISMS, basics, unclassified } from '../../core/transitions/catalog.js';
import { gateFindings } from '../lib/findings.mjs';

// A report, never a rule: it never blocks, so every finding here is a WARN and the exit code stays 0.
const f = gateFindings();

const MECH_DESC = {
  anim: 'per-LAYER entrance/exit (anim / out on a layer)',
  cut: 'transforms ONE scene root over a window (cut, dir-aware)',
  sting: 'a generative shader OVERLAY over one beat',
  seam: 'a two-scene GPU blend of BOTH beats (real scene-to-scene)',
};

const onlyBasics = process.env.BASIC === '1' || process.argv.includes('--basic');
const rows = onlyBasics ? basics() : TRANSITIONS;

console.log(`\n  TRANSITION DATABASE · ${TRANSITIONS.length} transitions · ${basics().length} basics · core/transitions.js\n`);
for (const m of MECHANISMS) {
  const list = rows.filter((t) => t.mechanism === m);
  if (!list.length) continue;
  console.log(`  ${m.toUpperCase().padEnd(6)}: ${MECH_DESC[m]}`);
  // group by family within the mechanism
  const fams = [...new Set(list.map((t) => t.family))].sort();
  for (const f of fams) {
    const names = list.filter((t) => t.family === f)
      .map((t) => (t.basic ? '★' : ' ') + t.name + (t.dir ? '↕' : ''));
    console.log(`    ${f.padEnd(9)} ${names.join('  ')}`);
  }
  console.log('');
}
console.log('  ★ = basic · ↕ = direction-aware (left/right/up/down)');
console.log('  Decision theory (what to pick, and why): docs/CRAFT/TRANSITIONS.md\n');

const orphan = unclassified();
if (orphan.length) {
  console.log(`  ~ ${orphan.length} unclassified (family "other"), extend FAMILY_OF in core/transitions.js:`);
  console.log(`    ${orphan.map((t) => `${t.mechanism}:${t.name}`).join(', ')}\n`);
  f.warn('unclassified-transition', `${orphan.length} transition(s) fall into family "other": ${orphan.map((t) => `${t.mechanism}:${t.name}`).join(', ')}`,
    { fix: 'extend FAMILY_OF in core/transitions.js' });
}
