// canvas-purity.mjs: do the CANVAS PIXELS depend only on n?
//
//   node quality/gates/canvas-purity.mjs <format> [data.json]
//   make check GATE=canvas-purity
//
// `make check GATE=probe` compares a DOM SIGNATURE, so it can only see attributes and computed styles. The two
// layer types that draw pixels (`shader` (WebGL) and `paint` (Canvas 2D)) put their entire output
// somewhere the DOM signature cannot reach. probe reported the paint demo clean while 2 of 6 frames
// rendered different PIXELS depending on render order: an off-window layer never cleared its canvas,
// so it held whatever a previous frame had drawn, and frames render across 8 workers in arbitrary
// order (engine-doctrine/MISTAKES.md #64). This gate hashes the actual pixels instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/layout/safe.js';
import { serveRepo, waitForEngine } from '../../harness/lib/render-harness.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const f = gateFindings();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const format = process.argv[2] || 'scene';
const dataArg = process.argv[3];
const dataUrl = dataArg ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/films/${format}/sample.json`;

const { server, port } = await serveRepo();

const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, decodeURIComponent(dataUrl).replace(/^\//, '')), 'utf8')); } catch { return {}; } })();
const [VW, VH] = sceneDims(cfg);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/films/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'networkidle0' });
const err = await waitForEngine(page);
if (err) { console.error('SCENE ERROR:', err); process.exit(1); }

const total = (await page.evaluate(() => window.__engine.meta)).totalFrames;
const nCanvas = await page.evaluate(() => document.querySelectorAll('canvas').length);
if (nCanvas <= 1) { console.log(`~ ${format}: no shader/paint canvases to check (only the bg canvas)`); await browser.close(); server.close(); process.exit(0); }

// `three` (real GPU lighting, MeshPhysicalMaterial transmission) can sum its lighting in a different
// float order between render orders with no visible difference, unlike every other canvas here (2D
// paint, or a shader with no accumulation): those must still match byte-for-byte. So a `three` canvas
// gets a per-channel BYTE tolerance instead of exact-hash equality; nothing else does.
const THREE_TOLERANCE = 10;

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
    out.push({ surface: cv.dataset.surface || '', hash: h.toString(16), bytes: Array.from(d) });
  }
  return out;
}, { n, pre });

const frames = Array.from({ length: 8 }, (_, i) => Math.round(((i + 0.5) / 8) * total)).filter((n) => n > 9 && n < total - 9);
let bad = 0;
for (const n of frames) {
  const clean = await sig(n, []);
  const dirty = await sig(n, [n + 9, total - 1, 0, n - 9]);   // same scrambler shape as probe-purity
  const which = [];
  clean.forEach((c, i) => {
    const d = dirty[i];
    if (c.surface === 'three') {
      let maxDelta = 0;
      for (let k = 0; k < c.bytes.length; k++) maxDelta = Math.max(maxDelta, Math.abs(c.bytes[k] - d.bytes[k]));
      if (maxDelta > THREE_TOLERANCE) which.push([i, `${c.hash} (Δ${maxDelta})`, d.hash]);
    } else if (c.hash !== d.hash) which.push([i, c.hash, d.hash]);
  });
  if (which.length) {
    bad++;
    // The signature is one entry PER CANVAS, so the divergent canvas is already known here. Printing
    // only the frame threw that away and left the reader hunting across every canvas.
    f.fail('canvas-order-dependent',
      `frame ${n}: ${which.length} of ${clean.length} canvas(es) differ by render order`,
      { at: `frame ${n}`,
        fix: which.map(([i, h, o]) => `canvas[${i}]  clean ${h}  →  after scrambled order ${o}`).join('; ') });
  }
}
await browser.close(); server.close();
if (bad) console.log('A shader/paint layer that does not clear when off-window holds the last frame it drew.');
else console.log(`✓ canvas purity OK: ${frames.length} frames, ${nCanvas} canvases, pixels identical regardless of render order`);
f.emit();
process.exit(bad ? 1 : 0);
