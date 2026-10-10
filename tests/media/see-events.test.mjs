import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRegion, eventLines, matchOf, pairEvents, shotEvents, soundsWithoutAction } from '../../harness/media/see/events-math.mjs';

const FPS = 30;
const shot = { moves: [{ id: 'dialog', appears: true, firstSeen: 1.2 }, { id: 'bg', appears: false, firstSeen: 0 }], energy: { moving: true, bursts: [{ t0: 1.2, t1: 1.6, peak: 2.4 }, { t0: 2.4, t1: 2.7, peak: 1.1 }] } };

test('shotEvents lists an appearing part and a burst, and folds a burst that opens with the appearance into it', () => {
  const ev = shotEvents(shot, FPS);
  assert.deepEqual(ev.map((e) => [e.t, e.kind]), [[1.2, 'appears'], [2.4, 'burst']]);
  assert.match(ev[0].what, /dialog appears/);
});

test('pairEvents: on the frame within 1 frame, a sound early is before its action, late is near within 3 and off beyond, none out of reach', () => {
  const events = [{ t: 1.2, what: 'a' }, { t: 2.0, what: 'b' }, { t: 3.0, what: 'c' }, { t: 4.0, what: 'd' }];
  const marks = [{ t: 1.2 + 1 / FPS, label: 'click' }, { t: 2.0 - 3 / FPS, label: 'pop' }, { t: 3.2, label: 'swish' }];
  const out = pairEvents(events, marks, FPS);
  assert.deepEqual(out.map((e) => e.verdict), ['sound on the frame', 'sound before its action', 'sound off', 'no sound']);
  assert.equal(out[0].sound.frames, 1);
  assert.equal(out[1].sound.frames, -3);
  assert.equal(out[3].sound, null);
});

test('a sound before its cause is a negative frame count the line prints', () => {
  const [e] = pairEvents([{ t: 1.5, what: 'burst of motion' }], [{ t: 1.2, label: 'click' }], FPS);
  assert.equal(e.sound.frames, -9);
  assert.match(eventLines([e]).join('\n'), /click at 1\.20 s \(-9 f\), sound before its action/);
});

test('soundsWithoutAction names a mark with no event within 3 frames; matchOf counts the events on the frame', () => {
  const events = pairEvents([{ t: 1, what: 'x' }, { t: 2, what: 'y' }], [{ t: 1, label: 'click' }, { t: 5, label: 'impact' }], FPS);
  assert.deepEqual(soundsWithoutAction([{ t: 1, label: 'click' }, { t: 5, label: 'impact' }], events, FPS), [{ t: 5, label: 'impact' }]);
  assert.deepEqual(matchOf([{ events }]), { events: 2, onFrame: 1, share: 0.5 });
});

test('changeRegion finds where a part changes, says nothing moves for a still frame, and names a cut', () => {
  const w = 96, h = 54, a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  for (let y = 40; y < 50; y++) for (let x = 70; x < 90; x++) b[y * w + x] = 200;
  const r = changeRegion(a, b, w, h);
  assert.equal(r.where, 'lower right');
  assert.ok(r.share > 0.03 && r.share < 0.06);
  assert.equal(changeRegion(a, a, w, h).words, 'nothing moves');
  assert.equal(changeRegion(a, new Uint8Array(w * h).fill(255), w, h).where, 'whole frame');
});
