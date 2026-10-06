import test from 'node:test';
import assert from 'node:assert/strict';
import { declaredHolds, undeclaredStills, stillText } from '../../harness/lib/still-limit.mjs';

const why = (entries) => Object.fromEntries(entries.map((e) => [e, 'the held wordmark is the last beat']));

test('a still over 0.5 s is named; one at 0.5 s or under is not', () => {
  const runs = [{ a: 1, b: 1.5, len: 0.5 }, { a: 2, b: 2.7, len: 0.7 }];
  assert.deepEqual(undeclaredStills(runs), [{ a: 2, b: 2.7, len: 0.7 }]);
});

test('a scoped dead-air waiver with a reason covers its seconds only', () => {
  const allow = ['dead-air@4-5'];
  const runs = [{ a: 4.1, b: 5, len: 0.9 }, { a: 1, b: 2, len: 1 }];
  assert.deepEqual(undeclaredStills(runs, { allow, _why: why(allow) }), [{ a: 1, b: 2, len: 1 }]);
});

test('a still that runs past its declared hold by over 0.5 s is still named', () => {
  const allow = ['dead-air@4-4.5'];
  assert.equal(undeclaredStills([{ a: 4, b: 5.2, len: 1.2 }], { allow, _why: why(allow) }).length, 1);
});

test('a bare dead-air covers the film, and a waiver with no reason covers nothing', () => {
  assert.deepEqual(declaredHolds({ allow: ['dead-air'], _why: why(['dead-air']) }), [[0, Infinity]]);
  assert.deepEqual(declaredHolds({ allow: ['dead-air@1-2'] }), []);
});

test('stillText names the seconds, the limit and both fixes', () => {
  assert.equal(stillText({ a: 2, b: 2.7, len: 0.7 }), 'static window 2-2.7 s (0.7 s, limit 0.5 s): keep one thing moving (a slow drift on the ground or the hero); waive: "allow": ["dead-air@2-2.7"], "_why": {"dead-air@2-2.7": "<reason>"} in <script id="authoring">');
});
