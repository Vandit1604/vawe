// The draft text-size line follows a type-scale declared in the film's DESIGN.md. Needs Chrome.
//   node --test tests/media/draft-type-scale.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openPage, resolveFrame, settle, readPageMeta, probePage, pageAdvice } from '../../harness/media/render-page.mjs';

const PAGE = `<!doctype html><html data-aspect="16:9"><head><meta charset="utf-8"><meta name="duration" content="4">
<style>html,body{margin:0;background:#111}.t{position:absolute;left:10%;top:40%;font:700 77px/1.1 Arial,sans-serif;color:#fff}</style></head>
<body><div data-world="s1"><div class="t">Quiet headline here</div></div></body></html>`;

async function textAdvice(pagePath) {
  const opened = await openPage(pagePath, resolveFrame(pagePath));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    return pageAdvice(pagePath, await probePage(opened.page, Number(readPageMeta(pagePath, 'duration')), pagePath)).text;
  } finally { await opened.close(); }
}

test('text at 5% cap height is under the house floor, and passes when DESIGN.md declares a 4% type-scale', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-typescale-'));
  try {
    const pagePath = path.join(dir, 'page.html');
    fs.writeFileSync(pagePath, PAGE);
    const before = await textAdvice(pagePath);
    assert.equal(before.length, 1, JSON.stringify(before));
    assert.match(before[0], /readable-text-size/);
    fs.writeFileSync(path.join(dir, 'DESIGN.md'), '# Design\n\n## Declared\n- type-scale: 4%\n');
    assert.deepEqual(await textAdvice(pagePath), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
