import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHit, SOUND_CLASSES } from '../../harness/lib/sound-class.mjs';

const SR = 22050;
let seed = 7;
const noise = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 2147483648 - 1; };

/** A 1.5 s signal with one sound at 0.2 s: `tone` Hz (0 for noise), decay time constant `tau`, attack time `rise`. */
function hit({ tone, tau, rise = 0.001 }) {
  const mono = new Float32Array(SR * 1.5);
  for (let i = 0; i < mono.length; i++) {
    const t = i / SR - 0.2;
    if (t < 0) continue;
    const env = Math.min(1, t / rise) * Math.exp(-t / tau);
    mono[i] = 0.8 * env * (tone ? Math.sin(2 * Math.PI * tone * t) : noise());
  }
  return mono;
}

const classOf = (spec, riseMs = 2) => classifyHit(hit(spec), SR, 0.2, riseMs).cls;

test('classifyHit names click, pop, swish, impact and sustained by decay and brightness', () => {
  assert.equal(classOf({ tone: 0, tau: 0.012 }), 'click');
  assert.equal(classOf({ tone: 3500, tau: 0.01 }), 'click');
  assert.equal(classOf({ tone: 450, tau: 0.03 }), 'pop');
  assert.equal(classOf({ tone: 0, tau: 0.09, rise: 0.012 }), 'swish');
  assert.equal(classOf({ tone: 70, tau: 0.16 }), 'impact');
  assert.equal(classOf({ tone: 300, tau: 0.5, rise: 0.08 }, 60), 'sustained');
  assert.equal(classOf({ tone: 300, tau: 0.5 }), 'sustained');
});

test('every class the reader can return is a listed class', () => {
  for (const spec of [{ tone: 0, tau: 0.01 }, { tone: 200, tau: 0.05 }, { tone: 1200, tau: 0.2 }]) assert.ok(SOUND_CLASSES.includes(classOf(spec)));
});

test('a silent span is a pop with no decay', () => {
  assert.deepEqual(classifyHit(new Float32Array(10), SR, 0.5, 1), { cls: 'pop', decayS: 0, hz: 0 });
});
