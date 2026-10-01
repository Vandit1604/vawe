import test from 'node:test';
import assert from 'node:assert/strict';
import { probeTracks, readHoldProblems } from '../../harness/lib/read-hold.mjs';

const box = [0, 0, 400, 60];
const at = (t, ...texts) => ({ t, lines: texts.map((text) => ({ text, box })) });

test('probeTracks: one run of samples is one track per word, in and out at half a step', () => {
  const tracks = probeTracks([at(0.25), at(0.75, 'Ship it now'), at(1.25, 'Ship it now'), at(1.75)], { step: 0.5, frameH: 600 });
  assert.deepEqual(tracks.map((t) => t.text), ['Ship', 'it', 'now']);
  assert.deepEqual([tracks[0].tIn, tracks[0].tOut, tracks[0].sizeSettled], [0.5, 1.5, 0.1]);
});

test('probeTracks: the Words table gives the settle time, so a long entrance is not counted as hold', () => {
  const samples = [at(0.25, 'Go'), at(0.75, 'Go'), at(1.25, 'Go'), at(1.75)];
  const plain = readHoldProblems(probeTracks(samples, { step: 0.5, frameH: 600 }));
  const spec = readHoldProblems(probeTracks(samples, { step: 0.5, frameH: 600 }, [{ text: 'Go', settle: 1 }]));
  assert.equal(plain.length, 0);
  assert.equal(spec.length, 1);
  assert.ok(spec[0].hold < 1.08);
});

test('probeTracks: a line that returns later is a second run', () => {
  const tracks = probeTracks([at(0.25, 'A'), at(0.75), at(1.25, 'A')], { step: 0.5, frameH: 600 });
  assert.equal(tracks.length, 2);
});
