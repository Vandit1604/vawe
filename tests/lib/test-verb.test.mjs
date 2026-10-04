import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { testSteps, SERIAL_TESTS } from '../../harness/cli/verbs.mjs';

test('vawe test runs every test file once: the serial files alone and last, the rest together first', () => {
  const [parallel, serial] = testSteps().map((s) => s.node.slice(1));
  assert.deepEqual(serial, SERIAL_TESTS);
  for (const f of SERIAL_TESTS) assert.ok(fs.existsSync(f), f);
  assert.equal(parallel.some((f) => SERIAL_TESTS.includes(f)), false);
  assert.ok(parallel.includes('tests/lib/test-verb.test.mjs'));
  assert.equal(new Set(parallel).size, parallel.length);
});
