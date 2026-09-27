// tests/engine/pipeline-parity.test.mjs: proves the shared produced-baseline pass
// (core/engine/pipeline.js `runProducePass`, wired into core/engine/expand.js `loadScene` for every
// Node gate AND core/engine/boot.js `resolveThemeAndBake` for the real browser render) actually
// produces the SAME decisions on both paths, for real tracked films, not just a hand-written fixture.
//
// Before this pass existed, `lowerScene` ran BEFORE `produceBaseline` in Node (loadScene) but AFTER it
// in the browser (films/scene/scene.js build(), called from core/engine/boot.js resolveThemeAndBake),
// and produceBaseline never ran on the Node path at all. A gate reading a transitions-only scene could
// approve a DIFFERENT cut list than the one the browser actually rendered.
//
// Scope: compares only the fields the produced baseline decides (cuts/seams/stings, sceneUnits, and
// each layer's anticipate/size-role/_finish), never raw pixel coordinates: `resolveCoords` is
// browser-only (needs a real frame size) and legitimately runs only on the render path, so `L.x`/`L.y`
// differ between the two by design (core/engine/pipeline.js's own header explains why): comparing
// those would be asserting a difference the fix does not remove and was never meant to.
//
//   node tests/engine/pipeline-parity.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadScene, expandScene } from '../../core/engine/expand.js';
import { serveRepo, launchPage, waitForEngine, bootPathFor, REPO_ROOT } from '../../harness/lib/render-harness.mjs';

// Three real, tracked films that already author `transitions[]` (the exact surface the order bug
// mishandled) and declare a theme, small enough to boot fast.
const FILMS = ['hero-site.json', 'seam-demo.json', 'paint-demo.json'];

function flatten(ls, out = []) {
  for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    out.push(L);
    flatten(L.children, out);
  }
  return out;
}

// The fields the shared produced-baseline pass decides, and nothing a layout-only step (resolveCoords)
// would change. Order-sensitive: both paths walk the same expanded layer tree in the same order.
function producedFieldsOf(data) {
  return {
    cuts: (data.cuts || []).map((c) => ({ t: c.t, style: c.style })),
    seams: (data.seams || []).map((s) => ({ t: s.t, fx: s.fx })),
    stings: (data.stings || []).map((s) => ({ t: s.t, fx: s.fx })),
    sceneUnits: data.sceneUnits ?? null,
    layers: flatten(data.layers).map((L) => ({
      id: L.id ?? null,
      type: L.type ?? null,
      size: typeof L.size === 'number' ? L.size : null,
      anticipate: L.anticipate ?? null,
      finish: !!L._finish,
    })),
  };
}

const { server, port, close: closeServer } = await serveRepo({ root: REPO_ROOT });
try {
  for (const name of FILMS) {
    const abs = path.join(REPO_ROOT, 'films/scene', name);
    const raw = fs.readFileSync(abs, 'utf8');
    const json = JSON.parse(raw);

    // Node/gate path: core/engine/expand.js loadScene, what every gate and script calls.
    const nodeScene = loadScene(structuredClone(json));
    const nodeFields = producedFieldsOf(nodeScene);

    // Browser render path: the real scene.html page, boot.js -> films/scene/scene.js build().
    // bootPathFor mirrors internal/render/expand.go: sugar (block/beat/comp) is pre-expanded to a
    // scratch file before the browser ever fetches it, exactly as the real Go render does.
    const expanded = expandScene(structuredClone(json));
    const rel = path.relative(REPO_ROOT, abs);
    const bootRel = bootPathFor(REPO_ROOT, raw, expanded, rel);
    const { page, close: closePage } = await launchPage({ width: 1080, height: 1920 });
    let browserFields;
    try {
      await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/${bootRel}&fps=30`, { waitUntil: 'load' });
      const err = await waitForEngine(page);
      assert.equal(err, null, `${name}: engine error booting the real render path: ${err}`);
      // JSON round-tripped INSIDE the page: puppeteer's own structured-clone serialization drops deep
      // object properties past a default depth (page.evaluate returning window.__engine.data directly
      // came back with every layer a bare {}), so the page does its own stringify instead.
      const browserData = JSON.parse(await page.evaluate(() => JSON.stringify(window.__engine.data)));
      browserFields = producedFieldsOf(browserData);
    } finally {
      await closePage();
    }

    assert.deepEqual(browserFields, nodeFields,
      `${name}: the Node/gate path and the browser render path produced different cuts/sceneUnits/`
      + `layer baselines. A gate checking this film would be approving a different scene than the `
      + `one that renders.`);
  }
} finally {
  closeServer();
}

console.log('pipeline-parity.test.mjs: ok');
