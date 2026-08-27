// scripts/media/watermark.mjs: bake the DRAFT watermark to a transparent PNG.
//   make watermark  [TEXT="VAWE DRAFT"] [OPACITY=0.1]
//
// WHY A BAKED PNG AND NOT ffmpeg drawtext: drawtext needs a TTF/OTF on disk and every font this repo
// ships is .woff2, which FreeType will not load. Rasterising it here instead costs nothing at render
// time, keeps the mark in the real brand face, and follows the same offline-bake rule as
// `make ransom-sprites` and `make gradients`: the render only ever reads a finished file.
//
// One 1920x1080 sheet covers every output shape. encode.Video scales it to the frame with scale2ref,
// so a 9:16 export stretches the diagonal a little, which at 10% opacity nobody can see and nobody
// cares about. Baking one sheet per aspect would be more correct and less simple.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(repoRoot, 'assets/watermark');
const TEXT = process.env.TEXT || 'VAWE DRAFT';
const OPACITY = Number(process.env.OPACITY || 0.1);
const W = 1920, H = 1080;

// The mark has to survive being judged and NOT survive being posted. A single corner chip is too easy
// to crop off; a wall of low-opacity diagonal text cannot be cropped without losing the frame, yet it
// still lets you read composition, colour and motion, which is the whole point of a free draft.
const html = `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: 'Anybody'; src: url('/assets/fonts/Anybody.woff2') format('woff2'); font-weight: 900; }
  html, body { margin: 0; width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
  .rows { position: absolute; inset: -40%; transform: rotate(-30deg);
          display: flex; flex-direction: column; gap: 90px; }
  .row { white-space: nowrap; font-family: 'Anybody', system-ui, sans-serif; font-weight: 900;
         font-size: 64px; letter-spacing: 10px; color: rgba(255,255,255,${OPACITY});
         /* a dark twin under the light one so the mark holds on white AND on black backgrounds */
         text-shadow: 0 2px 0 rgba(0,0,0,${(OPACITY * 0.55).toFixed(3)}); }
  .row span { padding-right: 120px; }
</style>
<div class="rows">
  ${Array.from({ length: 14 }, (_, r) => `<div class="row" style="margin-left:${(r % 2) * 260}px">${
    Array.from({ length: 10 }, () => `<span>${TEXT}</span>`).join('')
  }</div>`).join('')}
</div>`;

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
// Served from disk so the @font-face resolves; about:blank would silently fall back to system-ui.
const tmp = path.join(repoRoot, '.watermark.tmp.html');
fs.writeFileSync(tmp, html);
await page.goto(`file://${tmp}`);
await page.evaluate(() => document.fonts.ready);

fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, 'draft.png');
await page.screenshot({ path: file, omitBackground: true });
await browser.close();
fs.rmSync(tmp, { force: true });

const kb = (fs.statSync(file).size / 1024).toFixed(0);
console.log(`watermark: ${W}x${H} "${TEXT}" @ ${OPACITY} → assets/watermark/draft.png (${kb}KB)`);
console.log('  use:  ./bin/vawe scene.json --watermark assets/watermark/draft.png');
