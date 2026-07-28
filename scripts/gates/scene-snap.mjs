// scripts/scene-snap.mjs — check scenes WITHOUT rendering video. Captures a per-frame DOM signature
// (bbox + transform + opacity + font-size + color + text + clip-path of every id'd / critical element,
// plus a fingerprint of the background canvas) headless,
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
import { sceneDims } from '../../core/safe.js';
// ONE shared signature definition (capture + diff), also used by snap-scenes.mjs. Both gates used to
// keep their own hand-copied version; that duplication is how a field gets added to one and not the
// other, and how a gate goes blind without saying so (MISTAKES #159).
import { captureSig, diffSig } from './snap-signature.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SNAP = path.join(repoRoot, 'verify', 'snap');
fs.mkdirSync(SNAP, { recursive: true });
const args = process.argv.slice(2);
const m = args.find((a) => !a.startsWith('--'));
const SAVE = args.includes('--save');
if (!m) { console.error('usage: node scripts/scene-snap.mjs <format> [--save]'); process.exit(1); }
// FAIL on an extra positional arg. This gate always snapshots the FORMAT's sample.json, but it used
// to accept `scene-snap.mjs scene formats/scene/paint-demo.json` and silently ignore the second
// argument, reporting "IDENTICAL" about a file it never opened. That is a gate answering a question
// it was not asked, which is worse than no gate: the answer looks authoritative.
const extra = args.filter((a) => !a.startsWith('--')).slice(1);
if (extra.length) {
  console.error(`scene-snap takes a FORMAT name, not a data file — it always snapshots formats/${m}/sample.json.`);
  console.error(`  ignored: ${extra.join(', ')}`);
  console.error('  to compare one scene, render it and use `make compare`.');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = await new Promise((r) => { const s = http.createServer((req, res) => { const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
const port = server.address().port;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
// Signatures must be captured at the format's real dims, or the baseline records a cropped canvas.
const snapCfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', m, 'sample.json'), 'utf8')); } catch { return {}; } })();
const [SVW, SVH] = sceneDims(snapCfg);
await page.setViewport({ width: SVW, height: SVH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/formats/${m}/sample.json&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const meta = await page.evaluate(() => window.__engine.meta);
const total = meta.totalFrames;
// Sample WHERE THE MOTION IS. An even spread lands almost entirely in steady state — transition
// windows are 0.3-0.6s — so this gate reported IDENTICAL after every fade curve in the engine was
// re-eased (#38). Transition frames are derived from the same data-* attributes driveClips reads, so
// the sampling follows whatever the scene actually does rather than a fixed grid.
const motionFrames = await page.evaluate(() => {
  const out = new Set();
  const FPS = (window.__engine.meta && window.__engine.meta.fps) || 30;
  const at = (t) => { const f = Math.round(t * FPS); if (f >= 0) out.add(f); };
  for (const el of document.querySelectorAll('[data-start]')) {
    const st = parseFloat(el.dataset.start) || 0;
    const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
    const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : null;
    const ex = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
    at(st + en * 0.3); at(st + en * 0.7);                       // mid-entrance, both sides of the curve
    if (du != null && Number.isFinite(du)) { at(st + du - ex * 0.7); at(st + du - ex * 0.3); } // mid-exit
  }
  return [...out];
});
const cutFrames = (() => { try {
  const j = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', m, 'sample.json'), 'utf8'));
  return (j.cuts || []).flatMap((c) => { const h = (c.dur ?? 0.36) / 2; return [c.t - h * 0.5, c.t, c.t + h * 0.5]; }).map((t) => Math.round(t * 30));
} catch { return []; } })();
const frames = [...new Set([
  ...(meta.stings || []).map((t) => Math.round(t * 30)),
  ...motionFrames, ...cutFrames,
  ...Array.from({ length: 20 }, (_, i) => Math.round(((i + 0.5) / 20) * total)),
])].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);

const sig = await captureSig(page, frames);
await browser.close(); server.close();

const file = path.join(SNAP, `${m}.json`);
if (SAVE) { fs.writeFileSync(file, JSON.stringify(sig)); console.log(`✓ baseline saved → verify/snap/${m}.json  (${frames.length} frames)`); process.exit(0); }

if (!fs.existsSync(file)) { console.error(`no baseline for ${m} — run with --save first`); process.exit(2); }
const base = JSON.parse(fs.readFileSync(file, 'utf8'));
const diffs = diffSig(base, sig);
console.log(`\n==== SNAP DIFF · ${m} (${frames.length} frames vs baseline) ====`);
if (!diffs.length) { console.log('✓ IDENTICAL — no DOM/layout change across sampled frames'); process.exit(0); }
for (const d of diffs.slice(0, 60)) console.log('  ' + d);
if (diffs.length > 60) console.log(`  … +${diffs.length - 60} more`);
console.log(`\n△ ${diffs.length} change(s) — review that each is intended.`);
process.exit(0);
