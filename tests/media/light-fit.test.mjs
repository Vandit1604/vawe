// tests/media/light-fit.test.mjs: house-rule self-check, no framework.
//   node tests/media/light-fit.test.mjs
//
// Covers the closed-form fit and the colour-delta/apply pair on synthetic light maps built by hand
// (no ffmpeg/puppeteer here: harness/media/light-fit.mjs's own CLI, which does render, is exercised
// separately as the proof step in engine-doctrine/CRAFT/RECREATION.md).
import { fitFieldOpts, colourDelta, applyDelta } from '../../harness/media/light-fit.mjs';
import { SCHEMA } from '../../core/lightfield/index.js';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }
const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);

// A 16x9 map: bright gold top-left, draining to black bottom-right, the same SHAPE as the reference
// this tool was built against (a diagonal field of light), built by formula rather than fixtures.
function goldenDiagonal(cols = 16, rows = 9) {
  return Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    const d = Math.hypot(x / cols, y / rows);
    const k = Math.max(0, 1 - d);
    return [Math.round(230 * k), Math.round(180 * k), Math.round(20 * k)];
  }));
}

{
  const map = goldenDiagonal();
  const opts = fitFieldOpts(map);
  const CS = SCHEMA.colour.fields;

  for (const role of ['bloom', 'mid', 'deep', 'ground']) assert(isHex(opts.colour[role]), `${role} must be a 6-digit hex, got ${opts.colour[role]}`);
  assert(opts.colour.originX < 50 && opts.colour.originY < 50,
    `a top-left field must fit an origin in the top-left quadrant, got (${opts.colour.originX}, ${opts.colour.originY})`);
  assert(opts.colour.spread >= 0 && opts.colour.spread <= 1, `spread must be a unit dial, got ${opts.colour.spread}`);
  assert(opts.colour.evenness >= 0 && opts.colour.evenness <= 1, `evenness must be a unit dial, got ${opts.colour.evenness}`);
  assert(opts.colour.lobes === CS.lobes.def, `lobes should default rather than be guessed, got ${opts.colour.lobes}`);
  console.log(`✓ light-fit.test.mjs: fitFieldOpts reads a top-left field's own origin and stays inside every dial's range`);

  // bloom should be a SATURATED gold, not the washed-out near-white a naive "brightest pixel" pick
  // would choose from a field that fades smoothly through white at its very peak.
  const { r, g, b } = { r: parseInt(opts.colour.bloom.slice(1, 3), 16), g: parseInt(opts.colour.bloom.slice(3, 5), 16), b: parseInt(opts.colour.bloom.slice(5, 7), 16) };
  assert(r - b > 40, `bloom should read as gold (red well above blue), got ${opts.colour.bloom}`);
  console.log(`✓ light-fit.test.mjs: bloom (${opts.colour.bloom}) is picked for saturation, not raw brightness`);

  // a ground truth: fitting a map against ITSELF (as the "got" map) must produce a zero delta, and
  // applying a zero delta must be a no-op.
  const zero = colourDelta(map, map);
  assert(zero.every((v) => Math.abs(v) < 1e-9), `a map against itself must have a zero colour delta, got ${zero}`);
  const same = applyDelta(opts, zero);
  assert(same.colour.bloom === opts.colour.bloom && same.colour.mid === opts.colour.mid,
    'applyDelta with a zero delta must leave bloom/mid unchanged');
  console.log('✓ light-fit.test.mjs: colourDelta is 0 against an identical map, and applyDelta(_, 0) is a no-op');

  // a non-zero delta shifts bloom/mid but leaves deep/ground alone (measured to help, not hurt: see
  // applyDelta's own comment).
  const dark = map.map((row) => row.map(([cr, cg, cb]) => [cr * 0.5, cg * 0.5, cb * 0.5]));
  const delta = colourDelta(map, dark);
  const nudged = applyDelta(opts, delta);
  assert(nudged.colour.bloom !== opts.colour.bloom, 'a non-zero delta must move bloom');
  assert(nudged.colour.deep === opts.colour.deep && nudged.colour.ground === opts.colour.ground,
    'applyDelta must leave deep/ground untouched');
  console.log('✓ light-fit.test.mjs: applyDelta moves bloom/mid only, never deep/ground');
}

console.log('light-fit.test.mjs: ok');
