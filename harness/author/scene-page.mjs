import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneDims } from '../../core/layout/safe.js';
import { serveRepo, launchPage, waitForEngine } from '../lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function openScene(dataArg, opts = {}) {
  const scale = opts.scale ?? 1;
  const fps = opts.fps ?? 30;
  const data = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
  const format = data.module;
  if (!format || !fs.existsSync(path.join(ROOT, 'films', format, 'scene.html'))) {
    throw new Error(`unknown module "${format}" in ${dataArg}`);
  }
  const dataUrl = '/' + path.relative(ROOT, path.resolve(dataArg)).split(path.sep).join('/');

  const { server, port } = await serveRepo();

  const [VW, VH] = sceneDims(data);
  const { browser, page } = await launchPage({ width: VW, height: VH, scale,
    args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
      `--force-device-scale-factor=${scale}`] });
  await page.goto(`http://127.0.0.1:${port}/films/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=${fps}`, { waitUntil: 'load' });
  const err = await waitForEngine(page);
  if (err) { await browser.close(); server.close(); throw new Error(`SCENE ERROR: ${err}`); }
  const meta = await page.evaluate(() => window.__engine.meta);

  return {
    data, meta, width: VW, height: VH, page,
    async grab(t, file) {
      await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(t * meta.fps));
      await page.evaluate(() => (window.__realRaf ? new Promise((r) => __realRaf(() => __realRaf(r))) : true));
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: VW, height: VH } });
      return file;
    },
    async close() { await browser.close(); server.close(); },
  };
}
