// tests/media/review-cut-pass.test.mjs: the cut pass names the least seen text and the most repeated move,
// and stays silent while an error stands.
//   node --test tests/media/review-cut-pass.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutLines } from '../../harness/media/review.mjs';

const node = (group, line, w) => ({ id: group, group, line, opacity: 1, blur: 0, size: 20, ink: { x: 0, y: 0, w, h: 20 }, clips: [], vw: 1000, vh: 500 });
const samples = [0, 0.1, 0.2].map((t) => ({ t, nodes: [node('a', 'Big headline', 400), node('b', 'tiny note', 40)] }));
const moves = [{ props: ['opacity', 'transform'], ms: 600 }, { props: ['opacity', 'transform'], ms: 600 }, { props: ['filter'], ms: 300 }];

test('names the least seen line and the most repeated move', () => {
  const [line] = cutLines([{ severity: 'warn' }], { samples, moves }, 0.1);
  assert.match(line, /^Cut: remove one element and one move, then review again/);
  assert.match(line, /"tiny note"/);
  assert.match(line, /opacity \+ transform over 0\.60 s \(2 times\)/);
});

test('says nothing while an error-level finding stands', () => {
  assert.deepEqual(cutLines([{ severity: 'error' }], { samples, moves }, 0.1), []);
});
