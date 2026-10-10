import test from 'node:test';
import assert from 'node:assert/strict';
import { spectralChange, bedLine, BED_RATE } from '../../harness/lib/bed-motion.mjs';

const seconds = 20;
const make = (fn) => Float32Array.from({ length: BED_RATE * seconds }, (_, i) => fn(i / BED_RATE));
const tone = (hz, t) => Math.sin(2 * Math.PI * hz * t);
const drone = make((t) => 0.3 * tone(110, t) + 0.2 * tone(165, t));
const tremolo = make((t) => (0.6 + 0.4 * tone(0.3, t)) * (0.3 * tone(110, t) + 0.2 * tone(165, t)));
const melody = make((t) => 0.3 * tone([220, 262, 330, 392][Math.floor(t / 0.5) % 4], t));

test('a stationary drone, even with a tremolo on it, has a spectral change near zero and draws the bed line', () => {
  for (const samples of [drone, tremolo]) {
    const change = spectralChange(samples);
    assert.ok(change < 0.01, `change ${change}`);
    assert.match(bedLine({ name: 'pad.mp3', change }), /^sound: the bed "pad\.mp3" keeps one spectrum for the whole film/);
  }
});

test('a bed that changes notes passes, and a bed too short or silent to read is not judged', () => {
  const change = spectralChange(melody);
  assert.ok(change > 0.5);
  assert.equal(bedLine({ name: 'music.mp3', change }), null);
  assert.equal(spectralChange(new Float32Array(BED_RATE)), null);
  assert.equal(spectralChange(new Float32Array(BED_RATE * seconds)), null);
  assert.equal(bedLine({ name: 'x', change: null }), null);
});
