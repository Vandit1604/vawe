import test from 'node:test';
import assert from 'node:assert/strict';
import { peakLine } from '../../harness/lib/peak-limit.mjs';

test('a peak over -10 dBFS names the peak and the gain to take off', () => {
  assert.equal(peakLine(-6.2), 'sound: true peak -6.2 dBFS (limit -10 dBFS); lower data-gain on the loudest cue by 4 dB');
});

test('a peak at or under -10 dBFS, or no audio, says nothing', () => {
  assert.equal(peakLine(-10), null);
  assert.equal(peakLine(-18.5), null);
  assert.equal(peakLine(null), null);
});
