import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const guide = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../guides/ENGINE-CHANGES.md'), 'utf8');

test('the framework agent guide states the batch review rule and has no em dash', () => {
  assert.match(guide, /3 of 10 items at random, plus every item that a check flagged/);
  assert.match(guide, /If one sampled item fails, review the whole batch/);
  assert.equal(guide.includes(String.fromCharCode(0x2014)), false);
});
