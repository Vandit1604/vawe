// Worlds that differ only by their image are different worlds, so a reel that cuts between them by animating the wrapper's
// opacity is not one held world. Needs Chrome.   node --test tests/media/world-images.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame, seekAll } from '../../harness/media/render-page.mjs';
import { readWorlds, sampleWorlds } from '../../harness/media/world-sample.mjs';
import { heldWorlds, mergeSameContent } from '../../harness/lib/worlds.mjs';

const PAGE = 'tests/fixtures/pages/world-image-reel.html';

test('three image worlds of 2 s each stay three worlds and none is held', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const spans = await sampleWorlds(opened.page, 6, (ms) => seekAll(opened.page, ms));
    assert.deepEqual(spans.map((s) => [s.id, Math.round(s.start), Math.round(s.end)]), [['a', 0, 2], ['b', 2, 4], ['c', 4, 6]]);
    assert.deepEqual(mergeSameContent(spans).map((s) => s.id), ['a', 'b', 'c']);
    assert.deepEqual(heldWorlds(spans), []);
  } finally { await opened.close(); }
});

test('the shape of a world holds a short hash of an image source, not the source', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    await seekAll(opened.page, 1000);
    const [a] = (await readWorlds(opened.page)).filter((w) => w.visible);
    const shape = a.shape.join('\n');
    assert.doesNotMatch(shape, /data:image|<svg|%3Csvg/);
    assert.match(shape, /^img\.\|\|\|[0-9a-z]{1,8}\|/m);
  } finally { await opened.close(); }
});
