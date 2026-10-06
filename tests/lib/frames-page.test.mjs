import test from 'node:test';
import assert from 'node:assert/strict';
import { framesPage, worldLines } from '../../harness/lib/frames-page.mjs';

test('frames.html has one figure per world with the id under the image and relative paths', () => {
  const html = framesPage({ title: 'a & b', worlds: [{ id: 's1', src: '../../out/f-frames/s1.png' }, { id: 's2', src: '../../out/f-frames/s2.png' }] });
  assert.equal([...html.matchAll(/<figure>/g)].length, 2);
  assert.match(html, /<img src="\.\.\/\.\.\/out\/f-frames\/s2\.png" alt="s2"><figcaption>s2<\/figcaption>/);
  assert.match(html, /<title>a &amp; b: key frames<\/title>/);
  assert.match(html, /repeat\(2, /);
  assert.doesNotMatch(html, /src="\//);
});

test('worldLines leads each fired line with the world id, and says clean when none fired', () => {
  assert.deepEqual(worldLines('s1', ['  @1.3s text (rule a)']), ['  s1 @1.3s text (rule a)']);
  assert.deepEqual(worldLines('s2', []), ['  s2: clean']);
});
