// lookbook.mjs — capture a site's LOOK for art direction: full-page screenshot + viewport shots
// at a few scroll depths. This is the no-template step: the designer (human or agent) STUDIES
// these images and derives the video's design language from the brand's own typography, spacing,
// shape language and density — instead of picking a canned style.
//
//   node scripts/lookbook.mjs <url> <brand>     →  engine/assets/brands/<brand>/look/*.png
//   make lookbook URL=https://site.com NAME=acme
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [url, brand] = process.argv.slice(2);
if (!url || !brand) { console.error('usage: node scripts/lookbook.mjs <url> <brand>'); process.exit(1); }

const dir = path.join(ROOT, 'engine/assets/brands', brand, 'look');
fs.mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1512, height: 950, deviceScaleFactor: 1 });
try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }); }
catch { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
await page.evaluate(async () => {
  await document.fonts.ready;
  // walk the page once so lazy sections/images mount before we shoot
  for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300));
});

await page.screenshot({ path: path.join(dir, 'full.png'), fullPage: true });
const H = await page.evaluate(() => document.body.scrollHeight);
const stops = [0, 0.33, 0.66].map((f) => Math.min(Math.round(H * f), Math.max(0, H - 950)));
for (let i = 0; i < stops.length; i++) {
  await page.evaluate((y) => scrollTo(0, y), stops[i]);
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: path.join(dir, `view-${i}.png`) });
}
await browser.close();
console.log(`✓ lookbook → engine/assets/brands/${brand}/look/  (full.png + ${stops.length} viewport shots)`);
console.log('  study these before authoring: typography, density, shape language, imagery, voice.');
