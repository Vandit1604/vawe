import test from 'node:test';
import assert from 'node:assert/strict';
import { artboardColumns, artboardLayout, artboardCaption, artboardHtml } from '../../harness/lib/artboard.mjs';

const near = (a, b) => assert.ok(Math.abs(a - b) <= 1, `${a} vs ${b}`);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('columns rule: up to 3 per row, balanced rows, never 3 and 1 for 4', () => {
  const cols = Array.from({ length: 12 }, (_, i) => artboardColumns(i + 1));
  assert.deepEqual(cols, [1, 2, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3]);
});

for (let n = 1; n <= 12; n++) {
  test(`layout of ${n} frames: even gaps, labels outside frames, centred last row`, () => {
    const L = artboardLayout({ count: n });
    assert.ok(L.width >= 1920 && L.width <= 2400, `width ${L.width}`);
    assert.equal(L.items.length, n);
    for (const { frame, label } of L.items) {
      assert.ok(Math.abs(frame.w / frame.h - 16 / 9) < 0.01, 'true 16:9');
      assert.ok(label.y + label.h <= frame.y, 'label above its frame');
      assert.ok(frame.x >= L.gap && frame.x + frame.w <= L.width - L.gap, 'inside the margins');
    }
    L.items.forEach((a, i) => L.items.forEach((b, j) => {
      if (i !== j) assert.ok(!overlap(a.frame, b.label) && !overlap(a.frame, b.frame), `frame ${i} overlaps ${j}`);
    }));
    const rows = [...new Set(L.items.map((it) => it.frame.y))];
    assert.equal(rows.length, Math.ceil(n / L.cols));
    rows.forEach((y, r) => {
      const row = L.items.filter((it) => it.frame.y === y);
      row.slice(1).forEach((it, i) => assert.equal(it.frame.x - (row[i].frame.x + row[i].frame.w), L.gap, 'gap between frames'));
      near(row[0].frame.x, L.width - (row.at(-1).frame.x + row.at(-1).frame.w));
      if (r > 0) {
        const above = L.items.find((it) => it.frame.y === rows[r - 1]).frame;
        assert.equal(row[0].label.y - (above.y + above.h), L.gap, 'gap above the next label');
      }
    });
    assert.equal(L.items[0].label.y, L.gap);
    const last = L.items.at(-1).frame;
    assert.equal(L.height - (last.y + last.h), L.gap);
  });
}

test('the gap is about 6% of the frame width', () => {
  const L = artboardLayout({ count: 5 });
  near(L.gap, L.items[0].frame.w * 0.06);
});

test('a portrait aspect keeps its ratio', () => {
  const { items } = artboardLayout({ count: 2, aspect: '9:16' });
  assert.ok(Math.abs(items[0].frame.h / items[0].frame.w - 16 / 9) < 0.01);
});

test('caption: zero-padded index and name on the left, the second range on the right', () => {
  assert.deepEqual(artboardCaption(0, 'hook', 0, 4), { left: '01  hook', right: '0.0 to 4.0 s' });
  assert.deepEqual(artboardCaption(11, '', null, null), { left: '12', right: '' });
});

test('html: a label per frame outside the image, relative paths, click to open with arrow keys', () => {
  const layout = artboardLayout({ count: 2 });
  const html = artboardHtml({ title: 'a & b', layout, fontHref: '../../assets/fonts/Inter.woff2',
    items: [{ left: '01  s1', right: '0.0 to 1.0 s', src: '../../out/f/s1.png' }, { left: '02  s2', right: '', src: '../../out/f/s2.png' }] });
  assert.equal([...html.matchAll(/class="frame"/g)].length, 2);
  assert.equal([...html.matchAll(/class="label"/g)].length, 2);
  assert.match(html, /<title>a &amp; b<\/title>/);
  assert.match(html, /ArrowRight/);
  assert.doesNotMatch(html, /src="\//);
  assert.doesNotMatch(html, /monospace/);
});
