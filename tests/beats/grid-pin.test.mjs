// tests/beats/grid-pin.test.mjs: MUSIC-GRID beat pins ("beat:<n>", core/beats/index.js) and per-joint
// snap granularity ("beat"/"bar"/"downbeat"), the two pieces item p2-l-music adds on top of the
// existing `audio.beatSync` nudge-to-nearest-beat policy (which already IS "cutsOnBeat": it moves
// every cut/seam/sting onto the grid within a tolerance and reports what moved, docstring in
// core/beats/index.js `bindBeats`/`describeBind`). No second mechanism is added here, only these two
// gaps in the one that already exists.
//   node tests/beats/grid-pin.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindBeats } from '../../core/beats/index.js';

const throws = (fn, re) => assert.throws(fn, re);

// A fixture grid, the shape `make beatmap` writes to assets/music/<name>.beats.json.
const GRID = { bpm: 120, confidence: 8, beats: [0, 0.5, 1, 1.5, 2, 2.5, 3], downbeats: [0, 2] };

test('"beat:<n>" pins a cut to the nth beat of the music grid (0-based)', () => {
  const s = { audio: { music: 'beat', beatSync: true }, cuts: [{ t: 'beat:2', style: 'punch' }] };
  const r = bindBeats(s, GRID);
  assert.equal(s.cuts[0].t, 1); // GRID.beats[2]
  assert.equal(r.pinned.length, 1);
  assert.equal(r.moved.length, 0); // a pin is reported once, not double-counted as a nudge
});

test('a pin forces snap:false, so the ordinary nudge pass leaves it exactly there', () => {
  const s = { audio: { music: 'beat', beatSync: true }, cuts: [{ t: 'beat:2', style: 'punch' }] };
  bindBeats(s, GRID);
  assert.equal(s.cuts[0].snap, false);
});

test('an out-of-range pin throws, naming the grid length', () => {
  const s = { audio: { music: 'beat', beatSync: true }, cuts: [{ t: 'beat:99', style: 'punch' }] };
  throws(() => bindBeats(s, GRID), /only has 7 beat/);
});

test('a seam and a sting accept the same pin, not just a cut', () => {
  const s = {
    audio: { music: 'beat', beatSync: true },
    seams: [{ t: 'beat:4', dur: 0.5, fx: 'fade' }],
    stings: [{ t: 'beat:0', fx: 'flash' }],
  };
  bindBeats(s, GRID);
  assert.equal(s.seams[0].t, 2);
  assert.equal(s.stings[0].t, 0);
});

test('snap:"bar" sends ONE joint to downbeats even when the scene default is the fine grid', () => {
  // 0.54 is a near miss on the fine grid (nearest 0.5, drift 0.04) but far from every downbeat (0, 2).
  const s = { audio: { music: 'beat', beatSync: true }, cuts: [{ t: 0.54, style: 'punch', snap: 'bar' }] };
  const r = bindBeats(s, GRID);
  assert.equal(s.cuts[0].t, 0.54); // too far from any downbeat, held rather than nudged
  assert.equal(r.held.length, 1);
});

test('snap:"beat" sends ONE joint to the fine grid even when the scene default is bars', () => {
  const s = {
    audio: { music: 'beat', beatSync: { bar: true } },
    cuts: [{ t: 0.54, style: 'punch', snap: 'beat' }],
  };
  const r = bindBeats(s, GRID);
  assert.equal(s.cuts[0].t, 0.5); // the fine grid's near miss, not the downbeat grid's
  assert.equal(r.moved.length, 1);
});

test('an unrecognised snap string throws rather than silently defaulting', () => {
  const s = { audio: { music: 'beat', beatSync: true }, cuts: [{ t: 0.54, style: 'punch', snap: 'nonsense' }] };
  throws(() => bindBeats(s, GRID), /must be false, "beat", "bar", or "downbeat"/);
});

console.log('ok - beats/grid-pin: "beat:<n>" pins and per-joint snap granularity');
