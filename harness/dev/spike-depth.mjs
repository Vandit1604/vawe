import puppeteer from 'puppeteer';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';

const W = 1080, H = 1920;
const LENS = 1600;            // the default lens; no `p` and no `tilt.dist` is stated below
const TRUCK = 600;            // camera x from -300 to +300 across the film
const DEPTHS = { near: 300, mid: 0, far: -900 };

const scene = {
  module: 'scene', theme: 'default', duration: 4, audio: { silent: true },
  bg: [{ t: 0, preset: 'aurora' }],
  camera: [{ t: 0, s: 1, x: -TRUCK / 2, y: 0 }, { t: 4, s: 1, x: TRUCK / 2, y: 0 }],
  layers: Object.entries(DEPTHS).map(([id, z], i) => ({
    id, type: 'rect', x: 140 + i * 250, y: 400 + i * 460, w: 300, h: 200,
    fill: ['#39f', '#f93', '#3f9'][i], start: 0, duration: 4, anim: 'none',
    modifiers: [{ tilt: { y: 18 } }, ...(z === 0 ? [] : [{ plane: z }])],
  })),
};

const SCENE_URL = '/__spike-depth.json';
const { server, port } = await serveRepo({
  route: (req, res) => {
    if (decodeURIComponent(req.url.split('?')[0]) !== SCENE_URL) return false;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scene));
    return true;
  },
});

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });  // what the Go capture emulates
await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=${encodeURIComponent(SCENE_URL)}&fps=30`, { waitUntil: 'load' });
const err = await waitForEngine(page);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }

await page.evaluate((ids) => {
  const els = [...document.querySelectorAll('.hs-layer')];
  ids.forEach((id, i) => {
    const el = els[i];
    const m = document.createElement('i');
    m.dataset.mark = id;
    m.style.cssText = 'position:absolute;left:50%;top:50%;width:1px;height:1px';
    el.appendChild(m);
  });
}, Object.keys(DEPTHS));

const centres = async (f) => {
  await page.evaluate((n) => window.__engine.renderFrame(n), f);
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-mark]')]
    .map((m) => { const r = m.getBoundingClientRect(); return [m.dataset.mark, r.left + r.width / 2]; })));
};

const A = await centres(0), B = await centres(119);   // the two ends of the truck
await browser.close(); server.close();

let fail = 0;
console.log(`lens ${LENS}px · camera trucks ${TRUCK}px between frame 0 and frame 119\n`);
console.log('layer      z       moved      predicted   ratio vs z=0');
for (const [id, z] of Object.entries(DEPTHS)) {
  const moved = B[id] - A[id];
  const want = TRUCK * (LENS / (LENS - z));
  const ok = Math.abs(moved - want) < 1.5;
  if (!ok) fail++;
  console.log(`${id.padEnd(9)} ${String(z).padStart(5)}   ${moved.toFixed(2).padStart(8)}   ${want.toFixed(2).padStart(9)}   `
    + `${(moved / TRUCK).toFixed(4)}  ${ok ? '✓' : '✗ off by ' + (moved - want).toFixed(2)}`);
}
const spread = Math.abs((B.near - A.near) - (B.far - A.far));
console.log(`\nnear vs far: ${spread.toFixed(2)}px of differential displacement across the move.`);
if (spread < 1) {
  console.error('✗ NO PARALLAX: every layer moved by the same amount. That is a scale, not a depth.');
  process.exit(1);
}
if (fail) { console.error(`✗ ${fail} layer(s) missed the predicted displacement`); process.exit(1); }
console.log('✓ parallax: each depth moves by lens/(lens - z), so the layers are genuinely non-coplanar.');
