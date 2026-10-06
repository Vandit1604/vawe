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

test('worldLines prints each rule once with every world it fired in, then the clean worlds', () => {
  const format = (fired) => fired.map((f) => `  @${f.t}s ${f.value} (rule ${f.id})`);
  const a = { id: 'tracking', value: 'loose', t: 1 };
  const shots = [{ id: 's1', fired: [a] }, { id: 's2', fired: [] }, { id: 's3', fired: [{ ...a, t: 6 }] }];
  assert.deepEqual(worldLines(shots, format), ['  s1, s3: @1s loose (rule tracking)', '  clean: s2']);
});
