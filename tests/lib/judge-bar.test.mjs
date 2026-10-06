import test from 'node:test';
import assert from 'node:assert/strict';
import { barLines, barResult, dialLosses, lostBoth, capScores, barFix, barReport, barEvent, AXIS_DIAL } from '../../harness/lib/judge-bar.mjs';
import { FRESH_AXES } from '../../quality/gates/rubric.mjs';

const refs = [{ id: 'A', title: 'Film A', studio: 'Studio', file: '/r/A.png' }, { id: 'B', title: 'Film B', studio: null, file: '/r/B.png' }];
const entry = (ref, dial, winner, why = 'w') => ({ ref, dial, winner, why });
const all = (winners) => refs.flatMap((r) => ['text', 'colour', 'motion'].map((d) => entry(r.id, d, winners[r.id]?.[d] ?? 'ours')));

test('every axis in the dial table is a fresh film axis', () => {
  const axes = FRESH_AXES.film.map(([k]) => k);
  for (const k of Object.keys(AXIS_DIAL)) assert.ok(axes.includes(k), k);
  assert.deepEqual(AXIS_DIAL, { type: 'text', colour: 'colour', motion: 'motion', pace: 'motion' });
});

test('the prompt lists each sheet, the three dials and the JSON key', () => {
  const text = barLines(refs).join('\n');
  assert.match(text, /REF A \(Film A, Studio\): \/r\/A\.png/);
  assert.match(text, /REF B \(Film B\): \/r\/B\.png/);
  assert.match(text, /- text: .*\n- colour: .*\n- motion: /);
  assert.match(text, /"bar":\[\{"ref":"A","dial":"text","winner":"ours or A"/);
  assert.match(text, /6 entries/);
});

test('barResult reads winners, and a missing or foreign answer is a loss', () => {
  const raw = [entry('A', 'text', 'OURS', 'ok'), entry('A', 'colour', 'A', 'dull'), entry('B', 'motion', 'B', 'slow'), { ref: 'B', dial: 'text', winner: 'ours' }, 'junk', null];
  const bar = barResult(raw, refs);
  assert.equal(bar.length, 6);
  assert.deepEqual(bar[0], { ref: 'A', dial: 'text', winner: 'ours', why: 'ok' });
  assert.deepEqual(bar[1], { ref: 'A', dial: 'colour', winner: 'A', why: 'dull' });
  assert.equal(bar[2].winner, 'A');
  assert.equal(bar[2].why, 'the judge gave no answer');
  assert.equal(bar[3].winner, 'ours');
  assert.equal(barResult(undefined, refs).every((b) => b.winner !== 'ours'), true);
});

test('losses count per dial and lostBoth needs two references', () => {
  const bar = all({ A: { text: 'A', motion: 'A' }, B: { text: 'B' } });
  assert.deepEqual(dialLosses(bar), { text: { lost: 2, of: 2 }, colour: { lost: 0, of: 2 }, motion: { lost: 1, of: 2 } });
  assert.deepEqual(lostBoth(bar), ['text']);
  assert.deepEqual(lostBoth([entry('A', 'text', 'A')]), []);
});

test('capScores caps 6 when ours loses to both and 7 when it loses to one, never raising a score', () => {
  const scores = { hook: 8, motion: 8, scenes: 8, type: 8, colour: 8, pace: 5, expensive: 8 };
  const bar = all({ A: { text: 'A', motion: 'A' }, B: { text: 'B' } });
  const { scores: out, capped } = capScores(scores, bar);
  assert.deepEqual(out, { hook: 8, motion: 7, scenes: 8, type: 6, colour: 8, pace: 5, expensive: 8 });
  assert.deepEqual(capped.map((c) => `${c.axis} ${c.from}>${c.to}`), ['type 8>6', 'motion 8>7']);
  assert.deepEqual(capScores(scores, all({})).capped, []);
});

test('barFix names the first loss on the dial of the axis', () => {
  const bar = [entry('A', 'motion', 'A', 'ours snaps at 2 s'), entry('B', 'motion', 'ours')];
  assert.equal(barFix('pace', bar), 'ours loses to A on motion: ours snaps at 2 s');
  assert.equal(barFix('type', bar), null);
});

test('the report and the event keep the wins per dial and the losses', () => {
  const bar = all({ A: { text: 'A' } });
  assert.deepEqual(barReport(bar), ['bar: text won 1 of 2, colour won 2 of 2, motion won 2 of 2', '- text: REF A is better, w']);
  assert.deepEqual(barEvent(bar)[0], { ref: 'A', dial: 'text', winner: 'A' });
  assert.equal(Object.keys(barEvent(bar)[0]).includes('why'), false);
});
