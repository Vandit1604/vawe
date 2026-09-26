// tests/layers/matte-modes.test.mjs: `resolve()` and the invert composite it drives, pure and
// hermetic (no browser: matte.js's geometry is plain arithmetic, per its own header note).
//
// node tests/layers/matte-modes.test.mjs
import assert from 'node:assert/strict';
import { resolve, frame } from '../../core/fx/matte.js';

const L = { id: 'target' };

// `layer` is the author-facing key the task asked for; `from` is the pre-existing spelling. Both name
// the same thing and giving both at once is refused, one truth only.
assert.deepEqual(resolve({ layer: 'sweep' }, L), { from: 'sweep', mode: 'luminance', invert: false });
assert.deepEqual(resolve({ from: 'sweep' }, L), { from: 'sweep', mode: 'luminance', invert: false });
assert.throws(() => resolve({ from: 'sweep', layer: 'sweep' }, L), /name the same thing/);

// mode vocabulary: luma/luminance are the same CSS mode; each takes an -inverted twin.
assert.deepEqual(resolve({ layer: 's', mode: 'luma' }, L), { from: 's', mode: 'luminance', invert: false });
assert.deepEqual(resolve({ layer: 's', mode: 'luminance' }, L), { from: 's', mode: 'luminance', invert: false });
assert.deepEqual(resolve({ layer: 's', mode: 'alpha' }, L), { from: 's', mode: 'alpha', invert: false });
assert.deepEqual(resolve({ layer: 's', mode: 'luma-inverted' }, L), { from: 's', mode: 'luminance', invert: true });
assert.deepEqual(resolve({ layer: 's', mode: 'alpha-inverted' }, L), { from: 's', mode: 'alpha', invert: true });
assert.throws(() => resolve({ layer: 's', mode: 'invert' }, L), /unknown mode/);

// a bare string is still shorthand for `{ layer: <id> }`, the default luma mode.
assert.deepEqual(resolve('sweep', L), { from: 'sweep', mode: 'luminance', invert: false });

// frame(): an inverted mask adds a second, fully-opaque mask layer and composites the two with
// mask-composite: exclude / -webkit-mask-composite: xor, the real CSS primitive for "invert a mask",
// never a private code path. A non-inverted matte writes one mask layer and clears any composite.
const scene = {
  specOf: (id) => (id === 'src' ? { bg: 'linear-gradient(#fff,#fff)' } : null),
  boxOf: (id) => (id === 'src' ? { cx: 100, cy: 100, w: 50, h: 50, scale: 1 } : { cx: 100, cy: 100, w: 200, h: 200, scale: 1 }),
  ids: ['src', 'target'],
};
const mkEl = () => ({ style: {} });

const plain = mkEl();
frame(null, plain, { id: 'target' }, 0, scene, { layer: 'src', mode: 'alpha' });
assert.equal(plain.style.maskComposite, '');
assert.equal(plain.style.webkitMaskComposite, '');
const FULL_MASK = 'linear-gradient(#fff, #fff)';
assert.ok(!plain.style.maskImage.includes(FULL_MASK), 'a non-inverted matte writes exactly one mask layer');

const inverted = mkEl();
frame(null, inverted, { id: 'target' }, 0, scene, { layer: 'src', mode: 'alpha-inverted' });
assert.equal(inverted.style.maskComposite, 'exclude');
assert.equal(inverted.style.webkitMaskComposite, 'xor');
assert.ok(inverted.style.maskImage.endsWith(`, ${FULL_MASK}`), 'an inverted matte writes a second, full-opacity mask layer');

console.log('matte-modes.test.mjs: ok');
