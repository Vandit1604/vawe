// tests/media/see-required-motion.test.mjs: house-rule self-check, no framework.
//   node tests/media/see-required-motion.test.mjs
//
// Proves harness/media/see.mjs's sheetCheck() required-motion-match gate: `ok` fails on ANY window
// under MATCH_FLOOR (0.5) of the reference's energy, or on peak/exit speed under MATCH_FLOOR, passes
// when a curve is checked against itself, and each failing window's hint is built from that window's
// own numbers (energy value, moving-area fraction when a DOM curve supplies one), never canned text.
import { sheetCheck, MATCH_FLOOR } from '../../harness/media/see.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const refCurve = [
  { t0: 0, t1: 0.5, mean: 8.8 },
  { t0: 0.5, t1: 1.0, mean: 7.5 },
  { t0: 1.0, t1: 1.5, mean: 6.0 },
  { t0: 1.5, t1: 2.0, mean: 8.0 },
];

// ── a curve against itself passes ───────────────────────────────────────────────────────────────────
{
  const r = sheetCheck({ curve: refCurve }, { curve: refCurve });
  assert(r.ok === true, `expected a self-compare to pass, got ${JSON.stringify(r.rows)}`);
  assert(r.tooStillWindows.length === 0, 'expected no too-still windows against itself');
}

// ── a draft under half the reference in one window fails, with a numeric hint naming both sides ─────
{
  const weakFilm = [
    { t0: 0, t1: 0.5, mean: 0.3, area: 0.05 },
    { t0: 0.5, t1: 1.0, mean: 7.5, area: 0.5 },
    { t0: 1.0, t1: 1.5, mean: 6.0, area: 0.5 },
    { t0: 1.5, t1: 2.0, mean: 8.0, area: 0.5 },
  ];
  const r = sheetCheck({ curve: refCurve }, { curve: weakFilm });
  assert(r.ok === false, 'expected the weak-first-window draft to fail required motion match');
  assert(r.tooStillWindows.length === 1, `expected exactly one too-still window, got ${r.tooStillWindows.length}`);
  const hint = r.tooStillWindows[0].hint;
  assert(hint.includes('8.8'), `expected the reference's own energy number in the hint: ${hint}`);
  assert(hint.includes('0.3'), `expected the film's own energy number in the hint: ${hint}`);
  assert(/enlarge the moving area/i.test(hint), `expected a small-area window to say enlarge the moving area: ${hint}`);
  console.log(`✓ see-required-motion.test.mjs: weak window hint -> "${hint}"`);
}

// ── a flat under-half draft fails on window ratio AND peak/exit speed together (peak/exit are
// derived from the SAME per-window numbers, so they can never fail independently of at least one
// too-still window: each window's ratio >= MATCH_FLOOR forces both the peak and the exit average to
// clear it too, by the same inequality; this proves the three checks read consistently) ─────────────
{
  const flatWeakFilm = refCurve.map((c) => ({ ...c, mean: c.mean * 0.45 }));
  const r = sheetCheck({ curve: refCurve }, { curve: flatWeakFilm });
  assert(r.tooStillWindows.length === refCurve.length, `expected every window to read too-still at 0.45x, got ${r.tooStillWindows.length}`);
  assert(Math.abs(r.peakRatio - 0.45) < 1e-6, `expected peakRatio to sit at the 0.45x scale, got ${r.peakRatio}`);
  assert(r.peakRatio < MATCH_FLOOR && r.exitRatio < MATCH_FLOOR, 'expected both peak and exit ratio under MATCH_FLOOR');
  assert(r.ok === false, 'expected a uniformly weak draft to fail the overall gate');
  console.log('✓ see-required-motion.test.mjs: a flat under-half draft fails window ratio and peak/exit speed together');
}

// ── a window with no area data (mp4-vs-mp4 path) still gets a numeric, non-canned hint ───────────────
{
  const weakFilmNoArea = refCurve.map((c, i) => (i === 2 ? { ...c, mean: 0.5 } : c));
  const r = sheetCheck({ curve: refCurve }, { curve: weakFilmNoArea });
  assert(r.tooStillWindows.length === 1, `expected one too-still window, got ${r.tooStillWindows.length}`);
  assert(r.tooStillWindows[0].area == null, 'expected no area on an mp4-vs-mp4 (no DOM) row');
  assert(!/enlarge the moving area/i.test(r.tooStillWindows[0].hint), 'no area data: hint must not claim a moving-area fix');
  console.log(`✓ see-required-motion.test.mjs: no-area hint -> "${r.tooStillWindows[0].hint}"`);
}

console.log('see-required-motion.test.mjs: ok');
