// tests/layers/glow-pure-light.test.mjs: the runnable self-check for the "dark pill behind the
// words" bug (core/layers/util.js chipBox / core/layers/svg.js). `glow` on a text layer with no chip
// (no bg/border/shadow/elevation) used to paint a box-shadow around the whole line's bounding box,
// a soft rectangle behind the glyphs rather than light on them. A text layer that ALSO asks for a
// chip (`bg`) legitimately wants a glowing BOX, and an svg layer's glow was silently unread.
// Fixture: tests/fixtures/glow-pure-light.json.
//   node --test tests/layers/glow-pure-light.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = '/tests/fixtures/glow-pure-light.json';

test('bare text glow is a text-shadow on the glyphs, a chip glow stays a box-shadow, and svg glow is wired', async () => {
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=${DATA}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);

    const styleOf = (id) => page.evaluate((i) => {
      const el = document.querySelector(`[data-id="${i}"]`);
      const svg = el && el.querySelector('svg');
      const s = el && getComputedStyle(el);
      return { boxShadow: s?.boxShadow || '', textShadow: s?.textShadow || '',
        svgFilter: svg ? getComputedStyle(svg).filter : null };
    }, id);

    const bare = await styleOf('bare');
    assert.notEqual(bare.textShadow, 'none', 'a bare glow must land on textShadow, not go missing');
    assert.equal(bare.boxShadow, 'none', 'a bare (chipless) text glow must not paint a box-shadow (the "dark pill" bug)');

    const chip = await styleOf('chip');
    assert.notEqual(chip.boxShadow, 'none', 'a text layer that also sets `bg` asked for a chip: its glow stays a box-shadow');

    const mark = await styleOf('mark');
    assert.ok(mark.svgFilter && mark.svgFilter.includes('drop-shadow'),
      `an svg layer's glow must render (a drop-shadow on the <svg>), got: ${mark.svgFilter}`);
  } finally {
    await closePage(); await closeServer();
  }
});
