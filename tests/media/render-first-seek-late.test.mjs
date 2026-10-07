// A frame does not depend on how long the page sat between load and its first seek: the document
// timeline is frozen, so animations move only when seeked. Needs Chrome.   node --test tests/media/render-first-seek-late.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { openPage, seekAll, resolveFrame, frameFormat } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/pages/late-first-seek.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function framesAfter(waitMs, times) {
  const frame = resolveFrame(PAGE, { aspect: '16:9', final: true });
  const opened = await openPage(PAGE, frame, { final: true });
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await sleep(waitMs);
    const hashes = [];
    for (const t of times) {
      await seekAll(opened.page, t * 1000);
      const png = Buffer.from(await opened.page.screenshot({ ...frameFormat(true).shot, encoding: 'base64' }), 'base64');
      hashes.push(createHash('md5').update(png).digest('hex'));
    }
    return hashes;
  } finally { await opened.close(); }
}

test('a first seek 2 s after load paints the same frames as one right after load', async () => {
  const times = [0, 0.1, 0.5, 1.2];
  const soon = await framesAfter(0, times);
  const late = await framesAfter(2000, times);
  assert.deepEqual(late, soon);
  assert.ok(new Set(soon).size > 1, 'the frames move');
});
