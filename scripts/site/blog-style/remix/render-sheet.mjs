// A contact sheet of covers, once at full size and once at card size (360 px):
// node scripts/site/blog-style/remix/render-sheet.mjs <out.png> <columns> <image.webp ...>
// Each image is captioned with its file name.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { RENDER_ARGS } from '../../../../harness/lib/render-harness.mjs';

const [out, columns, ...images] = process.argv.slice(2);
if (!out || !columns || !images.length) throw new Error('usage: render-sheet.mjs <out.png> <columns> <image ...>');
const tile = (file, width) => `<figure><img src="file://${path.resolve(file)}" width="${width}"><figcaption>${path.basename(file, '.webp').replace('dither-rays-', '')}</figcaption></figure>`;
const width = 2400;
const bigWidth = Math.floor((width - 36 - 14 * (Number(columns) - 1)) / Number(columns));
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #16151a; color: #97969b; font: 14px system-ui, sans-serif; }
  .big, .small { display: flex; flex-wrap: wrap; gap: 14px; padding: 18px; }
  .small { border-top: 1px solid #2a292f; }
  figure { margin: 0; } img { display: block; border-radius: 6px; } figcaption { padding: 3px 0 6px; }
</style><div class="big">${images.map((f) => tile(f, bigWidth)).join('')}</div>
<div class="small">${images.map((f) => tile(f, 360)).join('')}</div>`;
const htmlFile = path.join(path.dirname(path.resolve(out)), '.sheet.html');
fs.writeFileSync(htmlFile, html);
const browser = await puppeteer.launch({ headless: true, args: RENDER_ARGS });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 800 });
  await page.goto(`file://${htmlFile}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
} finally {
  await browser.close();
  fs.rmSync(htmlFile);
}
