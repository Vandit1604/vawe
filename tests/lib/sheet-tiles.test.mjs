import test from 'node:test';
import assert from 'node:assert/strict';
import { tileRuns, tileProblems, sheetFps } from '../../harness/lib/sheet-tiles.mjs';

// The exp-h4o draft's adjacent-tile differences at 5 fps (0.2-4.8 s): the judge called 4.0-4.8 s "5 static tiles, limit 4".
const H4O = [22.54, 7.64, 12.27, 48.59, 25.29, 29.22, 28.56, 15.69, 90, 8.91, 8.81, 7.2, 5.2, 2.78, 3.12, 2.99, 3.21, 59.66, 84.73, 22, 3.64, 3.44, 3.54, 3.56];

test('the h4o tail reads as 5 near-identical tiles, as the judge counted', () => {
  assert.deepEqual(tileRuns(H4O, 5), [{ a: 2.6, b: 3.4, tiles: 5 }, { a: 4, b: 4.8, tiles: 5 }]);
  assert.deepEqual(tileProblems(H4O, 5), [
    '5 near-identical tail tiles 4-4.8 s on the judge\'s sheet (limit 4): add a move there or make the push larger, or declare the hold with "dead-air@4-4.8" in authoring.allow and a _why',
  ]);
});

test('a mid-film run over 8 tiles is named; 8 is fine; a declared hold is not counted', () => {
  const still = (n) => Array(n).fill(1);
  assert.equal(tileProblems([20, ...still(7), 20, 20], 5).length, 0);
  assert.match(tileProblems([20, ...still(8), 20, 20], 5)[0], /^9 near-identical tiles 0\.2-1\.8 s/);
  const tail = [20, 20, ...still(5)];
  assert.equal(tileProblems(tail, 5).length, 1);
  assert.equal(tileProblems(tail, 5, { allow: ['dead-air@0.4-1.4'], _why: { 'dead-air@0.4-1.4': 'the wordmark holds' } }).length, 0);
});

test('the sheet rate matches the judge: 5 fps, fewer for a film over 30 s', () => {
  assert.equal(sheetFps(10), 5);
  assert.equal(sheetFps(60), 2.5);
});
