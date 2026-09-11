// quality/gates/transitions-catalog.mjs: print THE TRANSITION DATABASE (core/transitions.js).
//   make transitions            → the full catalog, grouped by mechanism, basics marked ★
//   make transitions BASIC=1    → just the basics (the fundamentals every tool has)
//   make transitions D=<film.json> → per-boundary: current transition/seam, stated why, top candidates
// The catalog is DERIVED from the four source registries, so this is always in sync, its only failure
// mode is a name the family classifier didn't recognise (family "other"), which it reports at the end.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRANSITIONS, MECHANISMS, basics, unclassified } from '../../core/transitions/catalog.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { parseStoryboard, timeline } from '../../harness/author/storyboard-parse.mjs';
import { resolvedTransitionIn, parseTransitionWhy, isSeamRecipe, nearestTransitions } from '../../harness/lib/contract.mjs';
import { RELATIONSHIP_KEYS, candidatesFor } from '../../core/transitions/relationships.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// A report, never a rule: it never blocks, so every finding here is a WARN and the exit code stays 0.
const f = gateFindings();

// make transitions D=<film.json>: PER-BOUNDARY, the same procedure `make critics` briefs the transition
// decider to run first (docs/CRAFT/TRANSITIONS.md#the-decision-procedure-the-algorithm-to-run-at-every-
// seam). Read here, never re-derived: the exact fields storyboard-check.mjs already checks.
const filmArg = process.argv.slice(2).find((a) => !a.startsWith('--') && a.endsWith('.json'));
if (filmArg) {
  const abs = path.resolve(ROOT, filmArg);
  const name = path.basename(abs, '.json');
  const sbPath = path.join(path.dirname(abs), `${name}.storyboard.md`);
  if (!fs.existsSync(sbPath)) {
    console.error(`no storyboard at ${path.relative(ROOT, sbPath)}; nothing to report on.`);
    process.exit(2);
  }
  const src = fs.readFileSync(sbPath, 'utf8');
  const beats = timeline(parseStoryboard(src)).beats;
  console.log(`\n  TRANSITIONS · ${path.relative(ROOT, sbPath)} · ${Math.max(0, beats.length - 1)} boundary(ies)\n`);
  for (let i = 1; i < beats.length; i++) {
    const prev = beats[i - 1], b = beats[i];
    const resolved = resolvedTransitionIn(b);
    const seam = isSeamRecipe(b) || isSeamRecipe(prev);
    const current = resolved ? `fx:${resolved.fx}` : (b.transition_in ? `"${b.transition_in}" (unresolved)` : seam ? 'recipe seam' : 'nothing');
    const why = parseTransitionWhy(b.transition_why);
    const whyLine = why && !why.error ? `${why.relationship} · ${why.feeling} · ${why.mode}` : 'unreasoned';
    const relationship = why && !why.error ? why.relationship : null;
    const candidates = relationship ? (candidatesFor(relationship) || []) : nearestTransitions(`${prev.name} ${b.name}`, 3).map((t) => t.name);
    console.log(`  beat ${i} (${prev.name}) -> beat ${i + 1} (${b.name})`);
    console.log(`    current: ${current}`);
    console.log(`    why: ${whyLine}`);
    console.log(`    candidates${relationship ? ` for "${relationship}"` : ' (likely, unreasoned)'}: ${candidates.join(', ') || '(none)'}`);
    console.log(`    relationships: ${RELATIONSHIP_KEYS.join(', ')}. docs/CRAFT/TRANSITIONS.md#the-decision-procedure-the-algorithm-to-run-at-every-seam\n`);
  }
  process.exit(0);
}

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
