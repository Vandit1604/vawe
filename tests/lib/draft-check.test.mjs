import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleTimes, textProblems, soundLine, mergeProblems, draftCheckLines } from '../../harness/lib/draft-check.mjs';

const at = (t, ...lines) => ({ t, lines: lines.map(([text, fontPx]) => ({ text, fontPx })) });
const dim = { step: 0.5, frameH: 540 };

test('sampleTimes: 10 samples for a 5 s film, capped at 40', () => {
  const s = sampleTimes(5);
  assert.equal(s.times.length, 10);
  assert.equal(s.times[0], 0.25);
  assert.equal(sampleTimes(120).times.length, 40);
});

test('textProblems: small text held 1 s is named with its cap height', () => {
  const out = textProblems([at(3.25, ['Light, after dark', 30]), at(3.75, ['Light, after dark', 30])], dim);
  assert.deepEqual(out, ['text "Light, after dark" at 3.3 s: cap height 3.9% of frame (rule 9 asks 6%)']);
});

test('textProblems: text at 6% or more passes', () => {
  assert.deepEqual(textProblems([at(1, ['Big', 48]), at(1.5, ['Big', 48])], dim), []);
});

test('textProblems: a flash under 0.5 s is not a read', () => {
  const fine = { step: 0.25, frameH: 540 };
  assert.deepEqual(textProblems([at(1, ['tiny', 20]), at(1.25, ['other', 100])], fine), []);
});

test('textProblems: smallest first, and the smallest size in a run is the one reported', () => {
  const out = textProblems([at(1, ['A', 30], ['B', 15]), at(1.5, ['A', 20], ['B', 15]), at(2, ['B', 15])], dim);
  assert.match(out[0], /^text "B" at 1.0 s: cap height 1.9%/);
  assert.match(out[1], /^text "A" at 1\.5 s: cap height 2\.6%/);
});

test('textProblems: a text that leaves and returns is two runs, the long one counts', () => {
  const out = textProblems([at(1, ['X', 20]), at(2, ['gap', 90]), at(3, ['X', 20]), at(3.5, ['X', 20])], dim);
  assert.equal(out.length, 1);
});

test('soundLine: silent inside -24 to -16, a fix outside', () => {
  assert.equal(soundLine(null), null);
  assert.equal(soundLine(-20), null);
  assert.equal(soundLine(-27.4), 'sound: -27 LUFS integrated (subtle target about -20; raise data-gain on the quiet cues)');
  assert.match(soundLine(-12), /lower data-gain on the loud cues/);
});

test('mergeProblems: alternates the two lists and stops at 4', () => {
  assert.deepEqual(mergeProblems(['v1', 'v2', 'v3'], ['t1', 't2', 't3']), ['v1', 't1', 'v2', 't2']);
  assert.deepEqual(mergeProblems([], ['t1']), ['t1']);
});

test('draftCheckLines: clean, or problems then the instruction', () => {
  assert.deepEqual(draftCheckLines([], null), ['draft check: no problems found']);
  assert.deepEqual(draftCheckLines(['a'], 'sound: x'), ['draft check:', '  a', '  sound: x', 'fix the draft check first']);
});
