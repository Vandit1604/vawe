import test from 'node:test';
import assert from 'node:assert/strict';
import { peakLine } from '../../harness/lib/peak-limit.mjs';

test('a peak over -3 dBFS names the peak and the gain to take off', () => {
  assert.equal(peakLine(-1.2), 'sound: true peak -1.2 dBFS (limit -3 dBFS); lower data-gain on the loudest cue by 2 dB');
});

test('a peak at or under -3 dBFS, or no audio, says nothing', () => {
  assert.equal(peakLine(-3), null);
  assert.equal(peakLine(-18.5), null);
  assert.equal(peakLine(null), null);
});
