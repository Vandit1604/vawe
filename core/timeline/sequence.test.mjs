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

// ---- ARRIVAL EASE, adapted when a move ends at full speed but lands in a hold (jerky joins) ----
// A slide that accelerates all the way in (`easeInCubic`) then holds is a hard stop with no
// deceleration: adapted to its decelerating twin so the arrival still lands, just softly.
{
  const layers = [{ id: 'card', motion: [
    { t: 0, x: 0 }, { t: 1, x: 300, ease: 'easeInCubic' }, { t: 1.5, x: 300 },
  ] }];
  resolveKeyedProps(layers);
  assert.equal(layers[0].motion[1].ease, 'easeInOutCubic',
    'a move that ends at full speed and lands in a hold is adapted to its decelerating twin');
}

// An EXIT (this key sends opacity to 0) keeps its accelerating ease: exits accelerate on purpose.
{
  const layers = [{ id: 'fader', motion: [
    { t: 0, x: 0, opacity: 1 }, { t: 1, x: 300, opacity: 0, ease: 'easeInCubic' },
  ] }];
  resolveKeyedProps(layers);
  assert.equal(layers[0].motion[1].ease, 'easeInCubic', 'an exit is left alone, exits accelerate');
}

// An authored handle already shapes its own segment and is left alone too.
{
  const layers = [{ id: 'handled', motion: [
    { t: 0, x: 0 }, { t: 1, x: 300, easeIn: 'easyEase' }, { t: 1.5, x: 300 },
  ] }];
  resolveKeyedProps(layers);
  assert.equal(layers[0].motion[1].ease, undefined, 'a key with an authored easeIn handle is left alone');
}

// resolveKeyedProps runs twice per boot (scene.js:831), so the adaptation must be idempotent: running
// it again on an already-adapted key must not double-wrap it (easeInOutCubic -> easeInOutOutCubic).
{
  const layers = [{ id: 'card', motion: [
    { t: 0, x: 0 }, { t: 1, x: 300, ease: 'easeInCubic' }, { t: 1.5, x: 300 },
  ] }];
  resolveKeyedProps(layers);
  resolveKeyedProps(layers);
  assert.equal(layers[0].motion[1].ease, 'easeInOutCubic', 'adapting twice is a no-op the second time');
}

// ---- A MOTION KEY PAST THE LAYER'S OWN DURATION STRETCHES IT, RATHER THAN TRUNCATING THE MOVE ----
// core/tracks/motion.js gates its whole write (transform AND opacity) on `t < start + duration`; a
// key authored past `duration` used to go dark, the layer freezing at its last live pose while the
// GENERIC exit fade took over, which is why an authored slide-and-fade read as "doesn't move, just
// disappears" (the real bug this file was written for, vawe-flow-2's `terminal-plane`).
{
  const layers = [{ id: 'terminal-plane', duration: 4.6, motion: [
    { t: 0, opacity: 0 }, { t: 1.2, opacity: 1 }, { t: 5.1129, opacity: 1, x: 0 },
    { t: 5.4129, opacity: 0, x: -2400 },
  ] }];
  resolveKeyedProps(layers);
  assert.equal(layers[0].duration, 5.4129, 'duration stretches to cover a motion key authored past it');
  assert.equal(motionAt(layers[0].motion, 5.4129).dx, -2400, 'the late key still resolves to its authored x');
}

// A `duration` already long enough for the whole track is left exactly as authored.
{
  const layers = [{ id: 'fits', duration: 10, motion: [{ t: 0, x: 0 }, { t: 2, x: 100 }] }];
  resolveKeyedProps(layers);
  assert.equal(layers[0].duration, 10, 'a duration that already covers the track is untouched');
}

// A layer with no authored `duration` at all already lives forever (clipStyleAt's Infinity fallback,
// core/timeline/clips.js); resolveKeyedProps must not invent one where the author stated none.
{
  const layers = [{ id: 'no-duration', motion: [{ t: 0, x: 0 }, { t: 5, x: 500 }] }];
  resolveKeyedProps(layers);
  assert.equal(layers[0].duration, undefined, 'no authored duration is left undefined, not invented');
}

// Idempotent, same reason as the arrival-ease adaptation above: resolveKeyedProps runs twice per boot.
{
  const layers = [{ id: 'stretch-twice', duration: 1, motion: [{ t: 0, x: 0 }, { t: 3, x: 300 }] }];
  resolveKeyedProps(layers);
  resolveKeyedProps(layers);
  assert.equal(layers[0].duration, 3, 'stretching twice lands on the same duration, not a second stretch');
}

console.log('✓ sequence.test.mjs: arrival-ease adapts a hard stop into a hold, leaves exits and authored handles alone');
