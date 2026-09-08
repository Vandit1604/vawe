// preview.mjs, FAST iteration: render the key frames of a format directly (no encode),
// into one labeled contact sheet. ~5s, not a full render.
//   node scripts/author/preview.mjs higherlower            (storyboard)
//   node scripts/author/preview.mjs higherlower 560         (single exact frame)
//   node scripts/author/preview.mjs higherlower b3          (single frame: the START of beat 3)
//   node scripts/author/preview.mjs higherlower 560 mydata.json   (custom data file)
//   node scripts/author/preview.mjs higherlower --data mydata.json          (any position)
//
// `--data` exists because the positional slot is THIRD, so `make look M=scene D=x.json` had nowhere
// to put it and the Makefile silently dropped it: both targets rendered sample.json while reporting
// the scene you asked for. That is the same defect the Makefile records fixing for `make motion`
// ("without it the target silently audited sample.json instead of your scene"), it survived here
// because the fix went to one call site. docs/MISTAKES.md #365.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/layout/safe.js';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { marksOf, junctionTable, shotWindows } from '../../core/timeline/junctions.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flagIdx = argv.indexOf('--data');
const flagData = flagIdx >= 0 ? argv[flagIdx + 1] : undefined;
if (flagIdx >= 0) argv.splice(flagIdx, flagData === undefined ? 1 : 2);
const format = argv[0];
// `bN` (N=b3) is a BEAT INDEX, not a frame number: resolved below, once the scene's own beats are known
// (shotWindows off the real cut/seam joints, the same joints the engine cuts the film on). This is the
// jump-to-beat ergonomic Manim's `-n <k>` names as the single best iteration feature in any of these
// tools: without it, `make frame` needs a frame computed from a beat by hand every time.
const frameArg = argv[1] != null && argv[1] !== '' ? argv[1] : null;
const beatMatch = frameArg != null ? /^b(\d+)$/i.exec(frameArg.trim()) : null;
let single = frameArg != null && !beatMatch ? Number(frameArg) : null;
const dataArg = flagData ?? argv[2];
if (flagIdx >= 0 && flagData === undefined) {
  console.error('preview.mjs: --data needs a file path after it');
  process.exit(1);
}
if (dataArg && !fs.existsSync(path.resolve(dataArg))) {
  // Falling back to sample.json here is exactly how this bug hid: a missing scene must be loud.
  console.error(`preview.mjs: no such data file "${dataArg}"`);
  console.error('usage: make look D=formats/scene/<film>.json  (or make frame D=… N=<n>)');
  process.exit(1);
}
if (!format || !fs.existsSync(path.join(repoRoot, 'formats', format, 'scene.html'))) {
  console.error('usage: node scripts/author/preview.mjs <format> [frame] [data.json | --data f.json]');
  console.error('formats:', fs.readdirSync(path.join(repoRoot, 'formats')).join(', '));
  process.exit(1);
}
const dataUrl = dataArg
  ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/formats/${format}/sample.json`;

const { server, port } = await serveRepo();

const t0 = Date.now();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
// The viewport must be the canvas the renderer would actually produce, or a preview is a crop of a
// different video. This read `orientation`, which almost no scene declares, scenes declare `aspect`,
// so every 16:9 scene previewed into a 1080x1920 portrait window, silently (MISTAKES #46).
const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, decodeURIComponent(dataUrl).replace(/^\//, '')), 'utf8')); } catch { return {}; } })();
const [VW, VH] = sceneDims(cfg);
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
const err = await waitForEngine(page);
if (err) { console.error('SCENE ERROR:', err); process.exit(1); }
const meta = await page.evaluate(() => window.__engine.meta);
const { duration, stings, fps: F } = meta;

// Resolve bN now that the film's own duration is known: shotWindows cuts it into beats at the SAME
// joints the engine cuts on (cuts + seams; a sting is punctuation, not a boundary), no second copy of
// that math (core/timeline/junctions.js). b1 is always the first beat, even a film with zero cuts (one
// shot, one window).
if (beatMatch) {
  const beatIdx = parseInt(beatMatch[1], 10); // 1-based, matches how a storyboard numbers its beats
  const lowered = loadScene(structuredClone(cfg));
  const shots = shotWindows(junctionTable(marksOf(lowered)), duration);
  if (beatIdx < 1 || beatIdx > shots.length) {
    console.error(`preview.mjs: beat b${beatIdx} out of range, this film has ${shots.length} beat(s) (b1..b${shots.length})`);
    await browser.close(); server.close(); process.exit(1);
  }
  single = Math.round(shots[beatIdx - 1].start * F);
  console.log(`  b${beatIdx} → frame ${single} (${shots[beatIdx - 1].start.toFixed(2)}s of ${shots.length} beat(s))`);
}

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

// tiles keep the scene's own ratio: a fixed 300x533 squashed every landscape frame in the sheet
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
