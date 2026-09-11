// quality/gates/pace.mjs: `make pace D=<film> TEMPO=<n>`. Prints the duration and pace-check numbers
// a scene would render at, with `tempo` overridden to TEMPO for this print only. Writes nothing to
// disk: it is the "what would this feel like" preview for core/engine/tempo.js, run before committing
// to a tempo value.
import fs from 'node:fs';
import { loadScene } from '../../core/engine/expand.js';

const file = process.argv[2];
const tempoArg = process.argv[3];
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

console.log(`tempo:    ${tempoArg ?? '(scene default)'}`);
console.log(`duration: ${d.duration.toFixed(3)}s`);
console.log(`events:   ${t.length}  (${(t.length / d.duration).toFixed(2)} ev/s)`);
console.log(`longest hold: ${hold.toFixed(2)}s, at ${at.toFixed(2)}s`);
