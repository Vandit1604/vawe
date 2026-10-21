// tests/media/lens-views.test.mjs: views, movements, backdrop and depth cue of core/surfaces/lens-views.js (pure, no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAMP_DEG, MOVES, VIEWS, backdropFor, lensPose, luminance, moveBetween, shadowFor, view, viewScaled } from '../../core/surfaces/lens-views.js';

test('the four measured presets are named, flat is the identity and the isometric tilts 30 and 45 degrees', () => {
  assert.deepEqual(Object.keys(VIEWS), ['flat', 'side-angle', 'isometric', 'top-diagonal', 'reverse-isometric']);
  const iso = lensPose(view('isometric'));
  assert.ok(Math.abs(iso.tiltX + Math.PI / 6) < 1e-12 && Math.abs(iso.tiltY + Math.PI / 4) < 1e-12);
  assert.deepEqual(viewScaled('reverse-isometric', 0.5), { x: -10, y: 22.5, z: 0, zoom: 0.58 });
});

test('a movement is the same for the same seed and different for another', () => {
  const a = moveBetween('soft-orbit', 7);
  assert.deepEqual(a, moveBetween('soft-orbit', 7));
  assert.notDeepEqual(a, moveBetween('soft-orbit', 8));
});

test('every screen movement keeps x and y within the measured clamp, its end settles within 18 degrees, and scale shrinks it', () => {
  for (const name of Object.keys(MOVES).filter((n) => !n.startsWith('isometric'))) {
    for (let seed = 1; seed <= 30; seed++) {
      const { from, to } = moveBetween(name, seed);
      for (const p of [from, to]) assert.ok(Math.abs(p.x) <= CLAMP_DEG && Math.abs(p.y) <= CLAMP_DEG, `${name} ${seed}`);
      assert.ok(Math.abs(to.x) <= 18 && Math.abs(to.y) <= 18, `${name} ${seed} end ${to.x}, ${to.y}`);
      const small = moveBetween(name, seed, { scale: 0.5 });
      assert.ok(Math.abs(small.from.y) <= Math.abs(from.y) + 1e-9);
    }
  }
});

test('soft-orbit reproduces the study ranges: start pitch 6 to 25, yaw 20 to 25 (clamped), end pitch 3 to 10 and yaw 7 to 15', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { from, to } = moveBetween('soft-orbit', seed);
    assert.ok(Math.abs(from.x) >= 6 - 1e-9 && Math.abs(from.y) >= 20 - 1e-9);
    assert.ok(Math.abs(to.x) >= 3 - 1e-9 && Math.abs(to.x) <= 10 + 1e-9 && Math.abs(to.y) >= 7 - 1e-9 && Math.abs(to.y) <= 15 + 1e-9);
  }
});

test('an unknown name fails with the valid ones', () => {
  assert.throws(() => view('oblique'), /unknown view "oblique"; valid: flat, side-angle/);
  assert.throws(() => moveBetween('spin', 1), /unknown move "spin"; valid: focus-push/);
});

test('the backdrop of a near-black page is a little lighter, of a white page a little darker', () => {
  const dark = backdropFor([0, 0, 0]);
  assert.ok(luminance(dark) > 0.005 && luminance(dark) < 0.05, `${luminance(dark)}`);
  const light = backdropFor([1, 1, 1]);
  assert.ok(luminance(light) < 1 && luminance(light) > 0.85);
});

test('a light backdrop gets the plain soft shadow and no rim', () => {
  const s = shadowFor([0.93, 0.93, 0.91], [0, 0, 0]);
  assert.equal(s.mode, 'light');
  assert.equal(s.rim.alpha, 0);
  assert.ok(s.layers[0].alpha <= 0.34);
});

test('a dark backdrop gets denser shadow layers, a rim and a reflection, and the shadow reads against it', () => {
  const page = [0, 0, 0];
  const backdrop = backdropFor(page);
  const s = shadowFor(backdrop, page);
  assert.equal(s.mode, 'dark');
  assert.ok(s.layers[0].alpha >= 0.6 && s.layers[1].alpha >= 0.8);
  assert.ok(s.rim.alpha > 0 && s.reflection.alpha > 0);
  const shadowed = luminance(backdrop.map((c) => c * (1 - s.layers[1].alpha)));
  assert.ok((luminance(backdrop) + 0.05) / (shadowed + 0.05) >= 1.15, 'the contact shadow is under 1.15:1 against the backdrop');
  assert.ok(luminance(s.rim.color) > luminance(backdrop) * 5);
});

test('a tint colours the rim of a dark backdrop and changes nothing on a light one', () => {
  const dark = shadowFor([0, 0.03, 0.07], [0, 0, 0], { tint: [0.2, 0.55, 1] });
  assert.ok(dark.rim.color[2] > dark.rim.color[0] * 1.5);
  assert.deepEqual(shadowFor([0.95, 0.95, 0.94], [0, 0, 0], { tint: [0.2, 0.55, 1] }), shadowFor([0.95, 0.95, 0.94], [0, 0, 0]));
});
