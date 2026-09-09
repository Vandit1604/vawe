// quality/gates/waiver-drift.mjs: IS THIS WAIVER A DECISION, OR A HABIT?
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
//   node quality/gates/waiver-drift.mjs [<scene.json>]     ·   make waivers [D=<file>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { population, LIBRARY } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'formats', 'scene');
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
// "It never blocks. A gate that blocked on this would itself be waived" (see header): every finding
// here is a WARN or a NOTE, never an error, so the exit code stays 0.
const f = gateFindings();

// LEGACY IS RETIRED. `quality/gates/legacy-manifest.json` used to grandfather films that predated a
// rule "by the calendar"; `quality/gates/legacy-fold.mjs` folded every one of its rows into an explicit
// `authoring.allow` + `_why` on the scene itself, and the manifest and the ratchet engine that read it
// were deleted (author-check.mjs). So this file no longer has to tell legacy and waived apart: every
// exception counted below is a real, per-scene, `_why`-carrying decision. `ratchet` stays as an empty
// shape (rather than a second read path) so the block that used to print it below simply prints nothing.
let ratchet = { rules: {} };
const legacyCount = () => 0;
const legacyHolder = () => false;

// ---- the census ----
const tally = new Map();      // code -> [scene names]
let total = 0;
// The population comes from harness/lib/census.mjs, which states N and REFUSES a checkout that cannot
// see the library rather than counting what is left (docs/MISTAKES.md #391). `quiet` because the census
// header below is the line CLAUDE.md quotes, and two counts would invite the drift this gate is about.
const pop = population('waiver census', { filter: LIBRARY, quiet: true });
for (const f of pop.names) {
  let d; try { d = JSON.parse(fs.readFileSync(path.join(SCENES, f), 'utf8')); } catch { continue; }
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
// it was also waived by a quarter of the library. Deleted rather than fixed, docs/TASTE.md says why.
const RETIRED = new Map([
  ['no-visual-vocabulary', 'visual-vocabulary, deleted (its size measurement was wrong)'],
  ['graphics-thin', 'visual-vocabulary, deleted (its size measurement was wrong)'],
  ['text-only-beat', 'visual-vocabulary, deleted (its size measurement was wrong)'],
  ['no-plan-for-craft', 'craft-checklist.mjs, folded into craft-unvisited (it duplicated no-storyboard)'],
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
  const name = path.basename(file, '.json');
  const liveCodes = [...tally.keys()].filter((c) => !RETIRED.has(c)).length;
  if (!mine.length) {
    // SAY THE SUBJECT IS EMPTY. Exiting mute made "this film waives nothing" and "this gate did not run"
    // the same output, and the parent ladder printed `→ nothing found` over both.
    console.log(`  ✓ this film waives nothing. Census for scale: ${total} scene(s), ${liveCodes} live waiver code(s).\n`);
    process.exit(0);
  }
  for (const c of mine) {
    if (RETIRED.has(c)) {
      console.log(`  ✗ ${c}, DEAD WAIVER: no gate emits this code any more (${RETIRED.get(c)}).`);
      console.log(`      Delete it from "authoring.allow" (and its \`_why\`). It excuses nothing.`);
      f.warn('dead-waiver', `${c}: no gate emits this code any more (${RETIRED.get(c)}), delete it from "authoring.allow"`, { at: c });
      continue;
    }
    const others = (tally.get(c) || []).filter((n) => n !== name);
    const pct = Math.round(share(c) * 100);
    if (!others.length) { console.log(`  ✓ ${c}: waived here and nowhere else. That is a decision.`); continue; }
    const why = d.authoring?._why?.[c];
    const line = `${c}: also waived by ${others.length} other film(s) (${pct}% of the library): ${others.slice(0, 6).join(', ')}${others.length > 6 ? ', …' : ''}`;
    if (share(c) >= DRIFT) {
      console.log(`  ~ ${line}`);
      console.log(`      At this share the rule is effectively repealed and nothing recorded that decision.`);
      console.log(`      Either fix the films, or change the gate honestly, but stop paying the toll.`);
      f.warn('waiver-drift', `${line}. At this share the rule is effectively repealed.`, { at: c });
    } else {
      console.log(`  · ${line}`);
      f.note('waiver-shared', line, { at: c });
    }
    if (!why) console.log(`      and it carries no \`_why\`, so the argument for breaking it does not exist.`);
  }
  for (const code of Object.keys(ratchet.rules || {})) {
    if (!legacyHolder(code, name)) continue;
    console.log(`  ▪ ${code} · this film holds LEGACY status (grandfathered ${ratchet.rules[code].legacy[name].since}).`);
    console.log(`      Not a waiver: nobody has looked at this film against that rule, and no reason is recorded.`);
    f.note('legacy-status', `${code}: this film holds LEGACY status (grandfathered ${ratchet.rules[code].legacy[name].since})`, { at: code });
  }
  console.log('');
  process.exit(0);
}

// ---- the whole library ----
const all = [...tally.entries()].sort((a, b) => b[1].length - a[1].length);
const dead = all.filter(([c]) => RETIRED.has(c));
const rows = all.filter(([c]) => !RETIRED.has(c));
console.log(`\n  WAIVER CENSUS · ${total} scenes in ${path.relative(ROOT, SCENES)}\n`);
console.log(`  Every share below is a share of THAT number. Films are gitignored on purpose (.gitignore:61),`);
console.log(`  so a fresh clone counts about a third as many and every percentage here moves with it. Quote the`);
console.log(`  count with the percentage or the percentage means nothing.\n`);
const ratcheted = Object.entries(ratchet.rules || {});
if (ratcheted.length) {
  console.log(`  ▪ GRANDFATHERED, which is a different thing. These rules were ratcheted on a date, and the`);
  console.log(`    films that predate them are excused BY THE CALENDAR, not by anyone's argument:\n`);
  for (const [code, entry] of ratcheted) console.log(`      ${code.padEnd(28)} ${String(legacyCount(code)).padEnd(6)} film(s), adopted ${entry.adopted}`);
  console.log(`    A legacy film carries no reason because no reason has been made. Edit one and it loses the`);
  console.log(`    status and must comply. Census: make legacy\n`);
}
if (dead.length) {
  console.log(`  ✗ DEAD WAIVERS: no gate emits these codes any more, so they excuse nothing:\n`);
  for (const [c, films] of dead) {
    console.log(`      ${c.padEnd(28)} ${films.length} film(s): ${films.slice(0, 6).join(', ')}${films.length > 6 ? ', …' : ''}`);
    f.warn('dead-waiver', `${c}: ${films.length} film(s) still carry this dead waiver (${RETIRED.get(c)}): ${films.slice(0, 6).join(', ')}${films.length > 6 ? ', …' : ''}`, { at: c });
  }
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
for (const [c, films] of drifted) {
  const pct = Math.round((films.length / total) * 100);
  f.warn('waiver-drift', `${c} is waived by ${films.length} film(s), ${pct}% of the library, and has stopped being a rule`, { at: c });
}
