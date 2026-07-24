// reveal.mjs — see how each beat ANIMATES IN, not just where it lands. `make beats` samples a beat's
// middle (the settled state), which hides the motion that carries the craft — the dolly direction, the
// typewriter, a colour-wave, a collage assembling. This renders, per beat, the ENTER arc densely +
// the settled frame + the EXIT arc, so the reveal is always visible. The recurring failure it kills:
// judging a beat by its hold and missing the reveal (docs/MISTAKES.md — the "settled not reveal" trap).
//
//   make reveal D=formats/scene/x.json                 → /tmp/reveal.png (one row per beat: enter | set | exit)
//   node scripts/author/reveal.mjs <scene.json> [--enter 0.7] [--n 8]
//
// Deterministic: reads the scene's exact layer start-times to place each beat's enter window precisely
// (no guessing), and renders headless via the engine's pure renderFrame(n). For a raw reference video
// (no JSON) use `make filmstrip … FROM=<beat> FPS=12` per beat instead — this tool is for our renders.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? +argv[i + 1] : d; };
const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/author/reveal.mjs <scene.json> [--enter 0.7] [--n 8]'); process.exit(1); }
const ENTER = flag('--enter', 0.7);   // seconds of the entrance to sample densely
const NENTER = flag('--n', 8);        // frames across the entrance arc
const NEXIT = 5;                      // frames across the exit arc
const data = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
const format = data.module;
if (!format || !fs.existsSync(path.join(ROOT, 'formats', format, 'scene.html'))) { console.error(`✗ unknown module "${format}"`); process.exit(1); }
const dataUrl = '/' + path.relative(ROOT, path.resolve(dataArg)).split(path.sep).join('/');

// ---- beat boundaries: cut times, else layer-start clusters (>1.2s gap) — same signal as beats.mjs ----
const near = (arr, t, e = 0.35) => arr.some((x) => Math.abs(x - t) < e);
let bounds = [];
for (const c of data.cuts || []) if (typeof c.t === 'number' && !near(bounds, c.t)) bounds.push(c.t);
for (const t of data.transitions || []) if (typeof t.at === 'number' && !near(bounds, t.at)) bounds.push(t.at);
const starts = [...new Set((data.layers || []).filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
let last = -9;
for (const t of starts) { if (t - last > 1.2 && !near(bounds, t)) bounds.push(t); last = t; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const [VW, VH] = sceneDims(data);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const err = await page.evaluate(() => window.__engineError || null);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }
const { duration, fps: F } = await page.evaluate(() => window.__engine.meta);

bounds = [...new Set(bounds.map((t) => Math.max(0, Math.min(duration, t))))].sort((a, b) => a - b);
if (!bounds.length || bounds[0] > 0.05) bounds.unshift(0);
const beats = bounds.map((t0, i) => ({ i, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration })).filter((b) => b.t1 - b.t0 > 0.15);

const tmp = path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : '/tmp', 'reveal');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const tileW = 200, tileH = Math.round((tileW * VH) / VW);
const grab = async (t, file, tag, color) => {
  await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(Math.max(0, Math.min(duration - 0.01, t)) * F));
  const raw = file + '.raw.png';
  await page.screenshot({ path: raw, clip: { x: 0, y: 0, width: VW, height: VH } });
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
    `scale=${tileW}:${tileH},drawtext=text='${tag}':x=5:y=5:fontsize=15:fontcolor=${color}:box=1:boxcolor=black@0.6`, file]);
  return file;
};

const rows = [];
for (const b of beats) {
  const span = b.t1 - b.t0;
  const cells = [];
  // ENTER arc — dense over the first ENTER seconds (capped at half the beat), the reveal itself
  const eWin = Math.min(ENTER, span * 0.55);
  for (let k = 0; k < NENTER; k++) {
    const t = b.t0 + (eWin * k) / (NENTER - 1);
    cells.push(await grab(t, path.join(tmp, `b${b.i}_e${k}.png`), `${b.i + 1} in ${(t - b.t0).toFixed(2)}s`, 'lime'));
  }
  // SETTLED — the hold
  cells.push(await grab(b.t0 + Math.min(span * 0.7, eWin + (span - eWin) * 0.5), path.join(tmp, `b${b.i}_s.png`), `${b.i + 1} SET`, 'white'));
  // EXIT arc — dense over the last ~0.5s
  const xWin = Math.min(0.5, span * 0.4);
  for (let k = 0; k < NEXIT; k++) {
    const t = b.t1 - xWin + (xWin * k) / (NEXIT - 1);
    cells.push(await grab(t, path.join(tmp, `b${b.i}_x${k}.png`), `${b.i + 1} out`, 'orange'));
  }
  const row = path.join(tmp, `row_${String(b.i).padStart(2, '0')}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]), '-filter_complex', `hstack=inputs=${cells.length}`, '-frames:v', '1', row]);
  rows.push({ img: row, n: cells.length });
}
await browser.close(); server.close();

const maxCells = Math.max(...rows.map((r) => r.n));
const full = tileW * maxCells;
const padded = rows.map((r, i) => {
  if (r.n === maxCells) return r.img;
  const p = path.join(tmp, `pad_${i}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', r.img, '-vf', `pad=${full}:ih:0:0:color=0x0a0a0c`, p]);
  return p;
});
const sheet = '/tmp/reveal.png';
spawnSync('ffmpeg', ['-v', 'error', '-y', ...padded.flatMap((p) => ['-i', p]), '-filter_complex', `vstack=inputs=${padded.length}`, '-frames:v', '1', sheet]);
console.log(`✓ reveal · ${beats.length} beats · each row = [green ENTER arc · white SETTLED · orange EXIT arc]  →  ${sheet}`);
console.log('  Read the GREEN cells: how does each beat animate IN? (dolly direction, typing, a colour-wave, a collage assembling.)');
console.log('  This is the check `make beats` cannot do — it samples the hold; this samples the reveal.');
