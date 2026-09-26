// tests/layout/anchor-point.test.mjs: `anchorPoint` on a layer says which point of the layer's OWN
// box its authored x/y names (default: the top-left corner, unchanged). Fixes engine friction: an
// author who specs x/y as a box's CENTRE (the way a director would) got the left/top edge instead,
// with no error, 25 minutes and 2 renders before the convention was found by reading code.
//   node --test tests/layout/anchor-point.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANCHOR_POINTS, resolveAnchorPoint } from '../../core/layout/safe.js';
import { layoutErrors } from '../../core/validate/layout.mjs';

test('resolveAnchorPoint: absent name is the top-left corner, identity', () => {
  assert.deepEqual(resolveAnchorPoint(undefined), [0, 0]);
  assert.deepEqual(resolveAnchorPoint(null), [0, 0]);
});

test('resolveAnchorPoint: the nine names are the fractions of w/h subtracted from x/y', () => {
  assert.deepEqual(resolveAnchorPoint('top-left'), [0, 0]);
  assert.deepEqual(resolveAnchorPoint('center'), [0.5, 0.5]);
  assert.deepEqual(resolveAnchorPoint('bottom-right'), [1, 1]);
  assert.deepEqual(resolveAnchorPoint('top'), [0.5, 0]);
  assert.deepEqual(resolveAnchorPoint('left'), [0, 0.5]);
  assert.equal(Object.keys(ANCHOR_POINTS).length, 9);
});

test('resolveAnchorPoint: an unknown name is refused by name, not silently taken as the corner', () => {
  assert.throws(() => resolveAnchorPoint('middle'), /anchorPoint "middle" is not one of/);
});

// The arithmetic core/engine/boot.js resolveLayerCoords applies once x/y are resolved numbers: the
// box's left/top edge is x/y minus the anchor fraction of its own w/h. Reproduced here (pure, no DOM)
// so the formula itself is asserted directly, mirroring tests/layout/safe.test.mjs's own pattern of
// re-deriving the engine's arithmetic rather than importing boot.js.
function anchoredEdge(x, y, w, h, anchorPoint) {
  const [fx, fy] = resolveAnchorPoint(anchorPoint);
  return { left: x - fx * w, top: y - fy * h };
}

test('anchoredEdge: "center" puts the box\'s centre at x/y, not its corner', () => {
  const { left, top } = anchoredEdge(960, 540, 200, 100, 'center');
  assert.equal(left, 860); // 960 - 200/2
  assert.equal(top, 490);  // 540 - 100/2
});

test('anchoredEdge: default (no anchorPoint) leaves x/y as the left/top edge', () => {
  const { left, top } = anchoredEdge(960, 540, 200, 100, undefined);
  assert.equal(left, 960);
  assert.equal(top, 540);
});

test('layoutErrors: anchorPoint "center" with no w is named, not silently the left edge', () => {
  const errs = layoutErrors({ layers: [{ type: 'rect', x: 960, y: 540, anchorPoint: 'center' }] });
  assert.ok(errs.some((e) => /anchorPoint "center".*`w`/.test(e)), errs.join('\n'));
});

test('layoutErrors: anchorPoint "center" with w and h set is clean', () => {
  const errs = layoutErrors({ layers: [{ type: 'rect', x: 960, y: 540, w: 200, h: 100, anchorPoint: 'center' }] });
  assert.ok(!errs.some((e) => e.includes('anchorPoint')), errs.join('\n'));
});

test('layoutErrors: a text layer with `size` is excused the height half (boot.js estimates it)', () => {
  const errs = layoutErrors({ layers: [{ type: 'text', text: 'hi', x: 960, y: 540, w: 400, size: 80, anchorPoint: 'bottom' }] });
  assert.ok(!errs.some((e) => e.includes('anchorPoint')), errs.join('\n'));
});

test('layoutErrors: an unknown anchorPoint name is reported, listing the real ones', () => {
  const errs = layoutErrors({ layers: [{ type: 'rect', x: 0, y: 0, anchorPoint: 'middle' }] });
  assert.ok(errs.some((e) => e.includes('anchorPoint "middle" is not one of')), errs.join('\n'));
});
