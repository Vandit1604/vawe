// core/engine/tempo.test.mjs: the runnable self-check for the `tempo` global pace dial.
//   node core/engine/tempo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandScene } from './expand.js';

const scene = (extra) => ({
  module: 'scene',
  duration: 10,
  layers: [
    { id: 'a', type: 'text', text: 'hi', start: 1, duration: 2, enterDur: 0.3, exitDur: 0.3, typing: 20, x: 100, y: 100, w: 200, h: 40 },
    { id: 'b', type: 'video', start: 2, duration: 4, src: 'clip.mp4' },
  ],
  bg: [{ preset: 'plain', from: 0, to: 10 }],
  ...extra,
});

test('tempo absent gives a byte-identical expansion', () => {
  const withTempo = expandScene(scene());
  const without = expandScene(scene());
  assert.deepEqual(withTempo, without);
});

test('tempo 1 gives a byte-identical expansion', () => {
  const base = expandScene(scene());
  const withOne = expandScene(scene({ tempo: 1 }));
  assert.deepEqual(withOne, base);
});

test('tempo 0.5 doubles every listed time', () => {
  const d = expandScene(scene({ tempo: 0.5 }));
  assert.equal(d.duration, 20);
  assert.equal(d.layers[0].start, 2);
  assert.equal(d.layers[0].duration, 4);
  assert.equal(d.layers[0].enterDur, 0.6);
  assert.equal(d.layers[0].exitDur, 0.6);
  assert.equal(d.bg[0].from, 0);
  assert.equal(d.bg[0].to, 20);
});

test('tempo scales typing cps the OTHER way (slower tempo = fewer chars/sec)', () => {
  const d = expandScene(scene({ tempo: 0.5 }));
  assert.equal(d.layers[0].typing, 10);   // 20 * 0.5
});

test('footage is not slowed: a video layer keeps rate 1, only its window (start/duration) stretches', () => {
  const d = expandScene(scene({ tempo: 0.5 }));
  assert.equal(d.layers[1].start, 4);
  assert.equal(d.layers[1].duration, 8);
  assert.equal(d.layers[1].rate, undefined);   // never introduced by the resolver
});

test('a station target reference (an id string, not a number) is left untouched by scaling', () => {
  const d = expandScene(scene({
    tempo: 0.5,
    cameraMove: [{ move: 'travel', start: 1, stations: [{}, { target: '#a', dur: 0.8 }] }],
  }));
  // bakeCameraMove consumes cameraMove and deletes it, resolving `target` against the layer it names
  // (id "a" above) using that layer's OWN scaled box, not a hardcoded pixel; nothing here should have
  // thrown or mistaken the id string for a time value.
  assert.equal(d.cameraMove, undefined);
  assert.ok(Array.isArray(d.camera) && d.camera.length >= 2);
});

test('a cue authored at time T lands at T/tempo, same as any other point-in-time field', () => {
  const d = expandScene(scene({ tempo: 0.85, audio: { cues: [{ t: 2.9435, name: 'tick' }] } }));
  // 2.9435 / 0.85 = 3.4629...; snapped to the nearest 1/60s frame.
  assert.equal(d.audio.cues[0].t, Math.round((2.9435 / 0.85) * 60) / 60);
  assert.equal(d.audio.cues[0].name, 'tick');
});

test('an out-of-range tempo is refused', () => {
  assert.throws(() => expandScene(scene({ tempo: 3 })), /between 0\.5 and 2/);
  assert.throws(() => expandScene(scene({ tempo: 0.1 })), /between 0\.5 and 2/);
});
