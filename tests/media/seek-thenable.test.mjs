// window.seek and onFrame hooks may return anything: only a native Promise is awaited, so an arrow function that
// returns a GSAP-like timeline (a then() that never settles) cannot hang a render. Launches Chrome.
//   node --test tests/media/seek-thenable.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { pageArgs } from '../../harness/lib/render-harness.mjs';
import { seekTo, installPageFrame } from '../../core/engine/page-seek.js';

const fixture = fs.readFileSync(new URL('../fixtures/pages/seek-returns-thenable.html', import.meta.url), 'utf8');
const asyncPage = `<!doctype html><div id="box"></div><script>
window.seek = async (t) => { await new Promise((r) => setTimeout(r, 50)); document.getElementById('box').dataset.t = String(t); };
</script>`;

async function open(browser, html) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(`window.__pageSeek = ${seekTo}; (${installPageFrame})(${JSON.stringify({ aspect: '16:9', width: 1920, height: 1080 })});`);
  await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return page;
}

test('a seek that returns a never-settling thenable does not hang', async () => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  try {
    const page = await open(browser, fixture);
    const outcome = await Promise.race([
      page.evaluate((t) => window.__pageSeek(t), 0.25).then(() => 'done'),
      new Promise((resolve) => setTimeout(() => resolve('hung'), 5000)),
    ]);
    assert.equal(outcome, 'done');
    assert.equal(await page.evaluate(() => document.getElementById('box').style.opacity), '0.75');
    assert.equal(await page.evaluate(() => document.getElementById('box').dataset.hook), '0.25');
  } finally { await browser.close(); }
});

test('an async seek is still awaited', async () => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  try {
    const page = await open(browser, asyncPage);
    await page.evaluate((t) => window.__pageSeek(t), 0.5);
    assert.equal(await page.evaluate(() => document.getElementById('box').dataset.t), '0.5');
  } finally { await browser.close(); }
});
