import test from 'node:test';
import assert from 'node:assert/strict';
import { VERBS } from '../../harness/cli/verbs.mjs';

const dev = VERBS.find((v) => v.name === 'dev');
const renderArgs = (v) => dev.build(v, ['films/f/page.html']).find((s) => s.script === 'harness/media/render-page.mjs').args;

test('a dev draft mixes the audio by default and --silent turns the mix off', () => {
  assert.equal(renderArgs({}).includes('--silent'), false);
  assert.equal(renderArgs({}).includes('--audio'), false);
  assert.equal(renderArgs({ silent: true }).includes('--silent'), true);
});

test('dev has --silent and no --audio flag, and says sound is the default', () => {
  assert.ok(dev.flags.some((f) => f.name === 'silent'));
  assert.equal(dev.flags.some((f) => f.name === 'audio'), false);
  assert.match(dev.summary, /with sound/);
});
