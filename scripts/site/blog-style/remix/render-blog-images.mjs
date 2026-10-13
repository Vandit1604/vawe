// Renders covers and the simple figure variations once per candidate display font, then one review page with a font switcher:
// node scripts/site/blog-style/remix/render-blog-images.mjs <page.html>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { serveRepo, RENDER_ARGS } from '../../../../harness/lib/render-harness.mjs';

const FONTS = [
  { id: 'geist', family: 'Geist', line: 'Tight neo-grotesk. SIL Open Font License 1.1.' },
  { id: 'jakarta', family: 'Plus Jakarta Sans', line: 'Geometric sans. SIL Open Font License 1.1.' },
  { id: 'bricolage', family: 'Bricolage Grotesque', line: 'Characterful grotesk. SIL Open Font License 1.1.' },
];
const COVERS = ['big-deletion', 'cheap-wait', 'loophole-audit', 'read-load'];
const VARIANTS = [
  { id: 'mesh', label: 'A. Soft mesh', line: 'Soft radial blobs in the post palette, no panel.' },
  { id: 'edge', label: 'B. Dither edge', line: 'Flat field, the cover rays only along the bottom edge.' },
  { id: 'glow', label: 'C. Key glow', line: 'Flat field, one glow behind the key value.' },
  { id: 'tint', label: 'D. Tint and one card', line: 'Lifted tint, one card, a gradient only on the key value.' },
];
const FIGURES = ['big-deletion/hero', 'audio-as-written/diagram', 'cheap-wait/polls', 'loophole-audit/hero'];

const pageFile = process.argv[2];
if (!pageFile) throw new Error('usage: render-blog-images.mjs <page.html>');
const imgDirName = path.basename(pageFile, '.html');
const imgDir = path.join(path.dirname(pageFile), imgDirName);
fs.mkdirSync(imgDir, { recursive: true });
const coverFile = (f, slug) => `${f.id}-cover-${slug}.webp`;
const figFile = (f, v, id) => `${f.id}-${v.id}-${id.replace('/', '--')}.webp`;

async function shoot(browser, url, file, width, height, scale) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: height || 400, deviceScaleFactor: scale });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true || window.__error', { timeout: 30000 });
  const error = await page.evaluate('window.__error');
  if (error) throw new Error(`${url}: ${error}`);
  const h = height || await page.evaluate('window.__height');
  if (!height) await page.setViewport({ width, height: h, deviceScaleFactor: scale });
  const png = path.join(imgDir, file.replace(/\.webp$/, '.png'));
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width, height: h } });
  await page.close();
  if (spawnSync('cwebp', ['-quiet', '-q', '88', png, '-o', path.join(imgDir, file)]).status !== 0) throw new Error(`cwebp failed on ${png}`);
  fs.unlinkSync(png);
}

const { port, close } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: RENDER_ARGS });
const base = `http://127.0.0.1:${port}/scripts/site/blog-style/remix`;
try {
  for (const f of FONTS) {
    const font = encodeURIComponent(f.family);
    for (const slug of COVERS) await shoot(browser, `${base}/thumb.html?post=${slug}&font=${font}`, coverFile(f, slug), 1200, 630, 1);
    for (const v of VARIANTS) for (const id of FIGURES) await shoot(browser, `${base}/figure/simple.html?spec=${id}&v=${v.id}&font=${font}`, figFile(f, v, id), 680, 0, 2);
    console.log(f.family);
  }
} finally {
  await browser.close();
  await close();
}

const section = (f, i) => `<section id="${f.id}"${i ? ' hidden' : ''}>
<p class="lead">${f.family}: ${f.line}</p>
<h2>Covers</h2>
<div class="covers">${COVERS.map((s) => `<img src="${imgDirName}/${coverFile(f, s)}" alt="${f.family} cover: ${s}" width="1200" height="630">`).join('')}</div>
<h2>Figures</h2>
${VARIANTS.map((v) => `<h3>${v.label}</h3><p>${v.line}</p>
<div class="figs">${FIGURES.map((id) => `<img src="${imgDirName}/${figFile(f, v, id)}" alt="${f.family}, ${v.label}: ${id}" width="680">`).join('')}</div>`).join('\n')}
</section>`;

fs.writeFileSync(pageFile, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blog images</title>
<style>
  body { margin: 0; background: #16151a; color: #fff; font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1400px; margin: 0 auto; padding: 48px 16px 80px; }
  h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 40px 0 12px; }
  h3 { font-size: 16px; margin: 28px 0 0; }
  p { color: #97969b; margin: 0; }
  .lead { color: #d8d8da; margin-top: 20px; }
  .tabs { display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap; }
  .tabs button { font: 600 15px system-ui, sans-serif; color: #d8d8da; background: #27262c; border: 1px solid #393840; border-radius: 8px; padding: 9px 16px; cursor: pointer; }
  .tabs button[aria-selected="true"] { background: #fff; color: #16151a; border-color: #fff; }
  .covers { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .covers img { width: 100%; height: auto; border-radius: 8px; display: block; }
  .figs { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; align-items: flex-start; }
  .figs img { width: 680px; max-width: 100%; height: auto; border-radius: 8px; display: block; }
</style>
</head>
<body>
<main>
<header><h1>Blog images</h1><p>Covers and the four figure styles, set in three candidate fonts.</p></header>
<div class="tabs" role="tablist">${FONTS.map((f, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${f.id}">${f.family}</button>`).join('')}</div>
${FONTS.map(section).join('\n')}
</main>
<script>
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b === t)));
    document.querySelectorAll('main > section').forEach((s) => { s.hidden = s.id !== t.dataset.tab; });
  }));
</script>
</body>
</html>
`);
console.log(pageFile);
