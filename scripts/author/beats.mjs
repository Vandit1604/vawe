// beats.mjs — verify a video BEAT BY BEAT before you trust it. Renders the first / mid / last frame of
// every beat into one labeled contact sheet (/tmp/beats.png) so one image tells you if a beat is murky,
// overlapping, or off. With --vs <brand> it stacks each beat beside its source-section screenshot (from
// `make sections`) — a side-by-side taste diff: does our beat actually reflect the real section?
//
//   node scripts/beats.mjs <data.json> [--vs brand] [--stride 1]
//   make beats D=formats/scene/linear-30.json            (self check)
//   make beats D=formats/scene/linear-30.json VS=linear  (fidelity vs captured sections)
//
// Beat boundaries: data.camera[].t keyframes if present, else data.captions[].start, else even ~5s slices.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const vs = flag('--vs', null);
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/beats.mjs <data.json> [--vs brand]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
const format = data.module;
if (!format || !fs.existsSync(path.join(ROOT, 'formats', format, 'scene.html'))) { console.error(`✗ unknown module "${format}" in ${dataArg}`); process.exit(1); }
const dataUrl = '/' + path.relative(ROOT, path.resolve(dataArg)).split(path.sep).join('/');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
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
if (err) { console.error('SCENE ERROR:', err); process.exit(1); }
const meta = await page.evaluate(() => window.__engine.meta);
const { duration, fps: F } = meta;

// beat boundaries → [t0,t1) windows.
// A beat is a story unit, and the truest signal of one is the AUTHORED transition: a `cuts[]` time.
// Next best is a CLUSTER of layer start-times (a new group of content entering after a gap) — the
// same heuristic the motion director uses. camera/captions are weaker signals, and an even chop is
// the last resort. Earlier this used ONLY camera→captions→even-split, so a cut-driven scene (the
// reel) was chopped into arbitrary 5s chunks and undercounted its real beats.
const near = (arr, t, eps = 0.35) => arr.some((x) => Math.abs(x - t) < eps);
let bounds = [];
// 1. explicit cut times — the strongest boundary
for (const c of data.cuts || []) if (typeof c.t === 'number' && !near(bounds, c.t)) bounds.push(c.t);
// 2. layer-start clusters: sort starts, a >1.2s gap opens a new beat (ignore the full-bleed base track 0)
const starts = [...new Set((data.layers || []).filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
let last = -9;
for (const t of starts) { if (t - last > 1.2 && !near(bounds, t)) { bounds.push(t); } last = t; }
// 3. fallbacks only if the above found nothing
if (bounds.length < 2) for (const k of data.camera || []) if (typeof k.t === 'number' && !near(bounds, k.t)) bounds.push(k.t);
if (bounds.length < 2) for (const c of data.captions || []) if (typeof c.start === 'number' && !near(bounds, c.start)) bounds.push(c.start);
if (bounds.length < 2) { const n = Math.max(2, Math.round(duration / 5)); bounds = Array.from({ length: n }, (_, i) => (i * duration) / n); }
bounds = [...new Set(bounds.map((t) => Math.max(0, Math.min(duration, t))))].sort((a, b) => a - b);
if (bounds[0] > 0.05) bounds.unshift(0);
const beats = bounds.map((t0, i) => ({ i, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration })).filter((b) => b.t1 - b.t0 > 0.2);

// optional source sections for the fidelity column
let sections = [];
if (vs) {
  try { sections = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/brands', vs, 'sections', 'sections.json'), 'utf8')).sections; }
  catch { console.warn(`  ⚠ --vs ${vs}: no sections.json (run: make sections URL=… NAME=${vs}) — skipping fidelity column`); }
}

const tmp = '/tmp/beats_frames'; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const grab = async (t, file) => { await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(t * F)); await page.screenshot({ path: file, clip: { x: 0, y: 0, width: VW, height: VH } }); };
const tileW = 300, tileH = Math.round((tileW * VH) / VW);
const rows = [];
for (const b of beats) {
  const ts = [b.t0 + 0.3, (b.t0 + b.t1) / 2, b.t1 - 0.2].map((t) => Math.max(b.t0, Math.min(b.t1 - 0.02, t)));
  const cells = [];
  for (let k = 0; k < ts.length; k++) {
    const raw = path.join(tmp, `b${b.i}_${k}.png`);
    await grab(ts[k], raw);
    const lab = path.join(tmp, `b${b.i}_${k}_l.png`);
    const tag = k === 0 ? 'in' : k === 1 ? 'mid' : 'out';
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
      `scale=${tileW}:${tileH},drawtext=text='${b.i + 1}·${tag} ${ts[k].toFixed(1)}s':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65`, lab]);
    cells.push(lab);
  }
  // fidelity: prepend the source section shot (letterboxed to tile height)
  const sec = sections[b.i];
  if (sec) {
    const secShot = path.join(ROOT, sec.shot);
    if (fs.existsSync(secShot)) {
      const sl = path.join(tmp, `b${b.i}_src.png`);
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', secShot, '-vf',
        `scale=${tileW}:${tileH}:force_original_aspect_ratio=decrease,pad=${tileW}:${tileH}:(ow-iw)/2:(oh-ih)/2:color=0x1a1a1e,drawtext=text='SITE: ${sec.label}':x=8:y=8:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.7`, sl]);
      cells.unshift(sl);
    }
  }
  const rowImg = path.join(tmp, `row_${String(b.i).padStart(2, '0')}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]), '-filter_complex', `hstack=inputs=${cells.length}`, '-frames:v', '1', rowImg]);
  rows.push({ img: rowImg, n: cells.length });
}
await browser.close(); server.close();

// stack rows (pad narrower rows so hstack widths match)
const maxCells = Math.max(...rows.map((r) => r.n));
const full = tileW * maxCells;
const padded = rows.map((r, i) => {
  if (r.n === maxCells) return r.img;
  const p = path.join(tmp, `padrow_${i}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', r.img, '-vf', `pad=${full}:ih:0:0:color=0x0a0a0c`, p]);
  return p;
});
const sheet = '/tmp/beats.png';
spawnSync('ffmpeg', ['-v', 'error', '-y', ...padded.flatMap((p) => ['-i', p]), '-filter_complex', `vstack=inputs=${padded.length}`, '-frames:v', '1', sheet]);
console.log(`✓ ${beats.length} beats · ${duration.toFixed(1)}s${vs ? ` · vs SITE ${vs}` : ''}  →  ${sheet}`);
console.log('  Read the sheet, give a verdict PER numbered beat (keep / fix X / cut / too fast). Judge each against\n  docs/CRAFT/TASTE-RULES.md: does it read, earn its time, and connect to its neighbours?');
