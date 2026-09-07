// core/engine/produce.test.mjs: the runnable self-check for produceBaseline's inferred-cut default
// (docs/MISTAKES.md, "101 of 181 films had no joint at all"). Pure-JS, no DOM.
//   node core/engine/produce.test.mjs
import assert from 'node:assert/strict';
import { produceBaseline } from './produce.js';

const look = { cuts: { default: 'fade', accent: 'cinematicZoom' } };
const frame = { w: 1920, h: 1080 };
// track-bearing beat layers with a gap wide enough to read as a cut (inferCuts's own default: 1.2s)
const beatLayers = (starts) => starts.map((start, i) => ({ type: 'text', track: i, start, duration: 3 }));

// ---- A jointless film with a real gap gains an inferred cut, AND sceneUnits in the SAME pass ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], layers: beatLayers([0, 4]) };
  produceBaseline(data, {}, frame, look);
  assert.ok(Array.isArray(data.cuts) && data.cuts.length === 1, 'a real gap infers one cut');
  assert.equal(data.cuts[0].style, 'fade', 'the injected cut carries look.cuts.default');
  assert.equal(data.sceneUnits, true, 'sceneUnits fires in the SAME pass so the fading cut is not a whole-frame one');
}

// ---- sceneUnits:false, WRITTEN BY THE AUTHOR, skips injection: cadence-film.json's real shape ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], sceneUnits: false, layers: beatLayers([0, 4]) };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'sceneUnits:false is not force-converted to a moving style; injection is skipped');
  assert.equal(data.sceneUnits, false, 'the author\'s explicit false survives untouched');
}

// ---- a choreographed scene (a motion track) is skipped by both guards, same as before this change ----
{
  const data = {
    module: 'scene', duration: 10, bg: [{ preset: 'plain' }],
    layers: [{ type: 'text', track: 0, start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 1, x: 10 }] },
      { type: 'text', track: 1, start: 4, duration: 3 }],
  };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'a choreographed scene gets no inferred cuts');
  assert.equal(data.sceneUnits, undefined, 'and no sceneUnits either');
}

// ---- a film with no inferable boundary (a contact sheet: everything starts near 0) gets none ----
{
  const data = { module: 'scene', duration: 5, bg: [{ preset: 'plain' }], layers: beatLayers([0, 0.1, 0.2]) };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'no gap over the threshold, no cuts: the true answer for a contact sheet');
}

// ---- a film that already has a cut is left alone (absent-only) ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], cuts: [{ t: 4, style: 'none' }], layers: beatLayers([0, 4]) };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts.length, 1, 'an authored cut is not added to');
  assert.equal(data.cuts[0].style, 'none', 'and not rewritten');
}

console.log('produce.test.mjs: ok');
