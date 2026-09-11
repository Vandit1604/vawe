// harness/lib/finding-codes.test.mjs: choreo.mjs prints camera-coverage-floor as `var = \`code: prose\``,
// with no brackets and no fail()/warn() call, so PATTERNS needs its own shape for that convention. This
// guards the shape stays narrow: it must not pick up a script's own name-prefixed banner line (the
// convention plenty of gates use for progress/PASS/FAIL prose, never a finding code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codesEmitted } from './finding-codes.mjs';

test('camera-coverage-floor is recognized as emitted (choreo.mjs assigns it as `code: prose`)', () => {
  const emitted = codesEmitted();
  assert.ok(emitted.has('camera-coverage-floor'));
  assert.ok([...emitted.get('camera-coverage-floor')].some((f) => f.includes('choreo.mjs')));
});

test('a script banner like `block-schema: PASS` is not mistaken for a finding code', () => {
  // block-schema.mjs prints its own name as a log prefix (console.log(`block-schema: ...`)), not an
  // assignment; the assignment-anchored pattern must not treat every `name: ` template as a code.
  assert.ok(!codesEmitted().has('block-schema'));
});
