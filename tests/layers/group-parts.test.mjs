// core/layers/group-parts.test.mjs: the runnable self-check for `parts` on a GROUP CHILD.
//
// Bug: applyGsapHooks (films/scene/scene.js) builds every GSAP-driven hook (parts, fx, motionPath,
// physics, splitText, morph) as a paused tween, but it was called only from buildLayer, which runs
// for TOP-LEVEL layers. addGroupChild (core/layers/util.js) builds a group child straight into
// `extra[]` and never passes it through applyGsapHooks, so a group child's `parts` entrance never ran:
// the child rendered its POPPED-IN state from frame 0 instead of appearing at its authored delay. A
// sibling child's `typing` still worked because typing is driven per-frame off data-* by driveClips,
// which extra[] DOES join (films/scene/scene.js:760) - so the bug read as "typing is fine, parts is
// broken" rather than "hooks never run on a child". Fixed by calling applyGsapHooks for every entry in
// `extra` before it joins `layers`.
//
//   node --test core/layers/group-parts.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Fixture lives under tests/fixtures/films/, never films/scene/ (real, gitignored film content this
// suite must not depend on); scene.html itself, the engine shell, stays served from films/scene/.
const SCENES = path.join(ROOT, 'tests/fixtures/films');
const REL = 'stagetest-group-parts.json';

const SCENE = {
  module: 'scene', theme: 'vawe', aspect: '16:9', duration: 2,
  bg: [{ preset: 'plain', from: 0, to: 2 }],
  layers: [{
    type: 'group', x: 100, y: 100, w: 800, h: 400, layout: 'free', duration: 2,
    children: [{
      type: 'html', x: 0, y: 0, w: 400, h: 200,
      html: '<div data-part="done" style="font-size:48px">added 1 package</div>',
      parts: [{ select: '[data-part="done"]', anim: 'popIn', delay: 1.0 }],
    }],
  }],
};

after(() => { try { fs.unlinkSync(path.join(SCENES, REL)); } catch { /* already gone */ } });

test('a group child\'s `parts` entrance runs: hidden before its delay, visible after', async () => {
  fs.writeFileSync(path.join(SCENES, REL), JSON.stringify(SCENE));
  const { port, close: closeServer } = await serveRepo({ root: ROOT });
  const { page, close: closePage } = await launchPage({ width: 1920, height: 1080 });
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/tests/fixtures/films/${REL}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
    assert.equal(err, null, `scene must build clean, got: ${err}`);
    const opacityAt = (n) => page.evaluate((fr) => {
      window.__engine.renderFrame(fr);
      const el = document.querySelector('[data-part="done"]');
      return el ? getComputedStyle(el).opacity : null;
    }, n);
    const before = await opacityAt(15);  // t = 0.5s, before the 1.0s delay: must be hidden
    const after_ = await opacityAt(45);  // t = 1.5s, after the pop-in: must be visible
    assert.ok(before != null, 'the [data-part] element must exist');
    assert.equal(Number(before), 0, `parts entrance must not have fired yet at t=0.5s, got opacity ${before}`);
    assert.equal(Number(after_), 1, `parts entrance must have fired by t=1.5s, got opacity ${after_}`);
  } finally {
    await closePage(); closeServer();
  }
});
