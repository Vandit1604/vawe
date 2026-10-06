import test from 'node:test';
import assert from 'node:assert/strict';
import { probeTracks, readHoldProblems, readHoldUnmeasured, rowsNeed, lineNeed, HOLD_RULE } from '../../harness/lib/read-hold.mjs';

const box = [0, 0, 400, 60];
const at = (t, ...texts) => ({ t, lines: texts.map((text) => ({ text, box })) });
const rows = (t, ...texts) => ({ t, lines: texts.map((text, block) => ({ text, box, block })) });

test('probeTracks: one run of samples is one track, in and out at half a step', () => {
  const tracks = probeTracks([at(0.25), at(0.75, 'Ship it now'), at(1.25, 'Ship it now'), at(1.75)], { step: 0.5, frameH: 600 });
  assert.deepEqual(tracks.map((t) => t.text), ['Ship it now']);
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

test('probeTracks: product chrome is not a line to read', () => {
  const chrome = { t: 0.75, lines: [{ text: 'Inbox', box, chrome: true }, { text: 'Ship it now', box }] };
  const tracks = probeTracks([chrome, { ...chrome, t: 1.25 }], { step: 0.5, frameH: 600 });
  assert.deepEqual(tracks.map((t) => t.text), ['Ship it now']);
});

const LIST = ['02:14 Ship Thursday', '07:40 Free forever', '09:05 Sync Friday'];
const listSamples = (holdSamples) => [rows(0.25), ...Array.from({ length: holdSamples }, (_, i) => rows(0.75 + i * 0.5, ...LIST)), rows(0.75 + holdSamples * 0.5)];

test('separate rows of a list are separate lines: three short rows held 4 s are no problem, and a short hold names each row alone', () => {
  assert.deepEqual(readHoldProblems(probeTracks(listSamples(8), { step: 0.5, frameH: 600 })), []);
  const short = readHoldProblems(probeTracks(listSamples(2), { step: 0.5, frameH: 600 }));
  assert.deepEqual(short.map((p) => p.text), LIST);
  assert.ok(short.every((p) => p.n === 3 && p.rows === 3));
});

test('rows shown together need the longest row plus a word of time per extra row, not the sum', () => {
  const need = rowsNeed([lineNeed(3), lineNeed(3), lineNeed(3)]);
  assert.ok(Math.abs(need - (HOLD_RULE.floor + 2 * HOLD_RULE.perExtraRow)) < 1e-9);
  assert.ok(need < 3 * lineNeed(3));
  assert.equal(rowsNeed([lineNeed(10)]), lineNeed(10));
});

test('a flood of 26 notices is held at most the ceiling, and a long line keeps its own time', () => {
  assert.equal(rowsNeed(Array(26).fill(lineNeed(3))), HOLD_RULE.ceiling);
  assert.equal(rowsNeed([lineNeed(10), lineNeed(3)]), lineNeed(10));
});

test('the texts of one element are one line, and the words of a split headline count as one headline', () => {
  const split = (t) => ({ t, lines: ['Ship', 'faster', 'than', 'ever', 'before'].map((text) => ({ text, box, block: 0 })) });
  const problems = readHoldProblems(probeTracks([at(0.25), split(0.75), split(1.25), at(1.75)], { step: 0.5, frameH: 600 }));
  assert.equal(problems.length, 1);
  assert.equal(problems[0].n, 5);
  assert.equal(problems[0].text, 'Ship faster than ever before');
});

test('a line that left before its settle time has no hold: not a problem, counted as not measured', () => {
  const samples = [at(0.25, 'Go'), at(0.75, 'Go'), at(1.25), at(2.25)];
  const tracks = probeTracks(samples, { step: 0.5, frameH: 600 }, [{ text: 'Go', settle: 3 }]);
  assert.deepEqual(readHoldProblems(tracks), []);
  assert.equal(readHoldUnmeasured(tracks).length, 1);
});
