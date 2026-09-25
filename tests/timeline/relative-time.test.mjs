// core/timeline/relative-time.test.mjs: the runnable self-check for `audio.cues[].t` accepting the
// SAME relative-time grammar as `layers[].start`/`transitions[].at`/`cameraMove.start`, so a cue can
// name the moment it belongs to ("installLine.end+0.2") instead of a number an author has to recompute
// by hand every time that layer moves. A cue pinned to a stale hand-computed number is exactly the bug
// this closes: `vawe-flow-2.json` fired two cues early because the value copied in was a part's
// `delay` (relative to its parent), not the absolute second that delay resolves to.
//   node core/timeline/relative-time.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRelativeTimes } from '../../core/timeline/relative-time.js';
import { expandScene } from '../../core/engine/expand.js';

const scene = (cues, extra) => ({
  module: 'scene',
  duration: 10,
  layers: [
    { id: 'install', type: 'text', text: 'installing', start: 2, duration: 3 },
  ],
  audio: { cues },
  ...extra,
});

test('a plain number cue time passes through untouched', () => {
  const d = scene([{ t: 4.5, name: 'chime' }]);
  resolveRelativeTimes(d);
  assert.equal(d.audio.cues[0].t, 4.5);
});

test('a relative cue time resolves against the layer it names, bare id = that layer\'s start', () => {
  const d = scene([{ t: 'install', name: 'chime' }]);
  resolveRelativeTimes(d);
  assert.equal(d.audio.cues[0].t, 2);
});

test('".end" plus an offset resolves off the layer\'s end, the moment it actually lands', () => {
  const d = scene([{ t: 'install.end+0.2', name: 'chime' }]);
  resolveRelativeTimes(d);
  assert.equal(d.audio.cues[0].t, 5.2);
});

test('an unknown reference throws, naming the known ids', () => {
  const d = scene([{ t: 'nowhere+1', name: 'chime' }]);
  assert.throws(() => resolveRelativeTimes(d), /unknown reference "nowhere"/);
});

test('resolves BEFORE tempo, so the resolved time scales exactly like any other authored time', () => {
  const d = expandScene(scene([{ t: 'install.end+0.2', name: 'chime' }], { tempo: 0.5 }));
  // install.end is 5s at tempo 1 (start 2 + duration 3); tempo 0.5 doubles every authored time,
  // so the layer resolves to start 4 / duration 6 and the cue must land at (4+6)+0.4 = 10.4, not at
  // 5.2*2 by coincidence of a flat scale-after-resolve (same shape as transitions[].at already proves).
  assert.equal(d.layers[0].start, 4);
  assert.equal(d.layers[0].duration, 6);
  assert.equal(d.audio.cues[0].t, 10.4);
});

console.log('ok - relative-time: audio.cues[].t accepts a layer/beat reference, resolved before tempo');
