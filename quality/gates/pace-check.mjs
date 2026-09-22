// quality/gates/pace-check.mjs: is anything actually HAPPENING, and how often?
//
//   node quality/gates/pace-check.mjs <scene.json> [--strict]
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
// FLOOR IS REPORTING ONLY, NOT A BAR. It used to fail a film under 1.0 events/s, "this library's own
// tenth percentile among films" (this file's prior header). That is corpus-derived, the exact defect
// named in engine-doctrine's rules-from-sources plan: a threshold justified by our own films is a
// finding, not a bar, unless it is a RELATIVE check by design (`direction-floor`'s corpus checks are;
// this metric asks an absolute question, "is this film asleep", so it is not). No editing-rhythm
// literature publishes a cuts-or-arrivals-per-second floor for a metric this bespoke (this gate's own
// events include layer arrivals and departures, not shot cuts, so even a published average-shot-length
// figure would not transfer), and this gate's own header already admits the measure is too crude to
// trust as a verdict (it cannot see a count ticking or a route drawing). Rather than invent a source
// nobody could check, FLOOR stays as a number worth PRINTING (the eps count below it, and the "asleep"
// flag in the census), and stops being a number that fails a film.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { population, LIBRARY, SCENE_DIR } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const strict = process.argv.includes('--strict');

// FLOOR: reporting only, see the header. Calibrated on the committed library, films only: median is
// 1.20 and p90 is 1.92; a fixture or a backdrop sits nearer 0.15 and is meant to. Kept as the line
// under which the census flags a film "asleep", never as a reason this gate fails one.
const FLOOR = 1.0;
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
const problems = [];
// FLOOR no longer files a finding, see the header: it is corpus-derived and this gate's own crude
// measure cannot carry an absolute bar. Still printed, next to the number it describes.
const asleep = m.copy && m.eps < FLOOR;
if (m.hold > HOLD && !m.allow.includes('slow-pace')) {
  problems.push(`${m.hold.toFixed(1)}s from ${m.at.toFixed(1)}s with nothing arriving or leaving, against a cap of `
    + `${HOLD.toFixed(1)}s. A held frame is a device; ${HOLD}s of one is a stall.`);
}

console.log(`\n  pace · ${file}  ${m.eps.toFixed(2)} events/s · ${m.events} event(s) over ${m.dur}s · longest hold `
  + `${m.hold.toFixed(1)}s from ${m.at.toFixed(1)}s  (${FLOOR.toFixed(2)} ev/s is this library's tenth percentile, `
  + `reported not enforced · hold cap ${HOLD.toFixed(1)}s)`);
if (asleep) {
  console.log(`  ⚠ ${m.eps.toFixed(2)} events/s is below this library's own tenth percentile (${FLOOR.toFixed(2)}), `
    + `reported as a finding, not enforced as a bar: no external source publishes an events-per-second floor for `
    + `this gate's bespoke, deliberately crude measure. For scale: the median film is 1.20 ev/s.\n`);
}
if (!problems.length) {
  const waived = m.allow.includes('slow-pace');
  console.log(waived
    ? `  ○ pace rules WAIVED by {"authoring":{"allow":["slow-pace"]}}, the ${HOLD.toFixed(1)}s hold cap was not `
      + `applied. The numbers above are measured; no verdict was reached.\n`
    : `  ✓ within the hold cap${asleep ? ' (the events/s finding above is reported, not a failure)' : ''}\n`);
  process.exit(0);
}
// Both problems are filed under the one code this gate has ever emitted, `pace`; the specific
// diagnosis is the summary. The record is the finding (engine-doctrine/MISTAKES.md #401).
const F = gateFindings({ scene: file, indent: '    ' });
for (const p of problems) F.warn('pace', p);
F.emit();
console.log(strict ? '\n  ✗ pace (strict)\n' : '\n  Waive a deliberately still film with {"authoring":{"allow":["slow-pace"]}}.\n');
process.exit(strict ? 1 : 0);
