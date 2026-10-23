import test from 'node:test';
import assert from 'node:assert/strict';
import { enterSpecs, enter, leaveSpecs, stagger, EASE } from '../../core/motion/presets.js';

function varyEl(over = {}) {
  const anims = [];
  return {
    id: 'cap', anims, closest: () => null, ownerDocument: { documentElement: { getAttribute: () => null } },
    animate(keyframes, timing) { const a = { id: timing.id, keyframes, timing, effect: { getTiming: () => timing } }; anims.push(a); return a; },
    getAnimations: () => anims,
    ...over,
  };
}
const timings = (el) => el.anims.map((a) => [a.timing.delay, a.timing.duration, a.timing.easing, a.keyframes[0].translate]);

test('vary: the same seed and key give the same values, another key or seed gives others', () => {
  const run = (vary, key) => enterSpecs({ at: 1, band: 'gravity', vary, key }).map(({ keyframes, timing }) => [timing, keyframes[0].translate]);
  assert.deepEqual(run(3, 'a'), run(3, 'a'));
  assert.notDeepEqual(run(3, 'a'), run(3, 'b'));
  assert.notDeepEqual(run(3, 'a'), run(4, 'a'));
  assert.deepEqual(run(true, 2), run(1, 2));
});

test('vary stays in its ranges: duration 0.9 to 1.1, delay plus 30 to 80 ms, rise 0.85 to 1.15, land or landSoft only', () => {
  const seen = new Set();
  for (let key = 0; key < 200; key++) {
    const [move] = enterSpecs({ at: 1, duration: 1, from: '0 100px', vary: 1, key });
    assert.ok(move.timing.duration >= 900 && move.timing.duration <= 1100, `${move.timing.duration}`);
    assert.ok(move.timing.delay >= 1030 && move.timing.delay <= 1080, `${move.timing.delay}`);
    const rise = Number(/\* ([\d.]+)\)/.exec(move.keyframes[0].translate)[1]);
    assert.ok(rise >= 0.85 && rise <= 1.15, `${rise}`);
    seen.add(move.timing.easing);
  }
  assert.deepEqual([...seen].sort(), [EASE.land, EASE.landSoft].sort());
  assert.equal(enterSpecs({ ease: 'settle', vary: 1, key: 1 })[0].timing.easing, EASE.settle);
});

test('vary off is the old output exactly', () => {
  const opts = { at: 0.4, band: 'professional', from: '0 1.4vh', blur: 4 };
  assert.deepEqual(enterSpecs({ ...opts, vary: false, key: 5 }), enterSpecs(opts));
  const a = varyEl(), b = varyEl();
  enter(a, opts);
  enter(b, { ...opts, vary: false });
  assert.deepEqual(timings(a), timings(b));
  assert.equal(enterSpecs(opts)[0].timing.delay, 400);
  assert.equal(enterSpecs(opts)[0].keyframes[0].translate, '0 1.4vh');
});

test('vary exits stay shorter than their entrance, whatever the draw', () => {
  for (let key = 0; key < 200; key++) {
    const [came] = enterSpecs({ duration: 0.5, vary: 1, key });
    const [gone] = leaveSpecs({ entrance: came.timing.duration / 1000, at: 3, vary: 1, key });
    assert.ok(gone.timing.duration <= 0.6 * came.timing.duration + 1, `${gone.timing.duration} vs ${came.timing.duration}`);
  }
  assert.deepEqual(leaveSpecs({ end: 2, entrance: 0.5, vary: false }), leaveSpecs({ end: 2, entrance: 0.5 }));
  const [ends] = leaveSpecs({ end: 2, entrance: 0.5, vary: 1, key: 1 });
  assert.equal(ends.timing.delay + ends.timing.duration, 2000);
});

test('vary does nothing on the product look or inside data-chrome; stagger varies each element by index', () => {
  const look = (name) => ({ documentElement: { getAttribute: () => name } });
  const plain = varyEl(), product = varyEl({ ownerDocument: look('product') }), chrome = varyEl({ closest: () => ({}) }), base = varyEl();
  enter(plain, { vary: 1 });
  enter(product, { vary: 1 });
  enter(chrome, { vary: 1 });
  enter(base);
  assert.notDeepEqual(timings(plain), timings(base));
  assert.deepEqual(timings(product), timings(base));
  assert.deepEqual(timings(chrome), timings(base));
  const run = () => { const els = [varyEl({ id: '' }), varyEl({ id: '' }), varyEl({ id: '' })]; stagger(els, { vary: 1, duration: 0.3 }); return els; };
  const [one, two] = [run(), run()];
  assert.deepEqual(timings(one[0]), timings(two[0]));
  assert.notDeepEqual(timings(one[0]).map((t) => t.slice(1)), timings(one[1]).map((t) => t.slice(1)));
});
