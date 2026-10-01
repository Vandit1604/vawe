// tests/media/spec-sample.test.mjs: the spec times measured off a live page do not depend on the spec value:
// copying the measured time back into the table gives the same time again. Needs Chrome.
//   node --test tests/media/spec-sample.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame, seekAll } from '../../harness/media/render-page.mjs';
import { sampleSpec } from '../../harness/media/draft-check.mjs';

const PAGE = 'tests/fixtures/pages/word-at-2-5.html';
const FRAME_S = 1 / 30;

test('a word that appears at 2.50 s and a box that rests at 1.50 s measure the same whatever the table says', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const seek = (ms) => seekAll(opened.page, ms);
    let spec = { appear: 0.5, settle: 3.2, box: 3 };
    for (let run = 0; run < 3; run++) {
      const tables = { words: [{ text: 'Ship', appear: spec.appear, settle: spec.settle }], objects: [{ id: 'b', selector: '#box', in: 1, settle: spec.box, out: null }] };
      const got = await sampleSpec(opened.page, tables, seek, 4);
      const [word] = got.times;
      const rest = got.objects.find((c) => c.label === 'b settle').got;
      assert.ok(Math.abs(word.appear - 2.5) <= FRAME_S, `run ${run}: appear ${word.appear}`);
      assert.ok(Math.abs(rest - 1.5) <= 2 * FRAME_S, `run ${run}: rest ${rest}`);
      spec = { appear: word.appear, settle: word.settle ?? spec.settle, box: rest };
    }
  } finally { await opened.close(); }
});
