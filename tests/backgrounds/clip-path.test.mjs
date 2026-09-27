// tests/backgrounds/clip-path.test.mjs: applyCssClipPath (core/backgrounds/index.js) is the read-back
// half of a masking cut style's own clipPath output (core/cuts/presentations.js wipe/circleWipe/
// clockWipe): a real canvas clip region instead of the alpha-blend every bg window switch used to do
// even under a masking fx, which passed a pale intermediate tint through a white-to-cobalt change
// (films/scene/scene.js drawBg, MISTAKES). Pure-JS, no real canvas: a tiny mock records the calls.
//   node --test tests/backgrounds/clip-path.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCssClipPath } from '../../core/backgrounds/index.js';

function mockCtx() {
  const calls = [];
  return {
    calls,
    beginPath: () => calls.push(['beginPath']),
    rect: (x, y, w, h) => calls.push(['rect', x, y, w, h]),
    arc: (x, y, r, a, b) => calls.push(['arc', x, y, r, a, b]),
    moveTo: (x, y) => calls.push(['moveTo', x, y]),
    lineTo: (x, y) => calls.push(['lineTo', x, y]),
    closePath: () => calls.push(['closePath']),
    clip: () => calls.push(['clip']),
  };
}

test('none is not a clip: no calls, false returned', () => {
  const ctx = mockCtx();
  assert.equal(applyCssClipPath(ctx, 1920, 1080, 'none'), false);
  assert.equal(applyCssClipPath(ctx, 1920, 1080, null), false);
  assert.deepEqual(ctx.calls, []);
});

test('inset(): a directional wipe clip lowers to a real rect', () => {
  const ctx = mockCtx();
  // wipe(0.4, 'left') -> inset(0 60% 0 0), core/cuts/presentations.js
  const ok = applyCssClipPath(ctx, 1000, 500, 'inset(0 60% 0 0)');
  assert.equal(ok, true);
  const rect = ctx.calls.find((c) => c[0] === 'rect');
  assert.deepEqual(rect, ['rect', 0, 0, 400, 500], 'left wipe at 40% reveals the left 400px, full height');
  assert.ok(ctx.calls.some((c) => c[0] === 'clip'));
});

test('circle(): an iris clip lowers to a real arc, centred and radius-scaled', () => {
  const ctx = mockCtx();
  const ok = applyCssClipPath(ctx, 1000, 1000, 'circle(25% at 50% 50%)');
  assert.equal(ok, true);
  const arc = ctx.calls.find((c) => c[0] === 'arc');
  assert.equal(arc[1], 500); assert.equal(arc[2], 500); // centred on a square frame
  assert.ok(arc[3] > 0, 'a positive radius in px');
});

test('polygon(): a clock-wipe clip lowers to a real path', () => {
  const ctx = mockCtx();
  const ok = applyCssClipPath(ctx, 200, 100, 'polygon(50.0% 50.0%, 50.0% 0.0%, 100.0% 0.0%)');
  assert.equal(ok, true);
  assert.deepEqual(ctx.calls[1], ['moveTo', 100, 50]);
  assert.deepEqual(ctx.calls[2], ['lineTo', 100, 0]);
  assert.deepEqual(ctx.calls[3], ['lineTo', 200, 0]);
});

test('a maskImage-only style (no clipPath at all) is not a clip this canvas can draw', () => {
  const ctx = mockCtx();
  assert.equal(applyCssClipPath(ctx, 1000, 500, 'linear-gradient(90deg, #000 10%, transparent 30%)'), false);
  assert.deepEqual(ctx.calls, [], 'nothing is drawn when the shape cannot be parsed as a hard clip');
});
