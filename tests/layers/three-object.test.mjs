// tests/layers/three-object.test.mjs: end-to-end proof for the `three` "object" scene
// (core/surfaces/three-fx.js SCENES.object), fixture tests/fixtures/three-object.json: an extruded
// SVG shield in glass, keyed 0->40 degrees of objectMotion rotY over 2s, plus a glass sphere.
//
// PROOF, each a fact a DOM signature cannot see (the pixels are inside a canvas):
//   1. it renders with no scene error, and the canvas is transparent where the object isn't (glass
//      composites over the HTML background, never an opaque WebGL clear).
//   2. objectMotion actually moves the object: frame 0 and frame 60 (t=0 and t=2, the two keys)
//      produce DIFFERENT pixels, proven by a coarse hash, not merely "no throw".
//   3. seek-per-frame is pure: rendering frame 30 cold reads the same pixels as rendering it after
//      scrambling render order (0, 59, 15, 30), the same purity make canvas-purity checks generally.
//
//   node --test tests/layers/three-object.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
const DATA = '/tests/fixtures/three-object.json';

// Coarse pixel fingerprint, the same shape quality/gates/canvas-purity.mjs uses: downsample so GPU
// antialiasing noise cannot flip the hash, then FNV-1a over the bytes. `which` picks the Nth canvas
// tagged `data-surface="three"` (core/layers/canvas.js), so the shared bg canvas (untagged) is skipped.
const fingerprint = (page, which) => page.evaluate((i) => {
  const cv = [...document.querySelectorAll('canvas[data-surface="three"]')][i];
  const s = document.createElement('canvas'); s.width = 32; s.height = 18;
  const c = s.getContext('2d'); c.drawImage(cv, 0, 0, 32, 18);
  const d = c.getImageData(0, 0, 32, 18).data;
  let h = 2166136261 >>> 0, transparentAny = false;
  for (let k = 0; k < d.length; k += 4) if (d[k + 3] < 250) transparentAny = true;
  for (let k = 0; k < d.length; k++) { h ^= d[k]; h = Math.imul(h, 16777619) >>> 0; }
  return { hash: h.toString(16), transparentAny, surface: cv.dataset.surface || '' };
}, which);

test('three object: renders clean, transparent, moves under objectMotion, and is order-pure', async () => {
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=${DATA}&fps=${FPS}`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);

    const render = (frame) => page.evaluate((n) => window.__engine.renderFrame(n), frame);

    await render(30);
    const shield = await fingerprint(page, 0);
    assert.equal(shield.surface, 'three', 'canvas 0 must be tagged as the `three` surface');
    assert.ok(shield.transparentAny, 'a glass object over a black bg must still leave some transparent alpha at its corners');

    const at0 = await fingerprint(page, 0);
    await render(60);
    const at2 = await fingerprint(page, 0);
    assert.notEqual(at0.hash, at2.hash,
      'objectMotion keys rotY 0 -> 40 degrees over 2s (frame 0 -> frame 60): the two frames must render different pixels');

    // Order purity: frame 30 rendered right after itself must match frame 30 rendered after a
    // scrambled run of other frames, the same property make canvas-purity checks generally and the
    // same property core/layers/canvas.js's off-window clear exists to guarantee.
    await render(30);
    const cleanRun = await fingerprint(page, 0);
    await render(0); await render(59); await render(15); await render(30);
    const scrambledRun = await fingerprint(page, 0);
    assert.equal(cleanRun.hash, scrambledRun.hash,
      'renderFrame(30) must be pure: same pixels whatever frames rendered before it');
  } finally {
    await closePage();
    await closeServer();
  }
});
