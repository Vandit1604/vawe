// core/backgrounds/index.test.mjs: the runnable self-check for bgTurnRatio (a bg window's own
// departure asymmetry, see films/scene/scene.js drawBg). Pure-JS.
//   node core/backgrounds/index.test.mjs
import assert from 'node:assert/strict';
import { bgTurnRatio } from './index.js';
import { exitRatioFromMotion } from '../motion/motion.js';

// ---- no authored `turnRatio`: derives from the theme's own pace, same fact as every layer's exit ----
{
  for (const ds of [0.7, 0.9, 1, 1.1, 1.3]) {
    assert.equal(bgTurnRatio(null, ds), exitRatioFromMotion(ds),
      `durationScale ${ds}: bgTurnRatio must be the SAME number exitRatioFromMotion gives a layer, not a second, drifting copy`);
  }
  assert.equal(bgTurnRatio(undefined, 1), exitRatioFromMotion(1), 'undefined (never authored) derives the same way as null');
}

// ---- an authored `turnRatio` on the outgoing window wins outright, whatever the theme's pace is ----
{
  assert.equal(bgTurnRatio(0.15, 1), 0.15, 'an explicit fast turn wins over the derived default');
  assert.equal(bgTurnRatio(1, 0.5), 1, '`turnRatio: 1` is the explicit opt-out back to an even crossfade, even on a brisk theme');
  assert.equal(bgTurnRatio(0, 1.3), 0, 'an authored 0 wins too: falsy but authored is still authored, only null/undefined derive');
}

console.log('✓ backgrounds/index.test.mjs: derives from durationScale, one fact one owner, authored value wins outright');
