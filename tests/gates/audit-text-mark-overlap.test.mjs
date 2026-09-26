// tests/gates/audit-text-mark-overlap.test.mjs: a film agent's friction log had a wave mark drawn over
// the letters of the wordmark, and the tagline sitting on top of the mark too, and `verify.mjs`
// reported 0 problems. quality/audit.mjs's overlap check (`checkPairs`) only ever compared TEXT against
// TEXT: a mark (an svg/image/rect carrying `logotype:true`, core/layers/util.js) has no text, so it
// never entered `info` and was never paired against anything. `checkTextMarkOverlap` now reads the
// scene's `[data-logotype]` elements separately and pairs each against every text layer, reporting
// `overlap-mark` as ADVICE (never a hard fail, unlike text-vs-text `overlap`) so a mark deliberately
// touching a caption at the edge is not blocked, only named.
//   node tests/gates/audit-text-mark-overlap.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = 'tests/fixtures/audit-text-mark-overlap.fixture.json';

let out;
try { out = execFileSync(process.execPath, ['quality/audit.mjs', FIXTURE], { cwd: ROOT, encoding: 'utf8' }); }
catch (e) { out = e.stdout + e.stderr; } // a HARD finding (from the deliberately low-contrast fixture) exits 1

assert.match(out, /\[overlap-mark\] .*wordmark.*✕ waveMark|\[overlap-mark\] f\d+ hs-layer ✕ waveMark/,
  `expected an overlap-mark finding naming the mark's id; got:\n${out}`);
assert.match(out, /\(\d+ critical elems · \d+ hard · 1 warn\)/, 'the overlap-mark finding must count as a WARN, not a hard failure');

console.log('audit-text-mark-overlap.test.mjs: OK (text over a logotype mark at rest is now caught, as advice)');
