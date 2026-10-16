import test from 'node:test';
import assert from 'node:assert/strict';
import { typingSpans } from '../../harness/lib/typing-spans.mjs';
import { withoutTypingStills } from '../../harness/lib/still-limit.mjs';

const at = (t, ...texts) => ({ t: +t.toFixed(3), lines: texts.map((text) => ({ text })) });
const series = (n, texts) => Array.from({ length: n }, (_, k) => at(k / 30, ...texts(k / 30)));

test('typingSpans: characters added one by one are a span from the step before the first to the last change', () => {
  const samples = series(120, (t) => ['Ask', 'write a film'.slice(0, Math.max(0, Math.min(12, Math.floor((t - 1) * 6))))]);
  assert.deepEqual(typingSpans(samples), [[1.133, 3]]);
});

test('typingSpans: a blinking caret, as a line or as a trailing glyph, is no text', () => {
  const line = series(120, (t) => ['Ask anything', Math.floor(t * 4) % 2 ? '' : '|']);
  const trailing = series(120, (t) => [`Ask anything${Math.floor(t * 4) % 2 ? '' : ' ▌'}`]);
  assert.deepEqual(typingSpans(line), []);
  assert.deepEqual(typingSpans(trailing), []);
});

test('typingSpans: a text that flips between two states is a blink, not typing', () => {
  assert.deepEqual(typingSpans(series(120, (t) => [Math.floor(t * 6) % 2 ? 'ready' : 'ready.'])), []);
});

test('typingSpans: one change is an arrival and two are too few; a pause over the still limit ends the span', () => {
  assert.deepEqual(typingSpans(series(60, (t) => [t < 1 ? 'one' : 'two'])), []);
  assert.deepEqual(typingSpans(series(60, (t) => [t < 0.5 ? 'a' : t < 1 ? 'ab' : 'abc'])), []);
  const paused = series(150, (t) => ['abcdefghij'.slice(0, t < 1 ? Math.floor(t * 4) : t < 2.5 ? 4 : Math.min(10, 4 + Math.floor((t - 2.5) * 4)))]);
  assert.equal(typingSpans(paused).length, 2);
});

test('withoutTypingStills: the typing seconds leave a still run, the rest stays and keeps its flags', () => {
  const runs = [{ a: 1, b: 5, len: 4, camera: true }];
  assert.deepEqual(withoutTypingStills(runs, [[1.5, 4]]), [
    { a: 1, b: 1.5, len: 0.5, camera: true },
    { a: 4, b: 5, len: 1, camera: true },
  ]);
  assert.deepEqual(withoutTypingStills(runs, [[0, 6]]), []);
  assert.deepEqual(withoutTypingStills(runs, []), runs);
});
