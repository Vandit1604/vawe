// tests/dev/recreation-new.test.mjs: house-rule self-check, no framework.
//   node tests/dev/recreation-new.test.mjs
//
// Proves harness/dev/recreation-new.mjs (make dev-tool X=new TYPE=recreation) writes a working
// page.html (correct duration, a timeline that actually runs) plus a `see` pass on the reference, and
// prints exactly one next step, against the repo's own site/public/assets/sample.mp4 fixture.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/dev/recreation-new.mjs');
const REF = path.join(ROOT, 'site/public/assets/sample.mp4');
const NAME = `_test-${process.pid}`;
const outDir = path.join(ROOT, 'films/recreations', NAME);

try {
  const stdout = execFileSync('node', [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, TYPE: 'recreation', NAME, REF },
  });
  assert(new RegExp(`make next PAGE=films/recreations/${NAME}/page.html REF=${REF}`).test(stdout),
    `expected the one next-step line: ${stdout}`);

  const pagePath = path.join(outDir, 'page.html');
  assert(fs.existsSync(pagePath), 'page.html was not written');
  const html = fs.readFileSync(pagePath, 'utf8');
  assert(/<meta name="duration" content="7\.6/.test(html), `duration meta should read ~7.6s: ${html}`);
  assert(/timelineFromScript/.test(html), 'page should drive its timing sheet through timelineFromScript');
  assert(/--i/.test(html), 'page should split its hero text into letters keyed by --i');

  assert(fs.existsSync(path.join(outDir, 'see', 'index.md')), 'see pass did not write index.md');

  const { serveRepo, launchPage } = await import('../../harness/lib/render-harness.mjs');
  const { port, close } = await serveRepo({ root: ROOT });
  const { browser, page } = await launchPage({ width: 1920, height: 1080 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/films/recreations/${NAME}/page.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 200));
  const info = await page.evaluate(() => ({
    animations: document.getAnimations().length,
    letters: document.querySelectorAll('.letter').length,
  }));
  await browser.close();
  close();
  assert(errors.length === 0, `page.html threw: ${errors.join('; ')}`);
  assert(info.animations > 0, 'the timing sheet produced no animations');
  assert(info.letters > 0, 'the hero text was not split into letters');

  console.log('ok - recreation-new.mjs writes a working starter and one next step');
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
