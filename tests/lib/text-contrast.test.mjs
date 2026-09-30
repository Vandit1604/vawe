import test from 'node:test';
import assert from 'node:assert/strict';
import { backgroundIn, lowContrast, contrastLines } from '../../harness/lib/text-contrast.mjs';

// A w x h frame of one ground colour with a block of glyph colour in its top-left quarter.
function frame(w, h, ground, glyph) {
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = x < w / 4 && y < h / 4 ? glyph : ground;
    data.set(c, (y * w + x) * 3);
  }
  return { width: w, height: h, data };
}

const amber = [255, 154, 38], burnt = [179, 36, 10], ink = [28, 10, 46];

test('the background is the ground behind the glyphs, not the glyphs', () => {
  assert.deepEqual(backgroundIn(frame(40, 40, amber, burnt), [0, 0, 20, 20], burnt, 1), amber);
});

test('an accent word on an amber flood is named with its ratio in both samples it fails', () => {
  const f = frame(40, 40, amber, burnt);
  const at = (t) => ({ t, lines: [{ text: 'through', box: [0, 0, 40, 40], color: 'rgb(179, 36, 10)' }] });
  const found = lowContrast([at(4), at(4.5)], new Map([[4, f], [4.5, f]]), 1);
  assert.equal(found.length, 1);
  assert.equal(found[0].text, 'through');
  assert.ok(found[0].ratio > 3 && found[0].ratio < 3.3, String(found[0].ratio));
  assert.match(contrastLines(found)[0], /^text "through" at 4.00 s reads 3.1:1 on the pixels behind it \(#b3240a on #ff9a26, needs 4.5:1\): use #\w{6}/);
});

test('dark ink on amber passes', () => {
  const f = frame(40, 40, amber, ink);
  const found = lowContrast([{ t: 1, lines: [{ text: 'vatt', box: [0, 0, 40, 40], color: 'rgb(28, 10, 46)' }] }], new Map([[1, f]]), 1);
  assert.deepEqual(found, []);
});

test('one failing sample among several passing ones is a transition, not a finding', () => {
  const bad = frame(40, 40, amber, burnt), good = frame(40, 40, [255, 255, 255], burnt);
  const at = (t) => ({ t, lines: [{ text: 'x', box: [0, 0, 40, 40], color: 'rgb(179, 36, 10)' }] });
  assert.deepEqual(lowContrast([at(1), at(2), at(3)], new Map([[1, bad], [2, good], [3, good]]), 1), []);
});
