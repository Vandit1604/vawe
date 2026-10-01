// tests/media/visible-lines.test.mjs: the draft's text probe leaves out aria-hidden text, flags data-chrome text
// and gives the joined text of an element whose letters sit in separate spans. Needs Chrome.
//   node --test tests/media/visible-lines.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame } from '../../harness/media/render-page.mjs';
import { visibleLines } from '../../harness/media/draft-check.mjs';
import { DECORATIVE, CHROME } from '../../harness/lib/draft-check.mjs';
import { lineFor } from '../../harness/lib/spec-conformance.mjs';

const PAGE = 'tests/fixtures/pages/decorative-text.html';

test('aria-hidden text is not probed, data-chrome text is flagged, and split letters join into one text', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const sample = await opened.page.evaluate(visibleLines, DECORATIVE, CHROME);
    const texts = sample.lines.map((l) => l.text);
    assert.ok(texts.includes('Read this'));
    assert.ok(!texts.some((t) => /invoices|flood/.test(t)), 'aria-hidden text must be skipped');
    assert.deepEqual(sample.lines.filter((l) => l.chrome).map((l) => l.text), ['Inbox', '(3)']);
    assert.ok(!sample.lines.find((l) => l.text === 'Read this').chrome);
    assert.equal(lineFor(sample, 'Ship').text, 'Ship');
    assert.equal(lineFor(sample, 'Inbox (3)').text, 'Inbox (3)');
  } finally { await opened.close(); }
});
