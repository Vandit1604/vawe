import test from 'node:test';
import assert from 'node:assert/strict';
import { sfxFilter, lengthAfter, pitchRate } from '../../harness/lib/sfx-chain.mjs';

test('a pitch of 12 semitones doubles the rate and halves the length', () => {
  assert.equal(pitchRate(12), 2);
  assert.equal(lengthAfter(1, { from: 0.1, to: 0.6, pitch: 12 }), 0.25);
});

test('the chain trims, pitches, fades out at the end of the shortened clip and levels', () => {
  const f = sfxFilter({ from: 0.1, to: 0.6, pitch: 12, fadeOut: 0.1, gain: -3 }, 1);
  assert.equal(f, 'atrim=start=0.1:end=0.6,asetpts=PTS-STARTPTS,asetrate=88200,aresample=44100,afade=t=out:st=0.15:d=0.1,volume=-3dB');
  assert.equal(sfxFilter({}, 1), 'anull');
});

test('a bad trim or fades longer than the clip name the option', () => {
  assert.throws(() => sfxFilter({ from: 0.9, to: 0.5 }, 1), /--trim ends at 0.5 s/);
  assert.throws(() => sfxFilter({ from: 2 }, 1), /starts at 2 s/);
  assert.throws(() => sfxFilter({ fadeIn: 0.6, fadeOut: 0.6 }, 1), /fades/);
});
