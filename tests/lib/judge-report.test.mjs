import test from 'node:test';
import assert from 'node:assert/strict';
import { reportLines } from '../../harness/lib/judge-report.mjs';

const result = {
  stage: 'draft', verdict: 'FIX', worlds: 5, scores: { hook: 6, thread: 9, motion: 5, type: 7 },
  fixes: [
    { axis: 'hook', score: 6, at: 0.1, fix: 'put the subject in frame 0' },
    { axis: 'motion', score: 5, at: null, fix: 'slow the exit' },
    { axis: 'type', score: 7, at: 2.5, fix: 'pad the mask' },
    { axis: 'sound', score: 7, at: null, fix: 'lower the swell' },
  ],
};

test('the report is the verdict, one score line, the three worst fixes and the file', () => {
  const lines = reportLines(result, 'out/x.judge.json');
  assert.equal(lines[0], 'judge --fresh (draft): FIX');
  assert.equal(lines[1], 'hook 6, thread 9, motion 5, type 7; worlds 5');
  assert.deepEqual(lines.slice(2, 5).map((l) => l.split(':')[0]), ['- motion 5 [no rule]', '- hook 6 at 0.1 [no rule]', '- type 7 at 2.5 [no rule]']);
  assert.equal(lines.at(-1), 'full report: out/x.judge.json');
  assert.equal(lines.length, 6);
});

test('the ledger lines follow the score line', () => {
  const lines = reportLines({ ...result, ledger: ['ledger: 1 fixed, 0 partly, 0 still; 2 new'] }, 'out/x.judge.json');
  assert.equal(lines[2], 'ledger: 1 fixed, 0 partly, 0 still; 2 new');
});

test('the side-by-side answers print before the file line', () => {
  const bar = [{ ref: 'A', dial: 'text', winner: 'A', why: 'ours is one size' }, { ref: 'A', dial: 'colour', winner: 'ours', why: '' }, { ref: 'A', dial: 'motion', winner: 'ours', why: '' }];
  const lines = reportLines({ ...result, bar }, 'out/x.judge.json');
  assert.deepEqual(lines.slice(-3), ['bar: text won 0 of 1, colour won 1 of 1, motion won 1 of 1', '- text: REF A is better, ours is one size', 'full report: out/x.judge.json']);
});
