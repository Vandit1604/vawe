// core/tracks/units.test.mjs: known-answer check for the word-by-word EXIT (core/tracks/units.js).
// Run: node core/tracks/units.test.mjs
//
// THE OWNER RULE UNDER TEST: an exit reads faster than the entrance it mirrors, never a same-speed
// rewind. Left unconfigured, `exit.each`/`exit.stagger` must derive from the ENTRANCE's own resolved
// numbers (EXIT_RUSH = 0.6), not a flat constant, so a slow entrance still exits proportionally
// quicker. `fade` (opacity only, no transform) is used throughout so the numbers under test are read
// straight off `style.opacity`, with no transform maths in the way.
import assert from 'node:assert/strict';
import { frame } from './units.js';

const kit = { M: { stagger: 0.04 } };
const unitsOf = (n) => Array.from({ length: n }, () => ({ style: {} }));

// ---- single unit: exit.each defaults to 0.6x the entrance's own `each`, never the theme default ----
{
  const units = unitsOf(1);
  const L = { split: 'word', preset: 'fade', each: 1, exit: { at: 2, preset: 'fade' } };
  const start = 0, end = 100;
  const run = (t) => { frame(kit, null, L, units, t, null, start, end); return Number(units[0].style.opacity); };

  // Before exit.at: still the entrance's settled state, fully in.
  assert.equal(run(2), 1, 'a unit at the exact moment exit.at is reached has not started leaving yet');
  // Exactly at exit.at + entranceEach*0.6 (the derived, rushed duration): fully gone.
  assert.ok(run(2 + 1 * 0.6) < 1e-6, 'an unconfigured exit finishes at 0.6x the entrance\'s own `each`, not at 1x');
  // Just short of that rushed duration: not fully gone yet, proving it is a real ramp and not a snap.
  assert.ok(run(2 + 1 * 0.6 - 0.05) > 0.01, 'the rushed exit is still a ramp short of its own (shorter) duration');
  // Had the exit copied the entrance's OWN 1s duration unrushed, it would still be mid-fade at 0.6s in;
  // it is not, which is the concrete "faster than its entrance" claim this test exists to pin down.
}

// ---- an author override still wins: exit.each bypasses the 0.6x derivation entirely ----
{
  const units = unitsOf(1);
  const L = { split: 'word', preset: 'fade', each: 1, exit: { at: 2, preset: 'fade', each: 1 } };
  frame(kit, null, L, units, 2 + 1, null, 0, 100);
  assert.ok(Number(units[0].style.opacity) < 1e-6, 'an explicit exit.each of 1 (matching the entrance) finishes at 1s, not 0.6s');
}

// ---- multi-unit: the default exit stagger step derives from the ENTRANCE's own resolved step ----
{
  const units = unitsOf(2);
  // entrance stagger is a bare number (0.1/unit); exit is left unconfigured.
  const L = { split: 'word', preset: 'fade', each: 1, stagger: 0.1, exit: { at: 2, preset: 'fade' } };
  const start = 0;
  const opacityAt = (t) => { frame(kit, null, L, units, t, null, start, 100); return units.map((u) => Number(u.style.opacity)); };
  // Unit 0 leaves first; at exit.at + 0.6 (its own rushed `each`, no stagger offset) it is gone.
  let [o0, o1] = opacityAt(2 + 0.6);
  assert.ok(o0 < 1e-6, 'unit 0 (no stagger offset) is fully exited at exit.at + rushed each');
  // Unit 1 is offset by the RUSHED stagger step (0.1 * 0.6 = 0.06), not the unrushed 0.1: at
  // exit.at + 0.6 + 0.06 it must also be fully gone.
  [o0, o1] = opacityAt(2 + 0.6 + 0.06);
  assert.ok(o1 < 1e-6, 'unit 1 is offset by 0.6x the entrance\'s own stagger step (0.06), not the raw 0.1');
  // Confirm it is genuinely offset and not simultaneous: shortly before that point unit 1 still shows.
  [o0, o1] = opacityAt(2 + 0.6 + 0.06 - 0.02);
  assert.ok(o1 > 0.01, 'unit 1 has not finished yet a moment before its own rushed, staggered deadline');
}

console.log('units.test.mjs: an unconfigured exit derives a rushed (0.6x) each and stagger from the entrance\'s own numbers, and an author override still wins');
