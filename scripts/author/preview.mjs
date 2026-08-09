// preview.mjs — FAST iteration: render the key frames of a format directly (no encode),
// into one labeled contact sheet. ~5s, not a full render.
//   node scripts/author/preview.mjs higherlower            (storyboard)
//   node scripts/author/preview.mjs higherlower 560         (single exact frame)
//   node scripts/author/preview.mjs higherlower 560 mydata.json   (custom data file)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const format = process.argv[2];
const single = process.argv[3] != null ? Number(process.argv[3]) : null;
const dataArg = process.argv[4];
if (!format || !fs.existsSync(path.join(repoRoot, 'formats', format, 'scene.html'))) {
  console.error('usage: node scripts/author/preview.mjs <format> [frame] [data.json]');
  console.error('formats:', fs.readdirSync(path.join(repoRoot, 'formats')).join(', '));
  process.exit(1);
}
const dataUrl = dataArg
  ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/formats/${format}/sample.json`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = http.createServer((req, res) => {
  const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const t0 = Date.now();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
// The viewport must be the canvas the renderer would actually produce, or a preview is a crop of a
// different video. This read `orientation`, which almost no scene declares — scenes declare `aspect` —
// so every 16:9 scene previewed into a 1080x1920 portrait window, silently (MISTAKES #46).
const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, decodeURIComponent(dataUrl).replace(/^\//, '')), 'utf8')); } catch { return {}; } })();
const [VW, VH] = sceneDims(cfg);
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const err = await page.evaluate(() => window.__engineError || null);
if (err) { console.error('SCENE ERROR:', err); process.exit(1); }
const meta = await page.evaluate(() => window.__engine.meta);
const { duration, stings, fps: F } = meta;

const grab = async (frame, file) => {
  await page.evaluate((n) => window.__engine.renderFrame(n), frame);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: VW, height: VH } });
};

if (single != null) {
  const out = `/tmp/preview_${format}_${single}.png`;
  await grab(single, out);
  console.log(`${format} f${single} (${(single / F).toFixed(1)}s) → ${out}  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  await browser.close(); server.close(); process.exit(0);
}

// tiles keep the scene's own ratio — a fixed 300x533 squashed every landscape frame in the sheet
const TILE_W = VW >= VH ? 400 : 300, TILE_H = Math.round(TILE_W * VH / VW);
const tmp = '/tmp/preview_frames'; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const ts = [0.3, 1.2, ...stings.flatMap((s) => [s - 0.2, s + 0.5]), duration * 0.55, duration - 1.0, duration - 0.15]
  .filter((t) => t >= 0 && t < duration).sort((a, b) => a - b);
const uniq = ts.filter((t, i) => i === 0 || t - ts[i - 1] > 0.25).slice(0, 16);
const tiles = [];
for (let i = 0; i < uniq.length; i++) {
  const raw = path.join(tmp, `r${i}.png`);
  await grab(Math.round(uniq[i] * F), raw);
  const labeled = path.join(tmp, `${String(i).padStart(2, '0')}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
    `scale=${TILE_W}:${TILE_H},drawtext=text='${uniq[i].toFixed(1)}s':x=8:y=8:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65`, labeled]);
  tiles.push(labeled);
}
await browser.close(); server.close();
const cols = 4, sheet = `/tmp/preview_${format}.png`;
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(tmp, '%02d.png'), '-vf', `tile=${cols}x${Math.ceil(tiles.length / cols)}:padding=10:color=0x0a0a0c`, '-frames:v', '1', sheet]);
console.log(`${format}  ${duration.toFixed(1)}s  ${uniq.length} key frames  →  ${sheet}   [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
