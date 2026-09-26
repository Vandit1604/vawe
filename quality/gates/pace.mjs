// quality/gates/pace.mjs: `make check GATE=pace D=<film> TEMPO=<n>`. Prints the duration and pace-check numbers
// a scene would render at, with `tempo` overridden to TEMPO for this print only. Writes nothing to
// disk: it is the "what would this feel like" preview for core/engine/tempo.js, run before committing
// to a tempo value.
import fs from 'node:fs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { measureEvents } from '../../harness/lib/pace-events.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--json');
const file = args[0];
const tempoArg = args[1];
if (!file) { console.error('usage: node quality/gates/pace.mjs <scene.json> [tempo]'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
if (tempoArg != null) raw.tempo = Number(tempoArg);
const d = loadScene(raw);
const m = measureEvents(d) || { events: 0, eps: 0, hold: d.duration, at: 0 };

// An INSTRUMENT, not a check: every line here is a measured fact with no pass/fail threshold, so
// each is recorded as `info`. The record is what --json and VAWE_FINDINGS_OUT read; the console.log
// beside each stays the printed line, unchanged, the same dual-write craft-coverage.mjs uses.
const f = gateFindings();
console.log(`tempo:    ${tempoArg ?? '(scene default)'}`);
f.note('tempo', `tempo:    ${tempoArg ?? '(scene default)'}`, { tempo: tempoArg ?? null });
console.log(`duration: ${d.duration.toFixed(3)}s`);
f.note('duration', `duration: ${d.duration.toFixed(3)}s`, { duration: d.duration });
console.log(`events:   ${m.events}  (${m.eps.toFixed(2)} ev/s)`);
f.note('events', `events:   ${m.events}  (${m.eps.toFixed(2)} ev/s)`, { events: m.events });
console.log(`longest hold: ${m.hold.toFixed(2)}s, at ${m.at.toFixed(2)}s`);
f.note('longest-hold', `longest hold: ${m.hold.toFixed(2)}s, at ${m.at.toFixed(2)}s`, { hold: m.hold, holdAt: m.at });
