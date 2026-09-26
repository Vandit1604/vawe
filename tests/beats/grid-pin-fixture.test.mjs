// tests/beats/grid-pin-fixture.test.mjs: the WHOLE authoring path for a music-grid beat pin, JSON on
// disk through expandScene/lowerScene (core/engine/expand.js `loadScene`, what every Node gate calls)
// to bindBeats (core/beats/index.js, what films/scene/scene.js calls before the first frame), reading
// the real beats.json sidecar `make media X=beatmap` writes. Unit-level bindBeats calls with a synthetic
// `cuts` array live in tests/beats/grid-pin.test.mjs; this is the one that proves the JSON syntax
// (transitions[].at: "beat:2", transitions[].snap: "bar") survives every stage in between.
//   node tests/beats/grid-pin-fixture.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { bindBeats, describeBind } from '../../core/beats/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, '../fixtures/beat-grid-pin.fixture.json'), 'utf8'));
const grid = JSON.parse(fs.readFileSync(path.join(here, '../fixtures/beat-sync.beats.json'), 'utf8'));

test('a "beat:<n>" transition survives expand+lower as a string, resolved only at bind', () => {
  const data = loadScene(structuredClone(fixture));
  assert.equal(data.cuts[0].t, 'beat:2'); // not yet a number: the real grid has not loaded
  bindBeats(data, grid);
  assert.equal(data.cuts[0].t, 1); // grid.beats[2] === 1.0
});

test('transitions[].snap: "bar" reaches the lowered cut and overrides its nudge', () => {
  const data = loadScene(structuredClone(fixture));
  assert.equal(data.cuts[1].snap, 'bar');
  const r = bindBeats(data, grid);
  // 0.05 is a near miss on downbeat 0 (drift 0.05, within the default 0.12s tolerance)
  assert.equal(data.cuts[1].t, 0);
  assert.ok(r.moved.some((m) => m.kind === 'cut' && m.to === 0));
});

test('probe output names the pin and the nudge (what an author actually reads)', () => {
  const data = loadScene(structuredClone(fixture));
  const r = bindBeats(data, grid);
  const line = describeBind(r);
  assert.match(line, /1 pinned/);
  assert.match(line, /1 joint\(s\) moved/);
});

console.log('ok - beats/grid-pin-fixture: transitions[].at "beat:<n>" and snap:"bar" through the real pipeline');
