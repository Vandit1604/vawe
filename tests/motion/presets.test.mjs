import test from 'node:test';
import assert from 'node:assert/strict';
import { easeFn, BANDS, bandSeconds, bandOf, pickBand, enterSpecs, enter, leaveSpecs, leave, staggerTimes, stagger, layerTiming, layer, EASE, EASE_HANDLES, keysSpec, keys } from '../../core/motion/presets.js';
import { handleCurve, HANDLE_REGISTRY } from '../../core/motion/motion.js';

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

test('enter lands on the land ease, fades in the first 40% and holds both ends', () => {
  const [move, fade] = enterSpecs({ at: 1.2, band: 'gravity' });
  assert.equal(move.timing.easing, EASE.land);
  assert.match(EASE.land, /^linear\(0, /);
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
  assert.equal(a.timing.easing, EASE.launch);
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

test('leave accepts ease: leave, enter accepts any EASE name, an unknown name throws', () => {
  const [a] = leaveSpecs({ at: 0, band: 'gravity', ease: 'leave' });
  assert.equal(a.timing.easing, EASE.leave);
  assert.equal(enterSpecs({ ease: 'settle' })[0].timing.easing, EASE.settle);
  assert.throws(() => enterSpecs({ ease: 'zoom' }), /valid: land landSoft settle swap glide carry leave launch/);
});

test('the handle numbers follow the Lottie and HyperFrames data', () => {
  const at = (n) => HANDLE_REGISTRY.pick(n);
  assert.deepEqual(at('fling'), { influence: 12, speed: 4.8 });
  assert.deepEqual(at('overshoot'), { influence: 35, speed: -0.4 });
  assert.deepEqual(at('long'), { influence: 60, speed: 0 });
  assert.deepEqual(at('hang'), { influence: 75, speed: 0 });
  assert.equal(at('easyEase').speed, 0);
});

function parseLinear(str) {
  return str.slice('linear('.length, -1).split(',').map(Number);
}

test('every EASE is a linear() from its handle pair, starts at 0 and ends at 1', () => {
  assert.deepEqual(Object.keys(EASE), Object.keys(EASE_HANDLES));
  for (const [name, [out, into]] of Object.entries(EASE_HANDLES)) {
    const pts = parseLinear(EASE[name]), f = handleCurve(out, into);
    assert.equal(pts[0], 0);
    assert.equal(pts.at(-1), 1);
    pts.forEach((v, i) => assert.ok(Math.abs(v - f(i / (pts.length - 1))) < 1e-3, `${name} sample ${i}`));
  }
  assert.ok(parseLinear(EASE.land)[2] > 0.15, 'land leaves fast');
});

test('keys: a two-key table is the handleCurve of its two handles', () => {
  const { keyframes, timing } = keysSpec('translate', [[1, '0 0', 'fling'], [2.5, '0 40px', 'hang']]);
  assert.equal(keyframes.length, 2);
  assert.deepEqual(keyframes.map((k) => k.offset), [0, 1]);
  assert.equal(timing.delay, 1000);
  assert.equal(timing.duration, 1500);
  const pts = parseLinear(keyframes[0].easing), f = handleCurve('fling', 'hang');
  pts.forEach((v, i) => assert.ok(Math.abs(v - f(i / (pts.length - 1))) < 1e-3));
  assert.equal(keyframes[1].easing, undefined);
});

test('keys: a three-key table has two segment easings and offsets from times', () => {
  const el = fakeEl();
  keys(el, 'scale', [[0, 1, { out: 'fling' }], [1, 1.2, 'easyEase'], [4, 1, { in: 'long' }]]);
  const { keyframes } = el.anims[0];
  assert.deepEqual(keyframes.map((k) => k.offset), [0, 0.25, 1]);
  assert.match(keyframes[0].easing, /^linear\(0, /);
  assert.match(keyframes[1].easing, /^linear\(0, /);
  assert.notEqual(keyframes[0].easing, keyframes[1].easing);
  assert.equal(keyframes[2].easing, undefined);
});

test('keys: no handles is a straight segment; bad tables throw', () => {
  assert.equal(keysSpec('x', [[0, 0], [1, 1]]).keyframes[0].easing, 'linear');
  assert.throws(() => keysSpec('x', [[0, 0]]), /two keys/);
  assert.throws(() => keysSpec('x', [[1, 0], [1, 1]]), /increase/);
});

test('easeFn samples a named ease, and pop passes its mark', () => {
  assert.equal(easeFn('land')(0), 0);
  assert.equal(easeFn('land')(1), 1);
  assert.ok(Math.max(...Array.from({ length: 101 }, (_, i) => easeFn('pop')(i / 100))) > 1.1);
  assert.throws(() => easeFn('nope'), /unknown ease/);
});
