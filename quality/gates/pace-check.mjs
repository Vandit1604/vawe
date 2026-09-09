// quality/gates/pace-check.mjs: is anything actually HAPPENING, and how often?
//
//   node quality/gates/pace-check.mjs <scene.json> [--strict]
//   node quality/gates/pace-check.mjs            (census across the committed library)
//
// WHY THIS EXISTS. Two films were authored as a deliberate improvement on showcase-flight.json and both
// came out SLOWER than the thing they replaced: 0.85 and 0.95 events per second against its 1.79, and
// below the library's own median of 1.20. Nobody had to watch them to know, it is arithmetic on the
// JSON, and nothing measured it (docs/MISTAKES.md #336).
//
// The gate that knew already existed and was looking at the wrong artefact. `storyboard-check` warns
// `held-state-too-long` at about 1.5 seconds, and it grades the PLAN. Both films were replanned until
// that warning cleared, and then authored with a nine-second route draw and an eleven-second camera
// settle. The plan said seven beats; the render holds. CLAUDE.md says it plainly: a green
// storyboard-check proves nothing about the film.
//
// WHAT AN EVENT IS. Any moment a layer arrives or leaves, plus every cut. It is deliberately crude: it
// cannot see a count ticking or a route drawing, so a film can score badly and be fine. That is why the
// floor is set at the library's own tenth percentile among FILMS rather than at its median, the aim is
// to catch a film that is asleep, not to push everything toward the same rhythm.
//
// It cannot see the opposite failure either. A film can hit any number here by strobing its layers, and
// `direction-floor`'s effect-soup check is the ceiling that answers for that.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { population, LIBRARY, SCENE_DIR } from '../lib/census.mjs';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const strict = process.argv.includes('--strict');

// Calibrated on the committed library, films only. Median is 1.20 and p90 is 1.92; a fixture or a
// backdrop sits nearer 0.15 and is meant to.
const FLOOR = 1.0;          // below this a film is asleep
const HOLD = 4.0;           // seconds with nothing arriving or leaving
import { loadScene } from '../../core/engine/expand.js';

function measure(p) {
// The unified `transitions` surface is SUGAR: the engine lowers it to cuts/seams/stings before it
// renders anything (core/transitions/lower.js), and until this line the gates did not, so a scene
// that declared its boundaries the documented way was read as a film with no boundaries at all.
// Lowering here is idempotent and a no-op for a scene that already writes raw `cuts`. MISTAKES #380.
  const d = loadScene(JSON.parse(fs.readFileSync(p, 'utf8')));
  if (!d.layers || !d.duration) return null;
  const ev = new Set();
  const walk = (a) => a.forEach((l) => {
    if (l.start != null) ev.add(+Number(l.start).toFixed(2));
    if (l.start != null && l.duration != null) ev.add(+Number(l.start + l.duration).toFixed(2));
    if (l.children) walk(l.children);
  });
  walk(d.layers);
  for (const c of d.cuts || []) ev.add(c.t);
  for (const s of d.stings || []) ev.add(s.t);
  const t = [...ev].filter((x) => x >= 0 && x <= d.duration).sort((a, b) => a - b);
  // The longest stretch where nothing enters or leaves, INCLUDING the head and the tail: a film that
  // opens on four seconds of held frame is slow in exactly the way this is looking for.
  let hold = t.length ? t[0] : d.duration, at = 0;
  for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] > hold) { hold = t[i] - t[i - 1]; at = t[i - 1]; }
  if (t.length && d.duration - t[t.length - 1] > hold) { hold = d.duration - t[t.length - 1]; at = t[t.length - 1]; }
  // A film SAYS something. A backdrop or a determinism fixture has no copy and is meant to be still, so
  // it is measured and reported and never failed.
  const copy = JSON.stringify(d.layers).match(/"text"\s*:/g)?.length ?? 0;
  return { dur: d.duration, eps: t.length / d.duration, events: t.length, hold, at, copy, allow: d.authoring?.allow || [] };
}

