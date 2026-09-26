// tests/tracks/shape-tools-render.test.mjs: end-to-end proof for the two AE shape tools,
// trim paths (core/tracks/trim.js) and the repeater (core/fx/repeat.js), rendered as real frames.
// Fixture: tests/fixtures/shape-tools.fixture.json (a logo stroke that draws on with trim end 0->1
// and a rotating offset, and a 12-copy ring built by the repeater).
//
//   node --test tests/tracks/shape-tools-render.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;

test('trim paths draws on and slides its segment; the repeater builds a 12-copy staggered ring', async () => {
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html`
      + `?data=/tests/fixtures/shape-tools.fixture.json&fps=${FPS}`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);

    const sample = (seconds) => page.evaluate((fr) => {
      window.__engine.renderFrame(fr);
      const logo = document.querySelector('[data-id="logo"]');
      const p = logo && logo.querySelector('path');
      const ring = document.querySelector('[data-id="ring"]');
      const cells = ring ? [...ring.querySelectorAll('[data-repeat-cell]')] : [];
      return {
        dasharray: p && p.style.strokeDasharray,
        dashoffset: p && p.style.strokeDashoffset ? Number(p.style.strokeDashoffset) : null,
        cellCount: cells.length,
        cells: cells.map((c) => ({
          i: Number(c.getAttribute('data-repeat-cell')),
          rot: Number(/rotate\(([-\d.]+)deg\)/.exec(c.style.transform)[1]),
          opacity: Number(c.style.opacity),
        })),
      };
    }, Math.round(seconds * FPS));

    // ---- TRIM: the segment grows (draw-on) and its dashoffset keeps moving (offset spin) ----
    const t0 = await sample(0);
    assert.equal(t0.dasharray.split(',')[0].trim(), '0', 'at t=0 (trimEnd=0) nothing of the path is revealed');

    const t1 = await sample(1);
    const seg0 = Number(t0.dasharray.split(',')[0]);
    const seg1 = Number(t1.dasharray.split(',')[0]);
    assert.ok(seg1 > seg0, `the revealed segment must grow as trimEnd draws on: ${seg0} -> ${seg1}`);

    const t2 = await sample(2);
    assert.equal(t2.dasharray.split(',')[1].trim(), '0', 'at t=2 (trimEnd=1) the whole path is revealed, no gap');
    assert.notEqual(t1.dashoffset, t2.dashoffset, 'dashoffset keeps changing after the draw-on (the offset key still moves)');

    // ---- REPEATER: 12 copies, symmetric around the unmoved centre (`from: "center"`) ----
    assert.equal(t0.cellCount, 12, 'copies: 12 built cells, one per the fixture\'s `repeat.copies`');
    const byIndex = Object.fromEntries(t0.cells.map((c) => [c.i, c]));
    assert.equal(byIndex[5].rot, -15, 'the two middle cells straddle the unmoved centre symmetrically (k=-0.5)');
    assert.equal(byIndex[6].rot, 15, 'the two middle cells straddle the unmoved centre symmetrically (k=+0.5)');
    assert.equal(byIndex[0].rot, -165, 'the first cell is the far end of the fan, 5.5 steps of 30deg before centre');
    assert.equal(byIndex[11].rot, 165, 'the last cell mirrors the first: the fan is symmetric around the centre');

    // ---- REPEATER STAGGER: partway in, earlier-index cells have faded in further than later ones ----
    const half = Object.fromEntries((await sample(0.5)).cells.map((c) => [c.i, c]));
    assert.ok(half[0].opacity > half[6].opacity,
      'stagger: cell 0 (arrives first) is more opaque than cell 6 half a second in');
  } finally {
    await closePage();
    await closeServer();
  }
});
