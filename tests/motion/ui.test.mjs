import test from 'node:test';
import assert from 'node:assert/strict';
import { UI } from '../../core/motion/presets.js';
import { spring } from '../../core/motion/springs.js';

test('the send spring overshoots by the measured 9 to 20 percent', () => {
  const { k, d } = UI.send;
  let peak = 0;
  for (let t = 0; t < 1; t += 0.001) peak = Math.max(peak, spring(t, k, d));
  const [lo, hi] = UI.snap.overshoot;
  assert.ok(peak - 1 >= lo && peak - 1 <= hi, `peak ${peak}`);
});

test('typing at the preset pace is 20 to 27 characters a second', () => {
  const { charMs, spaceMs } = UI.typing;
  const text = 'How do I undo a git commit?';
  const ms = [...text].reduce((sum, c) => sum + charMs + (c === ' ' ? spaceMs : 0), 0);
  const rate = (text.length * 1000) / ms;
  assert.ok(rate >= 20 && rate <= 27, `rate ${rate}`);
});

test('the stream gap range gives 15 to 25 words a second at 1 to 3 words a chunk', () => {
  const [lo, hi] = UI.stream.gapMs;
  const rate = (words, gap) => (words * 1000) / gap;
  assert.ok(rate(2, (lo + hi) / 2) >= 15 && rate(2, (lo + hi) / 2) <= 25);
});
