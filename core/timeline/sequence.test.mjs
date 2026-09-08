// core/timeline/sequence.test.mjs: the runnable self-check for `radius` joining POSE (the missing
// row that let a layer travel and resize but never change SHAPE: rectangle -> pill -> circle).
// Pure-JS, no DOM: motionAt/resolveKeyedProps read only plain keyframe objects and a plain layer
// object stands in for an element's authored data.
//   node core/timeline/sequence.test.mjs
import assert from 'node:assert/strict';
import { motionAt, resolveKeyedProps, velocityAt, KEYFRAME_PROPS } from './sequence.js';

// `radius` is a real pose output, not a second unnamed key: the boot-time refusal for stray keyframe
// props (sequence.js:163) reads KEYFRAME_PROPS, so this is the one place adding it to POSE has to show.
assert.ok(KEYFRAME_PROPS.includes('radius'), 'KEYFRAME_PROPS carries `radius`, generated from POSE');

// ---- RADIUS INTERPOLATES BETWEEN TWO KEYS ----
{
  const layers = [{ id: 'r1', motion: [{ t: 0, radius: 4 }, { t: 1, radius: 12 }] }];
  resolveKeyedProps(layers);
  const [L] = layers;
  assert.equal(motionAt(L.motion, 0).radius, 4, 'radius at the first key is the authored value');
  assert.equal(motionAt(L.motion, 1).radius, 12, 'radius at the last key is the authored value');
  const mid = motionAt(L.motion, 0.5).radius;
  assert.ok(mid > 4 && mid < 12, `radius interpolates strictly between its two keys, got ${mid}`);
}

// ---- AN OMITTED RADIUS LEAVES THE AUTHORED VALUE UNTOUCHED ----
// A track that keys x but never mentions radius must report `null` for it (POSE's null identity),
// which is how a keyed layer opts out of paying for this at all: the caller leaves the authored
// `L.radius` on the DOM alone rather than the evaluator inventing 0 or holding a neighbour.
{
  const layers = [{ id: 'r2', radius: 8, motion: [{ t: 0, x: 0 }, { t: 1, x: 100 }] }];
  resolveKeyedProps(layers);
  const [L] = layers;
  assert.equal(motionAt(L.motion, 0).radius, null, 'radius identity is null at the first key when never keyed');
  assert.equal(motionAt(L.motion, 0.5).radius, null, 'radius identity is null mid-track when never keyed');
  assert.equal(motionAt(L.motion, 1).radius, null, 'radius identity is null at the last key when never keyed');
}

// ---- A THREE-KEY TRACK REACHES PILL AND THEN CIRCLE ----
// The reference film's button, measured frame by frame: rectangle {w:39,h:22,radius:4}, pill
// {w:39,h:22,radius:11} (radius reached half the held height), circle {w:22,h:22,radius:11} (width
// caught up to height, same radius carries through). Two of the three properties (w/h) were already
// keyable; this is the one row that let the third travel with them.
{
  const layers = [{ id: 'btn', w: 39, h: 22, radius: 4, motion: [
    { t: 0, w: 39, h: 22, radius: 4 },
    { t: 1, w: 39, h: 22, radius: 11 },
    { t: 2, w: 22, h: 22, radius: 11 },
  ] }];
  resolveKeyedProps(layers);
  const [L] = layers;
  const rect = motionAt(L.motion, 0);
  assert.deepEqual([rect.w, rect.h, rect.radius], [39, 22, 4], 'key 0 is the authored rectangle');
  const pill = motionAt(L.motion, 1);
  assert.deepEqual([pill.w, pill.h, pill.radius], [39, 22, 11], 'key 1 is a pill: radius reached half the height, w/h held');
  const circle = motionAt(L.motion, 2);
  assert.deepEqual([circle.w, circle.h, circle.radius], [22, 22, 11], 'key 2 is a circle: w caught up to h, radius unchanged');
  // Between pill and circle only w moves; radius (11 at both ends) must interpolate flat, not dip.
  const between = motionAt(L.motion, 1.5);
  assert.equal(between.radius, 11, 'radius stays flat at 11 through the pill-to-circle segment');
  assert.ok(between.w > 22 && between.w < 39, `w is mid-travel from pill to circle, got ${between.w}`);
}

console.log('✓ sequence.test.mjs: radius joins POSE, interpolates, leaves an unkeyed layer untouched, and the button reaches pill then circle');

// ---- ANGULAR VELOCITY (`omega`), the half `squash` could not see (docs/MISTAKES.md #588) ----
// A layer that only turns has zero dx/dy by construction, so `speed` reads 0 however fast it spins.
{
  const kfs = [{ t: 0, x: 0 }, { t: 1, x: 300, ease: 'linear' }];
  const { vx, vy, omega, speed } = velocityAt(kfs, 0.5, 1 / 30);
  assert.equal(omega, 0, `a track that never keys rot has zero angular velocity, got ${omega}`);
  assert.ok(vx > 0, `a rightward move still reads a positive vx, got ${vx}`);
  assert.equal(speed, Math.hypot(vx, vy), 'speed is still hypot(vx, vy)');
}

{
  const kfs = [{ t: 0, rot: 0 }, { t: 1, rot: 90, ease: 'linear' }];
  const { vx, vy, omega } = velocityAt(kfs, 0.5, 1 / 30);
  assert.equal(vx, 0, `a track that never keys x has zero vx, got ${vx}`);
  assert.equal(vy, 0, `a track that never keys y has zero vy, got ${vy}`);
  assert.ok(omega > 0, `a rot 0->90 over 1s reads a positive omega, got ${omega}`);
  assert.ok(Math.abs(omega - 90) < 1, `omega is in deg/s (90deg over 1s ~= 90), got ${omega}`);
}

{
  const kfs = [{ t: 0, rot: 180 }, { t: 1, rot: 0, ease: 'linear' }];
  const { omega } = velocityAt(kfs, 0.5, 1 / 30);
  assert.ok(omega < 0, `a rot 180->0 reads a negative omega, got ${omega}`);
}
