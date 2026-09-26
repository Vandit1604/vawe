// tests/layers/track-matte.test.mjs: end-to-end proof for the `matte` modifier's TRACK MATTE modes,
// rendered by a real browser and read back as real pixels (harness/lib/frame-sampler.mjs), never a
// DOM assertion about styles the browser might not have painted.
//
// node tests/layers/track-matte.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleScene, luminanceOf } from '../../harness/lib/frame-sampler.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const scene = path.join(here, '../fixtures/track-matte.fixture.json');

// One render of the whole 6s fixture at three ticks: t=0 and t=6 (`wipeRect`'s matte window off to
// either side of `revealText`), t=3 (concentric with it). Bright/dark by BT.601 luma (frame-sampler's
// `luminanceOf`, box-averaged over the region so a moving mask edge or antialiasing does not flip one
// stray pixel and fail the test), against the black `bg` preset and white text/gradient fills.
const { samples } = await sampleScene(scene, { times: [0, 3, 6] });
const at = (t) => samples.find((s) => s.t === t).img;
const DARK = 15, LIT = 40;

// ALPHA MATTE, MOVING: `wipeRect` (opacity 0, a 300x150 rect) keys its x from 200 (t0) through 810
// (t3) to 1400 (t6). `revealWindow` is the FIXED screen box wipeRect covers only at t3: dark while the
// matte sits elsewhere, lit only when the matte arrives, dark again once it has moved past. Same
// layer, same modifier, three different frames: the matte moved and the reveal moved with it.
const revealWindow = { x: 810, y: 360, w: 300, h: 146 };
assert.ok(luminanceOf(at(0), revealWindow) < DARK, 'revealText: dark before wipeRect arrives (t=0)');
assert.ok(luminanceOf(at(3), revealWindow) > LIT, 'revealText: lit once wipeRect is concentric with it (t=3)');
assert.ok(luminanceOf(at(6), revealWindow) < DARK, 'revealText: dark again after wipeRect has moved past (t=6)');

// wipeRect (300x150) is narrower than revealText's own box (700x146): its far corners never sit under
// the matte at any of the three keyframes, so they stay dark throughout.
for (const [name, box] of Object.entries({
  'top-left corner': { x: 615, y: 365, w: 30, h: 30 },
  'bottom-right corner': { x: 1265, y: 465, w: 30, h: 30 },
}))
  for (const t of [0, 3, 6])
    assert.ok(luminanceOf(at(t), box) < DARK, `revealText's ${name} should stay dark at t=${t}, wipeRect never reaches it`);

// LUMA MATTE, TEXT-SHAPED: `textMask` is an svg (opacity 0) with a black background and one big white
// glyph, `footage`'s luma matte. `footage`'s own box centre lands inside the glyph's ink (luma 1,
// shows the gradient); its corners land in the svg's black margin (luma 0, hidden). True at every
// tick, a still shape needs no motion to prove.
const footageCentre = { x: 1290, y: 800, w: 40, h: 100 };
for (const t of [0, 3, 6]) {
  assert.ok(luminanceOf(at(t), footageCentre) > LIT, `footage centre should show the gradient through the glyph's ink at t=${t}`);
  for (const [name, box] of Object.entries({
    'top-left corner': { x: 965, y: 725, w: 30, h: 30 },
    'bottom-right corner': { x: 1620, y: 950, w: 30, h: 30 },
  }))
    assert.ok(luminanceOf(at(t), box) < DARK, `footage's ${name} should stay hidden in the glyph svg's black margin at t=${t}`);
}

console.log('track-matte.test.mjs: ok');
