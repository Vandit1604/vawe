// quality/gates/motion-split.mjs: how much of a film's motion is the GROUND, and how much is the FILM.
//
//   node quality/gates/motion-split.mjs films/scene/x.json
//   make check GATE=motion-split D=films/scene/x.json
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
import { sceneDims } from '../../core/layout/safe.js';
import { marksOf } from '../../core/timeline/junctions.js';
import { serveRepo, waitForEngine } from '../../harness/lib/render-harness.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv.find((a) => a.endsWith('.json'));
if (!file) { console.error('usage: node quality/gates/motion-split.mjs <scene.json>'); process.exit(2); }
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
// WHERE THIS STANDS, and it is not settled. Measured on vawe-teaser, 180 frames:
//
//   this file, PNG screenshots      n=60  min 0.052  median 0.422  max 2.803
//   ffmpeg, the render's JPEGs      n=179 min 0.92   median 1.563  max 6.28
//   the render, its own JPEGs       median 2.47
//
// THE MINIMUMS DIFFER BY EIGHTEEN TIMES, and that is the one solid finding. A JPEG carries a
// quantisation noise floor around 0.9, so on captured frames a completely held frame still reads as
// moving; a lossless screenshot of the same instant reads 0.05. That floor is why the render reports
// 25% still where this file reports 67% on the same film: the render's stillness threshold is being
// compared against a number the codec cannot go below.
//
// FOUR EXPLANATIONS IN THIS COMMENT HAVE BEEN WRONG, every one of them reasoned instead of measured:
//   1. JPEG noise inflates the render's MEDIAN. It does not; PNG renders 2.41 against JPEG's 2.47.
//      (It does set the FLOOR, which is a different claim and is the finding above.)
//   2. The render is therefore the number to distrust.
//   3. This file is the broken one, "proven" because its median sat under ffmpeg's minimum. That
//      compared a PNG-based median against a JPEG-based minimum. Two sources, two floors, invalid.
//   4. The screenshots were stale for want of a paint wait. A double rAF was added, copied from the
//      capturer, and the number did not move at all.
//
// WHAT IS ACTUALLY UNEXPLAINED, stated narrowly so the next person starts in the right place: the
// medians are 0.42 here and 2.47 there, and the ~0.9 codec floor accounts for maybe half of that.
// Nothing measured so far accounts for the rest. The next measurement is the render's OWN delta array
// on PNG-captured frames, compared pair by pair against this file's, on the same frame indices.
// SPLIT_DEBUG=1 prints this side's.
const PAIRS = 48;          // internal/scene/scene.go stillPairs
const GRID = 12, SUB = 3;  // the same cell size and sub-step internal/scene/scene.go uses

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });

// SEEK SYNCHRONOUSLY, the way every other gate here does (quality/gates/snap-signature.mjs:129).
// The first version awaited a double requestAnimationFrame inside the page to let a frame settle, and
// it hung: `Runtime.callFunctionOn timed out`. renderFrame(n) is synchronous by contract, so there is
// nothing to wait for, and screenshotting afterwards is what forces the paint.
// SEEK, THEN WAIT FOR THE PAINT. renderFrame(n) mutates the DOM and returns; the browser has not
// drawn anything yet. Screenshotting straight after photographs whatever was on screen BEFORE the
// seek, so a pair can capture the same painted state twice and score a delta near zero.
//
// That is exactly what this file was doing, and it is why its median came out at 0.43 when ffmpeg
// measured the smallest real delta in the film at 0.92: a median under the minimum is not a
// measurement, it is stale pixels.
//
// The double rAF is not invented here. internal/scene/scene.go:673 awaits
// `new Promise(res => __realRaf(() => __realRaf(res)))` before every screenshot for the same reason,
// and that is the capturer whose numbers this file is meant to be comparable with. One frame of rAF
// schedules the paint; the second returns after it has happened.
const seek = async (page, f) => {
  await page.evaluate((f) => { window.__engine.renderFrame(f); }, f);
  await page.evaluate(() => (window.__realRaf
    ? new Promise((res) => window.__realRaf(() => window.__realRaf(res)))
    : new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))));
};

