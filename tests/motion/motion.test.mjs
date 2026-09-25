// tests/motion/motion.test.mjs: the runnable self-check for "the engine is still by default"
// (the owner's call, 2026-09: a default that induces motion nobody authored is a bug). Asserts the
// three DEFAULT_MOTION values that changed, and that a theme with no `motion` key still resolves them.
//   node tests/motion/motion.test.mjs
import assert from 'node:assert/strict';
import { DEFAULT_MOTION, motionDefaults, exitRatioFromMotion, anticipateFromMotion } from '../../core/motion/motion.js';

// ---- DEFAULT_MOTION itself: the values a theme falls back to when it names none of its own ----
assert.equal(DEFAULT_MOTION.idle, 'none', 'idle defaults to none: a settled layer does not breathe unless authored');
assert.equal(DEFAULT_MOTION.bounce, 0, 'bounce defaults to 0: no overshoot unless a theme asks for one');

// ---- motionDefaults(theme): a theme that never mentions `motion` still resolves to the engine default ----
{
  const m = motionDefaults(null);
  assert.equal(m.idle, 'none', 'motionDefaults(null): idle falls back to the engine default');
  assert.equal(m.bounce, 0, 'motionDefaults(null): bounce falls back to the engine default');
}
{
  const m = motionDefaults({ motion: {} });
  assert.equal(m.idle, 'none', 'a theme with an empty motion block still gets idle:none');
  assert.equal(m.bounce, 0, 'a theme with an empty motion block still gets bounce:0');
}

// ---- a theme that DOES name one still wins (the opt-in half of the same contract) ----
{
  const m = motionDefaults({ motion: { idle: 'breathe', bounce: 0.4 } });
  assert.equal(m.idle, 'breathe', 'a theme naming idle explicitly is not overridden by the engine default');
  assert.equal(m.bounce, 0.4, 'a theme naming bounce explicitly is not overridden by the engine default');
}

// ---- exitRatioFromMotion: derived from durationScale, anchored at 0.5 for the house pace (1) ----
assert.equal(exitRatioFromMotion(1), 0.5, 'durationScale 1 (the engine default pace) derives exitRatio 0.5, the house half');
assert.ok(exitRatioFromMotion(0.8) < 0.5, 'a faster theme (durationScale < 1) derives a snappier (lower) exitRatio');
assert.ok(exitRatioFromMotion(1.2) > 0.5, 'a slower, cinematic theme (durationScale > 1) derives a closer-to-symmetric exitRatio');
assert.equal(exitRatioFromMotion(0.1), 0.3, 'exitRatioFromMotion clamps at 0.3 so an extreme durationScale cannot derive an unusably snappy exit');
assert.equal(exitRatioFromMotion(3), 0.7, 'exitRatioFromMotion clamps at 0.7 so an extreme durationScale cannot derive a slower-than-entrance exit');

// ---- motionDefaults: exitRatio is now a REAL default (was flat 1, symmetric, for 30 of 41 themes) ----
{
  const m = motionDefaults(null);
  assert.equal(m.exitRatio, 0.5, 'motionDefaults(null): exitRatio derives from the engine default durationScale (1) instead of a flat 1');
}
{
  const m = motionDefaults({ motion: { durationScale: 0.8 } });
  assert.equal(m.exitRatio, exitRatioFromMotion(0.8), 'a theme that sets durationScale but not exitRatio still gets a derived, non-symmetric default');
}
{
  // The 11 themes that already hand-author exitRatio must still win outright: the derivation is a
  // default for the 30 that say nothing, never a second opinion over an explicit one.
  const m = motionDefaults({ motion: { durationScale: 0.8, exitRatio: 0.4 } });
  assert.equal(m.exitRatio, 0.4, 'an explicit exitRatio is not overridden by the derived default');
}

// ---- anticipateFromMotion: derived from bounce, anchored at the recipe's own 10-20% band ----
assert.equal(anticipateFromMotion(0), 0.1, 'bounce 0 (the engine default, and most themes) derives the floor of the practitioner band');
assert.equal(anticipateFromMotion(undefined), 0.1, 'a missing bounce reads as 0, not NaN');
assert.ok(anticipateFromMotion(0.2) > 0.1 && anticipateFromMotion(0.2) < 0.2, 'a mid bounce derives a mid amount, never the two other themes\' numbers');
assert.equal(anticipateFromMotion(0.42), 0.2, 'threadcite\'s bounce (0.42, the highest shipped) lands at the band ceiling');
assert.equal(anticipateFromMotion(1), 0.2, 'an even bouncier theme still clamps at 0.2, never past the recipe\'s own band');

console.log('✓ motion.test.mjs: idle, bounce, exitRatio and anticipateFromMotion are all still (or derived) by default, and a theme can opt back in');
