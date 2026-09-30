// A second render on the same machine starts at 2 workers; VAWE_WORKERS always wins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultWorkers } from '../../harness/media/render-page.mjs';

test('VAWE_WORKERS sets the worker count', () => {
  assert.equal(defaultWorkers({ VAWE_WORKERS: '3' }, () => true), 3);
});

test('another render running caps the workers at 2', () => {
  assert.equal(defaultWorkers({}, () => true), 2);
});

test('an idle machine keeps the full default', () => {
  assert.ok(defaultWorkers({}, () => false) >= 1);
});
