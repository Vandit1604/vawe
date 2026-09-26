// tests/timeline/group-clock.test.mjs: fast pure-JS asserts for the group's own local clock
// (core/timeline/group-clock.js). No DOM needed: every function under test is pure in its numeric
// input, the same contract core/timeline/time.js's `layerTime` already holds.
//
//   node --test tests/timeline/group-clock.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { resolveGroupClock, groupLocalTime, groupClockAbsoluteTime } from '../../core/timeline/group-clock.js';
import { resolveGroupWindow } from '../../core/layers/util.js';

test('resolveGroupClock: rejects a non-positive duration', () => {
  assert.throws(() => resolveGroupClock({ duration: 0 }, 'g'), /duration.*positive/);
  assert.throws(() => resolveGroupClock({}, 'g'), /duration.*positive/);
});

test('resolveGroupClock: rejects a non-positive rate', () => {
  assert.throws(() => resolveGroupClock({ duration: 1, rate: 0 }, 'g'), /rate.*positive/);
});

test('resolveGroupClock: loop defaults to 1 (play once, no repeat)', () => {
  const gc = resolveGroupClock({ duration: 1 }, 'g');
  assert.deepEqual(gc.loop, { count: 1, infinite: false, pingpong: false });
});

test('resolveGroupClock: loop rejects a fractional or non-positive count', () => {
  assert.throws(() => resolveGroupClock({ duration: 1, loop: 0 }, 'g'), /clock\.loop/);
  assert.throws(() => resolveGroupClock({ duration: 1, loop: 1.5 }, 'g'), /clock\.loop/);
});

test('resolveGroupClock: loop accepts the named shapes "forever" and "pingpong"', () => {
  assert.equal(resolveGroupClock({ duration: 1, loop: 'forever' }, 'g').loop.infinite, true);
  assert.equal(resolveGroupClock({ duration: 1, loop: 'pingpong' }, 'g').loop.pingpong, true);
});

test('resolveGroupClock: an unknown loop name names the two it does know', () => {
  assert.throws(() => resolveGroupClock({ duration: 1, loop: 'bounce' }, 'g'), /forever.*pingpong|pingpong.*forever/);
});

test('groupLocalTime: a plain 3x loop of a 1s cycle repeats the same phase', () => {
  const gc = resolveGroupClock({ duration: 1, loop: 3 }, 'g');
  assert.equal(groupLocalTime(gc, 0.5), 0.5);
  assert.equal(groupLocalTime(gc, 1.5), 0.5); // cycle 2, same phase
  assert.equal(groupLocalTime(gc, 2.5), 0.5); // cycle 3, same phase
  assert.equal(groupLocalTime(gc, 0), 0);
  assert.equal(groupLocalTime(gc, 1.0), 0); // cycle 2 restarts at 0
});

test('groupLocalTime: hold (default) freezes on the last cycle\'s own end once the loop is spent', () => {
  const gc = resolveGroupClock({ duration: 1, loop: 2 }, 'g'); // hold: true is the default
  assert.equal(groupLocalTime(gc, 10), 1); // long past 2 cycles: held at the cycle's own end
});

test('groupLocalTime: hold:false snaps back to the cycle\'s rest pose (0) once the loop is spent', () => {
  const gc = resolveGroupClock({ duration: 1, loop: 2, hold: false }, 'g');
  assert.equal(groupLocalTime(gc, 10), 0);
});

test('groupLocalTime: negative elapsed (before the group starts) reads as its first frame', () => {
  const gc = resolveGroupClock({ duration: 1, loop: 'forever' }, 'g');
  assert.equal(groupLocalTime(gc, -5), 0);
});

test('groupLocalTime: rate speeds the cycle up without changing its own duration', () => {
  const gc = resolveGroupClock({ duration: 1, rate: 2, loop: 'forever' }, 'g');
  assert.equal(groupLocalTime(gc, 0.25), 0.5); // 2x speed: 0.25s elapsed reads as 0.5s into the cycle
});

test('groupLocalTime: pingpong reverses every other pass, never jumping back to 0', () => {
  const gc = resolveGroupClock({ duration: 1, loop: 'pingpong' }, 'g');
  assert.equal(groupLocalTime(gc, 0.25), 0.25);  // pass 0, forward
  assert.equal(groupLocalTime(gc, 1.25), 0.75);  // pass 1, reversed: 1 - 0.25
  assert.equal(groupLocalTime(gc, 2.25), 0.25);  // pass 2, forward again
});

test('groupClockAbsoluteTime: composes a descriptor\'s outerStart with the loop', () => {
  const gc = resolveGroupClock({ duration: 1, loop: 'forever' }, 'g');
  const desc = { outerStart: 2, gc };
  assert.equal(groupClockAbsoluteTime(desc, 2.5), 0.5);  // 0.5s into the group -> phase 0.5
  assert.equal(groupClockAbsoluteTime(desc, 3.5), 0.5);  // one full cycle later -> same phase
});

test('resolveGroupWindow: no `clock` forwards the outer window and any inherited clock untouched', () => {
  const inherited = { outerStart: 0, gc: resolveGroupClock({ duration: 1, loop: 'forever' }, 'g') };
  const win = resolveGroupWindow({ id: 'plain' }, 5, 2, 0.3, inherited);
  assert.deepEqual(win, { start: 5, duration: 2, exitDur: 0.3, groupClock: inherited });
});

test('resolveGroupWindow: a `clock` replaces any inherited clock and re-bases children at 0', () => {
  const inherited = { outerStart: 0, gc: resolveGroupClock({ duration: 9, loop: 1 }, 'outer') };
  const win = resolveGroupWindow({ id: 'inner', clock: { duration: 1, loop: 3 } }, 5, 3, null, inherited);
  assert.equal(win.start, 0);
  assert.equal(win.duration, 1);
  assert.equal(win.groupClock.outerStart, 5);
  assert.equal(win.groupClock.outerEnd, 8);
  assert.notEqual(win.groupClock.gc, inherited.gc);
});
