// tests/timeline/cut-split-parity-render.test.mjs: end-to-end proof that a per-character split +
// preset text layer takes a scene-root cut's EXIT (films/scene/scene.js driveBeatUnits) exactly like
// an adjacent plain text layer, not a smaller or absent move. Investigated as a reported engine fault
// ("a split+preset layer does not translate on a scene-root cut's exit") and could not be reproduced:
// a split layer attaches under the SAME beat wrapper (`beatWrap[bi]`, films/scene/scene.js buildLayer)
// the cut styles, so the ancestor's transform/opacity composes over it exactly as it does over any
// other `.hs-layer`, regardless of the `.ku` unit spans `splitText` (core/type/type.js) writes inside
// it. This test is the regression guard for that finding: two layers at the same start/duration, one
// plain and one split+preset, must move and fade by the identical amount at every sampled frame of the
// cut window.
//
//   node --test tests/timeline/cut-split-parity-render.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;

test('a split+preset text layer rides a scene-root cut\'s exit (position and opacity) exactly like a plain sibling layer', async () => {
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html`
      + `?data=/tests/fixtures/films/cut-split-parity.json&fps=${FPS}`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);

    const sampleAt = (seconds) => page.evaluate((fr) => {
      window.__engine.renderFrame(fr);
      const of = (id) => {
        const el = document.querySelector(`[data-id="${id}"]`);
        const r = el.getBoundingClientRect();
        let opacity = 1;
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) opacity *= parseFloat(getComputedStyle(a).opacity || '1');
        return { y: r.y, opacity };
      };
      return { plain: of('plain1'), split: of('split1') };
    }, Math.round(seconds * FPS));

    // authored 200px apart (plain1.y=200, split1.y=400) at build; that gap must survive the cut
    // untouched at every sampled frame, in BOTH position and opacity, if the ancestor's exit style is
    // reaching the split layer exactly as it reaches the plain one.
    for (const t of [1.0, 2.05, 2.15, 2.25, 2.35]) {
      const { plain, split } = await sampleAt(t);
      assert.ok(Math.abs((split.y - plain.y) - 200) < 0.5,
        `t=${t}s: split1.y - plain1.y should stay 200px apart (a plain ancestor offset), got ${(split.y - plain.y).toFixed(2)}`);
      assert.ok(Math.abs(split.opacity - plain.opacity) < 0.01,
        `t=${t}s: split1 and plain1 should carry the same effective opacity under the cut, got plain=${plain.opacity.toFixed(3)} split=${split.opacity.toFixed(3)}`);
    }
  } finally {
    await closePage();
    await closeServer();
  }
});

console.log('cut-split-parity-render.test.mjs: ok');
