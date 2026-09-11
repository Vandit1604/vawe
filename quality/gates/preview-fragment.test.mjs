// quality/gates/preview-fragment.test.mjs: asserts on the two pure halves of build fix 7 (before render,
// a preview must prove what the film will actually do): the SANITISER PARITY (`make preview` running a
// fragment through the same `scopeStyles(sanitizeHtml(...))` the film's html layer uses, core/layers/html.js)
// and the REAL LAYER BOX lookup + clipping check (harness/lib/film-layer-box.mjs, harness/author/screen.mjs
// clipAgainstBox). No browser, no render: only the string/geometry halves that do not need one.
//   node quality/gates/preview-fragment.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sanitizeHtml, scopeStyles } from '../../core/type/sanitize-html.js';
import { findFilmLayerBox } from '../../harness/lib/film-layer-box.mjs';
import { clipAgainstBox } from '../../harness/author/screen.mjs';

// ---- sanitiser parity: what the FILM drops, the preview must drop too ----------------------------
{
  const dropped = `<div><iframe src="//evil.example/x"></iframe><p onclick="alert(1)">hi</p></div>`;
  const previewed = scopeStyles(sanitizeHtml(dropped));
  assert.ok(!previewed.includes('<iframe'), 'an embedding element the film sanitiser strips must not survive into the preview');
  assert.ok(!previewed.includes('onclick'), 'an on* handler the film sanitiser strips must not survive into the preview');
  assert.ok(previewed.includes('<p'), 'the rest of the fragment (not the dropped element) must still render');
}
{
  // the earlier defect this parity fix exists to prevent: an asset path served under a repo root is
  // NOT an escape and must survive both the real sanitiser and the preview built on top of it.
  const kept = `<img src="/assets/logo.png">`;
  const previewed = scopeStyles(sanitizeHtml(kept));
  assert.ok(previewed.includes('/assets/logo.png'), 'a served-root asset src must not be stripped as if it were an escaping url');
}

// ---- findFilmLayerBox: the real assembled box, not the generic preview box ------------------------
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'film-layer-box-'));
const fragPath = path.join(dir, 'card.html');
fs.writeFileSync(fragPath, '<div>card</div>');
{
  const filmPath = path.join(dir, 'x.json');
  fs.writeFileSync(filmPath, JSON.stringify({
    module: 'scene', aspect: '16:9',
    layers: [{ id: 'a', type: 'html', src: 'card.html', x: 100, y: 200, w: 400, h: 300 }],
  }));
  const box = findFilmLayerBox(dir, fragPath, null);
  assert.ok(box, 'a film beside the fragment naming it as a layer src must be found without --film');
  assert.equal(box.film, 'x.json');
  assert.deepEqual({ x: box.x, y: box.y, w: box.w, h: box.h }, { x: 100, y: 200, w: 400, h: 300 });
  assert.equal(box.W, 1920); assert.equal(box.H, 1080);
}
{
  const other = path.join(dir, 'unused.html');
  fs.writeFileSync(other, '<div>x</div>');
  assert.equal(findFilmLayerBox(dir, other, null), null, 'a fragment no film references yet must report null, not a false box');
}
{
  // a pinned layer (a relative-form box) must resolve through the SAME grammar boot.js uses, not a
  // second hand-derivation of pins/percentages.
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'film-layer-box-pin-'));
  const frag2 = path.join(dir2, 'panel.html');
  fs.writeFileSync(frag2, '<div>panel</div>');
  fs.writeFileSync(path.join(dir2, 'y.json'), JSON.stringify({
    module: 'scene', aspect: '16:9',
    layers: [{ id: 'b', type: 'html', src: 'panel.html', pin: 'bottom', w: 600 }],
  }));
  const box = findFilmLayerBox(dir2, frag2, null);
  assert.ok(box, 'a pinned layer must still resolve to a real box');
  assert.equal(box.w, 600);
  assert.ok(box.y > 0 && box.y < 1080, 'pin:"bottom" resolves against the safe box, not left at 0');
}

// ---- clipAgainstBox: a fragment that fits the 1920x1080 canvas but overruns its SMALLER assembled box
{
  const boxes = [{ tag: 'p', text: 'headline', x: 50, y: 50, w: 500, h: 80 }]; // fits 1920x1080 easily
  const layerBox = { x: 100, y: 100, w: 300, h: 200 }; // the film's real, smaller box
  const findings = clipAgainstBox(boxes, layerBox);
  assert.equal(findings.length, 1, 'an element inside the full canvas but outside its smaller layer box must be flagged');
  assert.equal(findings[0].severity, 'layer-box');
  assert.ok(findings[0].amounts.some((a) => /past its left edge/.test(a)));
}
{
  const boxes = [{ tag: 'p', text: 'ok', x: 150, y: 150, w: 100, h: 50 }];
  const layerBox = { x: 100, y: 100, w: 300, h: 200 };
  assert.equal(clipAgainstBox(boxes, layerBox).length, 0, 'an element genuinely inside its layer box must not be flagged');
}

console.log('preview-fragment.test.mjs: all assertions passed');
