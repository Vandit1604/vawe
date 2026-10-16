import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { SEEDS, pickSeed, hueWord } from '../../harness/lib/palette-seeds.mjs';

const run = (...args) => execFileSync('node', ['harness/dev/palette.mjs', ...args], { encoding: 'utf8' });

test('the same key picks the same seed, and the seed ids are unique', () => {
  assert.equal(pickSeed(SEEDS, { from: 'my-launch' }).id, pickSeed(SEEDS, { from: 'my-launch' }).id);
  assert.equal(new Set(SEEDS.map((s) => s.id)).size, SEEDS.length);
});

test('--id picks that seed and an unknown id throws', () => {
  assert.equal(pickSeed(SEEDS, { id: 'seed-200' }).oklch[0], 0.36);
  assert.throws(() => pickSeed(SEEDS, { id: 'nope' }), /no seed with id "nope"/);
});

test('hueWord names the hue zone', () => {
  assert.equal(hueWord(250), 'cobalt / indigo');
  assert.equal(hueWord(350), 'pure red');
});

test('vawe palette --from prints the seed block, the same each run', () => {
  const out = run('--from', 'my-launch');
  assert.match(out, /^BRAND SEED · seed-\d+\n/);
  assert.match(out, /oklch\(\d\.\d{3} \d\.\d{3} \d+\.\d\)/);
  assert.equal(out, run('--from', 'my-launch'));
  assert.equal(run('--id', 'seed-200').split('\n')[0], 'BRAND SEED · seed-200');
});
