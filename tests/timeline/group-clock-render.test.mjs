// tests/timeline/group-clock-render.test.mjs: end-to-end proof for a GROUP's local clock
// (core/timeline/group-clock.js, core/layers/util.js resolveGroupWindow, core/tracks/index.js
// runTracks). Fixture: tests/fixtures/films/nested-group-clock.json, a group whose `clock` plays a
// 1s local cycle (`x: 0 -> 800`, linear) three times over its own 3s outer window.
//
// PROOF: the child's x position at the same PHASE of each of the three cycles (0.5s into cycle 1, 2
// and 3, i.e. film seconds 0.5, 1.5, 2.5) must be identical. Without a group clock, a child's motion
// track runs once across the group's whole 3s window and never repeats; this is the difference a
// loop makes and the one no snapshot of an unrelated scene can catch.
//
//   node --test tests/timeline/group-clock-render.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;

test('a group clock loops its children: the same phase of each cycle lands at the same x', async () => {
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html`
      + `?data=/tests/fixtures/films/nested-group-clock.json&fps=${FPS}`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);

    const xAt = (seconds) => page.evaluate((fr) => {
      window.__engine.renderFrame(fr);
      const el = document.querySelector('[data-id="mover"]');
      const m = el && /translate3?d?\(([-\d.]+)px/.exec(el.style.transform);
      return m ? Number(m[1]) : null;
    }, Math.round(seconds * FPS));

    // Half a cycle into each of the three 1s loops (film seconds 0.5, 1.5, 2.5): the LOCAL clock puts
    // all three at the cycle's own midpoint, x=400, byte-identical because runTracks remaps each back
    // to the same local second before layerTime ever sees it.
    const cycle1 = await xAt(0.5);
    const cycle2 = await xAt(1.5);
    const cycle3 = await xAt(2.5);
    assert.ok(cycle1 != null, 'the mover layer must render a transform');
    assert.equal(cycle1, 400, `cycle 1 midpoint: expected x=400, got ${cycle1}`);
    assert.equal(cycle2, cycle1, `cycle 2 midpoint must match cycle 1 (the loop), got ${cycle2} vs ${cycle1}`);
    assert.equal(cycle3, cycle1, `cycle 3 midpoint must match cycle 1 (the loop), got ${cycle3} vs ${cycle1}`);

    // Each cycle still starts its OWN local clock at 0: the very first frame of cycle 2 (t=1.0) reads
    // the same x as the very first frame of cycle 1 (t=0.0), not the continuation a non-looping motion
    // track would have produced (which would keep climbing towards its single authored end value).
    const start1 = await xAt(0);
    const start2 = await xAt(1.0);
    assert.equal(start2, start1, `cycle 2's own start must match cycle 1's, got ${start2} vs ${start1}`);
  } finally {
    await closePage();
    await closeServer();
  }
});
