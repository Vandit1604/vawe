// quality/gates/pace-check.mjs: is anything actually HAPPENING, and how often?
//
//   node quality/gates/pace-check.mjs <scene.json> [--strict]   (--strict is now a no-op: see FLOOR/HOLD below)
//   node quality/gates/pace-check.mjs            (census across the committed library)
//
// WHY THIS EXISTS. Two films were authored as a deliberate improvement on showcase-flight.json and both
// came out SLOWER than the thing they replaced: 0.85 and 0.95 events per second against its 1.79, and
// below the library's own median of 1.20. Nobody had to watch them to know, it is arithmetic on the
// JSON, and nothing measured it (engine-doctrine/MISTAKES.md #336).
//
// The gate that knew already existed and was looking at the wrong artefact. `storyboard-check` warns
// `held-state-too-long` at about 1.5 seconds, and it grades the PLAN. Both films were replanned until
// that warning cleared, and then authored with a nine-second route draw and an eleven-second camera
// settle. The plan said seven beats; the render holds. CLAUDE.md says it plainly: a green
// storyboard-check proves nothing about the film.
//
// WHAT AN EVENT IS. Any moment a layer arrives or leaves, plus every cut. It is deliberately crude: it
// cannot see a count ticking or a route drawing, so a film can score badly and be fine.
//
// It cannot see the opposite failure either. A film can hit any number here by strobing its layers, and
// `direction-floor`'s effect-soup check is the ceiling that answers for that.
//
// FLOOR AND HOLD ARE BOTH REPORTING ONLY, NOT A BAR. FLOOR used to fail a film under 1.0 events/s,
// "this library's own tenth percentile among films" (this file's prior header): corpus-derived, the
// exact defect named in engine-doctrine's rules-from-sources plan, a threshold justified by our own
// films is a finding, not a bar, unless it is a RELATIVE check by design (`direction-floor`'s corpus
// checks are; this metric asks an absolute question, "is this film asleep", so it is not). No
// editing-rhythm literature publishes a cuts-or-arrivals-per-second floor for a metric this bespoke
// (this gate's own events include layer arrivals and departures, not shot cuts, so even a published
// average-shot-length figure would not transfer), and this gate's own header already admits the
// measure is too crude to trust as a verdict (it cannot see a count ticking or a route drawing).
//
// HOLD had no source at all, not even a corpus one, just this file's own assertion ("4s of one is a
// stall"). Same defect as `held-state-too-long` in harness/lib/genre-pacing.mjs, and the same fix:
// no perception or craft literature answers "how long may an arbitrary visual state hold", because the
// answer depends on what the beat is SHOWING. Rather than invent a source nobody could check, both
// numbers stay worth PRINTING (the eps and hold figures, the "asleep" flag in the census), and stop
// being numbers that fail a film. The craft judgement moved to `make plan-judge`'s `beat-pacing` code,
// an agent looking at the plan, same as genre-pacing.mjs's.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { population, LIBRARY, SCENE_DIR } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
// `--strict` is accepted and ignored: neither FLOOR nor HOLD blocks any more (see the header), so
// there is nothing left for strict mode to escalate.

// FLOOR and HOLD: REPORTING ONLY. Both are ours, and both stay because the report needs a line to
// flag against, never because either can fail a film.
// Calibrated on the committed library, films only: median is 1.20 and p90 is 1.92; a fixture or a
// backdrop sits nearer 0.15 and is meant to. No external source exists. Cinemetrics and the average
// shot length literature answer a different question (whole-film ASL, not events per second for
// motion graphics), and no motion-graphics pacing standard was found. Same shape as eye-trace.mjs's
// JUMP_FAR. engine-doctrine/RESEARCH/TIMING-SOURCES.md part 6.
const FLOOR = 1.0;          // below this the census calls a film asleep
const HOLD = 4.0;           // seconds with nothing arriving or leaving
import { loadScene } from '../../core/engine/expand.js';
import { measureEvents } from '../../harness/lib/pace-events.mjs';

function measure(p) {
// The unified `transitions` surface is SUGAR: the engine lowers it to cuts/seams/stings before it
// renders anything (core/transitions/lower.js), and until this line the gates did not, so a scene
// that declared its boundaries the documented way was read as a film with no boundaries at all.
// Lowering here is idempotent and a no-op for a scene that already writes raw `cuts`. MISTAKES #380.
  const d = loadScene(JSON.parse(fs.readFileSync(p, 'utf8')));
  return measureEvents(d);
}

