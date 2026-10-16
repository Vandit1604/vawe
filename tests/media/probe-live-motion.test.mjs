// What the draft probe sees of motion that only window.vawe.onFrame paints: arrivals that overshoot, and text that types.
// Needs Chrome.   node --test tests/media/probe-live-motion.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { openPage, resolveFrame, settle, readPageMeta, probePage } from '../../harness/media/render-page.mjs';
import { overshootShare } from '../../harness/lib/bar-lint.mjs';
import { typingSpans } from '../../harness/lib/typing-spans.mjs';

async function probe(pagePath) {
  const opened = await openPage(pagePath, resolveFrame(pagePath));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    return await probePage(opened.page, Number(readPageMeta(pagePath, 'duration')), pagePath);
  } finally { await opened.close(); }
}

test('cards driven in onFrame: the spring ones overshoot and the land ones do not, so the share is 50%', async () => {
  const { probe: found } = await probe('tests/fixtures/pages/onframe-arrivals.html');
  const arrivals = found.speed.arrivals;
  assert.equal(arrivals.length, 12);
  assert.deepEqual(arrivals.map((a) => a.over), Array.from({ length: 12 }, (_, i) => i % 2 === 0));
  assert.deepEqual(overshootShare([], arrivals), []);
});

test('a prompt box that types is a text span; a caret that blinks on a held frame is not', async () => {
  const typing = await probe('tests/fixtures/pages/typing-prompt.html');
  const [span, ...rest] = typingSpans(typing.probe.motionText);
  assert.equal(rest.length, 0);
  assert.ok(span[0] <= 1.1 && span[1] >= 4.2, `typing runs about 1 to 4.3 s, read ${span}`);
  assert.deepEqual(typingSpans((await probe('tests/fixtures/pages/caret-hold.html')).probe.motionText), []);
});
