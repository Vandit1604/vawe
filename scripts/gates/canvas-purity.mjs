// canvas-purity.mjs — do the CANVAS PIXELS depend only on n?
//
//   node scripts/gates/canvas-purity.mjs <format> [data.json]
//   make canvas-purity
//
// `make probe` compares a DOM SIGNATURE, so it can only see attributes and computed styles. The two
// layer types that draw pixels — `shader` (WebGL) and `paint` (Canvas 2D) — put their entire output
// somewhere the DOM signature cannot reach. probe reported the paint demo clean while 2 of 6 frames
// rendered different PIXELS depending on render order: an off-window layer never cleared its canvas,
// so it held whatever a previous frame had drawn, and frames render across 8 workers in arbitrary
// order (docs/MISTAKES.md #64). This gate hashes the actual pixels instead.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const format = process.argv[2] || 'scene';
const dataArg = process.argv[3];
const dataUrl = dataArg ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/formats/${format}/sample.json`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, decodeURIComponent(dataUrl).replace(/^\//, '')), 'utf8')); } catch { return {}; } })();
const [VW, VH] = sceneDims(cfg);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const err = await page.evaluate(() => window.__engineError || null);
if (err) { console.error('SCENE ERROR:', err); process.exit(1); }

const total = (await page.evaluate(() => window.__engine.meta)).totalFrames;
const nCanvas = await page.evaluate(() => document.querySelectorAll('canvas').length);
if (nCanvas <= 1) { console.log(`~ ${format}: no shader/paint canvases to check (only the bg canvas)`); await browser.close(); server.close(); process.exit(0); }

const sig = (n, pre) => page.evaluate(({ n, pre }) => {
  for (const f of pre) window.__engine.renderFrame(f);
  window.__engine.renderFrame(n);
  const out = [];
  for (const cv of document.querySelectorAll('canvas')) {
    const s = document.createElement('canvas'); s.width = 32; s.height = 18;
    const c = s.getContext('2d'); c.drawImage(cv, 0, 0, 32, 18);
    const d = c.getImageData(0, 0, 32, 18).data;
    let h = 2166136261 >>> 0;
    for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; }
    out.push(h.toString(16));
  }
  return out.join('|');
}, { n, pre });

const frames = Array.from({ length: 8 }, (_, i) => Math.round(((i + 0.5) / 8) * total)).filter((n) => n > 9 && n < total - 9);
let bad = 0;
for (const n of frames) {
  const clean = await sig(n, []);
  const dirty = await sig(n, [n + 9, total - 1, 0, n - 9]);   // same scrambler shape as probe-purity
  if (clean !== dirty) { bad++; console.log(`   ✗ frame ${n}: canvas pixels differ by render order`); }
}
await browser.close(); server.close();
if (bad) { console.log(`\n✗ CANVAS PURITY FAILED — ${bad}/${frames.length} frames depend on render order.`);
  console.log('A shader/paint layer that does not clear when off-window holds the last frame it drew.'); process.exit(1); }
console.log(`✓ canvas purity OK — ${frames.length} frames, ${nCanvas} canvases, pixels identical regardless of render order`);
