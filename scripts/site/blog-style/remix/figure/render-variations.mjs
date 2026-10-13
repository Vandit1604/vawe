// Renders the simple figure variations and a review page beside them:
// node scripts/site/blog-style/remix/figure/render-variations.mjs <page.html>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { serveRepo, RENDER_ARGS } from '../../../../../harness/lib/render-harness.mjs';

const VARIANTS = [
  { id: 'mesh', label: 'A. Soft mesh', line: 'Three soft radial blobs in the post palette and a fine grain; the data sits on the ground with no panel.' },
  { id: 'edge', label: 'B. Dither edge', line: 'A flat dark field with the cover\'s dithered rays only along the bottom edge.' },
  { id: 'glow', label: 'C. Key glow', line: 'A flat field and one duotone glow centred on the key value, so the light points at the answer.' },
  { id: 'tint', label: 'D. Tint and one card', line: 'A lifted tint, one quiet card, and a gradient only on the key value.' },
];
const FIGURES = ['big-deletion/hero', 'audio-as-written/diagram', 'cheap-wait/polls', 'loophole-audit/hero'];

const pageFile = process.argv[2];
if (!pageFile) throw new Error('usage: render-variations.mjs <page.html>');
const imgDirName = path.basename(pageFile, '.html');
const imgDir = path.join(path.dirname(pageFile), imgDirName);
fs.mkdirSync(imgDir, { recursive: true });
const file = (v, id) => `${v}-${id.replace('/', '--')}.webp`;

const { port, close } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: RENDER_ARGS });
try {
  for (const v of VARIANTS) for (const id of FIGURES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 680, height: 400, deviceScaleFactor: 2 });
    await page.goto(`http://127.0.0.1:${port}/scripts/site/blog-style/remix/figure/simple.html?spec=${id}&v=${v.id}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true || window.__error', { timeout: 30000 });
    const error = await page.evaluate('window.__error');
    if (error) throw new Error(`${v.id} ${id}: ${error}`);
    const height = await page.evaluate('window.__height');
    await page.setViewport({ width: 680, height, deviceScaleFactor: 2 });
    const png = path.join(imgDir, file(v.id, id).replace(/\.webp$/, '.png'));
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 680, height } });
    await page.close();
    if (spawnSync('cwebp', ['-quiet', '-q', '88', png, '-o', png.replace(/\.png$/, '.webp')]).status !== 0) throw new Error(`cwebp failed on ${png}`);
    fs.unlinkSync(png);
    console.log(file(v.id, id));
  }
} finally {
  await browser.close();
  await close();
}

fs.writeFileSync(pageFile, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Figure variations</title>
<style>
  body { margin: 0; background: #16151a; color: #fff; font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1400px; margin: 0 auto; padding: 56px 16px 80px; }
  h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 56px 0 2px; }
  p { color: #97969b; margin: 0; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; align-items: flex-start; }
  .grid img { width: 680px; max-width: 100%; height: auto; border-radius: 8px; display: block; }
</style>
</head>
<body>
<main>
<header><h1>Figure variations</h1><p>Four simpler figure styles, the same four figures in each, shown at the 680 px post width. Pick one.</p></header>
${VARIANTS.map((v) => `<h2>${v.label}</h2>
<p>${v.line}</p>
<div class="grid">${FIGURES.map((id) => `<img src="${imgDirName}/${file(v.id, id)}" alt="${v.label}: ${id}" width="680">`).join('')}</div>`).join('\n')}
</main>
</body>
</html>
`);
console.log(pageFile);
