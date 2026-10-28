// Writes an artboard sheet (harness/lib/artboard.mjs) as an html page and as a PNG of that page.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchPage, REPO_ROOT } from '../lib/render-harness.mjs';
import { artboardHtml, artboardLayout } from '../lib/artboard.mjs';

const FONT = path.join(REPO_ROOT, 'assets', 'fonts', 'Inter.woff2');

/**
 * `items` are [{ left, right, png, fullPng? }]. Writes the page to `htmlPath` (image paths relative to it) and its screenshot to `png`;
 * returns the layout. `cols` overrides the columns rule.
 */
export async function writeArtboardSheet({ title, aspect, items, htmlPath, png, cols }) {
  const layout = artboardLayout({ count: items.length, aspect, ...(cols ? { cols } : {}) });
  const dir = path.dirname(htmlPath);
  const rel = (f) => path.relative(dir, f);
  const html = artboardHtml({ title, aspect, layout, fontHref: rel(FONT),
    items: items.map((it) => ({ left: it.left, right: it.right, src: rel(it.png), full: it.fullPng ? rel(it.fullPng) : undefined })) });
  fs.writeFileSync(htmlPath, html);
  const { page, close } = await launchPage({ width: layout.width, height: layout.height });
  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: layout.width, height: layout.height } });
  } finally {
    await close();
  }
  return layout;
}
