// scripts/scene-snap.mjs — check scenes WITHOUT rendering video. Captures a per-frame DOM signature
// (bbox + transform + opacity + font-size + color + text of every id'd / critical element) headless,
// with NO encode and NO screenshot. Save a baseline before a refactor, then diff after to prove the
// rendered frames are unchanged (or see exactly what moved).
//   node scripts/scene-snap.mjs <format> --save     # write baseline → verify/snap/<format>.json
//   node scripts/scene-snap.mjs <format>            # diff current vs baseline
//   make snap M=<format> [SAVE=1]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SNAP = path.join(repoRoot, 'verify', 'snap');
fs.mkdirSync(SNAP, { recursive: true });
const args = process.argv.slice(2);
const m = args.find((a) => !a.startsWith('--'));
const SAVE = args.includes('--save');
if (!m) { console.error('usage: node scripts/scene-snap.mjs <format> [--save]'); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = await new Promise((r) => { const s = http.createServer((req, res) => { const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
const port = server.address().port;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
// landscape-aware: signatures must be captured at the format's real dims
const landscape = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', m, 'sample.json'), 'utf8')).orientation === 'landscape'; } catch { return false; } })();
await page.setViewport({ width: landscape ? 1920 : 1080, height: landscape ? 1080 : 1920, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/formats/${m}/sample.json&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const meta = await page.evaluate(() => window.__engine.meta);
const total = meta.totalFrames;
// sample ~20 frames across the timeline (+ every sting)
const frames = [...new Set([...(meta.stings || []).map((t) => Math.round(t * 30)), ...Array.from({ length: 20 }, (_, i) => Math.round(((i + 0.5) / 20) * total))])].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);

const sig = await page.evaluate((frames) => {
  const round = (v) => Math.round(v * 10) / 10;
  const snap = {};
  for (const f of frames) {
    window.__engine.renderFrame(f);
    const els = {};
    for (const el of document.querySelectorAll('[id], [data-layer="critical"]')) {
      const b = el.getBoundingClientRect(); if (b.width < 1 && b.height < 1) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity === 0) continue;
      const key = el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName);
      els[key] = { x: round(b.left), y: round(b.top), w: round(b.width), h: round(b.height),
        tf: s.transform === 'none' ? '' : s.transform, op: round(+s.opacity), fs: s.fontSize, c: s.color,
        t: (el.textContent || '').trim().slice(0, 24) };
    }
    snap[f] = els;
  }
  return snap;
}, frames);
await browser.close(); server.close();

const file = path.join(SNAP, `${m}.json`);
if (SAVE) { fs.writeFileSync(file, JSON.stringify(sig)); console.log(`✓ baseline saved → verify/snap/${m}.json  (${frames.length} frames)`); process.exit(0); }

if (!fs.existsSync(file)) { console.error(`no baseline for ${m} — run with --save first`); process.exit(2); }
const base = JSON.parse(fs.readFileSync(file, 'utf8'));
const diffs = [];
const fields = { x: 'x', y: 'y', w: 'w', h: 'h', tf: 'transform', op: 'opacity', fs: 'font', c: 'color', t: 'text' };
for (const f of Object.keys(sig)) {
  const a = base[f] || {}, b = sig[f];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!a[k]) { diffs.push(`f${f} +${k} (new)`); continue; }
    if (!b[k]) { diffs.push(`f${f} -${k} (gone)`); continue; }
    for (const fld of Object.keys(fields)) {
      const av = a[k][fld], bv = b[k][fld];
      if ((typeof av === 'number' ? Math.abs(av - bv) > 0.6 : av !== bv)) diffs.push(`f${f} ${k}.${fields[fld]}: ${JSON.stringify(av)} → ${JSON.stringify(bv)}`);
    }
  }
}
console.log(`\n==== SNAP DIFF · ${m} (${frames.length} frames vs baseline) ====`);
if (!diffs.length) { console.log('✓ IDENTICAL — no DOM/layout change across sampled frames'); process.exit(0); }
for (const d of diffs.slice(0, 60)) console.log('  ' + d);
if (diffs.length > 60) console.log(`  … +${diffs.length - 60} more`);
console.log(`\n△ ${diffs.length} change(s) — review that each is intended.`);
process.exit(0);
