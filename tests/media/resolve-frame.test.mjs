// The output size of a draft and a final is even on both sides for every aspect: libx264 with yuv420p
// refuses an odd side (a 4:5 draft is 540x675 before rounding).
//   node --test tests/media/resolve-frame.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFrame } from '../../harness/media/render-page.mjs';
import { ASPECTS } from '../../core/layout/aspects.js';

const PAGE = 'tests/fixtures/pages/seek-returns-thenable.html';

for (const final of [false, true]) {
  for (const aspect of [...Object.keys(ASPECTS), '7:5', '3:7']) {
    test(`${aspect} ${final ? 'final' : 'draft'} has an even output size`, () => {
      const f = resolveFrame(PAGE, { aspect, final });
      assert.equal(f.outWidth % 2, 0);
      assert.equal(f.outHeight % 2, 0);
      const full = final ? 1 : 0.5;
      assert.ok(Math.abs(f.outWidth - f.width * full) <= 1);
      assert.ok(Math.abs(f.outHeight - f.height * full) <= 1);
    });
  }
}

test('the 4:5 draft is 540x676, not 540x675', () => {
  const f = resolveFrame(PAGE, { aspect: '4:5' });
  assert.deepEqual([f.outWidth, f.outHeight], [540, 676]);
});

test('an odd --w gives an even output', () => {
  const f = resolveFrame(PAGE, { aspect: '16:9', w: 641 });
  assert.equal(f.outWidth % 2, 0);
  assert.equal(f.outHeight % 2, 0);
});
