// A warm tab belongs to the process that holds it: another process asking for the same url (with a changed
// signature) or for a fourth url must not close it mid-read. Launches Chrome.
//   node --test tests/media/preview-warm-owner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { pageArgs } from '../../harness/lib/render-harness.mjs';
import { takeWarmPage, WARM_HASH } from '../../harness/media/preview-server.mjs';

const url = (name) => `about:blank?${name}${WARM_HASH}`;

async function warmTab(browser, name, { sig = 'sig', owner = null } = {}) {
  const page = await browser.newPage();
  await page.goto(url(name));
  await page.evaluate((s, o) => { window.__warmSig = s; window.__warmOwner = o; }, sig, owner);
  return page;
}

test('a tab another live process owns is neither reused nor closed', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  t.after(() => browser.close());
  const held = await warmTab(browser, 'a', { owner: process.ppid });
  const taken = await takeWarmPage(browser, url('a'), 'changed');
  assert.equal(taken.reused, false);
  assert.notEqual(taken.page, held);
  assert.equal(held.isClosed(), false);
  assert.equal(await held.evaluate(() => 1 + 1), 2);
});

test('a tab past the limit is not closed while its owner holds it', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  t.after(() => browser.close());
  const held = await Promise.all(['a', 'b', 'c'].map((n) => warmTab(browser, n, { owner: process.ppid })));
  await takeWarmPage(browser, url('d'), 'sig');
  assert.deepEqual(held.map((p) => p.isClosed()), [false, false, false]);
});

test('a free tab with the same signature is reused, and one whose owner is dead is taken over', async (t) => {
  const browser = await puppeteer.launch({ headless: true, args: pageArgs(true) });
  t.after(() => browser.close());
  const free = await warmTab(browser, 'a');
  assert.equal((await takeWarmPage(browser, url('a'), 'sig')).page, free);
  await free.evaluate(() => { window.__warmOwner = null; });
  const deadOwner = await warmTab(browser, 'b', { owner: 2 ** 22 + 1 });
  assert.equal((await takeWarmPage(browser, url('b'), 'sig')).page, deadOwner);
});

test('closing a warm page that was never marked closes its tab, so no unclaimable tab is left', async () => {
  const { openPreview } = await import('../../harness/media/preview-server.mjs');
  const opened = await openPreview('tests/fixtures/pages/caret-hold.html', { warm: true, final: false });
  const { page } = opened;
  await opened.close();
  assert.equal(page.isClosed(), true);
});
