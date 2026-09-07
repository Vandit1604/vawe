// core/motion/parts.test.mjs: the runnable self-check for the `drawOn` part entrance.
// Bug: `drawOn` tweened `strokeDashoffset` over a [0,1] normalised range (`pathLength="1"`), and GSAP
// rounds a px-unit style value to the nearest whole pixel, so the whole seven-second draw in
// post-trailhead.json rendered as a ONE-FRAME SNAP (measured directly on the DOM: exactly "1px" for
// 1.45s, then exactly "0px" for the rest, on both the preview and the encoded-video code path, since
// both call window.__engine.renderFrame(n)). The fix measures the real path length with
// getTotalLength() (as core/layers/svg.js's applyDraw already does for its own draw reveal, #581) and
// tweens/dashes in real units, which gives GSAP's px rounding hundreds of representable steps instead
// of two. docs/MISTAKES.md #582.
//   node core/motion/parts.test.mjs
import assert from 'node:assert/strict';
import { PARTS } from './parts.js';

const [setup, fromVars, toVars, outVars] = PARTS.drawOn;

// A minimal SVGPathElement mock: only what applyDraw's setup touches.
function mockPath(totalLength) {
  return {
    style: {},
    attrs: { pathLength: '1' },
    getTotalLength: () => totalLength,
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
  };
}

// ---- setup(t): measures the REAL length, not the normalised [0,1] range ----
{
  const el = mockPath(841.69);
  setup(el);
  assert.equal(el.attrs.pathLength, undefined, 'setup must remove pathLength="1" (the normalise-to-[0,1] trick #582 fixes)');
  assert.equal(el.__drawLen, 841.69, 'setup must stash the real length getTotalLength() reports');
  assert.equal(el.style.strokeDasharray, '841.69 841.69', 'the dasharray must be dashed in real units, not "1 1"');
}

// ---- fromVars/toVars: function-values so gsap.fromTo(targets, ...) gives EACH target its own length ----
{
  const short = mockPath(100), long = mockPath(841.69);
  setup(short); setup(long);
  assert.equal(fromVars.strokeDashoffset(0, short), 100, 'fromVars must read the per-element stashed length, not a shared constant');
  assert.equal(fromVars.strokeDashoffset(0, long), 841.69, 'a second, differently-sized target must get its OWN length');
  assert.equal(toVars.strokeDashoffset, 0, 'toVars: fully revealed is always dashoffset 0, real units or normalised');
  assert.equal(outVars.strokeDashoffset(0, long), 841.69, 'the un-draw exit returns to the element\'s own full length, not "1"');
}

// ---- an element with no getTotalLength (a non-geometry part, e.g. a plain div matched by mistake) ----
// must not throw: it degrades to length 0 rather than crashing the whole `parts` build pass.
{
  const div = { style: {}, setAttribute() {}, removeAttribute() {} };
  assert.doesNotThrow(() => setup(div), 'setup must tolerate a target with no getTotalLength');
  assert.equal(fromVars.strokeDashoffset(0, div), 0, 'a target that was never measured falls back to 0, not undefined/NaN');
}

console.log('✓ parts.test.mjs: drawOn measures real path length, not the [0,1] range GSAP rounds to two states');
