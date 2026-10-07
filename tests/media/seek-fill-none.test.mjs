// A frame is a pure function of t: seeking past the end of a fill:none animation and back must show the
// same styles as a fresh page seeked once. Launches Chrome.
//   node --test tests/media/seek-fill-none.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { pageArgs } from '../../harness/lib/render-harness.mjs';
import { seekTo } from '../../core/engine/page-seek.js';

const html = `<!doctype html><html><head><style>
@keyframes css-hide { from { opacity: 0.2 } to { opacity: 0.2 } }
#css { animation: css-hide 1s linear; }
</style></head><body>
<div id="css">css</div><div id="waapi">waapi</div>
<script>
document.getElementById('waapi').animate([{ opacity: 0.3 }, { opacity: 0.3 }], { duration: 1000, fill: 'none' });
</script></body></html>`;

const seek = (page, t) => page.evaluate((s) => window.__pageSeek(s), t);
const opacities = (page) => page.evaluate(() => ['css', 'waapi'].map((id) => getComputedStyle(document.getElementById(id)).opacity));

test('seeking back into a finished fill:none animation applies it again', async () => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  try {
    const open = async () => {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(`window.__pageSeek = ${seekTo};`);
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      return page;
    };
    const fresh = await open();
    await seek(fresh, 0.25);
    const expected = await opacities(fresh);
    assert.deepEqual(expected, ['0.2', '0.3']);

    const swept = await open();
    await seek(swept, 0.25);
    await seek(swept, 5);
    assert.deepEqual(await opacities(swept), ['1', '1']);
    await seek(swept, 0.25);
    assert.deepEqual(await opacities(swept), expected);

    const late = await open();
    await seek(late, 5);
    await seek(late, 0.25);
    assert.deepEqual(await opacities(late), expected);
  } finally { await browser.close(); }
});

test('an animation the page cancelled or removed stays gone on later seeks', async () => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(`window.__pageSeek = ${seekTo};`);
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await seek(page, 0.25);
    assert.deepEqual(await opacities(page), ['0.2', '0.3']);

    await page.evaluate(() => {
      document.getElementById('css').getAnimations().forEach((a) => a.cancel());
      document.getElementById('waapi').getAnimations().forEach((a) => a.cancel());
    });
    await seek(page, 0.25);
    assert.deepEqual(await opacities(page), ['1', '1']);

    await page.evaluate(() => document.getElementById('css').remove());
    await seek(page, 0.5);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
  } finally { await browser.close(); }
});
