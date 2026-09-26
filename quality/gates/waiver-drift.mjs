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
// A BARE waiver ("dead-air") excuses its code for the WHOLE FILM, forever, whichever finding fires:
// measured, a new 1.0:1 contrast defect on a NEW beat rode through as "(waived)" under an excuse
// written for a different one. An entry may instead name the ONE instance it excuses, "dead-air@beat:3"
// (harness/lib/waivers.mjs), matched against exactly what that code's own finding calls `at`. A bare
// entry still works everywhere it always did; this file and author-check.mjs now also say, every time
// one is active, how many live findings it is hiding, so a film-wide excuse cannot hide its own size.
//
//   node quality/gates/waiver-drift.mjs [<scene.json>]     ·   make dev-tool X=waivers [D=<file>]
//   node quality/gates/waiver-drift.mjs --suggest <scene.json>   the instance-scoped entries that
//     would excuse exactly today's findings under each bare waiver this film carries, for migrating
//     off a film-wide excuse without rewriting the film. Never rewrites the file itself.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { population, LIBRARY, AUTHORED } from '../../harness/lib/census.mjs';
import { gateFindings, readFindings } from '../../harness/lib/findings.mjs';
import { codeFiresOn, gateForCode } from '../../harness/lib/code-fires.mjs';
import { splitWaiver, groupWaivers, bareWaiverCoverage, hasReason, MIN_REASON_LEN } from '../../harness/lib/waivers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'films', 'scene');
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

// Run the gate that owns `code` over one scene and hand back what it FOUND (not just whether it fired,
// which is all codeFiresOn answers): the caller wants each finding's `at`, to name the instance a bare
// waiver is hiding or to suggest the scoped entry that would replace it. `gateForCode` can point back
// at this very file (someone waived one of waiver-drift's OWN codes, which excuses nothing real but is
// not this function's problem to fix) or at author-check.mjs (`no-storyboard`, `no-authored-motion`,
// checked from inside it and never spawnable on their own); both would either recurse or find nothing,
// so both are refused here rather than spawned.
let seq = 0;
const spawnTmp = path.join('/tmp/.waiver-drift', String(process.pid));
function spawnAndRead(gate, sceneFile) {
  if (gate === 'quality/gates/waiver-drift.mjs' || gate === 'quality/gates/author-check.mjs') return [];
  fs.mkdirSync(spawnTmp, { recursive: true });
  const out = path.join(spawnTmp, `f-${++seq}.json`);
  spawnSync('node', [path.join(ROOT, gate), sceneFile], {
    encoding: 'utf8', cwd: ROOT, timeout: 60000, env: { ...process.env, VAWE_FINDINGS_OUT: out },
  });
  return readFindings(out) || [];
}

// ---- the census ----
const tally = new Map();      // code -> [scene names]
let total = 0;
// The population comes from harness/lib/census.mjs, which states N and REFUSES a checkout that cannot
// see the library rather than counting what is left (engine-doctrine/MISTAKES.md #391). `quiet` because the census
// header below is the line CLAUDE.md quotes, and two counts would invite the drift this gate is about.
const pop = population('waiver census', { filter: LIBRARY, quiet: true });
// The census counts by CODE, whatever shape the entry is written in: drift asks whether a RULE is
// being repealed, and an instance-scoped waiver ("dead-air@beat:3") is still one film choosing to
// break that rule, same as a bare one. The instance half matters to author-check (which finding it
// excuses); it does not change whether the film is on this list.
// REASONLESS and DUPLICATE, gathered in the same pass. `reasonless` is the library-wide twin of
// author-check's per-film block (AGENTS.md: "a waiver with no `_why` blocks"): author-check only ever
// sees the one film it is handed, so a film whose waiver was never re-checked after it was written
// stays reasonless forever. `reasonText` collects every real reason so a verbatim copy across films
// (or across codes in the same film) shows up as its own finding, never mistaken for two decisions.
const reasonless = [];              // [{ film, entry }]
const reasonText = new Map();       // normalized reason -> [{ film, entry }]
for (const f of pop.names) {
  let d; try { d = JSON.parse(fs.readFileSync(path.join(SCENES, f), 'utf8')); } catch { continue; }
  total++;
  const name = path.basename(f, '.json');
  const why = (d.authoring && (d.authoring._why || d.authoring.why || d.authoring.reason)) || {};
  for (const entry of (d.authoring?.allow || [])) {
    const { code } = splitWaiver(entry);
    if (!tally.has(code)) tally.set(code, []);
    tally.get(code).push(name);
    if (!hasReason(why, entry)) { reasonless.push({ film: name, entry }); continue; }
    const norm = why[entry].trim().toLowerCase();
    if (!reasonText.has(norm)) reasonText.set(norm, []);
    reasonText.get(norm).push({ film: name, entry });
  }
}

