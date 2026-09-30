import test from 'node:test';
import assert from 'node:assert/strict';
import { lowContrast, draftContrastLines } from '../../harness/lib/text-contrast.mjs';

const W = 40, H = 40;
const fill = (c, glyph = null) => {
  const data = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) data.set(glyph && (i % W) < W / 4 && i < (W * H) / 4 ? glyph : c, i * 3);
  return data;
};
const amber = [255, 154, 38], burnt = [179, 36, 10], ink = [28, 10, 46];
// The text painted in `glyph` on `ground`, and the same frame with the text hidden.
const shots = (ground, glyph) => ({ shown: fill(ground, glyph), raw: fill(ground), scale: 1, width: W, height: H });
const line = (text, color) => ({ text, fontPx: 30, box: [0, 0, W, H], color, opacity: 1 });

test('an accent word on an amber flood is named in the draft with its ratio and a colour that passes', () => {
  const samples = [4, 4.5].map((t) => ({ t, lines: [line('through', 'rgb(179, 36, 10)')], shots: shots(amber, burnt) }));
  const [l, ...rest] = draftContrastLines(samples);
  assert.equal(rest.length, 0);
  assert.match(l, /^text "through" at 4.00 s reads 3.1:1 on the pixels behind it \(#b3240a on #ff9a26, needs 4.5:1\): use #\w{6}, or change the ground behind it$/);
});

test('dark ink on amber passes', () => {
  const samples = [{ t: 1, lines: [line('vatt', 'rgb(28, 10, 46)')], shots: shots(amber, ink) }];
  assert.deepEqual(draftContrastLines(samples), []);
});

test('text the page lists but never paints is skipped', () => {
  const samples = [{ t: 1, lines: [line('hidden', 'rgb(179, 36, 10)')], shots: shots(amber, null) }];
  assert.deepEqual(draftContrastLines(samples), []);
});

test('without a minimum, large type needs only 3:1 (the critique rule)', () => {
  const row = (t) => ({ t, vh: H, items: [{ text: 'big', color: 'rgb(179, 36, 10)', opacity: 1, size: 30, weight: 400, x: 0, y: 0, w: W, h: H }], ...shots(amber, burnt) });
  assert.deepEqual(lowContrast([row(1), row(2)], { width: W, height: H }), []);
  assert.equal(lowContrast([row(1), row(2)], { width: W, height: H }, 4.5).length, 1);
});