if (!file) {
  // WAS `git ls-files`, which sees only TRACKED scenes and then CRASHED on the one mustache template it
  // did see, so the census produced a stack trace instead of a verdict.
  const files = population('pace census', { filter: LIBRARY })
    .names.map((f) => `${SCENE_DIR}/${f}`);
  const rows = [];
  const broken = [];
  // A scene that fails to LOAD (a stale/renamed effect name, e.g.) must not crash the whole census: the
  // same bug class already killed this on an unreadable file once (see the note above); loadScene can
  // throw too, and one bad film should be reported, not take down the verdict for the other 176.
  for (const f of files) {
    let m;
    try { m = measure(path.resolve(ROOT, f)); }
    catch (e) { broken.push([f, e.message]); continue; }
    if (m) rows.push([f.split('/').pop().replace('.json', ''), m]);
  }
  rows.sort((a, b) => a[1].eps - b[1].eps);
  console.log('\n  pace census · events per second · reporting only, ' + FLOOR.toFixed(1) + ' ev/s is this library\'s own tenth percentile, not an external bar\n');
  for (const [n, m] of rows) {
    const flag = m.copy && m.eps < FLOOR ? '  ← slow (reported, not failed)' : '';
    console.log(`  ${n.padEnd(30)} ${m.eps.toFixed(2).padStart(5)} ev/s   ${String(m.dur).padStart(5)}s   `
      + `${m.copy ? String(m.copy).padStart(3) + ' line(s)' : '  no copy'}   longest hold ${m.hold.toFixed(1)}s${flag}`);
  }
  if (broken.length) {
    console.log(`\n  ${broken.length} scene(s) could not be measured (fix or drop them, they are not counted above):`);
    for (const [f, msg] of broken) console.log(`    ✗ ${f}: ${msg}`);
  }
  process.exit(0);
}

// path.resolve, not path.join: author-check runs this on the EXPANDED scene, whose path is absolute
// (/tmp/.author-check/<pid>/x.json). path.join(ROOT, "/tmp/...") absorbs the leading slash and yields
// ROOT/tmp/..., a file that does not exist, so pace-check crashed on every beat/block/comp film.
// path.resolve returns an absolute arg unchanged and still joins a repo-relative one. MISTAKES #568.
const m = measure(path.resolve(ROOT, file));
if (!m) { console.error(`✗ ${file}: no layers or no duration`); process.exit(2); }
// Neither FLOOR nor HOLD files a blocking finding any more, see the header: both are numbers this repo
// cannot cite (one corpus-derived, one asserted with no source at all), and this gate's own crude
// measure cannot carry an absolute bar for either. Both stay worth PRINTING, as `.note` records
// (engine-doctrine/MISTAKES.md #401: the record is the finding, so this still goes through gateFindings
// rather than being console-only prose nothing downstream can read).
const asleep = m.copy && m.eps < FLOOR;
const held = m.hold > HOLD;
const waived = m.allow.includes('slow-pace');
const F = gateFindings({ scene: file, indent: '    ' });
console.log(`\n  pace · ${file}  ${m.eps.toFixed(2)} events/s · ${m.events} event(s) over ${m.dur}s · longest hold `
  + `${m.hold.toFixed(1)}s from ${m.at.toFixed(1)}s  (${FLOOR.toFixed(2)} ev/s is this library's tenth percentile, `
  + `${HOLD.toFixed(1)}s hold is this file's own unsourced line, both reported not enforced)`);
if (asleep && !waived) {
  F.note('pace', `${m.eps.toFixed(2)} events/s is below this library's own tenth percentile (${FLOOR.toFixed(2)}), `
    + `reported, not enforced: no external source publishes an events-per-second floor for this gate's bespoke, `
    + `deliberately crude measure. For scale: the median film is 1.20 ev/s.`);
}
if (held && !waived) {
  F.note('pace', `${m.hold.toFixed(1)}s from ${m.at.toFixed(1)}s with nothing arriving or leaving, past this `
    + `file's own ${HOLD.toFixed(1)}s line. Reported, not enforced: no perception or craft source answers how `
    + `long an arbitrary visual state may hold, the same defect and the same fix as harness/lib/genre-pacing.mjs's `
    + `\`held-state-too-long\`. Judge it by eye, or with \`make plan-judge\`'s \`beat-pacing\` finding.`);
}
F.emit();
if (waived && (asleep || held)) {
  console.log(`\n  ○ pace WAIVED by {"authoring":{"allow":["slow-pace"]}}: the numbers above are measured, no `
    + `finding was filed.\n`);
} else if (asleep || held) {
  console.log(`\n  · reported above, not a failure: neither number here is a bar (see the header).\n`);
} else {
  console.log(`\n  ✓ within both reported lines\n`);
}
process.exit(0);
