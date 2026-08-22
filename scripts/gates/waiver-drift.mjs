// scripts/gates/waiver-drift.mjs — IS THIS WAIVER A DECISION, OR A HABIT?
//
// Every blocking gate here can be waived with {"authoring":{"allow":["code"]}} and a `_why`. That is
// correct: a rule worth having is worth breaking deliberately, and forcing an author to argue for the
// break is the whole design. But a waiver costs nothing and is invisible after the fact, so the failure
// mode is not one bad waiver. It is the SAME waiver, film after film, until the rule is dead and
// nothing ever said so.
//
// This gate exists because of a specific incident and it is worth naming plainly. `visual-vocabulary`
// blocked `thread` for being built out of rounded rectangles, which was correct, and the film was
// rebuilt with real props. Hours later it blocked `glass` for the same reason, and that one was waived.
// Both judgements may be defensible on their own. What no gate could see was the PATTERN, which is the
// only level at which "we keep excusing ourselves from this rule" is visible at all.
//
// So this counts. For each code a scene waives, it reports how many other shipped scenes waive the same
// code, and it escalates from silence, to a note, to a WARN once a code is being waived across a large
// share of the library. The number is the argument: one film waiving `no-visual-vocabulary` made a
// choice, and nine films waiving it have quietly repealed the show-don't-tell floor.
//
// It never blocks. A gate that blocked on this would itself be waived, which is the joke.
//
//   node scripts/gates/waiver-drift.mjs [<scene.json>]     ·   make waivers [D=<file>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'formats', 'scene');
const file = process.argv[2];

// LEGACY IS NOT A WAIVER, and this census is the one place they could be confused. A ratcheted rule
// (scripts/gates/legacy-manifest.json) grandfathers the films that predate it, and a reader who sees
// "no-storyboard: 2 waivers" here would conclude the rule is barely being dodged, when in fact 121 films
// are excused from it by date. Both numbers have to be visible, and they have to be visibly different:
// a waiver is a person's decision with a reason attached, legacy is nobody having looked yet.
let ratchet = { rules: {} };
try { ratchet = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/gates/legacy-manifest.json'), 'utf8')); } catch {}
const legacyCount = (code) => Object.keys(ratchet.rules?.[code]?.legacy || {}).length;
const legacyHolder = (code, name) => Boolean(ratchet.rules?.[code]?.legacy?.[name]);

// ---- the census ----
const tally = new Map();      // code -> [scene names]
let total = 0;
for (const f of fs.readdirSync(SCENES)) {
  if (!f.endsWith('.json') || /\.(animatic|intent|expanded|beatsync|captioned|directed)\./.test(f) || f === 'schema.json') continue;
  let d; try { d = JSON.parse(fs.readFileSync(path.join(SCENES, f), 'utf8')); } catch { continue; }
  if (d?.module !== 'scene') continue;
  total++;
  for (const c of (d.authoring?.allow || [])) {
    if (!tally.has(c)) tally.set(c, []);
    tally.get(c).push(path.basename(f, '.json'));
  }
}

// A WAIVER FOR A RULE THAT NO LONGER EXISTS IS NOISE, and worse, it reads as a live argument. When a
// gate is deleted its codes have to be named here, or the census keeps counting ghosts and every author
// who reads a scene file believes a rule is being dodged that nothing has enforced for months.
// Retired: `visual-vocabulary`'s three codes. It measured a single-axis layer by squaring it, so a
// 590x18 underline scored as 590x590 and bought a pass off the exact defect the gate existed to catch;
// it was also waived by a quarter of the library. Deleted rather than fixed — docs/TASTE.md says why.
const RETIRED = new Map([
  ['no-visual-vocabulary', 'visual-vocabulary, deleted (its size measurement was wrong)'],
  ['graphics-thin', 'visual-vocabulary, deleted (its size measurement was wrong)'],
  ['text-only-beat', 'visual-vocabulary, deleted (its size measurement was wrong)'],
]);

// A code waived by this share of the library has stopped being an exception. 0.15 is deliberately low:
// with ~100 scenes it takes fifteen films to trip, which is far past the point where a pattern is real.
const DRIFT = 0.15;
const share = (c) => (tally.get(c)?.length || 0) / Math.max(1, total);

// ---- one scene: is what you are about to do already a habit? ----
if (file) {
  if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
  let d; try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { process.exit(0); }
  const mine = d?.authoring?.allow || [];
  if (!mine.length) process.exit(0);
  const name = path.basename(file, '.json');
  for (const c of mine) {
    if (RETIRED.has(c)) {
      console.log(`  ✗ ${c} — DEAD WAIVER: no gate emits this code any more (${RETIRED.get(c)}).`);
      console.log(`      Delete it from "authoring.allow" (and its \`_why\`). It excuses nothing.`);
      continue;
    }
    const others = (tally.get(c) || []).filter((n) => n !== name);
    const pct = Math.round(share(c) * 100);
    if (!others.length) { console.log(`  ✓ ${c} — waived here and nowhere else. That is a decision.`); continue; }
    const why = d.authoring?._why?.[c];
    const line = `${c} — also waived by ${others.length} other film(s) (${pct}% of the library): ${others.slice(0, 6).join(', ')}${others.length > 6 ? ', …' : ''}`;
    if (share(c) >= DRIFT) {
      console.log(`  ~ ${line}`);
      console.log(`      At this share the rule is effectively repealed and nothing recorded that decision.`);
      console.log(`      Either fix the films, or change the gate honestly — but stop paying the toll.`);
    } else {
      console.log(`  · ${line}`);
    }
    if (!why) console.log(`      and it carries no \`_why\`, so the argument for breaking it does not exist.`);
  }
  console.log('');
  process.exit(0);
}

// ---- the whole library ----
const all = [...tally.entries()].sort((a, b) => b[1].length - a[1].length);
const dead = all.filter(([c]) => RETIRED.has(c));
const rows = all.filter(([c]) => !RETIRED.has(c));
console.log(`\n  WAIVER CENSUS · ${total} scenes\n`);
if (dead.length) {
  console.log(`  ✗ DEAD WAIVERS — no gate emits these codes any more, so they excuse nothing:\n`);
  for (const [c, films] of dead) console.log(`      ${c.padEnd(28)} ${films.length} film(s): ${films.slice(0, 6).join(', ')}${films.length > 6 ? ', …' : ''}`);
  console.log(`      (${[...new Set(dead.map(([c]) => RETIRED.get(c)))].join('; ')})\n`);
}
if (!rows.length) { console.log('  no live waivers anywhere.\n'); process.exit(0); }
console.log(`  ${'code'.padEnd(30)} ${'films'.padEnd(6)} share`);
console.log(`  ${'─'.repeat(30)} ${'─'.repeat(6)} ─────`);
for (const [c, films] of rows) {
  const pct = Math.round((films.length / total) * 100);
  console.log(`  ${(share(c) >= DRIFT ? '~ ' : '  ') + c.padEnd(28)} ${String(films.length).padEnd(6)} ${pct}%`);
}
const drifted = rows.filter(([c]) => share(c) >= DRIFT);
console.log(drifted.length
  ? `\n  ~ ${drifted.length} rule(s) are waived by ${Math.round(DRIFT * 100)}%+ of the library and have stopped being rules:\n`
    + drifted.map(([c]) => `      ${c}`).join('\n')
    + `\n\n  This is the number, not an opinion. A rule this often excused is either wrong and should be\n`
    + `  changed, or right and is being ignored. Both are worth an hour; neither is worth another waiver.\n`
  : `\n  ✓ no rule is being waived habitually.\n`);
