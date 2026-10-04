import test from 'node:test';
import assert from 'node:assert/strict';
import { DIALS, parseSignature, readSignature } from '../../core/motion/signature.js';
import { enterSpecs, leaveSpecs, staggerTimes, layerTiming, EASE } from '../../core/motion/presets.js';

function withSignature(content, run) {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = { querySelector: (sel) => (sel === 'meta[name="signature"]' ? { content } : null) };
  try { run(); } finally { if (had) Object.defineProperty(globalThis, 'document', had); else delete globalThis.document; }
}

test('parseSignature keeps the known dials that have a value and drops empty and unknown ones', () => {
  assert.deepEqual(parseSignature('band=professional; ease=; stagger=60; mood=calm; thread=the caret=cursor'),
    { band: 'professional', stagger: '60', thread: 'the caret=cursor' });
  assert.deepEqual(parseSignature(DIALS.map((d) => `${d}=`).join('; ')), {});
  assert.deepEqual(parseSignature(null), {});
});

test('outside a page there is no signature and the presets keep their engine defaults', () => {
  assert.deepEqual(readSignature(), {});
  assert.equal(enterSpecs({})[0].timing.easing, EASE.land);
  assert.equal(enterSpecs({})[0].timing.duration, 650);
});

test('enter, leave, stagger and layer take the chosen band, ease and stagger; an explicit option wins', () => {
  withSignature('band=professional; ease=settle; stagger=100', () => {
    const [move] = enterSpecs({});
    assert.equal(move.timing.duration, 400);
    assert.equal(move.timing.easing, EASE.settle);
    assert.equal(enterSpecs({ band: 'energy', ease: 'glide' })[0].timing.duration, 225);
    assert.equal(enterSpecs({ ease: 'glide' })[0].timing.easing, EASE.glide);
    assert.equal(leaveSpecs({ at: 0 })[0].timing.duration, 240);
    assert.equal(leaveSpecs({ at: 0 })[0].timing.easing, EASE.launch);
    assert.equal(layerTiming({}).band, 'gravity');
    const gaps = staggerTimes(4).slice(1).map((t, i, all) => t - (i ? all[i - 1] : staggerTimes(4)[0]));
    assert.ok(gaps.every((g) => g >= 0.075 && g <= 0.125), `gaps ${gaps}`);
    assert.equal(staggerTimes(2, { gap: 0.04 }).length, 2);
  });
});
