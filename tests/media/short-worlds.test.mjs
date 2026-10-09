// Worlds shorter than any fixed sample step still get a span. Needs Chrome.
//   node --test tests/media/short-worlds.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame, seekAll } from '../../harness/media/render-page.mjs';
import { sampleWorlds } from '../../harness/media/world-sample.mjs';

const PAGE = 'tests/fixtures/pages/short-worlds.html';
const FRAME_S = 1 / 30;

test('worlds of 0.1, 0.25 and 1.0 s are all found within one frame', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const spans = await sampleWorlds(opened.page, 4, (ms) => seekAll(opened.page, ms));
    const want = { a: [0.5, 0.6], b: [1, 1.25], c: [2, 3] };
    assert.deepEqual(spans.map((s) => s.id), ['a', 'b', 'c']);
    for (const s of spans) {
      const [start, end] = want[s.id];
      assert.ok(Math.abs(s.start - start) <= FRAME_S, `${s.id} start ${s.start}`);
      assert.ok(Math.abs(s.end - end) <= FRAME_S, `${s.id} end ${s.end}`);
    }
  } finally { await opened.close(); }
});
