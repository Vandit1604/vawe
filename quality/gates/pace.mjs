// quality/gates/pace.mjs: `make pace D=<film> TEMPO=<n>`. Prints the duration and pace-check numbers
// a scene would render at, with `tempo` overridden to TEMPO for this print only. Writes nothing to
// disk: it is the "what would this feel like" preview for core/engine/tempo.js, run before committing
// to a tempo value.
import fs from 'node:fs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--json');
const file = args[0];
const tempoArg = args[1];
if (!file) { console.error('usage: node quality/gates/pace.mjs <scene.json> [tempo]'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
if (tempoArg != null) raw.tempo = Number(tempoArg);
const d = loadScene(raw);

const ev = new Set();
const walk = (a) => a.forEach((l) => {
  if (l.start != null) ev.add(+Number(l.start).toFixed(2));
  if (l.start != null && l.duration != null) ev.add(+Number(l.start + l.duration).toFixed(2));
  if (l.children) walk(l.children);
});
walk(d.layers || []);
for (const c of d.cuts || []) ev.add(c.t);
for (const s of d.stings || []) ev.add(s.t);
const t = [...ev].filter((x) => x >= 0 && x <= d.duration).sort((a, b) => a - b);
let hold = t.length ? t[0] : d.duration, at = 0;
for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] > hold) { hold = t[i] - t[i - 1]; at = t[i - 1]; }
if (t.length && d.duration - t[t.length - 1] > hold) { hold = d.duration - t[t.length - 1]; at = t[t.length - 1]; }

// An INSTRUMENT, not a check: every line here is a measured fact with no pass/fail threshold, so
// each is recorded as `info`. The record is what --json and VAWE_FINDINGS_OUT read; the console.log
// beside each stays the printed line, unchanged, the same dual-write craft-coverage.mjs uses.
const f = gateFindings();
console.log(`tempo:    ${tempoArg ?? '(scene default)'}`);
f.note('tempo', `tempo:    ${tempoArg ?? '(scene default)'}`, { tempo: tempoArg ?? null });
console.log(`duration: ${d.duration.toFixed(3)}s`);
f.note('duration', `duration: ${d.duration.toFixed(3)}s`, { duration: d.duration });
console.log(`events:   ${t.length}  (${(t.length / d.duration).toFixed(2)} ev/s)`);
f.note('events', `events:   ${t.length}  (${(t.length / d.duration).toFixed(2)} ev/s)`, { events: t.length });
console.log(`longest hold: ${hold.toFixed(2)}s, at ${at.toFixed(2)}s`);
f.note('longest-hold', `longest hold: ${hold.toFixed(2)}s, at ${at.toFixed(2)}s`, { hold, holdAt: at });
