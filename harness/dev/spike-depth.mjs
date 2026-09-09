// harness/dev/spike-depth.mjs: DOES `plane` PRODUCE PARALLAX, OR ONLY A SCALE?
//
// The two are easy to confuse and look similar on a still: a layer pushed back gets smaller either way.
// They part company the moment the CAMERA MOVES. Under a real depth the projection divides by the
// distance to the eye, so a near layer crosses the frame FASTER than a far one and the gap between them
// opens as the camera trucks. Under a scale every layer is still on one plane and the whole composition
// slides rigidly: same displacement, every layer, whatever z says.
//
// So the measurement is not "did the layer move". It is "did the layers move by DIFFERENT amounts, and
// by the amounts the lens predicts". A perspective projection at lens L puts a point at depth z on
// screen at L / (L - z) of its offset from the vanishing point, so trucking the camera by dx moves it by
//
//     dx · L / (L - z)
//
// which is 1.0 at z = 0, greater than 1 in front of the picture plane and less than 1 behind it. Three
// layers, three depths, one camera move; predict the three numbers, then read them off the real engine.
// Equal numbers mean a scale was built and the feature does not work.
//
// It drives the SHIPPING scene format rather than a hand-built page, the point is the engine's own rig,
// tracks and modifier stack, and a spike that rebuilt the construction by hand would prove the CSS works
// and say nothing about whether the engine reaches it. The scene is served from memory, so the spike
// leaves no file behind and cannot rot against one.
//
//   node harness/dev/spike-depth.mjs
import puppeteer from 'puppeteer';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';

const W = 1080, H = 1920;
const LENS = 1600;            // the default lens; no `p` and no `tilt.dist` is stated below
const TRUCK = 600;            // camera x from -300 to +300 across the film
const DEPTHS = { near: 300, mid: 0, far: -900 };

// One rect per depth, all three tilted so the frame is unambiguously a 3D one, and `anim: "none"` so no
// entrance is moving anything while we measure. Each carries an id, which is how the marker finds it.
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
await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${encodeURIComponent(SCENE_URL)}&fps=30`, { waitUntil: 'load' });
const err = await waitForEngine(page);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }

// A ZERO-SIZE MARKER at each layer's own centre, not the layer's bounding rect. Under perspective a
// rotated box projects to a trapezium whose axis-aligned bbox centre is NOT the projected centre, and it
// drifts as the camera moves, measuring that would fold a shape change into the displacement and report
// a parallax that is partly the tilt. A 1px marker rides the same transform and its rect IS the point.
// An `id` is scene bookkeeping and is not written to the DOM, so the layers are matched by ORDER, the
// engine builds `.hs-layer` elements in the order the JSON lists them.
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
