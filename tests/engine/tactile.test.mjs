// core/audio/tactile.test.mjs: the runnable self-check for the tactile-sound derivation.
//   node core/audio/tactile.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derive } from '../../core/audio/tactile.js';

const canvas = { w: 1920, h: 1080 };

test('a layer with parts AND its own motion track voices both: the container move and the children plucks', () => {
  const layer = {
    id: 'card', type: 'html', start: 8, duration: 3, w: 1600, h: 900,
    parts: [{ select: '[data-part="clip"]', anim: 'popIn', each: 0.2, stagger: 0.1, count: 4 }],
    motion: [
      { t: 0, y: 1080 }, { t: 0.8, y: 0 },       // entrance: slides up into frame
      { t: 2.4, y: 0 }, { t: 2.7, y: 0 },         // hold
      { t: 3.2, x: -2300, y: 0 },                 // exit: flies off-screen
    ],
  };
  const cues = derive({ duration: 20, layers: [layer] }, { canvas });
  const impacts = cues.filter((c) => c.name === 'impact' || c.name === 'whoosh');
  // one cue for the entrance move (t=8+0), one for the exit move (t=8+2.7): the container's own two
  // big events, neither of which the `parts` plucks account for.
  assert.ok(impacts.some((c) => Math.abs(c.t - 8) < 0.01), 'entrance move must sound');
  assert.ok(impacts.some((c) => Math.abs(c.t - 10.7) < 0.01), 'exit move must sound');
});

test('a layer with parts and NO motion track stays exactly as before: only the parts pluck', () => {
  const layer = {
    id: 'card', type: 'html', start: 5, duration: 2, w: 1600, h: 900,
    parts: [{ select: '[data-part="clip"]', anim: 'popIn', each: 0.2, stagger: 0.1, count: 3 }],
  };
  const cues = derive({ duration: 20, layers: [layer] }, { canvas });
  assert.equal(cues.filter((c) => c.name === 'impact' || c.name === 'whoosh').length, 0);
  assert.ok(cues.some((c) => c.name === 'pluck'));
});

test('a layer with motion but no real move (held flat) gets no motion cue', () => {
  const layer = {
    id: 'still', type: 'html', start: 0, duration: 5, w: 1600, h: 900,
    parts: [{ select: '[data-part="x"]', anim: 'fade', each: 0.2, count: 0 }], // suppress arrivalCues too
    motion: [{ t: 0, opacity: 1 }, { t: 5, opacity: 1 }],
  };
  const cues = derive({ duration: 20, layers: [layer] }, { canvas });
  assert.equal(cues.filter((c) => c.name === 'impact' || c.name === 'whoosh').length, 0);
});
