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
// BOTH SIDES ARE WRONG, IN OPPOSITE DIRECTIONS. Measured on vawe-teaser, 180 frames, three ways:
//
//   this file (JS)                      median 0.43
//   ffmpeg, no repo code involved       median 1.563   (mean 2.72, min 0.92, max 6.28, all 179 pairs)
//   the render (Go)                     median 2.47
//
// ffmpeg sits BETWEEN them. One reads about 3.6x low and the other about 1.6x high, so neither can be
// called the reference and the earlier idea that one of them was simply correct is dead.
//
// EVERYTHING CHEAP IS RULED OUT, each by measurement rather than by reading the code:
//   the constants   aligning pairs, luma and fps moved 0.42 to 0.43
//   the codec       VAWE_CAPTURE=png renders 2.41 against JPEG's 2.47
//   the frame size  captured frames are 1920x1080, exactly what this file screenshots at
//   the pictures    a screenshot and the captured frame for frame 0 differ by ZERO, and pair deltas
//                   from screenshots match pair deltas from disk (2.65 vs 2.46, 3.32 vs 5.00)
//   decode          returns 1920x1080x3, and its full-pixel delta of 2.955 matches ffmpeg's 2.654
//   the grid        averaging changes nothing here: GRID 12, GRID 1 and full-pixel all give 2.955,
//                   because this film's motion is low-frequency and cell averaging cannot cancel it
//   the formula     both sides mean-abs-diff the cell array and take the median
//
// THE CULPRIT IS THIS FILE, AND THE PROOF IS ARITHMETIC. ffmpeg measured the MINIMUM delta across all
// 179 pairs at 0.92: no pair in this film changes by less than that. This file reports a median of
// 0.43, which is below the smallest value that exists. A median of real pair deltas cannot sit under
// the minimum, so these are not real pair deltas. The render's 2.47 lands inside the measured range of
// 0.92 to 6.28 and is plausible; sampling every third pair can median higher than all 179.
//
// So `cells` and `score` are not at fault either: run standalone over two screenshots this file's own
// code gives 2.955 for pair 0->1, which is right. Something between seeking a frame and handing the
// screenshot to `score` is losing the change. The remaining suspect is the capture loop, where `seek`
// calls renderFrame and screenshots with nothing awaiting a paint, so a pair can photograph the same
// painted state twice and score near zero. NOT YET MEASURED, and it is the only thing left: log every
// delta this file computes and check how many are implausibly small.
//
// Two earlier explanations in this comment were wrong, both reasoned rather than measured: that JPEG
// noise inflated the render, and that the render was therefore the one to distrust. They are named here
// so nobody walks them again.
//
// UNTIL THIS IS SETTLED, quote neither number as a measurement of a film. The SPLIT (ground versus
// layers) may still be sound, because both halves come from this same path and the ratio can survive a
// scale error the absolute numbers do not.
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
