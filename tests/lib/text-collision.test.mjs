import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { textCollisions, textCollisionLines, textCrossings } from '../../harness/lib/text-collision.mjs';

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

const ship = JSON.parse(fs.readFileSync(new URL('../fixtures/text-collision-s11a-ship-the-beta.json', import.meta.url), 'utf8'));

test('s11a: "beta" and "on" cross while both move at 11.03 to 11.13 s', () => {
  const lines = textCollisionLines([], ship);
  assert.ok(lines.includes('text "beta" and "on" cross while moving from 11.03 to 11.13 s: keep their paths apart, or time one out before the other comes in'));
  assert.deepEqual(textCollisions(ship.filter((s) => s.t % 0.5 < 0.034)), []);
});

const dense = (pathA, pathB, extra = {}) => pathA.map((a, k) => ({
  t: +(k / 30).toFixed(3),
  lines: [{ text: 'Out', fontPx: 40, box: [a, 100, 200, 60], block: 1, own: 1, up: [1], ...extra.a }, { text: 'In', fontPx: 40, box: [pathB[k], 110, 200, 60], block: 2, own: 2, up: [2], ...extra.b }],
}));
const sweep = (from, step, n) => Array.from({ length: n }, (_, k) => from + k * step);

test('two moving texts that overlap for 3 samples cross; 2 samples, a still text and a drift do not', () => {
  assert.equal(textCrossings(dense(sweep(0, 40, 10), sweep(600, -40, 10))).length, 1);
  assert.equal(textCrossings(dense(sweep(0, 40, 6), sweep(400, -40, 6))).length, 0);
  assert.equal(textCrossings(dense(sweep(0, 40, 10), sweep(300, 0, 10))).length, 0);
  assert.equal(textCrossings(dense(sweep(0, 1, 10), sweep(100, 0.5, 10))).length, 0);
});

test('texts that share a source, a world or an ancestor never cross, and a pair the settled check names is not named twice', () => {
  const [a, b] = [sweep(0, 40, 10), sweep(600, -40, 10)];
  assert.equal(textCrossings(dense(a, b, { a: { source: 'id:chip' }, b: { source: 'id:chip' } })).length, 0);
  assert.equal(textCrossings(dense(a, b, { a: { world: 'a' }, b: { world: 'b' } })).length, 0);
  assert.equal(textCrossings(dense(a, b, { b: { up: [2, 1] } })).length, 0);
  assert.equal(textCrossings(dense(a, b), [{ t: 3, a: 'Out', b: 'In' }]).length, 0);
});
