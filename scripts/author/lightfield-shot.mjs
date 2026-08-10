// scripts/author/lightfield-shot.mjs: screenshot a generated field at a fixed frame.
//
// `make preview` centres a fragment in a 1400px box, which is the wrong page for a full-bleed field:
// the field is `position:absolute;inset:0` and needs a sized parent. This gives it one, sets
// `--t` explicitly (the field must look the same on every run), and writes a PNG.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { stableShot } from './lightfield-render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function shoot(htmlFile, outPng, { w = 735, h = 420, t = 0 } = {}) {
  const frag = fs.readFileSync(htmlFile, 'utf8');
  // Chrome wraps the last device pixel of a gradient background when the element is an ODD number
  // of pixels wide: at 735 the right-hand column repeats the left edge, at 734 and 736 it does not.
  // The engine's canvases are 1080 and 1920, so a real render never sees it. A reference shot can be
  // any size, so lay the page out even and clip back to what was asked for.
  const pw = w + (w % 2), ph = h + (h % 2);
  const page$ = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${pw}px;height:${ph}px;overflow:hidden;background:#000}
    #stage{position:relative;width:${pw}px;height:${ph}px;--t:${t};--p:0}
  </style></head><body><div id="stage">${frag}</div></body></html>`;

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: pw, height: ph, deviceScaleFactor: 1 });
    await page.setContent(page$, { waitUntil: 'load' });
    fs.mkdirSync(path.dirname(outPng), { recursive: true });
    // Never `page.screenshot` a field straight after `load`. A blended, masked field is sometimes
    // not rastered yet and the shot comes back valid and almost black, which is how `tide` spent a
    // day looking broken when only its portrait was. stableShot waits for two identical frames.
    fs.writeFileSync(outPng, await stableShot(page, { x: 0, y: 0, width: w, height: h }));
  } finally {
    await browser.close();
  }
  return outPng;
}

// Run directly: node scripts/author/lightfield-shot.mjs <fragment.html> [out.png]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node scripts/author/lightfield-shot.mjs <fragment.html> [out.png]'); process.exit(1); }
  const out = process.argv[3] || path.join(ROOT, 'out', path.basename(src).replace(/\.html$/, '.png'));
  console.log(await shoot(src, out));
}
