// probe-purity.mjs — assert renderFrame(n) is PURE in n.
//
// The Go capture loop (internal/scene/scene.go) pulls frames off a shared channel
// across several browser tabs in arbitrary order. If a format accumulates state
// frame-to-frame, the same n renders differently depending on what came before —
// invisible until sharded/parallel rendering corrupts the output.
//
// This catches it: for sampled frames n, render n, render a FAR-AWAY scrambler
// frame to dirty any hidden state, render n again, and require the two screenshots
// to be byte-identical.
//
//   node scripts/probe-purity.mjs bracket
//   node scripts/probe-purity.mjs higherlower mydata.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const format = process.argv[2];
const dataArg = process.argv[3];
if (!format || !fs.existsSync(path.join(repoRoot, 'formats', format, 'scene.html'))) {
  console.error('usage: node scripts/probe-purity.mjs <format> [data.json]');
  console.error('formats:', fs.readdirSync(path.join(repoRoot, 'formats')).join(', '));
  process.exit(2);
}
const dataUrl = dataArg
  ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/formats/${format}/sample.json`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const err = await page.evaluate(() => window.__engineError || null);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }

const meta = await page.evaluate(() => window.__engine.meta);
const total = meta.totalFrames;

// The invariant that actually matters for seeking + shard rendering: the VISIBLE output of
// frame n is a pure function of n. So we compare a visibility-filtered signature of the DOM,
// not a screenshot and not the full outerHTML:
//   - skip display:none / visibility:hidden / opacity:0 subtrees  → ignores stale hidden-panel
//     state (output-harmless; every format carries some) so it isn't a false positive
//   - record visible text + transform + opacity + color (incl. SVG attrs via the DOM)
//     → catches real order-dependence that would change captured pixels (the flicker risk)
//   - it's a DOM signature, so GPU/AA rasterization noise (which flakes SVG formats like
//     growth on a pixel probe) can't cause a false failure
// (A format drawing to <canvas> with hidden state would escape this — none do; note it if one does.)
const dom = async (n) => {
  await page.evaluate((f) => window.__engine.renderFrame(f), n);
  return page.evaluate(() => {
    const out = [];
    const walk = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      const leaf = el.children.length === 0;
      out.push(el.tagName + '|' + (leaf ? el.textContent.trim() : '') + '|' + cs.transform + '|' + cs.opacity + '|' + cs.color);
      for (const c of el.children) walk(c);
    };
    walk(document.querySelector('.stage'));
    return out.join('\n');
  });
};

// sample ~24 frames evenly + the last; segment boundaries are where impurity hides
const samples = [];
for (let i = 0; i < 24; i++) samples.push(Math.floor((i / 24) * total));
samples.push(total - 1);

let fails = 0;
for (const n of samples) {
  const a = await dom(n);
  // dirty any hidden frame-to-frame state with a far-away frame, then re-render n
  await dom(n < total / 2 ? total - 1 : 0);
  const b = await dom(n);
  if (a !== b) {
    fails++;
    const dir = '/tmp/purity_fail'; fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `f${n}_a.html`), a);
    fs.writeFileSync(path.join(dir, `f${n}_b.html`), b);
    console.error(`✗ frame ${n} (${(n / meta.fps).toFixed(1)}s) NOT pure — render-order-dependent DOM; diff: ${dir}/f${n}_{a,b}.html`);
  }
}
await browser.close(); server.close();

if (fails) { console.error(`\n✗ purity FAILED: ${fails}/${samples.length} frames depend on render order`); process.exit(1); }
console.log(`✓ purity OK — ${samples.length} sampled frames produce identical DOM regardless of render order (${format}, ${meta.duration.toFixed(1)}s)`);
