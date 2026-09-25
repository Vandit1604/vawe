// core/fx/squash.test.mjs: the runnable self-check for "squash cannot see rotation" (this session's
// fix, engine-doctrine/MISTAKES.md). Pure-JS: squash's frame() reads only `el.offsetWidth/Height` and
// `el.style.scale`, so a plain object stands in for the element, exactly as core/timeline/clips.test.mjs
// stands one in for `el.dataset`.
//   node core/fx/squash.test.mjs
import assert from 'node:assert/strict';
import { frame } from '../../core/fx/squash.js';

const scene = { clock: { fps: 30 } };
const fakeEl = (w, h) => ({ offsetWidth: w, offsetHeight: h, style: {} });

// REGRESSION: a layer that only translates squashes exactly as before (omega is 0, so the rotation
// branch never runs and speed/horizontal come from vx/vy alone).
{
  const L = { id: 'mover', start: 0, motion: [{ t: 0, x: 0 }, { t: 1, x: 3000, ease: 'linear' }] };
  const el = fakeEl(100, 100);
  frame({}, el, L, 0.5, scene, true);
  assert.notEqual(el.style.scale, 'none', 'a fast translating layer still squashes');
  const [sx, sy] = el.style.scale.split(' ').map(Number);
  assert.ok(sx > sy, `moving mostly in x stretches the x scale, got "${el.style.scale}"`);
}

// THE FIX: a layer that ONLY rotates about a fixed anchor (`ox`/`oy` constant, `rot` keyed, `x`/`y`
// never keyed) has zero dx/dy and used to read zero speed. It must now squash.
{
  const L = { id: 'arm', start: 0,
    motion: [{ t: 0, rot: 0, ox: 0, oy: 50 }, { t: 1, rot: 360, ox: 0, oy: 50, ease: 'linear' }] };
  const el = fakeEl(400, 20); // a wide, thin arm, pivoting at its own left edge (ox: 0)
  frame({}, el, L, 0.5, scene, { amount: 0.3, at: 200 });
  assert.notEqual(el.style.scale, 'none',
    'a layer that only rotates about a fixed anchor now squashes (used to read zero speed and do nothing)');
  const [sx, sy] = el.style.scale.split(' ').map(Number);
  // The anchor sits at the box's LEFT edge (reach along local x: 400; along local y: 10), so the box's
  // own extremity sweeps mostly along local y as it turns, and `y` is the axis that stretches.
  assert.ok(sy > sx, `an arm pivoting at its own edge stretches the SHORT axis it sweeps through, got "${el.style.scale}"`);
  assert.ok(sx * sy > 0.99 && sx * sy < 1.01, `volume still conserved (sx*sy ~= 1), got ${sx * sy}`);
}

// A layer that neither moves nor turns still renders identity.
{
  const L = { id: 'still', start: 0, motion: [{ t: 0, x: 0, rot: 0 }, { t: 1, x: 0, rot: 0 }] };
  const el = fakeEl(100, 100);
  frame({}, el, L, 0.5, scene, true);
  assert.equal(el.style.scale, 'none', 'a layer with keyed but unchanging x/rot stays identity');
}

console.log('squash.test.mjs: translation-only squash is unchanged, pure rotation about a fixed anchor now squashes, and a still layer stays identity');
