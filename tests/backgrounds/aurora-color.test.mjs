// tests/backgrounds/aurora-color.test.mjs: aurora's blobs land inside `rgba(${color},a)`, so `color`
// must already be an "r,g,b" string; a hex colour used to reach canvas addColorStop as
// `rgba(#3b82f6,a)`, an invalid CSS colour that throws. This proves a hex (and an rgb()-wrapped)
// colour now converts and paints instead of throwing, with the bare "r,g,b" form unaffected.
//   node --test tests/backgrounds/aurora-color.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { aurora } from '../../core/backgrounds/fx.js';

// A mock 2D context: addColorStop mirrors the real one's refusal of a non-numeric rgba() colour, so a
// still-broken conversion fails this test the same way it would fail in a real render.
function fakeCtx() {
  const stops = [];
  return {
    stops,
    set globalCompositeOperation(_v) {},
    createRadialGradient() {
      return {
        addColorStop(offset, color) {
          if (!/^rgba\(\d+,\d+,\d+,[\d.]+\)$/.test(color)) throw new Error(`invalid colour stop: ${color}`);
          stops.push(color);
        },
      };
    },
    set fillStyle(_v) {},
    beginPath() {},
    arc() {},
    fill() {},
  };
}

test('a hex blob colour converts instead of throwing', () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => aurora(ctx, 1920, 1080, 0, { blobs: [{ color: '#3b82f6', x: 0.5, y: 0.5, r: 400, ax: 0, ay: 0, px: 10, py: 10, ph: 0 }] }));
  assert.ok(ctx.stops.length > 0, 'expected at least one gradient stop to be painted');
  for (const s of ctx.stops) assert.doesNotMatch(s, /#/, `stop still carries a hex colour: ${s}`);
});

test('an rgb()-wrapped blob colour converts too', () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => aurora(ctx, 1920, 1080, 0, { blobs: [{ color: 'rgb(59, 130, 246)', x: 0.5, y: 0.5, r: 400, ax: 0, ay: 0, px: 10, py: 10, ph: 0 }] }));
  assert.ok(ctx.stops.every((s) => /^rgba\(59,130,246,/.test(s)), ctx.stops.join(', '));
});

test('an already-bare "r,g,b" colour is untouched', () => {
  const ctx = fakeCtx();
  aurora(ctx, 1920, 1080, 0, { blobs: [{ color: '31,59,255', x: 0.5, y: 0.5, r: 400, ax: 0, ay: 0, px: 10, py: 10, ph: 0 }] });
  assert.ok(ctx.stops.every((s) => s.startsWith('rgba(31,59,255,')), ctx.stops.join(', '));
});

test('the built-in default blobs still paint with no override', () => {
  const ctx = fakeCtx();
  assert.doesNotThrow(() => aurora(ctx, 1920, 1080, 0));
  assert.ok(ctx.stops.length > 0);
});
