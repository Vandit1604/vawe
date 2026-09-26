// tests/tracks/axis.test.mjs: known-answer check for the font-variation axis TRACK (core/tracks/units.js
// forwarding `L.axis` into core/type/type.js's axisFrame). Run: node tests/tracks/axis.test.mjs
//
// THE CLAIM UNDER TEST: `axis` rides the SAME per-unit clock as `preset`/`stagger`, so it composes with
// ANY preset (here `fade`, never `weight`) rather than requiring a preset of its own, and a multi-word
// stagger produces a REAL crest: a later unit is still ramping while an earlier one has already settled.
import assert from 'node:assert/strict';
import { frame } from '../../core/tracks/units.js';

const kit = { M: { stagger: 0.04 } };
const unitsOf = (n) => Array.from({ length: n }, () => ({ style: {} }));

// ---- single unit: wght ramps 300 -> 900 across the unit's own entrance window ----
{
  const units = unitsOf(1);
  const L = { split: 'word', preset: 'fade', each: 1, axis: { wght: [300, 900] } };
  const run = (t) => { frame(kit, null, L, units, t, null, 0, 100); return units[0].style.fontVariationSettings; };

  assert.equal(run(0), "'wght' 300", 'at the unit\'s own t=0 the axis sits at its authored `from`');
  assert.equal(run(1), "'wght' 900", 'at the unit\'s own t=1 (fully entered) the axis reaches its authored `to`');
  // Composes with `fade`, which the `weight` preset does not: opacity still moves too.
  frame(kit, null, L, units, 0.5, null, 0, 100);
  assert.ok(Number(units[0].style.opacity) > 0 && Number(units[0].style.opacity) < 1,
    'the fade preset\'s own opacity still ramps: axis rides alongside it, not instead of it');
  assert.equal(units[0].style.fontVariationSettings, "'wght' 600", 'at t=0.5 the axis sits mid-ramp between `from` and `to`');
  assert.equal(units[0].style.fontWeight, '600', 'axisStyle still writes the fontWeight fallback (100-step) beside the variation string');
}

// ---- multi-unit stagger: a later word is still mid-ramp while an earlier one has already settled ----
{
  const units = unitsOf(3);
  const L = { split: 'word', preset: 'fade', each: 0.5, stagger: 0.3, axis: { wght: [300, 900] } };
  frame(kit, null, L, units, 0.5, null, 0, 100);
  assert.equal(units[0].style.fontVariationSettings, "'wght' 900", 'unit 0, no stagger offset, has fully settled by t=0.5');
  const w1 = Number(/'wght' (\d+)/.exec(units[1].style.fontVariationSettings)[1]);
  assert.ok(w1 > 300 && w1 < 900, 'unit 1, staggered 0.3s behind, is still mid-crest at the same instant');
  assert.equal(units[2].style.fontVariationSettings, "'wght' 300", 'unit 2, staggered 0.6s behind, has not started yet');
}

console.log('axis.test.mjs: the font-variation axis rides the unit\'s own stagger clock and composes with a non-weight preset');
