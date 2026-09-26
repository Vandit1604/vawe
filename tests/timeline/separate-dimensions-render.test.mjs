// tests/timeline/separate-dimensions-render.test.mjs: end-to-end proof for Separate Dimensions
// (core/timeline/sequence.js segmentAt, `ease` as a per-property map). Fixture:
// tests/fixtures/films/separate-dimensions-arc.json, a single dot travelling one motion key where
// x uses `linear` and y uses `easeOutCubic`.
//
// PROOF: a straight line from (0,0) to (800,400) crosses x=400 exactly where it crosses y=200 (both
// at progress 0.5). If x and y actually ride DIFFERENT curves, the dot is off that line everywhere
// except the two shared endpoints, which is what makes the path an ARC rather than a diagonal.
//
//   node --test tests/timeline/separate-dimensions-render.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;

test('Separate Dimensions: x (linear) and y (easeOutCubic) on the same keys trace an arc, not a line', async () => {
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html`
      + `?data=/tests/fixtures/films/separate-dimensions-arc.json&fps=${FPS}`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);

    const posAt = (seconds) => page.evaluate((fr) => {
      window.__engine.renderFrame(fr);
      const el = document.querySelector('[data-id="dot"]');
      const m = el && /translate3?d?\(([-\d.]+)px,\s*([-\d.]+)px/.exec(el.style.transform);
      return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
    }, Math.round(seconds * FPS));

    const start = await posAt(0), end = await posAt(1);
    assert.ok(start, 'the dot must render a transform at the first frame');
    assert.ok(end, 'the dot must render a transform at the last frame');

    // The endpoints hold exactly, same contract as a whole-segment ease.
    assert.equal(end.x - start.x, 800, `x travels the full 800px, got ${end.x - start.x}`);
    assert.equal(end.y - start.y, 400, `y travels the full 400px, got ${end.y - start.y}`);

    // Midway in TIME: x (linear) is exactly halfway, y (easeOutCubic) is already PAST halfway of its
    // own span. If both rode one shared progress (the pre-existing gap this feature closes), x and y
    // would land at the same fraction and the point would sit exactly on the straight line.
    const mid = await posAt(0.5);
    const dx = mid.x - start.x, dy = mid.y - start.y;
    assert.equal(dx, 400, `x (linear) is exactly halfway its 0-800 span at t=0.5, got ${dx}`);
    assert.ok(dy > 200, `y (easeOutCubic) is PAST halfway its 0-400 span at t=0.5, got ${dy}`);

    // The straight line from (0,0) to (800,400) has slope 0.5; the arc's midpoint is measurably off
    // it (a diagonal move would put dy at exactly dx*0.5 = 200).
    assert.ok(Math.abs(dy - dx * 0.5) > 20, `the path leaves the straight diagonal (dx=${dx}, dy=${dy})`);
  } finally {
    await closePage();
    await closeServer();
  }
});
