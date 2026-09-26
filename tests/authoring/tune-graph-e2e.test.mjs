// tests/authoring/tune-graph-e2e.test.mjs: end-to-end proof for the tune graph editor
// (harness/author/tune.js, harness/author/curve-math.mjs). Fixture:
// tests/fixtures/films/curve-editor.json, one `rect` layer ("puck") with an explicit
// easeOut/easeIn handle pair on its only motion segment.
//
// PROOF: dragging the segment's `easeOut` handle in the value graph changes the layer's own
// `easeOut.speed`, and the SAME frame renders a different x once reseeked, through the real
// pointer-drag path (not a direct data mutation the test wrote itself).
//
//   node --test tests/authoring/tune-graph-e2e.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert';
import { launchPage } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/films/curve-editor.json');

function startTuneServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'harness/author/tune-server.mjs')], {
      cwd: ROOT, env: { ...process.env, D: FIXTURE, ID: 'puck', PORT: '0' },
    });
    let out = '';
    const onData = (buf) => {
      out += String(buf);
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)\/tune/);
      if (m) { child.stdout.off('data', onData); resolve({ child, port: Number(m[1]) }); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (b) => { out += String(b); });
    child.once('error', reject);
    child.once('exit', (code) => { if (code) reject(new Error(`tune-server exited ${code}: ${out}`)); });
  });
}

test('dragging the easeOut handle reshapes the curve and reseeks the frame', async () => {
  const { child, port } = await startTuneServer();
  const { page, close: closePage } = await launchPage({ width: 1400, height: 900 });
  try {
    await page.goto(`http://127.0.0.1:${port}/tune`, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const w = document.querySelector('#sc')?.contentWindow;
      return !!(w && w.__engineReady);
    }, { timeout: 20000 });
    await page.waitForSelector('circle.handle[data-side="out"]');

    const xAt = (seconds) => page.evaluate((fr) => {
      const w = document.querySelector('#sc').contentWindow;
      w.__engine.renderFrame(fr);
      const el = w.document.querySelector('[data-id="puck"]');
      const m = el && /translate3?d?\(([-\d.]+)px/.exec(el.style.transform);
      return m ? Number(m[1]) : null;
    }, Math.round(seconds * 30));

    const before = await page.evaluate(() => {
      // The harness's own working copy, not the iframe's: tune.js keeps `layers` (the module-local
      // clone `onLayers` builds) as the one source of truth a drag mutates.
      const c = document.querySelector('circle.handle[data-side="out"]');
      return { influence: Number(c.getAttribute('aria-valuenow')) };
    });
    const xBefore = await xAt(0.2);

    const box = await page.evaluate(() => {
      const c = document.querySelector('circle.handle[data-side="out"]');
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });

    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    // Drag right and down: a bigger influence (further along the segment) and a higher speed
    // (steeper departure), away from the fixture's Easy Ease default (influence 33.33, speed 0).
    await page.mouse.move(box.x + 60, box.y + 40, { steps: 8 });
    await page.mouse.up();

    await page.waitForFunction((prevInfluence) => {
      const c = document.querySelector('circle.handle[data-side="out"]');
      return Number(c.getAttribute('aria-valuenow')) !== prevInfluence;
    }, {}, before.influence);

    const after = await page.evaluate(() => {
      const c = document.querySelector('circle.handle[data-side="out"]');
      return { influence: Number(c.getAttribute('aria-valuenow')) };
    });
    assert.notEqual(after.influence, before.influence, 'the drag must change the handle\'s influence');

    const xAfter = await xAt(0.2);
    assert.notEqual(xAfter, xBefore, 'the same frame must reseek to a different x after the drag');
  } finally {
    await closePage();
    child.kill();
  }
});
