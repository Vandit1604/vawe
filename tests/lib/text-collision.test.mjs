import test from 'node:test';
import assert from 'node:assert/strict';
import { textCollisions, textCollisionLines } from '../../harness/lib/text-collision.mjs';

const line = (text, box) => ({ text, fontPx: 40, box });

test('two texts on one spot are named once, at the first time they overlap', () => {
  const samples = [
    { t: 0.5, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [600, 100, 300, 60])] },
    { t: 1, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [200, 110, 300, 60])] },
    { t: 1.5, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [150, 100, 300, 60])] },
    { t: 2, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [150, 100, 300, 60])] },
  ];
  assert.deepEqual(textCollisionLines(samples), ['text "Faster" and "builds" overlap at 2.00 s: move one, or time one out before the other comes in']);
});

const SOURCE_ROW = [100, 100, 400, 60];

test('a text that slides in over another is named once it stops, not while it travels', () => {
  const at = (t, chipBox) => ({ t, lines: [line('Row', SOURCE_ROW), line('Chip', chipBox)] });
  const flying = [at(0.5, [700, 400, 200, 60]), at(1, [300, 200, 200, 60]), at(1.5, [120, 100, 200, 60]), at(2, [110, 100, 200, 60]), at(2.5, [110, 100, 200, 60])];
  assert.deepEqual(textCollisions(flying).map((c) => c.t), [2]);
  assert.deepEqual(textCollisions(flying.slice(0, 3)), []);
});

test('a wrapped text is tested line by line: its short last line does not collide with text beside it', () => {
  const wrapped = { text: 'A long headline that wraps', fontPx: 40, box: [100, 100, 600, 120], rects: [[100, 100, 600, 60], [100, 160, 150, 60]] };
  const beside = line('Tag', [400, 160, 200, 60]);
  assert.deepEqual(textCollisions([{ t: 1, lines: [wrapped, beside] }]), []);
  assert.equal(textCollisions([{ t: 1, lines: [{ ...wrapped, rects: undefined }, beside] }]).length, 1);
  assert.equal(textCollisions([{ t: 1, lines: [wrapped, line('Tag', [150, 160, 200, 60])] }]).length, 1);
});

test('texts of two worlds never collide: an overlap across a cut is the seam, not a layout fault', () => {
  const lines = (wa, wb) => [{ t: 1, lines: [{ ...line('Out', [0, 0, 300, 80]), world: wa }, { ...line('In', [10, 0, 300, 80]), world: wb }] }];
  assert.deepEqual(textCollisions(lines('a', 'b')), []);
  assert.equal(textCollisions(lines('a', 'a')).length, 1);
  assert.equal(textCollisions(lines(undefined, 'b')).length, 1);
});

test('texts that touch or graze under a quarter of the smaller box do not collide', () => {
  const samples = [{ t: 1, lines: [line('A', [0, 0, 100, 50]), line('B', [100, 0, 100, 50]), line('C', [0, 45, 100, 50])] }];
  assert.deepEqual(textCollisions(samples), []);
});

test('a line with no box is skipped', () => {
  assert.deepEqual(textCollisions([{ t: 1, lines: [{ text: 'A', fontPx: 40 }, line('B', [0, 0, 10, 10])] }]), []);
});
