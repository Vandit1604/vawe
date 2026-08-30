// scripts/gates/motion-split.mjs: how much of a film's motion is the GROUND, and how much is the FILM.
//
//   node scripts/gates/motion-split.mjs formats/scene/x.json
//   make motion-split D=formats/scene/x.json
//
// WHY. `./bin/vawe` prints one motion figure and it is a property of the FRAME, so a moving backdrop
// flatters it exactly as much as moving content does. Measured on a real recreation: 2% still and 1.25
// on `aurora`, then 75% still and 0.29 on a static ground WITH NOT ONE LAYER CHANGED. I read the 1.25
// as evidence my fix had worked, an hour after building the instrument. A number that can be gamed by
// changing a preset is a number an author will eventually game by accident.
//
// TWO SAMPLED RENDERS, NOT TWO FULL ONES. It seeks the same frames twice in one browser, once normally
// and once with `?nobg=1`, and diffs consecutive pairs. Forty-odd screenshots instead of two full
// captures, so it costs seconds and can be run while authoring rather than only at ship.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv.find((a) => a.endsWith('.json'));
if (!file) { console.error('usage: node scripts/gates/motion-split.mjs <scene.json>'); process.exit(2); }
const abs = path.resolve(ROOT, file);
if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(abs, 'utf8'));
const [W, H] = sceneDims(cfg);
// ONE METRIC, TWO IMPLEMENTATIONS, and they had drifted. internal/scene/scene.go samples 48 pairs and
// weighs luma with Rec. 601; this file sampled 22 with Rec. 709 and skipped the fps normalisation
// entirely. So the render and the split answered a different question about the same film and an author
// comparing either against a reference got a number that depended on which command they had typed.
// Every constant here now matches that file by name. It is still two implementations of one definition,
// which is the shape this codebase logs more than any other, and the real repair is the split moving
// into the renderer that already has the frames on disk. Until then: change one, change both.
//
// ALIGNING THEM DID NOT CLOSE THE GAP, and that is the useful finding. This file reported 0.42 for the
// teaser and the render reported 1.69 to 2.47 for the same film; matching the constants moved it to
// 0.43. So the formula was never the cause. The two tools measure DIFFERENT PIXELS: the render weighs
// the frames it captured, and `scene.CaptureExt` writes those as JPEG for every render that is not an
// alpha export, while this file screenshots the live page as lossless PNG. JPEG quantisation noise
// differs frame to frame across the whole picture, so it reads as change everywhere and inflates the
// render's figure several times over. The number is measuring the codec as much as the film.
//
// Which one is right: THIS one. A film's motion is a property of what the engine drew, not of how the
// capture was compressed on the way to the encoder. The repair is for the renderer to measure before
// the frames are quantised, or to capture PNG when it intends to measure, and then this file goes away.
const PAIRS = 48;          // internal/scene/scene.go stillPairs
const GRID = 12, SUB = 3;  // the same cell size and sub-step internal/scene/scene.go uses

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });

// SEEK SYNCHRONOUSLY, the way every other gate here does (scripts/gates/snap-signature.mjs:129).
// The first version awaited a double requestAnimationFrame inside the page to let a frame settle, and
// it hung: `Runtime.callFunctionOn timed out`. renderFrame(n) is synchronous by contract, so there is
// nothing to wait for, and screenshotting afterwards is what forces the paint.
const seek = (page, f) => page.evaluate((f) => { window.__engine.renderFrame(f); }, f);

async function series(nobg) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=/${path.relative(ROOT, abs)}&fps=30${nobg ? '&nobg=1' : ''}`, { waitUntil: 'load' });
  const err = await waitForEngine(page); if (err) throw new Error(String(err));
  const total = await page.evaluate(() => window.__engine.meta.totalFrames);
  const step = Math.max(1, Math.floor(total / PAIRS));
  const deltas = [];
  for (let n = 0; n + 1 < total; n += step) {
    const shots = [];
    for (const f of [n, n + 1]) {
      await seek(page, f);
      shots.push(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } }));
    }
    deltas.push(shots);
  }
  await page.close();
  return deltas;
}

const { decode } = await import('../lib/png-diff.mjs');
const cells = (buf) => {
  const { w, h, ch, data } = decode(buf);
  const out = [];
  for (let y = 0; y < h; y += GRID) for (let x = 0; x < w; x += GRID) {
    let sum = 0, n = 0;
    for (let dy = 0; dy < GRID && y + dy < h; dy += SUB) for (let dx = 0; dx < GRID && x + dx < w; dx += SUB) {
      const i = ((y + dy) * w + (x + dx)) * ch;
      // Rec. 601, because that is what signalstats YAVG reports and what the Go side weighs with. A
      // 709 luma is not wrong, it is a DIFFERENT grey, and two greys make two numbers.
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++;
    }
    if (n) out.push(sum / n);
  }
  return out;
};
const score = (pairs) => {
  const ds = pairs.map(([a, b]) => {
    const A = cells(a), B = cells(b);
    let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]);
    return s / A.length;
  }).sort((x, y) => x - y);
  return { median: ds[Math.floor(ds.length / 2)], still: ds.filter((d) => d < 0.5).length / ds.length };
};

const full = score(await series(false));
const bare = score(await series(true));
await browser.close(); server.close();

const name = path.basename(abs, '.json');
console.log(`\n  MOTION SPLIT · ${name}\n`);
console.log(`  with the authored ground   motion ${full.median.toFixed(2)}   ${Math.round(full.still * 100)}% still`);
console.log(`  with the ground removed    motion ${bare.median.toFixed(2)}   ${Math.round(bare.still * 100)}% still`);
const groundShare = full.median > 0 ? Math.max(0, 1 - bare.median / full.median) : 0;
console.log(`\n  the GROUND is ${Math.round(groundShare * 100)}% of this film's measured motion.`);
console.log(`  the LAYERS deliver ${bare.median.toFixed(2)}, and that is the number to compare against a reference.`);
if (groundShare > 0.6)
  console.log(`\n  ⚠ most of what this film measures is its backdrop. That is not wrong, and it is not the\n    content moving. \`make grammar\` has the band the references sit in.`);
console.log('');
