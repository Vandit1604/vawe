// scripts/dev/evals.mjs: the eval harness (docs/EVALS.md). Renders each fixed brief under
// verify/evals/briefs/*.json to a labelled contact sheet, so a doctrine change can be judged
// before-vs-after by a human, the way another engine's skills-evals/compare.ts is judged. No score, no mp4:
// a sheet is small enough to commit and diff, a rendered video is not.
//
//   node scripts/dev/evals.mjs            # every brief
//   node scripts/dev/evals.mjs launch     # one brief only
//   make evals
//
// Reuses the same frame-grab approach as scripts/author/preview.mjs (headless puppeteer against
// scene.html, no encode): this is a contact sheet, not a full render, so it stays fast enough to run
// after every doctrine change.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BRIEFS_DIR = path.join(ROOT, 'verify/evals/briefs');
const BASELINE_DIR = path.join(ROOT, 'verify/evals/baseline');

const only = process.argv[2] || null;
const briefFiles = fs.readdirSync(BRIEFS_DIR).filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json`)
  .sort();
if (!briefFiles.length) {
  console.error(only ? `evals.mjs: no brief named "${only}" under verify/evals/briefs/` : 'evals.mjs: no briefs found under verify/evals/briefs/');
  process.exit(2);
}

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

const manifest = [];
for (const file of briefFiles) {
  const name = file.replace(/\.json$/, '');
  const t0 = Date.now();
  const dataUrl = `/verify/evals/briefs/${file}`;
  const cfg = JSON.parse(fs.readFileSync(path.join(BRIEFS_DIR, file), 'utf8'));
  const [VW, VH] = sceneDims(cfg);
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
  const err = await waitForEngine(page);
  if (err) { console.error(`✗ ${name}: SCENE ERROR: ${err}`); await page.close(); continue; }
  const meta = await page.evaluate(() => window.__engine.meta);
  const { duration, stings, fps: F } = meta;

  const outDir = path.join(BASELINE_DIR, name);
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = path.join(outDir, '.frames'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });

  const TILE_W = VW >= VH ? 340 : 240, TILE_H = Math.round(TILE_W * VH / VW);
  const ts = [0.3, duration * 0.3, ...stings.flatMap((s) => [s - 0.15]), duration * 0.6, duration * 0.85, duration - 0.15]
    .filter((t) => t >= 0 && t < duration).sort((a, b) => a - b);
  const uniq = ts.filter((t, i) => i === 0 || t - ts[i - 1] > 0.25).slice(0, 8);

  const grab = async (frame, file) => {
    await page.evaluate((n) => window.__engine.renderFrame(n), frame);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: VW, height: VH } });
  };
  for (let i = 0; i < uniq.length; i++) {
    const raw = path.join(tmp, `r${i}.png`);
    await grab(Math.round(uniq[i] * F), raw);
    const labeled = path.join(tmp, `${String(i).padStart(2, '0')}.png`);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
      `scale=${TILE_W}:${TILE_H},drawtext=text='${uniq[i].toFixed(1)}s':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65`, labeled]);
  }
  const cols = 4;
  const sheet = path.join(outDir, 'sheet.png');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(tmp, '%02d.png'), '-vf',
    `tile=${cols}x${Math.ceil(uniq.length / cols)}:padding=8:color=0x0a0a0c`, '-frames:v', '1', sheet]);
  fs.rmSync(tmp, { recursive: true, force: true });
  await page.close();

  manifest.push({ name, duration, aspect: cfg.aspect || null, frames: uniq.length, generatedAt: new Date().toISOString() });
  console.log(`✓ ${name}  ${duration.toFixed(1)}s  ${uniq.length} frames  → verify/evals/baseline/${name}/sheet.png  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
}

await browser.close(); server.close();

// Merge into the existing manifest (a single `--only` run must not drop the other five entries).
const manifestPath = path.join(BASELINE_DIR, 'manifest.json');
const prior = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
const merged = prior.filter((p) => !manifest.some((m) => m.name === p.name)).concat(manifest).sort((a, b) => a.name.localeCompare(b.name));
fs.mkdirSync(BASELINE_DIR, { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 1) + '\n');
console.log(`\n${manifest.length} brief(s) rendered, ${merged.length} in manifest.json.`);
