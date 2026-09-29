// tests/validate/did-you-mean.test.mjs: the runnable self-check for the three validator gaps that
// cost real agent time (unknown prop with no suggestion, a wrong-type field with no expected type,
// an unparseable aurora colour that renders wrong instead of refusing).
//   node --test tests/validate/did-you-mean.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { unknownLayerPropErrors } from '../../core/validate/cli.mjs';
import { validateData } from '../../core/validate/validate.mjs';
import { bgErrors } from '../../core/validate/backgrounds.mjs';

// A trimmed schema stub, not the real 1300-line films/scene/schema.json: only what unknownLayerPropErrors
// reads (fields.layers.item for "is this key known at all", layerProps for "which one did you mean").
const SCHEMA = {
  fields: { layers: { item: { type: {}, intensity: {}, pulse: {}, x: {}, y: {}, italic: {} } } },
  layerProps: {
    byType: { glow: ['intensity', 'pulse', 'color'], text: ['italic', 'size'] },
    shared: ['x', 'y', 'id', 'idle', 'items'],
  },
};

test('case 1: an unknown prop on a glow layer suggests the one glow field it is short for', () => {
  const errors = unknownLayerPropErrors({ layers: [{ type: 'glow', i: 0.4 }] }, SCHEMA);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown prop "i"/);
  assert.match(errors[0], /Did you mean: intensity\?/);
});

test('case 2: a field given the wrong type names the expected type', () => {
  const schema = { fields: { pulse: { type: 'number', label: 'seconds' } } };
  const errors = validateData(schema, { pulse: {} });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /must be a number, got a object/);
});

test('case 3: an aurora blob colour the engine cannot parse is refused at validate time, not rendered wrong', () => {
  const errors = bgErrors({
    bg: [{ base: { kind: 'radial' }, fx: [{ type: 'aurora', blobs: [{ color: { r: 1, g: 2, b: 3 } }] }] }],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /bg\[0\]\.fx\[0\]\.blobs\[0\]\.color/);
  assert.match(errors[0], /not a colour the engine can read/);
});

test('a real hex, rgb(), and bare "r,g,b" colour all pass clean', () => {
  const errors = bgErrors({
    bg: [{
      base: { kind: 'radial' },
      fx: [{ type: 'aurora', blobs: [
        { color: '#3b82f6' }, { color: 'rgb(10,20,30)' }, { color: '31,59,255' },
      ] }],
    }],
  });
  assert.deepEqual(errors, []);
});
