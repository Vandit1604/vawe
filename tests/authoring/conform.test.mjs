// tests/authoring/conform.test.mjs: hermetic fixture for `node harness/dev/conform.mjs`.
// node tests/authoring/conform.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, '../fixtures/probe-frame.fixture.json');
const script = path.join(here, '../../harness/dev/conform.mjs');

// "back" and "front" are two full-frame rects at the SAME box for the whole 8s: they must fail an
// overlap claim, and either one must fail a sub-second max-hold claim (both sit dead still). "aside" is
// off in a corner (x:40,y:40,w:100,h:60), clear of both: an overlap claim against it must pass. A line
// this DSL cannot parse is kept as a JUDGE-ONLY leftover, never silently dropped.
const brief = [
  'overlap: back !x front',
  'overlap: aside-child !x front',
  'hold: max 0.5',
  'a stray brief line no pattern here matches',
].join('\n');

// exits non-zero because two of the claims below fail on purpose; the fixture is here to prove the
// tool measures, not to prove this fixture conforms.
let out;
try { out = execFileSync('node', [script, fixture, '--brief', brief], { encoding: 'utf8' }); }
catch (e) { out = e.stdout; }

assert.match(out, /\[FAIL\] overlap back !x front/, 'same-box rects must fail the overlap claim');
assert.match(out, /\[PASS\] overlap aside-child !x front/, 'a corner box clear of the frame must pass');
assert.match(out, /\[FAIL\] hold max 0\.5s/, 'an 8s static rect must fail a 0.5s hold ceiling');
assert.match(out, /JUDGE-ONLY/, 'an unparsed line must surface as a judge-only leftover, not vanish');
assert.match(out, /a stray brief line no pattern here matches/, 'the leftover line itself must be printed verbatim');

console.log('conform.test.mjs: ok');
