// Renders blog figures from specs/<slug>/<name>.json to site/public/blog/<slug>/<name>.webp (2x of 680 px):
// node scripts/site/blog-style/remix/figure/render-figures.mjs [<slug>/<name> ...] [--style vawe|warm|minimal] [--out <dir>] [--page <review.html>]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { serveRepo, RENDER_ARGS, REPO_ROOT } from '../../../../../harness/lib/render-harness.mjs';

const MAX_BYTES = 150 * 1024;
const REVIEW = ['shell/timeline', 'read-load/hero', 'quality-bar/ref-range', 'easing/curves', 'page-contract/hero', 'trace-reviews/session-time', 'headless-blocks/layers', 'see-truth/flow'];
const here = path.dirname(new URL(import.meta.url).pathname);
const specDir = path.join(here, 'specs');
const blogDir = path.join(REPO_ROOT, 'site/public/blog');

const args = process.argv.slice(2);
const pageAt = args.indexOf('--page');
const pageFile = pageAt >= 0 ? args.splice(pageAt, 2)[1] : null;
const outAt = args.indexOf('--out');
const outDir = outAt >= 0 ? args.splice(outAt, 2)[1] : blogDir;
const styleAt = args.indexOf('--style');
const style = styleAt >= 0 ? args.splice(styleAt, 2)[1] : 'vawe';
const all = fs.readdirSync(specDir).flatMap((s) => fs.readdirSync(path.join(specDir, s)).filter((f) => f.endsWith('.json')).map((f) => `${s}/${f.slice(0, -5)}`)).sort();
const ids = args.length ? args : all;

function toWebp(png, webp) {
  for (const quality of [88, 80, 72, 64]) {
    if (spawnSync('cwebp', ['-quiet', '-q', String(quality), png, '-o', webp]).status !== 0) throw new Error(`cwebp failed on ${png}`);
    if (fs.statSync(webp).size <= MAX_BYTES) return fs.statSync(webp).size;
  }
  throw new Error(`${webp} is over ${MAX_BYTES} bytes at quality 64`);
}

const { port, close } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: RENDER_ARGS });
const failed = [];
try {
  for (const id of ids) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewport({ width: 680, height: 400, deviceScaleFactor: 2 });
    await page.goto(`http://127.0.0.1:${port}/scripts/site/blog-style/remix/figure/figure.html?spec=${id}&style=${style}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true || window.__error', { timeout: 30000 });
    const error = await page.evaluate('window.__error') || errors[0];
    if (error) { failed.push(`${id}: ${error}`); await page.close(); continue; }
    const height = await page.evaluate('window.__height');
    await page.setViewport({ width: 680, height, deviceScaleFactor: 2 });
    const png = path.join(outDir, `${id}.png`);
    fs.mkdirSync(path.dirname(png), { recursive: true });
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 680, height } });
    await page.close();
    const bytes = toWebp(png, png.replace(/\.png$/, '.webp'));
    fs.unlinkSync(png);
    console.log(`${id}.webp  680x${height}  ${Math.round(bytes / 1024)} KB`);
  }
} finally {
  await browser.close();
  await close();
}
if (failed.length) { console.error(failed.join('\n')); process.exitCode = 1; }

if (pageFile) writeReview(pageFile);

function writeReview(file) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(here, '..', 'data.js'), 'utf8'), sandbox);
  const section = Object.fromEntries(sandbox.window.POSTS.map((p) => [p.slug, p.section]));
  const imgDirName = path.basename(file, '.html');
  const imgDir = path.join(path.dirname(file), imgDirName);
  fs.rmSync(imgDir, { recursive: true, force: true });
  fs.mkdirSync(imgDir, { recursive: true });
  const copy = (id, ext) => {
    const name = `${id.replace('/', '--')}.${ext}`;
    fs.copyFileSync(path.join(blogDir, `${id}.${ext}`), path.join(imgDir, name));
    return `${imgDirName}/${name}`;
  };
  const title = (id) => JSON.parse(fs.readFileSync(path.join(specDir, `${id}.json`), 'utf8')).title.replace(/"/g, '&quot;');
  const pair = (id) => `<div class="pair"><h3>${id} <span>${section[id.split('/')[0]].replace('-', ' ')}</span></h3>
  <div class="row"><img src="${copy(id, 'svg')}" alt="old: ${title(id)}"><img src="${copy(id, 'webp')}" alt="${title(id)}"></div></div>`;
  fs.writeFileSync(file, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blog figures</title>
<style>
  body { margin: 0; background: #16151a; color: #fff; font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1440px; margin: 0 auto; padding: 56px 24px 80px; }
  h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 6px; }
  h2 { font-size: 19px; margin: 48px 0 12px; }
  h3 { font-size: 15px; font-weight: 600; margin: 28px 0 8px; }
  h3 span, p { color: #97969b; font-weight: 400; margin: 0; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .row img { width: 100%; height: auto; border-radius: 8px; display: block; background: #fff; }
  .grid { columns: 3 400px; column-gap: 16px; }
  .grid img { width: 100%; height: auto; border-radius: 8px; display: block; margin-bottom: 16px; break-inside: avoid; }
</style>
</head>
<body>
<main>
<header><h1>Blog figures</h1><p>Every figure redrawn from a data spec on its post's dithered-ray colour, old SVG on the left.</p></header>
<h2>Old and new</h2>
${REVIEW.filter((id) => all.includes(id)).map(pair).join('\n')}
<h2>All ${all.length}</h2>
<div class="grid">${all.map((id) => `<img src="${copy(id, 'webp')}" alt="${title(id)}" loading="lazy">`).join('')}</div>
</main>
</body>
</html>
`);
  console.log(file);
}
