// tests/media/text-timing-split-words.test.mjs: words are counted from the rendered text. Letters in
// separate spans join into a word, a visual gap between spans splits words. Needs Chrome.
//   node --test tests/media/text-timing-split-words.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame } from '../../harness/media/render-page.mjs';
import { sampleText } from '../../harness/lib/text-timing.mjs';

const PAGE = 'tests/fixtures/pages/split-words.html';

test('per-letter spans, word spans and inline markup count as the reader sees them', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const [{ nodes }] = await sampleText(opened.page, 0.1, 0.1);
    const lines = new Map(nodes.map((n) => [n.group, { line: n.line, words: n.words }]));
    const byLine = Object.fromEntries([...lines.values()].map((v) => [v.line, v.words]));
    assert.equal(byLine['Really smooth.'], 2);
    assert.equal(byLine['Really smooth and fast'], 4);
    assert.equal(byLine['One joinedword'], 2);
  } finally { await opened.close(); }
});
