// tests/media/review-reveal-clip.test.mjs: a line revealed by a box too short for its descenders is a
// cut, even though the text moves while it reveals; a reveal that ends whole is not. Needs Chrome.
//   node --test tests/media/review-reveal-clip.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame } from '../../harness/media/render-page.mjs';
import { sampleText, clippedGlyphs } from '../../harness/lib/text-timing.mjs';

const PAGE = 'tests/fixtures/pages/reveal-clip-descenders.html';

test('the short reveal box is flagged, the tall one is not', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const found = clippedGlyphs(await sampleText(opened.page, 2, 0.1));
    assert.equal(found.length, 1, JSON.stringify(found.map((c) => [c.t, c.px])));
    assert.equal(found[0].side, 'bottom');
    assert.equal(found[0].kind, 'overflow');
  } finally { await opened.close(); }
});