async function series(nobg) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/${path.relative(ROOT, abs)}&fps=30${nobg ? '&nobg=1' : ''}`, { waitUntil: 'load' });
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
  // step and total travel with the pairs: sample j is frame j*step, which is the only way the
  // sparkline below can put a cut under the column it actually happened in.
  return { pairs: deltas, step, total };
}

const { decode } = await import('../../harness/lib/png-diff.mjs');
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
  const series = pairs.map(([a, b]) => {
    const A = cells(a), B = cells(b);
    let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]);
    if (process.env.SPLIT_DEBUG) console.error(`    cells=${A.length} delta=${(s / A.length).toFixed(3)}`);
    return s / A.length;
  });
  // `series` stays in film order; the stats read a sorted COPY. Sorting in place is what kept the
  // shape of the film out of this file's output for as long as it has existed.
  const ds = [...series].sort((x, y) => x - y);
  return { median: ds[Math.floor(ds.length / 2)], still: ds.filter((d) => d < 0.5).length / ds.length, series };
};

const fullRun = await series(false);
const bareRun = await series(true);
const full = score(fullRun.pairs);
const bare = score(bareRun.pairs);
await browser.close(); server.close();

// This gate is an INSTRUMENT, never a check: it has no pass/fail threshold and must not gain one (see
// the comment at the bottom of this file). So every fact it reports is `info`, never `fail`/`warn`, and
// the exit code stays 0 no matter what it measures.
const f = gateFindings();
const name = path.basename(abs, '.json');
console.log(`\n  MOTION SPLIT · ${name}\n`);
console.log(`  with the authored ground   motion ${full.median.toFixed(2)}   ${Math.round(full.still * 100)}% still`);
console.log(`  with the ground removed    motion ${bare.median.toFixed(2)}   ${Math.round(bare.still * 100)}% still`);
f.note('motion-split', `with the authored ground: motion ${full.median.toFixed(2)}, ${Math.round(full.still * 100)}% still; with the ground removed: motion ${bare.median.toFixed(2)}, ${Math.round(bare.still * 100)}% still`,
  { fullMedian: full.median, fullStill: full.still, bareMedian: bare.median, bareStill: bare.still });
const groundShare = full.median > 0 ? Math.max(0, 1 - bare.median / full.median) : 0;
console.log(`\n  the GROUND is ${Math.round(groundShare * 100)}% of this film's measured motion.`);
console.log(`  the LAYERS deliver ${bare.median.toFixed(2)}, and that is the number to compare against a reference.`);
f.note('ground-share', `the ground is ${Math.round(groundShare * 100)}% of this film's measured motion; the layers deliver ${bare.median.toFixed(2)}`,
  { groundShare });
if (groundShare > 0.6) {
  console.log(`\n  ⚠ most of what this film measures is its backdrop. That is not wrong, and it is not the\n    content moving. \`make grammar\` has the band the references sit in.`);
  f.note('ground-dominant', 'most of what this film measures is its backdrop, not the content moving',
    { fix: '`make grammar` has the band the references sit in' });
}

// THE SHAPE, NOT A SCORE. Both numbers above are BOUNDS: they say how much this film moves and whose
// motion it is, and neither says WHEN. Bruce Block's argument (engine-doctrine/RESEARCH/MOTION-CANON.md, ADOPT 3)
// is that a film's visual intensity should follow its story: establish, escalate through the middle,
// resolve on the payoff. DIRECTION.md section 2 asks the author to accelerate toward the climax and
// then gives them nothing to look at. The per-sample series was already in hand here and was thrown
// away by a sort. This prints it.
//
// IT IS NOT GATED AND MUST NOT BECOME ONE. A film can be right and fall: a quiet ending is a choice,
// so any threshold on this curve manufactures a finding on every film that made that choice. This repo
// has deleted two gates for measuring a proxy for a judgement, and `visual-vocabulary` is the one to
// remember: it squared a 590x18 rule into 590x590 and credited a hairline with a tenth of the frame
// (engine-doctrine/TASTE.md). The eye reads the shape. This only draws it.
const FPS = 30;                 // the URL above renders at 30, so a sample index converts back to seconds
const BLOCKS = '▁▂▃▄▅▆▇█';
const shape = bare.series;      // the LAYERS alone: the ground's own motion is not the film's energy
const peak = Math.max(...shape);
const bars = shape.map((d) => BLOCKS[peak > 0 ? Math.min(7, Math.round((d / peak) * 7)) : 0]).join('');
const marks = marksOf(cfg);
const rule = Array(shape.length).fill(' ');
for (const m of marks) {
  const col = Math.round((m.t * FPS) / bareRun.step);
  if (col >= 0 && col < rule.length) rule[col] = m.kind === 'sting' ? '·' : '│';
}
const dur = bareRun.total / FPS;
const end = `${dur.toFixed(1)}s`;
console.log(`\n  THE FILM'S ENERGY OVER TIME · ${shape.length} samples of the layers, the ground removed\n`);
console.log(`    ${bars}`);
console.log(`    ${rule.join('')}`);
console.log(`    0s${' '.repeat(Math.max(1, shape.length - 2 - end.length))}${end}`
  + (marks.length ? '   │ cut or seam · sting' : '   one shot: no cuts, seams or stings to rule under it'));
console.log(`\n  peak ${peak.toFixed(2)} at ${((shape.indexOf(peak) * bareRun.step) / FPS).toFixed(1)}s.`);
console.log(`  Read the SHAPE, not the height: does it rise into the payoff, or is the loudest frame in
  the middle? A film whose peak sits in its middle ends twice. Nothing scores this and nothing will:
  engine-doctrine/CRAFT/DIRECTION.md section 2, "accelerate toward the climax".`);
console.log('');
f.note('energy-shape', `peak ${peak.toFixed(2)} at ${((shape.indexOf(peak) * bareRun.step) / FPS).toFixed(1)}s over ${shape.length} samples, ${dur.toFixed(1)}s runtime`,
  { peak, peakAt: (shape.indexOf(peak) * bareRun.step) / FPS, samples: shape.length });
f.emit();
