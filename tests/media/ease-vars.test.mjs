// The renderer sets every named ease as a CSS custom property, so plain CSS can use var(--ease-land). Needs Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, settle, resolveFrame } from '../../harness/media/render-page.mjs';
import { EASE } from '../../core/motion/presets.js';

const PAGE = 'tests/fixtures/ease-var/ease-var.html';
const outputs = (curve) => String(curve).replace(/^linear\(|\)$/g, '').split(',').map((stop) => stop.trim().split(/\s+/)[0]).join(' ');

test('a page reads every named ease as --ease-<name>, and an animation on var(--ease-land) runs on EASE.land', async () => {
  const opened = await openPage(PAGE, resolveFrame(PAGE, {}));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    const got = await opened.page.evaluate(() => ({
      soft: getComputedStyle(document.documentElement).getPropertyValue('--ease-land-soft').trim(),
      easing: document.getAnimations()[0].effect.getKeyframes()[0].easing,
    }));
    assert.equal(outputs(got.soft), outputs(EASE.landSoft));
    assert.equal(outputs(got.easing), outputs(EASE.land));
  } finally { await opened.close(); }
});
