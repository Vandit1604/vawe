import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinishLayers, bakeDepthOfField } from '../../core/engine/finish.js';

test('resolveFinishLayers: no finish key is a no-op', () => {
  const data = { layers: [{ type: 'text' }] };
  resolveFinishLayers(data, 1920, 1080);
  assert.equal(data.layers.length, 1);
});

test('resolveFinishLayers: bloom/vignette/aberration/grade each append one full-frame adjust/rect layer', () => {
  const data = {
    duration: 4,
    layers: [],
    finish: {
      bloom: { threshold: 0.7, strength: 0.8, radius: 12 },
      vignette: 0.5,
      aberration: 3,
      grade: { gradientMap: ['#111', '#c33', '#fc3', '#fff'] },
    },
  };
  resolveFinishLayers(data, 1920, 1080);
  assert.equal(data.layers.length, 4);
  const bloom = data.layers.find((L) => L.blend === 'screen');
  assert.ok(bloom && bloom.type === 'adjust' && /url\("?#/.test(bloom.filter));
  const vig = data.layers.find((L) => L.type === 'rect');
  assert.ok(vig && vig.filter.startsWith('vignette:0.5'));
  const grade = data.layers.find((L) => L.track === 9001);
  assert.ok(grade && /url\("?#/.test(grade.filter));
  for (const L of data.layers) { assert.equal(L.w, 1920); assert.equal(L.h, 1080); assert.equal(L.acrossBeats, true); }
});

test('resolveFinishLayers: light drops a full-frame html layer behind everything', () => {
  const data = { layers: [], finish: { light: { colour: { bloom: '#e8a33d' } } } };
  resolveFinishLayers(data, 800, 600);
  assert.equal(data.layers.length, 1);
  assert.equal(data.layers[0].type, 'html');
  assert.equal(data.layers[0].track, -1000);
  assert.match(data.layers[0].html, /<style>/);
});

test('resolveFinishLayers: grain only overrides a window that already carries a grain fx', () => {
  const data = {
    layers: [],
    finish: { grain: 0.4 },
    bg: [{ fx: [{ type: 'grain', alpha: 0.1 }] }, { preset: 'black' }],
  };
  resolveFinishLayers(data, 100, 100);
  assert.equal(data.grain, true);
  assert.equal(data.bg[0].opts.grain, 0.4);
  assert.equal(data.bg[1].opts, undefined);
});

test('bakeDepthOfField: no camera focus keyframes is a no-op', () => {
  const data = { layers: [{ modifiers: [{ plane: { z: -400 } }] }] };
  bakeDepthOfField(data);
  assert.equal(data.layers[0].filter, undefined);
});

test('bakeDepthOfField: a single focus keyframe gives every out-of-focus layer a static blur', () => {
  const data = {
    camera: [{ t: 0, f: 0 }],
    layers: [
      { modifiers: [{ plane: { z: -400 } }] },   // 400 misfocus
      { modifiers: [{ plane: 0 }] },              // in focus: no blur
      { x: 10 },                                  // no plane at all: untouched
    ],
  };
  bakeDepthOfField(data);
  assert.match(data.layers[0].filter, /^blur\(12\.00px\)$/); // 400 * 0.03
  assert.equal(data.layers[1].filter, undefined);
  assert.equal(data.layers[2].filter, undefined);
});

test('bakeDepthOfField: two focus keyframes key the blur through vars, not a static filter', () => {
  const data = {
    camera: [{ t: 0, f: 0 }, { t: 2, f: -400 }],
    layers: [{ modifiers: [{ plane: { z: -400 } }] }],
  };
  bakeDepthOfField(data);
  const L = data.layers[0];
  assert.deepEqual(L.vars['--dof'], [12, 0]); // starts 400 off, ends in focus
  assert.equal(L.varsDelay['--dof'], 0);
  assert.equal(L.varsDur['--dof'], 2);
  assert.equal(L.filter, 'blur(calc(var(--dof, 0) * 1px))');
});

test('bakeDepthOfField: finish.dof.strength overrides the default px-per-unit', () => {
  const data = { camera: [{ t: 0, f: 0 }], finish: { dof: { strength: 1 } }, layers: [{ modifiers: [{ plane: { z: -10 } }] }] };
  bakeDepthOfField(data);
  assert.equal(data.layers[0].filter, 'blur(10.00px)');
});
