// core/layout/safe.test.mjs: the runnable self-check for PLACEMENT, the registry PIN now reads
// (core/engine/boot.js, core/validate/validate.mjs and films/scene/schema.json's `pin` enum all
// derive from it). Asserts every placement name resolves a settled box INSIDE the safe box, at all
// five aspects and at a phone destination, which is the property the plan asked this table to hold.
//   node core/layout/safe.test.mjs
import assert from 'node:assert/strict';
import { ASPECTS, PLACEMENT, PLACEMENT_REGISTRY, safeArea } from '../../core/layout/safe.js';

// Reproduces just enough of core/engine/boot.js's resolveCoords to place ONE layer by name, without
// pulling in boot.js itself (which needs a DOM). Mirrors kw()/num() exactly: this is a test of the
// TABLE, so it must resolve the table the same way the engine does, not a simplified stand-in for it.
function place(pin, W, H, destination, size = 200) {
  const safe = safeArea(W, H, destination);
  const [x0, y0, x1, y1] = [safe.x0, safe.y0, safe.x1, safe.y1];
  const kw = (v, dim, sz, lo, hi) =>
    v === 'center' ? (dim - sz) / 2
      : v === 'optical' ? dim * 0.46 - sz / 2
      : v === 'third1' ? dim / 3 - sz / 2
      : v === 'third2' ? (2 * dim) / 3 - sz / 2
      : (v === 'left' || v === 'top') ? lo
      : (v === 'right' || v === 'bottom') ? hi - sz
      : v === 'text-band' ? lo + 0.63 * (hi - lo)
      : null;
  const [xk, yk, wFrac] = PLACEMENT[pin];
  const w = wFrac != null ? Math.round(wFrac * (x1 - x0)) : size;
  const h = size;
  const x = xk != null ? kw(xk, W, w, x0, x1) : x0;
  const y = yk != null ? kw(yk, H, h, y0, y1) : y0;
  return { x, y, w, h, safe };
}

const inside = (box) => box.x >= box.safe.x0 - 0.5 && box.x + box.w <= box.safe.x1 + 0.5
  && box.y >= box.safe.y0 - 0.5 && box.y + box.h <= box.safe.y1 + 0.5;

// Every placement name, at all five aspects, at the default destination: every settled box the table
// can produce (given a width/height a `w`-less name still needs to be handed for the test to place it)
// stays inside the safe box the same table was resolved against.
for (const name of PLACEMENT_REGISTRY.names) {
  for (const aspect of Object.keys(ASPECTS)) {
    const [W, H] = ASPECTS[aspect];
    const box = place(name, W, H, 'web');
    assert.ok(inside(box), `pin:"${name}" at ${aspect} (${W}x${H}, web): `
      + `box ${JSON.stringify({ x: box.x, y: box.y, w: box.w, h: box.h })} is outside the safe box `
      + `${JSON.stringify({ x0: box.safe.x0, y0: box.safe.y0, x1: box.safe.x1, y1: box.safe.y1 })}`);
  }
}

// And at a chrome-carrying destination (tiktok eats a right rail and top/bottom bands): ONLY the names
// built purely from safe-box-relative keywords (left/right/top/bottom/text-band/lower-band) are held to
// this, because core/engine/boot.js's own comment documents the other half on purpose - centre, optical
// and the thirds resolve against the CANVAS, not the safe box, so a centred layer CAN collide with
// tiktok's rail, and that is a composition call the audit reports rather than a placement bug. This is
// that invariant, pinned: the three new anchors (`stage`/`text-band`/`lower-band`) join the four
// corners in staying safe-box-relative at every destination, which is the portability the plan asked
// for from them specifically.
const CANVAS_RELATIVE = new Set(['center', 'optical', 'third1', 'third2']);
const chromeSafe = (name) => {
  const [xk, yk] = PLACEMENT[name];
  return ![xk, yk].some((k) => CANVAS_RELATIVE.has(k));
};
const chromeSafeNames = PLACEMENT_REGISTRY.names.filter(chromeSafe);
assert.deepEqual([...chromeSafeNames].sort(), ['bottom-left', 'bottom-right', 'lower-band', 'stage', 'text-band', 'top-left', 'top-right'],
  'the safe-box-relative subset of PLACEMENT: change this list only if PLACEMENT itself changed which entries use center/optical/thirds');
for (const name of chromeSafeNames) {
  const [W, H] = ASPECTS['9:16'];
  const box = place(name, W, H, 'tiktok');
  assert.ok(inside(box), `pin:"${name}" at 9:16 on tiktok: box lands outside the shrunk safe box`);
}

// The registry is the one owner: boot.js, validate.mjs and schema-drift.mjs all import PLACEMENT /
// PLACEMENT_REGISTRY rather than keeping a copy, so the name lists cannot drift. This just pins the
// count so a name silently dropped from PLACEMENT (and therefore from all three) fails loudly here too.
assert.equal(PLACEMENT_REGISTRY.names.length, 20, 'placement table: 17 classic pins + 3 named anchors (stage, text-band, lower-band)');

console.log(`✓ safe.test.mjs: ${PLACEMENT_REGISTRY.names.length} placement names resolve inside the safe box at all 5 aspects + tiktok`);
