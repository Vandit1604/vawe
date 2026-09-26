// tests/blocks/card-stat.test.mjs: card.stat (blocks/charts.mjs statCard) must never invent a
// delta chip. It shows one only when the author passes `delta`.
//
//   node tests/blocks/card-stat.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../../blocks/catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { statCard } = await import(`file://${path.join(ROOT, 'blocks/charts.mjs')}`);

test('statCard with no delta renders no chip', () => {
  const [layer] = statCard({ x: 0, y: 0, to: 100, label: 'blocks' });
  assert.equal(layer.children.length, 2, 'label + count only, no chip group');
});

test('statCard with a delta renders exactly one chip', () => {
  const [layer] = statCard({ x: 0, y: 0, to: 100, label: 'blocks', delta: '+12%' });
  assert.equal(layer.children.length, 3, 'label + count + one chip group');
  const chip = layer.children[2];
  assert.equal(chip.layout, 'row');
  const deltaText = chip.children.find((c) => c.text === '+12%');
  assert.ok(deltaText, 'the chip must carry the exact delta the author passed, never an invented one');
});

test('the searchable card.stat catalog row invents no delta', () => {
  const row = CATALOG.find((r) => r.name === 'card.stat');
  assert.ok(row, 'card.stat must stay in the catalog');
  assert.equal(row.props.delta ?? '', '', 'the bare, searchable example must not fabricate a delta');
});
