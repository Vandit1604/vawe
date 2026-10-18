import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, UsageError } from '../../harness/cli/parse.mjs';

const verb = { name: 'v', positional: [{ name: 'src', required: true }], flags: [{ name: 'quiet', type: 'bool' }, { name: 'title', type: 'string' }] };

test('a bool flag before a positional leaves the positional alone', () => {
  assert.deepEqual(parseArgs(verb, ['--quiet', 'a.mp4']), { values: { quiet: true }, positional: ['a.mp4'] });
});

test('a bool flag after a positional', () => {
  assert.deepEqual(parseArgs(verb, ['a.mp4', '--quiet']), { values: { quiet: true }, positional: ['a.mp4'] });
});

test('a value flag takes its value, spaced or with =', () => {
  assert.equal(parseArgs(verb, ['a.mp4', '--title', 'T']).values.title, 'T');
  assert.equal(parseArgs(verb, ['a.mp4', '--title=T']).values.title, 'T');
});

test('an unknown flag is a usage error', () => {
  assert.throws(() => parseArgs(verb, ['a.mp4', '--nope']), UsageError);
});
