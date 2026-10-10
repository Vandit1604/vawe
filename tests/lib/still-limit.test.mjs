import test from 'node:test';
import assert from 'node:assert/strict';
import { declaredHolds, undeclaredStills, stillText } from '../../harness/lib/still-limit.mjs';

const why = (entries) => Object.fromEntries(entries.map((e, i) => [e, `the wordmark of world s${i + 1} is held 0.9 s as the last beat`]));

test('a still over 0.5 s is named; one at 0.5 s or under is not', () => {
  const runs = [{ a: 1, b: 1.5, len: 0.5 }, { a: 2, b: 2.7, len: 0.7 }];
  assert.deepEqual(undeclaredStills(runs), [{ a: 2, b: 2.7, len: 0.7 }]);
});

test('a scoped static-window waiver with a reason covers its seconds only', () => {
  const allow = ['static-window@4-5'];
  const runs = [{ a: 4.1, b: 5, len: 0.9 }, { a: 1, b: 2, len: 1 }];
  assert.deepEqual(undeclaredStills(runs, { allow, _why: why(allow), _worlds: ['s1'] }), [{ a: 1, b: 2, len: 1 }]);
});

test('a still that runs past its declared hold by over 0.5 s is still named', () => {
  const allow = ['static-window@4-4.5'];
  assert.equal(undeclaredStills([{ a: 4, b: 5.2, len: 1.2 }], { allow, _why: why(allow), _worlds: ['s1'] }).length, 1);
});

test('a bare static-window covers the film, a waiver with no reason covers nothing, and the retired dead-air covers nothing', () => {
  assert.deepEqual(declaredHolds({ allow: ['static-window'], _why: why(['static-window']), _worlds: ['s1'] }), [[0, Infinity]]);
  assert.deepEqual(declaredHolds({ allow: ['static-window@1-2'] }), []);
  assert.deepEqual(declaredHolds({ allow: ['dead-air@1-2'], _why: why(['dead-air@1-2']), _worlds: ['s1'] }), []);
  assert.deepEqual(declaredHolds({ allow: ['tail-tiles@1-2'], _why: why(['tail-tiles@1-2']), _worlds: ['s1'] }), [], 'another check\'s code is not this check\'s hold');
});

test('stillText names the seconds, the limit and both fixes', () => {
  assert.equal(stillText({ a: 2, b: 2.7, len: 0.7 }), 'static window 2-2.7 s (0.7 s, limit 0.5 s): nothing moves; give the hold an element motion (typing, a counter, a glint), not a camera drift; waive: "allow": ["static-window@2-2.7"], "_why": {"static-window@2-2.7": "<where: a world id or a second, and what you measured, with its unit>"} in <script id="authoring">');
});
