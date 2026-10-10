import test from 'node:test';
import assert from 'node:assert/strict';
import { reasonProblem, hasReason, isWaived, waiverCovers, waiverProblems, RETIRED_CODES } from '../../harness/lib/waivers.mjs';

const ctx = { worlds: ['s1', 's4', 'hero'] };
const GOOD = 'world s4 holds the wordmark 3.5 s as the last beat';

test('a reason that names a world and a measured value counts', () => {
  assert.equal(reasonProblem(GOOD, ctx), null);
  assert.equal(reasonProblem('the caret ticks at 2.6 s for 0.9 s, so the hold is not still', ctx), null, 'a second is one number, a measure is a second');
  assert.equal(reasonProblem('hero is held 2.4 s while the chart counts to 42%', ctx), null);
});

test('generic reasons are refused, however long', () => {
  for (const r of ['intentional', 'by design', 'deliberate choice', 'stylistic', 'it is fine', 'ok', 'as intended', 'this is intentional and by design', 'fine, ok, as intended']) {
    assert.match(reasonProblem(r, ctx) ?? '', /under 12|generic/, r);
  }
});

test('a reason with no place, or no measure, is refused', () => {
  assert.match(reasonProblem('the wordmark holds as the last beat of the film', ctx), /names no place/);
  assert.match(reasonProblem('world s4 holds the wordmark as the last beat', ctx), /names no measured value/);
  assert.match(reasonProblem('the wordmark holds at 3.5 s as the last beat', ctx), /names no measured value/, 'a second alone is the place, not the measure');
  assert.match(reasonProblem('world s9 holds the wordmark as the last beat', ctx), /names no place/, 'a world id that is not on the page');
});

test('the same reason on 3 or more waivers is refused, 2 is not', () => {
  const entry = (n) => `world-held@${n}-${n + 1}`;
  const why = (k) => Object.fromEntries(Array.from({ length: k }, (_, i) => [entry(i), GOOD]));
  assert.equal(hasReason(why(2), entry(0), ctx), true);
  assert.equal(hasReason(why(3), entry(0), ctx), false);
  assert.match(reasonProblem(GOOD, { ...ctx, reasons: [GOOD, GOOD, GOOD] }), /same reason is used for 3 waivers/);
});

test('isWaived reads a range, a bare code and the page worlds, and refuses a retired code even with a good reason', () => {
  const authoring = { allow: ['world-held@2-5.5', 'dead-air', 'tail-tiles'], _why: { 'world-held@2-5.5': GOOD, 'dead-air': GOOD, 'tail-tiles': 'ok' }, _worlds: ['s4'] };
  assert.equal(isWaived(authoring, 'world-held', '3.2'), true);
  assert.equal(isWaived(authoring, 'world-held', '6'), false);
  assert.equal(isWaived(authoring, 'world-held'), false, 'a scoped waiver does not cover a finding with no second');
  assert.equal(isWaived(authoring, 'dead-air'), false);
  assert.equal(isWaived(authoring, 'tail-tiles'), false);
  assert.equal(waiverCovers('world-held@2-5.5', 'world-held', 5.5), true);
});

test('waiverProblems lists a retired code with what replaces it, a dead code, and each refused reason', () => {
  const authoring = { allow: ['dead-air@1-2', 'glow', 'off-colour', 'static-window@3-4', 'world-held@5-6'], _why: { 'dead-air@1-2': GOOD, glow: 'owner asked for a glow', 'off-colour': 'x', 'static-window@3-4': 'by design, deliberate and intentional', 'world-held@5-6': GOOD }, _worlds: ['s4'] };
  const lines = waiverProblems(authoring);
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^waiver "dead-air@1-2" waives nothing: it covered four checks at once/);
  assert.match(lines[1], /^waiver "glow" waives nothing: no check emits it/);
  assert.match(lines[3], /^waiver "static-window@3-4" refused: the reason is generic/);
  assert.ok(RETIRED_CODES['dead-air']);
});

test('a second matches a waiver written with fewer or more places, and a range holds it', () => {
  assert.equal(waiverCovers('one-band@0.2', 'one-band', '0.20'), true);
  assert.equal(waiverCovers('one-band@0.2', 'one-band', '0.3'), false);
  assert.equal(waiverCovers('display-tracking@2.2-2.3', 'display-tracking', '2.25'), true);
});
