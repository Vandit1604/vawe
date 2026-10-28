import test from 'node:test';
import assert from 'node:assert/strict';
import { heldEmitter } from '../../harness/cli/held-output.mjs';
import { VERBS } from '../../harness/cli/verbs.mjs';

test('output waits for the earlier step, then runs in order', async () => {
  let release;
  const emit = heldEmitter(new Promise((r) => { release = r; }));
  const seen = [];
  emit(() => seen.push('a'));
  emit(() => seen.push('b'));
  assert.deepEqual(seen, []);
  release();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(seen, ['a', 'b']);
  emit(() => seen.push('c'));
  assert.deepEqual(seen, ['a', 'b', 'c']);
});

test('with no earlier step, output runs at once', () => {
  const seen = [];
  heldEmitter(null)(() => seen.push('a'));
  assert.deepEqual(seen, ['a']);
});

test('dev runs its plan warning together with the render', () => {
  const steps = VERBS.find((v) => v.name === 'dev').build({}, ['films/x/page.html']);
  assert.match(steps[0].script, /dev-warn/);
  assert.equal(steps[0].overlap, true);
  assert.match(steps[1].script, /render-page/);
});