// A WAIVER FOR A RULE THAT NO LONGER EXISTS IS NOISE, and worse, it reads as a live argument. When a
// gate is deleted its codes have to be named here, or the census keeps counting ghosts and every author
// who reads a scene file believes a rule is being dodged that nothing has enforced for months.
// Retired: `visual-vocabulary`'s three codes. It measured a single-axis layer by squaring it, so a
// 590x18 underline scored as 590x590 and bought a pass off the exact defect the gate existed to catch;
// it was also waived by a quarter of the library. Deleted rather than fixed, engine-doctrine/TASTE.md says why.
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
// ---- the migration helper: what would replace a bare waiver, without rewriting the film ----
if (process.argv.includes('--suggest')) {
  if (!file) { console.error('usage: node quality/gates/waiver-drift.mjs --suggest <scene.json>'); process.exit(2); }
  if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
  let d; try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
  const { bare } = groupWaivers(d.authoring?.allow || []);
  console.log(`\n  WAIVER MIGRATION · ${path.basename(file)}\n`);
  if (!bare.size) { console.log('  no bare (film-wide) waivers here. Nothing to suggest.\n'); process.exit(0); }
  for (const c of bare) {
    if (RETIRED.has(c)) { console.log(`  ${c}: DEAD WAIVER, delete it; nothing to migrate.`); continue; }
    const gate = gateForCode(c);
    if (!gate) { console.log(`  ${c}: no gate in the source is known to emit this code. Cannot check what it excuses.`); continue; }
    const recs = spawnAndRead(gate, file).filter((r) => r.code === c);
    if (!recs.length) { console.log(`  ${c}: does not fire on this film right now. The bare waiver excuses nothing today; delete it.`); continue; }
    const named = recs.filter((r) => r.at !== undefined && r.at !== null);
    if (named.length !== recs.length) {
      console.log(`  ${c}: fires ${recs.length} time(s), but its gate (${gate}) names no instance (\`at\`) on the`);
      console.log(`      finding, so there is no scoped form to suggest. Bare is the only shape this code has.`);
      continue;
    }
    const instances = [...new Set(named.map((r) => String(r.at)))];
    console.log(`  ${c}: replace the bare entry with ${instances.length} scoped one(s), matching today's ${recs.length} finding(s):`);
    console.log(`      "allow": [${instances.map((i) => `"${c}@${i}"`).join(', ')}]`);
    console.log(`      "_why": { ${instances.map((i) => `"${c}@${i}": "…"`).join(', ')} }`);
  }
  console.log(`\n  This only PRINTS the suggestion; edit the scene yourself. A film not listed above already\n`);
  console.log(`  has no bare waiver worth narrowing, or narrows to nothing (delete it instead).\n`);
  process.exit(0);
}

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
  for (const entry of mine) {
    const { code: c, instance } = splitWaiver(entry);
    const scope = instance ? `@${instance}` : ' (film-wide)';
    if (RETIRED.has(c)) {
      console.log(`  ✗ ${entry}, DEAD WAIVER: no gate emits this code any more (${RETIRED.get(c)}).`);
      console.log(`      Delete it from "authoring.allow" (and its \`_why\`). It excuses nothing.`);
      f.warn('dead-waiver', `${entry}: no gate emits this code any more (${RETIRED.get(c)}), delete it from "authoring.allow"`, { at: entry });
      continue;
    }
    // The reason check runs on EVERY waiver, shared or not. It used to sit after the "waived here and
    // nowhere else" early return below, so a bare waiver unique to one film was praised as "a decision"
    // even carrying no `_why` at all: exactly the 42% that shipped with no reason despite AGENTS.md's
    // "a waiver with no `_why` blocks" (author-check.mjs only ever checks the one film it is handed;
    // this is the only pass that sees the whole library).
    const why = d.authoring?._why?.[entry];
    if (!hasReason(d.authoring && (d.authoring._why || d.authoring.why || d.authoring.reason), entry)) {
      console.log(`  ✗ ${entry}${scope}: NO REASON. AGENTS.md: a waiver with no \`_why\` blocks.`);
      f.warn('waiver-no-reason', `${entry}: no \`_why\` (or under ${MIN_REASON_LEN} chars) on ${name}`, { at: entry });
    }
    const others = (tally.get(c) || []).filter((n) => n !== name);
    if (!others.length) { console.log(`  ✓ ${entry}${scope}: waived here and nowhere else. That is a decision.`); continue; }
    const pct = Math.round(share(c) * 100);
    const line = `${entry}${scope}: also waived by ${others.length} other film(s) (${pct}% of the library, by code): ${others.slice(0, 6).join(', ')}${others.length > 6 ? ', …' : ''}`;
    if (share(c) >= DRIFT) {
      console.log(`  ~ ${line}`);
      console.log(`      At this share the rule is effectively repealed and nothing recorded that decision.`);
      console.log(`      Either fix the films, or change the gate honestly, but stop paying the toll.`);
      f.warn('waiver-drift', `${line}. At this share the rule is effectively repealed.`, { at: entry });
    } else {
      console.log(`  · ${line}`);
      f.note('waiver-shared', line, { at: entry });
    }
    if (why && reasonText.has(why.trim().toLowerCase()) && reasonText.get(why.trim().toLowerCase()).length > 1) {
      console.log(`      and this exact reason is copied verbatim onto another waiver: run the whole-library`);
      console.log(`      census (no <scene.json> argument) for the full duplicate list.`);
    }
  }
  // A BARE entry excuses its code film-wide; say how many LIVE findings that hides right now, the same
  // notice author-check.mjs prints mid-ladder, so waiver-drift and the ladder never disagree about it.
  {
    const { bare } = groupWaivers(mine);
    for (const c of bare) {
      const gate = gateForCode(c);
      if (!gate) continue;
      const recs = spawnAndRead(gate, file);
      const cov = bareWaiverCoverage(mine, c, recs.filter((r) => r.code === c).map((r) => ({ code: r.code, at: r.at })));
      if (cov && cov.count > 1) {
        console.log(`  ~ ${c} is a FILM-WIDE waiver and hides ${cov.count} live finding(s) right now`
          + `${cov.hasInstanceData ? `: ${cov.instances.join(', ')}` : ', with no per-instance data to tell them apart'}.`);
        f.warn('bare-waiver-hides-many', `${c}: a bare waiver on ${name} hides ${cov.count} live finding(s) at once`, { at: c });
      }
    }
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

// ---- REASONLESS, the library-wide half of author-check's own rule ------------------------------
//
// AGENTS.md: "a waiver with no `_why` blocks." author-check.mjs enforces that, correctly, on the ONE
// film it is handed. Nothing else in this repo ever re-checks a waiver once it ships: films/scene/ is
// gitignored (.gitignore:61), pre-push never touches it, and `make test` is pure unit tests on the
// motion primitives. So a waiver added without immediately re-running author-check on that film stays
// reasonless forever, invisible to everything except this census. This is the count that matters.
if (reasonless.length) {
  const byFilm = new Map();
  for (const { film, entry } of reasonless) { if (!byFilm.has(film)) byFilm.set(film, []); byFilm.get(film).push(entry); }
  console.log(`\n  ✗ REASONLESS: ${reasonless.length} waiver(s) with no \`_why\` (or under ${MIN_REASON_LEN} chars),`
    + ` in ${byFilm.size} film(s):\n`);
  for (const [film, entries] of [...byFilm.entries()].sort()) console.log(`      ${film.padEnd(30)} ${entries.join(', ')}`);
  console.log(`\n  Each is an author's own to write; this only counts them. Re-run author-check on a film to`);
  console.log(`  block on its own reasonless waivers: node quality/gates/author-check.mjs <scene.json>\n`);
}

// ---- DUPLICATE REASONS: a reason copied is not a reason for either waiver it sits on -----------
const duped = [...reasonText.entries()].filter(([, hits]) => hits.length > 1);
if (duped.length) {
  console.log(`\n  ✗ DUPLICATE REASONS: ${duped.length} reason(s) copied verbatim across more than one waiver:\n`);
  for (const [text, hits] of duped) {
    console.log(`      "${text}"`);
    for (const { film, entry } of hits) console.log(`        ${film.padEnd(30)} ${entry}`);
    f.warn('waiver-reason-duplicate', `reason "${text}" copied verbatim onto ${hits.length} waiver(s): `
      + `${hits.map((h) => `${h.film}:${h.entry}`).join(', ')}`, { at: text });
  }
  console.log('');
}

// ---- THE LEGACY-WAIVER RATCHET (opt-in: --ratchet) --------------------------------------------
//
// `quality/gates/legacy-fold.mjs` wrote 562 `"legacy: grandfathered …"` waivers into scenes so the
// 12-character `_why` floor never had to be argued with. `quality/gates/legacy-unfold.mjs` deleted
// them and stamped what was really behind them into `quality/baselines/legacy-waiver-ratchet.json`:
// one number per code, the count of films that GENUINELY still fire it. That number may only fall.
//
// This does NOT run by default: the header above is still true for the census ("it never blocks"),
// and this recomputes a live-fire count by spawning the owning gate against every scene for every
// ratcheted code, which is minutes, not seconds. `--ratchet` opts in; `--stamp` (with `--ratchet`)
// lowers the file when a real fix earned it. This is the one path in this gate that can exit non-zero.
if (process.argv.includes('--ratchet')) {
  const RATCHET_FILE = path.join(ROOT, 'quality/baselines/legacy-waiver-ratchet.json');
  const stamp = process.argv.includes('--stamp');
  const baseline = (() => { try { return JSON.parse(fs.readFileSync(RATCHET_FILE, 'utf8')); } catch { return {}; } })();
  const codes = Object.keys(baseline);
  // Three of these codes grade MOTION (no-authored-motion, plain-slideshow, static-bg): re-measuring
  // them over `pop.names` (LIBRARY) counts still-tile catalogues and held-still demos that were never
  // authored as films (harness/lib/census.mjs's AUTHORED comment). Every other ratcheted code (does a
  // scene waive a rule, carry a beat blueprint, …) has nothing to do with whether a person planned the
  // film, so it stays on LIBRARY.
  const MOTION_CODES = new Set(['no-authored-motion', 'plain-slideshow', 'static-bg']);
  // soft: a concurrent worktree can legitimately trail main by a few in-flight scratch storyboards
  // (engine-doctrine/MISTAKES.md #391 is about a tool going blind and staying silent, not about refusing to run
  // at all here); PARTIAL is stated below rather than swallowed.
  const authoredPop = population('waiver census · authored', { filter: AUTHORED, quiet: true, soft: true });
  console.log(`\n  LEGACY-WAIVER RATCHET · re-measuring ${codes.length} code(s) across ${pop.names.length} film(s)`
    + ` (${authoredPop.names.length} authored${authoredPop.blind ? `, PARTIAL: ${authoredPop.blind.split('\n')[0]}` : ''}, for the motion codes)…`);
  const current = {};
  for (const code of codes) {
    const names = MOTION_CODES.has(code) ? authoredPop.names : pop.names;
    let n = 0;
    for (const name of names) {
      const abs = path.join(SCENES, name);
      let d; try { d = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
      if (!codeFiresOn(code, abs, d)) continue;
      const why = d.authoring?._why?.[code];
      const isRealDecision = hasReason(d.authoring?._why, code) && !why.startsWith('legacy:');
      if (!isRealDecision) n++; // a real, human `_why` is a decision and does not count as debt
    }
    current[code] = n;
  }
  console.log(`\n  ${'code'.padEnd(30)} ${'ratchet'.padEnd(9)} now`);
  let worse = false;
  for (const code of codes) {
    const before = baseline[code] ?? 0;
    const now = current[code];
    const mark = now > before ? '✗' : now < before ? '↓' : ' ';
    if (now > before) worse = true;
    console.log(`  ${mark} ${code.padEnd(28)} ${String(before).padEnd(9)} ${now}`);
  }
  if (stamp) {
    fs.writeFileSync(RATCHET_FILE, `${JSON.stringify(current, null, 1)}\n`);
    console.log(`\n  ✓ ratchet stamped at the current count(s).`);
  } else if (worse) {
    console.log(`\n  ✗ at least one code fires on MORE films than the ratchet allows. Fix the film(s), or if`);
    console.log(`    this is a real regression someone should look at, that is the point: it is now visible.`);
    console.log(`    Never lower the ratchet to match a regression; --stamp is for when things get BETTER.`);
    f.fail('legacy-waiver-ratchet', 'a legacy-waiver code fires on more films than the ratchet allows; see the table above');
    process.exit(1);
  } else {
    console.log(`\n  ✓ within the ratchet. Lower it as films get fixed: node quality/gates/waiver-drift.mjs --ratchet --stamp`);
  }

  // ---- THE INSTANCE-COUNT RATCHET, same opt-in, a different question --------------------------
  //
  // The legacy ratchet above asks how many FILMS still fire a code. This asks something the instance
  // syntax makes visible for the first time: of the films that waive a code BARE (film-wide, whichever
  // instance fires), how many live findings does that waiver hide RIGHT NOW, summed across them? A bare
  // waiver growing quieter as findings get fixed is fine; one growing louder as a NEW instance rides in
  // under an old excuse is exactly the incident this phase exists to make visible (see header).
  const INSTANCE_FILE = path.join(ROOT, 'quality/baselines/waiver-instance-ratchet.json');
  const instanceBaseline = (() => { try { return JSON.parse(fs.readFileSync(INSTANCE_FILE, 'utf8')); } catch { return null; } })();
  const bareCodes = rows.map(([c]) => c).filter((c) => (tally.get(c) || []).some((n) => {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(SCENES, `${n}.json`), 'utf8')); } catch { return false; }
    return groupWaivers(d.authoring?.allow || []).bare.has(c);
  }));
  const instanceCurrent = {};
  for (const c of bareCodes) {
    const gate = gateForCode(c);
    if (!gate) { instanceCurrent[c] = instanceBaseline?.[c] ?? 0; continue; } // unknown gate: cannot re-measure, carry the baseline forward rather than guess
    let n = 0;
    for (const name of tally.get(c)) {
      const abs = path.join(SCENES, `${name}.json`);
      let d; try { d = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
      if (!groupWaivers(d.authoring?.allow || []).bare.has(c)) continue; // this film scoped its waiver, not bare
      n += spawnAndRead(gate, abs).filter((r) => r.code === c).length;
    }
    instanceCurrent[c] = n;
  }
  if (!instanceBaseline) {
    fs.mkdirSync(path.dirname(INSTANCE_FILE), { recursive: true });
    fs.writeFileSync(INSTANCE_FILE, `${JSON.stringify(instanceCurrent, null, 1)}\n`);
    console.log(`\n  ✓ no instance-ratchet baseline yet: recorded the current count(s) to ${path.relative(ROOT, INSTANCE_FILE)}.`);
  } else {
    console.log(`\n  ${'code'.padEnd(30)} ${'baseline'.padEnd(9)} now (findings hidden by BARE waivers)`);
    let grew = false;
    for (const c of new Set([...Object.keys(instanceBaseline), ...bareCodes])) {
      const before = instanceBaseline[c] ?? 0, now = instanceCurrent[c] ?? 0;
      const mark = now > before ? '✗' : now < before ? '↓' : ' ';
      if (now > before) grew = true;
      console.log(`  ${mark} ${c.padEnd(28)} ${String(before).padEnd(9)} ${now}`);
    }
    if (stamp) {
      fs.writeFileSync(INSTANCE_FILE, `${JSON.stringify(instanceCurrent, null, 1)}\n`);
      console.log(`\n  ✓ instance ratchet stamped at the current count(s).`);
    } else if (grew) {
      console.log(`\n  ✗ a bare waiver hides MORE findings than the baseline recorded. A NEW instance rode in`);
      console.log(`    under an old excuse: narrow the waiver (--suggest names the scoped form) or fix the film.`);
      f.fail('waiver-instance-growth', 'a bare waiver hides more live findings than the recorded baseline; see the table above');
      process.exit(1);
    } else {
      console.log(`\n  ✓ within the instance ratchet.`);
    }
  }
}
