import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInput } from '../../harness/media/see/input.mjs';

test('a page resolves to its draft path and its name, with cuts as a function', async () => {
  const found = await resolveInput('films/examples/colour-sting/page.html');
  assert.equal(found.name, 'colour-sting');
  assert.equal(found.page, 'films/examples/colour-sting/page.html');
  assert.match(found.video, /colour-sting-draft\.mp4$/);
  assert.equal(typeof found.cuts, 'function');
});

test('an existing mp4 resolves to itself', async () => {
  const found = await resolveInput('tests/fixtures/truth/beat/track.wav');
  assert.equal(found.video, 'tests/fixtures/truth/beat/track.wav');
  assert.equal(found.page, undefined);
});
