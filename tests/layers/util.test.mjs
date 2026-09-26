// tests/layers/util.test.mjs: the runnable self-check for checkDropped (core/layers/util.js), the
// refusal that stops an authored CSS value from being silently dropped by the browser's own parser.
//   node --test tests/layers/util.test.mjs
//
// WHY THIS RENDERS A REAL SCENE INSTEAD OF CALLING checkDropped DIRECTLY. droppedProps
// (core/type/sanitize-html.js) asks a real `document` element whether a value survives assignment,
// and returns [] outright when `document` is undefined (plain node has none). A direct unit test would
// therefore either fake a DOM (the "hand-rolled CSS grammar drifts from the real one" mistake this
// check exists to avoid) or test nothing. So this launches the real engine in a real Chromium page,
// the same way `make check GATE=snap-all` caught the reported bug live in the library (films/scene/one-word.json
// and films/scene/vawe-oblique.json both shipped a bare `"color": "accent"`/`"text"` and rendered
// silently wrong until this check existed).
//
// Fixtures are written under tests/fixtures/films/ with a `stagetest-` prefix (never films/scene/,
// which is real, gitignored film content this suite must not depend on) and removed in `after()`,
// pass or fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'tests/fixtures/films');

const written = [];
function writeFixture(name, color) {
  const rel = `stagetest-util-${name}.json`;
  fs.writeFileSync(path.join(SCENES, rel), JSON.stringify({
    module: 'scene', theme: 'vawe', aspect: '16:9', duration: 1,
    bg: [{ preset: 'plain', from: 0, to: 1 }],
    layers: [{ type: 'text', text: 'hi', x: 100, y: 100, w: 800, size: 96, color, duration: 1 }],
  }));
  written.push(rel);
  return rel;
}
after(() => { for (const f of written) { try { fs.unlinkSync(path.join(SCENES, f)); } catch { /* already gone */ } } });

test('a bare theme-token colour ("accent" for var(--accent)) is refused, named, with the var() hint', async () => {
  const rel = writeFixture('bad-color', 'accent');
  const { server, port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/tests/fixtures/films/${rel}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.ok(err, 'a bare colour token must not render silently: the engine should report an error');
    assert.match(err, /the browser drops this css declaration, color: accent/);
    assert.match(err, /did you mean `var\(--accent\)`\?/);
  } finally {
    await closePage(); closeServer();
  }
});

test('the same layer with the var() form renders clean', async () => {
  const rel = writeFixture('good-color', 'var(--accent)');
  const { server, port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/tests/fixtures/films/${rel}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `a valid var() colour must not be refused, got: ${err}`);
  } finally {
    await closePage(); closeServer();
  }
});
