import test from 'node:test';
import assert from 'node:assert/strict';
import { textCollisions, textCollisionLines } from '../../harness/lib/text-collision.mjs';

const line = (text, box) => ({ text, fontPx: 40, box });

test('two texts on one spot are named once, at the first time they overlap', () => {
  const samples = [
    { t: 0.5, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [600, 100, 300, 60])] },
    { t: 1, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [200, 110, 300, 60])] },
    { t: 1.5, lines: [line('Faster', [100, 100, 300, 60]), line('builds', [150, 100, 300, 60])] },
  ];
  assert.deepEqual(textCollisionLines(samples), ['text "Faster" and "builds" overlap at 1.00 s: move one, or time one out before the other comes in']);
});

test('texts that touch or graze under a quarter of the smaller box do not collide', () => {
  const samples = [{ t: 1, lines: [line('A', [0, 0, 100, 50]), line('B', [100, 0, 100, 50]), line('C', [0, 45, 100, 50])] }];
  assert.deepEqual(textCollisions(samples), []);
});

test('a line with no box is skipped', () => {
  assert.deepEqual(textCollisions([{ t: 1, lines: [{ text: 'A', fontPx: 40 }, line('B', [0, 0, 10, 10])] }]), []);
});
