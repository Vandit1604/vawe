// scripts/author/scene-page.mjs: open a scene in a headless browser and hand back a frame grabber.
//
// Every tool that wants to LOOK at a scene without rendering an mp4 needs the same twenty lines: serve
// the repo, boot scene.html against the JSON, wait for __engineReady, read meta, then seek and shoot.
// `beats.mjs` had them, `styleframes.mjs` was about to have them again, and a second copy is how the
// two drift until one of them is quietly capturing at the wrong scale.
//
//   const page = await openScene('formats/scene/x.json', { scale: 2 });
//   await page.grab(3.2, '/tmp/a.png');   // seconds → PNG
//   await page.close();
//
// That debt is paid: `beats.mjs` and `reveal.mjs` both boot through here now, and neither owns a server
// or a browser any more. What that buys beyond one copy of the code: `scripts/author/sheets.mjs` builds
// BOTH contact sheets off ONE open page, because the expensive thing is no longer per-tool.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneDims } from '../../core/safe.js';
import { serveRepo, launchPage, waitForEngine } from '../lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function openScene(dataArg, opts = {}) {
  const scale = opts.scale ?? 1;
  const fps = opts.fps ?? 30;
  const data = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
  const format = data.module;
  if (!format || !fs.existsSync(path.join(ROOT, 'formats', format, 'scene.html'))) {
    throw new Error(`unknown module "${format}" in ${dataArg}`);
  }
  const dataUrl = '/' + path.relative(ROOT, path.resolve(dataArg)).split(path.sep).join('/');

  const { server, port } = await serveRepo();

  const [VW, VH] = sceneDims(data);
  const { browser, page } = await launchPage({ width: VW, height: VH, scale,
    args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
      `--force-device-scale-factor=${scale}`] });
  await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=${fps}`, { waitUntil: 'load' });
  const err = await waitForEngine(page);
  if (err) { await browser.close(); server.close(); throw new Error(`SCENE ERROR: ${err}`); }
  const meta = await page.evaluate(() => window.__engine.meta);

  return {
    data, meta, width: VW, height: VH, page,
    // seek to a TIME in seconds and write a PNG. The two real animation frames are the same settle the
    // renderer waits for: without them the screenshot can land before the compositor has committed.
    async grab(t, file) {
      await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(t * meta.fps));
      await page.evaluate(() => (window.__realRaf ? new Promise((r) => __realRaf(() => __realRaf(r))) : true));
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: VW, height: VH } });
      return file;
    },
    async close() { await browser.close(); server.close(); },
  };
}
