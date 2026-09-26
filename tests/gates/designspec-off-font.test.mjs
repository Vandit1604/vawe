// tests/gates/designspec-off-font.test.mjs: a film agent's friction log wrote `font: "display"` on a
// text layer, which is not a theme role (only sans/serif/mono/num exist, core/theme/roles.js
// REQUIRED_ROLES + buildType). quality/gates/designspec-check.mjs's off-font finding used to name only
// the three roles it happened to remember (sans/serif/mono, missing num) and never offered a closest
// match. It now names all four real roles, and offers `nearest()` (core/validate/util.mjs) when the
// author's typo is close to one of them, the same "Did you mean" shape as the off-colour/dead-token
// findings just above it in the same file.
//   node tests/gates/designspec-off-font.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GATE = path.join(ROOT, 'quality/gates/designspec-check.mjs');

function run(fixtureRel) {
  try {
    return execFileSync(process.execPath, [GATE, fixtureRel], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    return e.stdout + e.stderr; // the gate WARNs by default (exit 0); --strict alone would exit 1
  }
}

const out = run('tests/fixtures/designspec-off-font.fixture.json');
assert.match(out, /off-font.*font "display" is not a theme role/,
  'a "display" font on a text layer must be flagged as off-role');
assert.match(out, /Real roles: sans\/serif\/mono\/num/,
  'the message must name all four real roles, not a stale three-role list');
assert.doesNotMatch(out, /Did you mean/, '"display" is not close enough to any real role to guess one');

console.log('designspec-off-font.test.mjs: OK (font "display" is flagged, real roles named)');
