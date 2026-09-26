// tests/blocks/item-shape.test.mjs: `timeline` and `uiReveal3d` read each item as an object
// ({title, meta?, done?} / {label, value?}). Before this fix, passing plain strings (items: ["Step
// 1", "Step 2"]) did not error: `it.title` on a string is `undefined`, which a template literal
// prints as the literal word "undefined" (timeline), or, behind an `it.x || ''` guard, silently
// renders a blank row (uiReveal3d). needShape (blocks/kit.mjs) asserts the shape, not just that the
// array is non-empty (needData's job), so the real cause is named instead of read off the frame.
//   node --test tests/blocks/item-shape.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { needShape } from '../../blocks/kit.mjs';
import { timeline } from '../../blocks/ui.mjs';
import { uiReveal3d } from '../../blocks/vfx.mjs';

test('needShape: a plain string item is refused, not silently undefined', () => {
  assert.throws(() => needShape('timeline', 'items', ['Step 1'], ['title']),
    /items\[0\]` must be an object with `title`\. Got "Step 1"/);
});

test('needShape: an object missing a required field is refused', () => {
  assert.throws(() => needShape('timeline', 'items', [{ meta: 'today' }], ['title']),
    /items\[0\]` is missing `title`/);
});

test('needShape: the real shape passes clean', () => {
  assert.doesNotThrow(() => needShape('timeline', 'items', [{ title: 'Step 1', meta: 'today' }], ['title']));
});

test('timeline: a plain-string items array is refused before it ever prints "undefined"', () => {
  assert.throws(() => timeline({ items: ['Step 1', 'Step 2'] }), /items\[0\]` must be an object/);
});

test('timeline: real {title} items render the title, not the word "undefined"', () => {
  const [layer] = timeline({ items: [{ title: 'Step 1' }, { title: 'Step 2', meta: 'today' }] });
  assert.ok(layer.html.includes('Step 1'));
  assert.ok(!layer.html.includes('undefined'));
});

test('uiReveal3d: a plain-string items array is refused', () => {
  assert.throws(() => uiReveal3d({ items: ['Row 1'] }), /items\[0\]` must be an object/);
});

test('uiReveal3d: real {label} items render clean', () => {
  const [layer] = uiReveal3d({ items: [{ label: 'CPU', value: '42%' }] });
  assert.ok(layer.html.includes('CPU'));
  assert.ok(!layer.html.includes('undefined'));
});
