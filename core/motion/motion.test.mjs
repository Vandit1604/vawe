// core/motion/motion.test.mjs: the runnable self-check for "the engine is still by default"
// (the owner's call, 2026-09: a default that induces motion nobody authored is a bug). Asserts the
// three DEFAULT_MOTION values that changed, and that a theme with no `motion` key still resolves them.
//   node core/motion/motion.test.mjs
import assert from 'node:assert/strict';
import { DEFAULT_MOTION, motionDefaults } from './motion.js';

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

console.log('✓ motion.test.mjs: idle and bounce are still by default, and a theme can still opt back in');
