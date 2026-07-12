// slop.mjs — the anti-slop gate. Renders a video's real DOM at a representative frame, inlines the
// computed font/color/background onto each element (so the tells are visible in static HTML), and runs
// the vendored impeccable detector (41 deterministic rules: overused fonts, purple/blue gradients,
// card-in-card, rounded icon-tile-over-heading, gray-on-color, centered-everything, …). No LLM.
//
//   node scripts/slop.mjs formats/hyperscene/northwind.json [--at 1.5]
//   make slop D=formats/hyperscene/northwind.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/slop.mjs <data.json> [--at seconds]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
const format = data.module;
const at = parseFloat(flag('--at', '1.5'));
const dataUrl = '/' + path.relative(ROOT, path.resolve(dataArg)).split(path.sep).join('/');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const landscape = data.orientation === 'landscape';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: landscape ? 1920 : 1080, height: landscape ? 1080 : 1920, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(at * 30));
// inline the computed font/color/background onto every element so the static-HTML detector can see them
const html = await page.evaluate(() => {
  const stage = document.querySelector('.stage') || document.body;
  for (const el of stage.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const s = el.getAttribute('style') || '';
    el.setAttribute('style', `${s};font-family:${cs.fontFamily};color:${cs.color};background:${cs.background.slice(0, 200)}`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${stage.outerHTML}</body></html>`;
});
await browser.close(); server.close();

const out = '/tmp/slop.html';
fs.writeFileSync(out, html);
const detector = path.join(ROOT, '.claude/skills/impeccable/scripts/detect.mjs');
console.log(`▶ anti-slop scan of ${path.relative(ROOT, dataArg)} @ ${at}s (rendered DOM → ${out})\n`);
const r = spawnSync('node', [detector, out], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
if (r.stderr) process.stderr.write(r.stderr);
console.log(`\n  tells above are the AI-slop signature — reach past them (asymmetry, scale contrast, a committed non-generic face).`);
console.log(`  CONTEXT: an "overused-font" flag on ${data.theme || 'this'} is slop ONLY if the face is your lazy default. If it's the`);
console.log('  reflected brand\'s REAL typeface (e.g. Linear genuinely uses Inter), it is correct — keep it. See .claude/skills/taste-skill.');
