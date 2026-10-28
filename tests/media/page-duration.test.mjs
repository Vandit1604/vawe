// <meta name="duration" content="auto">: the length is the last move's end plus a hold, resolved once by page-duration.mjs. Needs Chrome.
//   node --test tests/media/page-duration.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDuration, resolveLength, autoLength, lockLength, statedLength } from '../../harness/media/page-duration.mjs';
import { typicalRanges } from '../../harness/cli/route.mjs';

const page = (meta, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="duration" content="${meta}">
<style>body{margin:0;background:#123}</style></head><body><section data-world="a"><h1 id="t">Hello</h1></section><script>${body}</script></body></html>`;

const withPage = async (meta, body, fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-duration-'));
  const file = path.join(dir, 'page.html');
  fs.writeFileSync(file, page(meta, body));
  try { return await fn(file); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};

async function animationEndsInRender(file) {
  const { openPage, gotoLoaded, settle, resolveFrame } = await import('../../harness/media/render-page.mjs');
  const { page, url, close } = await openPage(file, resolveFrame(file, {}), { final: false });
  try {
    await gotoLoaded(page, url, file);
    await settle(page);
    return await page.evaluate(() => document.getAnimations().map((a) => a.effect.getComputedTiming().endTime).sort((a, b) => a - b));
  } finally { await close(); }
}

const move ="document.getElementById('t').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 2000, delay: 1000, fill: 'both' });";

test('autoLength adds the larger of the floor hold and the read time, on the 1/30 s grid', () => {
  assert.deepEqual(autoLength({ endS: 5.2, lastWorldWords: [1] }), { seconds: 6.4, endS: 5.2, holdS: 1.2 });
  assert.equal(autoLength({ endS: 5.2, lastWorldWords: [] }).holdS, 1.2);
  assert.equal(autoLength({ endS: 1, lastWorldWords: [10] }).holdS, 6);
  assert.equal(autoLength({ endS: 1.01, lastWorldWords: [1] }).seconds, 67 / 30);
});

test('statedLength reads a number, auto, or nothing', () => {
  assert.equal(statedLength('<meta name="duration" content="12.4">'), 12.4);
  assert.equal(statedLength('<meta name="duration" content="auto">'), 'auto');
  assert.equal(statedLength('<p>x</p>'), null);
});

test('lockLength writes the number into the meta and nothing else', () => {
  const html = '<meta charset="utf-8"><meta name="duration" content="auto"><meta name="aspect" content="16:9">';
  assert.equal(lockLength(html, 6.4333333), '<meta charset="utf-8"><meta name="duration" content="6.433"><meta name="aspect" content="16:9">');
});

test('typicalRanges reads the ranges from the ROUTING.md sentence and skips single numbers', () => {
  const r = typicalRanges('Typical lengths: sting 3 to 8 s, showreel 15 s, brand launch 15 to 40 s, story 30 s to 3 min, long form 1 to 6 min, beat sheet one table.');
  assert.deepEqual(r, { sting: [3, 8], 'brand launch': [15, 40], story: [30, 180], 'long form': [60, 360] });
});

test('an auto page ends at its last animation plus the hold, the same every time', async () => {
  await withPage('auto', move, async (file) => {
    const first = await resolveLength(file);
    assert.equal(first.auto, true);
    assert.equal(first.endS, 3);
    assert.equal(first.seconds, 4.2);
    assert.equal(await resolveDuration(file), 4.2);
  });
});

test('an animation sized from window.vawe.duration does not set the end, and spans the resolved length in the render', async () => {
  const ground = "document.body.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: window.vawe.duration * 1000, fill: 'both' });";
  await withPage('auto', move + ground, async (file) => {
    const found = await resolveLength(file);
    assert.equal(found.endS, 3);
    assert.equal(found.seconds, 4.2);
    assert.deepEqual(await animationEndsInRender(file), [3000, 4200]);
  });
});

test('a stated number is returned as written, with no browser', async () => {
  await withPage('12.4', move, async (file) => assert.equal(await resolveDuration(file), 12.4));
});

test('an endless animation does not set the end', async () => {
  const endless = "document.getElementById('t').animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 500, iterations: Infinity });";
  await withPage('auto', move + endless, async (file) => {
    const found = await resolveLength(file);
    assert.equal(found.endS, 3);
    assert.equal(found.ignoredInfinite, true);
  });
});

test('a page with no animation at all cannot be auto: it must state a number', async () => {
  await withPage('auto', '', async (file) => {
    await assert.rejects(resolveLength(file), /duration is auto but no animation ends.*state a number/);
  });
});