if (!file) {
  // WAS `git ls-files`, which sees only TRACKED scenes and then CRASHED on the one mustache template it
  // did see, so the census produced a stack trace instead of a verdict.
  const files = population('pace census', { filter: LIBRARY })
    .names.map((f) => `${SCENE_DIR}/${f}`);
  const rows = [];
  for (const f of files) { const m = measure(path.resolve(ROOT, f)); if (m) rows.push([f.split('/').pop().replace('.json', ''), m]); }
  rows.sort((a, b) => a[1].eps - b[1].eps);
  console.log('\n  pace census · events per second · a film with copy should clear ' + FLOOR.toFixed(1) + '\n');
  for (const [n, m] of rows) {
    const flag = m.copy && m.eps < FLOOR ? '  ← asleep' : '';
    console.log(`  ${n.padEnd(30)} ${m.eps.toFixed(2).padStart(5)} ev/s   ${String(m.dur).padStart(5)}s   `
      + `${m.copy ? String(m.copy).padStart(3) + ' line(s)' : '  no copy'}   longest hold ${m.hold.toFixed(1)}s${flag}`);
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
if (m.copy && m.eps < FLOOR && !m.allow.includes('slow-pace')) {
  problems.push(`${m.eps.toFixed(2)} events/s over ${m.dur}s (${m.events} event(s)), below the floor of ${FLOOR.toFixed(2)}, `
    + `which is this library's tenth percentile among films. For scale: the median film is 1.20 and the one this `
    + `replaces is 1.79. Cut the duration before adding layers: a slow film is almost always a film that is too long.`);
}
if (m.hold > HOLD && !m.allow.includes('slow-pace')) {
  problems.push(`${m.hold.toFixed(1)}s from ${m.at.toFixed(1)}s with nothing arriving or leaving, against a cap of `
    + `${HOLD.toFixed(1)}s. A held frame is a device; ${HOLD}s of one is a stall.`);
}

console.log(`\n  pace · ${file}  ${m.eps.toFixed(2)} events/s · ${m.events} event(s) over ${m.dur}s · longest hold `
  + `${m.hold.toFixed(1)}s from ${m.at.toFixed(1)}s  (floor ${FLOOR.toFixed(2)} ev/s · hold cap ${HOLD.toFixed(1)}s)`);
if (!problems.length) {
  // THE FLOOR ONLY APPLIES TO A FILM WITH COPY, and a scene with none used to read the same green line as
  // one that cleared the bar. Say which of the two rules ran, so a fixture cannot borrow a film's tick.
  const waived = m.allow.includes('slow-pace');
  console.log(waived
    ? `  ○ pace rules WAIVED by {"authoring":{"allow":["slow-pace"]}}, neither the ${FLOOR.toFixed(2)} ev/s floor\n`
      + `    nor the ${HOLD.toFixed(1)}s hold cap was applied. The numbers above are measured; no verdict was reached.\n`
    : m.copy
    ? `  ✓ it keeps moving, ${m.copy} line(s) of copy, so both rules applied\n`
    : `  ✓ within the hold cap. NO COPY in this scene, so the ${FLOOR.toFixed(2)} ev/s floor did not apply:\n`
      + `    a backdrop or a determinism fixture is meant to be still and is never failed for it.\n`);
  process.exit(0);
}
// Both problems are filed under the one code this gate has ever emitted, `pace`; the specific
// diagnosis is the summary. The record is the finding (docs/MISTAKES.md #401).
const F = gateFindings({ scene: file, indent: '    ' });
for (const p of problems) F.warn('pace', p);
F.emit();
console.log(strict ? '\n  ✗ pace (strict)\n' : '\n  Waive a deliberately still film with {"authoring":{"allow":["slow-pace"]}}.\n');
process.exit(strict ? 1 : 0);
