import test from 'node:test';
import assert from 'node:assert/strict';
import { samePage, blankRuns, isFlat, problemsOf, doneLines } from '../../harness/lib/ship-status.mjs';

const stats = (over = {}) => ({ duration: 6, turns: [{ t: 2 }, { t: 4 }], static: [], ...over });

test('samePage: relative and absolute spellings of one page match', () => {
  assert.ok(samePage('films/a/page.html', `${process.cwd()}/films/a/../a/page.html`));
  assert.ok(!samePage('films/a/page.html', 'films/b/page.html'));
});

test('problemsOf: worst first, seconds named, small things ignored', () => {
  const out = problemsOf(stats({ duration: 10, turns: [{ t: 6.5 }], static: [{ a: 1, b: 2.5, len: 1.5 }, { a: 8, b: 8.5, len: 0.5 }] }), [{ a: 4, b: 4.4 }]);
  assert.deepEqual(out, ['world held 0.0-6.5 s (6.5 s)', 'world held 6.5-10.0 s (3.5 s)', 'static window 1-2.5 s (1.5 s, limit 0.5 s): keep one thing moving (a slow drift on the ground or the hero), or declare the hold with "dead-air@1-2.5" in authoring.allow and a _why', 'blank frame 4.0-4.4 s']);
});

test('problemsOf: a clean film has none', () => {
  assert.deepEqual(problemsOf(stats(), []), []);
});

test('blankRuns: a flat run inside the film counts, flat edges do not', () => {
  const flat = { flat: true }, live = { flat: false };
  const feats = [...Array(4).fill(flat), ...Array(20).fill(live), ...Array(4).fill(flat), ...Array(20).fill(live), ...Array(4).fill(flat)];
  assert.deepEqual(blankRuns(feats, (f) => f.flat), [{ a: 2.4, b: 2.8 }]);
});

test('isFlat: one colour and level luma only', () => {
  const hist = (top) => Float64Array.from([top, 1 - top, ...Array(14).fill(0)]);
  assert.ok(isFlat({ hist: hist(1), grid: Float64Array.from([0.5, 0.51]) }));
  assert.ok(!isFlat({ hist: hist(0.6), grid: Float64Array.from([0.5, 0.5]) }));
  assert.ok(!isFlat({ hist: hist(1), grid: Float64Array.from([0.1, 0.9]) }));
});

test('doneLines: at most 3 problems and the judge command', () => {
  const job = { id: 'x', startedAt: 0, endedAt: 5000, outputs: ['out/x.mp4'], problems: ['a', 'b', 'c', 'd'] };
  const lines = doneLines(job);
  assert.equal(lines[0], 'job x: done in 5s');
  assert.equal(lines.filter((l) => l.startsWith('  ')).length, 3);
  assert.equal(lines.at(-1), 'next: bin/vawe judge out/x.mp4 --fresh');
});

test('doneLines: no problems and a skipped check are said plainly', () => {
  assert.match(doneLines({ id: 'x', startedAt: 0, endedAt: 1000, outputs: ['o.mp4'], problems: [] }).join('\n'), /no problems found/);
  assert.match(doneLines({ id: 'x', startedAt: 0, endedAt: 1000, outputs: ['o.mp4'], problems: [], checkError: 'boom' }).join('\n'), /check skipped: boom/);
});
