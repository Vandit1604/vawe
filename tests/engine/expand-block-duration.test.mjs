// tests/engine/expand-block-duration.test.mjs: every block family's own timing param is `dur`
// (blocks/schema.mjs), but the layer schema every OTHER layer type shares calls the same thing
// `duration`. Before this fix, an author who wrote `duration` on a block layer (matching every other
// layer type) had it silently dropped by the factory's destructure, the factory's own default `dur`
// won instead, and core/validate/lint-warnings.mjs missingWindowWarns still warned the layer had no
// window, disagreeing with the factory that had in fact accepted a value under a different name.
// core/engine/expand.js expandBlock now bridges `duration` to `dur` before calling the factory.
//   node --test tests/engine/expand-block-duration.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { expandScene } from '../../core/engine/expand.js';

function withWarnings(fn) {
  const warns = [];
  const orig = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try { return { result: fn(), warns }; } finally { console.warn = orig; }
}

test('a block layer’s authored `duration` reaches the factory as `dur`', () => {
  const { result: out } = withWarnings(() => expandScene({
    module: 'scene',
    layers: [{ type: 'block', block: 'gauge', x: 0, y: 0, value: 60, start: 2, duration: 7 }],
  }));
  assert.equal(out.layers[0].start, 2);
  assert.equal(out.layers[0].duration, 7); // not gauge's own default (4)
});

test('writing `duration` on a block no longer warns that it is ignored', () => {
  const { warns } = withWarnings(() => expandScene({
    module: 'scene',
    layers: [{ type: 'block', block: 'gauge', x: 0, y: 0, value: 60, duration: 7 }],
  }));
  assert.ok(!warns.some((w) => w.includes('duration')), warns.join('\n'));
});

test('`dur` still works directly, unaffected, and wins if both are somehow set', () => {
  const { result: out, warns } = withWarnings(() => expandScene({
    module: 'scene',
    layers: [{ type: 'block', block: 'gauge', x: 0, y: 0, value: 60, dur: 9, duration: 2 }],
  }));
  assert.equal(out.layers[0].duration, 9);
  assert.ok(!warns.some((w) => w.includes('duration')), warns.join('\n'));
});

test('no duration or dur at all still falls back to the factory’s own default', () => {
  const { result: out } = withWarnings(() => expandScene({
    module: 'scene',
    layers: [{ type: 'block', block: 'gauge', x: 0, y: 0, value: 60 }],
  }));
  assert.equal(out.layers[0].duration, 4); // gauge's own default `dur`
});
