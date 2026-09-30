import test from 'node:test';
import assert from 'node:assert/strict';
import { BANDS, bandSeconds, bandOf, pickBand, enterSpecs, enter, leaveSpecs, leave, staggerTimes, stagger, layerTiming, layer, LAND, LAUNCH } from '../../core/motion/presets.js';

function fakeEl() {
  const anims = [];
  return {
    anims,
    animate(keyframes, timing) {
      const a = { id: timing.id, keyframes, timing, effect: { getTiming: () => timing } };
      anims.push(a);
      return a;
    },
    getAnimations: () => anims,
  };
}

test('bands name the speed-bands doc ranges and pick by duration and distance', () => {
  assert.deepEqual(Object.keys(BANDS), ['energy', 'professional', 'gravity', 'cinematic']);
  assert.equal(bandSeconds('gravity'), 0.65);
  assert.equal(bandOf(0.1), 'energy');
  assert.equal(bandOf(0.45), 'professional');
  assert.equal(bandOf(3), 'cinematic');
  assert.equal(pickBand(900), 'cinematic');
  assert.equal(pickBand(150), 'energy');
  assert.throws(() => bandSeconds('slow'), /valid: energy professional gravity cinematic/);
});

test('enter lands on an exact expo-out curve, fades in the first 40% and holds both ends', () => {
  const [move, fade] = enterSpecs({ at: 1.2, band: 'gravity' });
  assert.equal(move.timing.easing, LAND);
  assert.match(LAND, /^linear\(0, /);
  assert.equal(move.timing.delay, 1200);
  assert.equal(move.timing.duration, 650);
  assert.equal(fade.timing.duration, 260);
  assert.equal(move.timing.fill, 'both');
  assert.deepEqual(move.keyframes[1], { translate: '0 0', scale: '1' });
  assert.deepEqual(fade.keyframes.map((k) => k.opacity), [0, 1]);
});

test('enter with blur clears the blur as the move settles', () => {
  const [move] = enterSpecs({ blur: 8 });
  assert.equal(move.keyframes[0].filter, 'blur(8px)');
  assert.equal(move.keyframes[1].filter, 'blur(0px)');
});

test('leave runs 0.6 of the entrance it finds, accelerates, and fills forwards only', () => {
  const el = fakeEl();
  enter(el, { band: 'gravity' });
  const [a] = leave(el, { end: 3 });
  assert.equal(a.timing.duration, 390);
  assert.equal(a.timing.delay, 2610);
  assert.equal(a.timing.easing, LAUNCH);
  assert.equal(a.timing.fill, 'forwards');
});

test('leave with no entrance takes 0.6 of the band it is given', () => {
  const [spec] = leaveSpecs({ at: 1, band: 'professional' });
  assert.equal(spec.timing.duration, 240);
  assert.equal(spec.timing.delay, 1000);
});

test('stagger gaps stay in 30 to 80 ms, fit 0.5 s, and repeat for one seed', () => {
  for (const n of [3, 6, 20]) {
    const t = staggerTimes(n, { at: 2 });
    assert.equal(t[0], 2);
    const gaps = t.slice(1).map((x, i) => x - t[i]);
    for (const g of gaps) assert.ok(g >= 0.0299 && g <= 0.0801, `gap ${g}`);
    assert.deepEqual(staggerTimes(n, { at: 2 }), t);
    if (n <= 11) assert.ok(t[n - 1] - t[0] <= 0.5 * 1.26);
  }
  assert.notDeepEqual(staggerTimes(5, { seed: 2 }), staggerTimes(5, { seed: 3 }));
});

test('stagger never lands two items on one 60 fps frame', () => {
  const els = [fakeEl(), fakeEl(), fakeEl(), fakeEl()];
  stagger(els, { at: 0, band: 'energy' });
  const lands = els.map((e) => Math.round((e.anims[0].timing.delay + e.anims[0].timing.duration) * 60 / 1000));
  assert.equal(new Set(lands).size, els.length);
});

test('layer starts the secondary before the lead lands, one band slower', () => {
  assert.deepEqual(layerTiming({ at: 1, band: 'gravity' }), { at: 1.455, band: 'cinematic' });
  const main = fakeEl(), second = fakeEl();
  layer(main, second, { at: 1, band: 'professional', overlap: 0.5 });
  assert.equal(second.anims[0].timing.delay, 1200);
  assert.equal(second.anims[0].timing.duration, 650);
  const land = main.anims[0].timing.delay + main.anims[0].timing.duration;
  assert.ok(second.anims[0].timing.delay < land);
});

test('layer staggers a list of secondaries', () => {
  const main = fakeEl(), parts = [fakeEl(), fakeEl(), fakeEl()];
  layer(main, parts, { band: 'energy' });
  const starts = parts.map((p) => p.anims[0].timing.delay);
  assert.ok(starts[0] < starts[1] && starts[1] < starts[2]);
});
