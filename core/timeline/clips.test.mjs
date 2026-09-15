// core/timeline/clips.test.mjs: the runnable self-check for the "one clock per layer, no default
// fade-out" fix (engine-doctrine/MISTAKES.md #574, #575). Pure-JS, no DOM: exitDurOf and clipStyleAt read only
// `el.dataset`, so a plain object stands in for an element.
//   node core/timeline/clips.test.mjs
import assert from 'node:assert/strict';
import { exitDurOf, clipStyleAt, BASE_EXIT } from './clips.js';
import { cutStyle } from '../cuts/index.js';

// ---- NO DEFAULT FADE-OUT (exitDurOf) ----
// A layer with neither `out` nor `exitDur` holds to its end: no BASE_EXIT invented at the read site.
assert.equal(exitDurOf({ dataset: {} }), 0, 'no out, no exitDur: holds to its end (0, not BASE_EXIT)');
// A layer that names an `out` still gets the documented default fade.
assert.equal(exitDurOf({ dataset: { out: 'fade' } }), BASE_EXIT, 'an `out` with no explicit exitDur still gets BASE_EXIT');
// An explicit exitDur always wins, with or without `out`.
assert.equal(exitDurOf({ dataset: { exitDur: '0.9' } }), 0.9, 'an explicit exitDur wins with no `out`');
assert.equal(exitDurOf({ dataset: { out: 'fade', exitDur: '0.9' } }), 0.9, 'an explicit exitDur wins over the out default');

// ---- WRAPPER LEAVES DURATIONS ALONE (clipStyleAt holds, does not fade, with no out/exitDur) ----
// A layer with no `out` (setLayerTiming's new default: no data-exitDur written) stays fully opaque
// for its whole life, right up to its authored end, then disappears at the boundary rather than
// fading through it: the "one more hand quietly writing this layer's life" bug this fix closes.
{
  const el = { dataset: { start: '0', duration: '2' } }; // no out, no exitDur: holds
  const mid = clipStyleAt(el, 1.9);
  assert.equal(mid.opacity, '1.000', `a layer with no out stays fully opaque near its end, got ${mid.opacity}`);
  const justBefore = clipStyleAt(el, 1.999);
  assert.equal(justBefore.opacity, '1.000', `...and right up to it, got ${justBefore.opacity}`);
  const atEnd = clipStyleAt(el, 2.0);
  assert.equal(atEnd.opacity, '0', `...then gone at the boundary, got ${atEnd.opacity}`);
}
// The old behaviour (an authored `out`) still fades, unaffected by this fix.
{
  const el = { dataset: { start: '0', duration: '2', out: 'fade', exitDur: '0.5' } };
  const mid = clipStyleAt(el, 1.75); // 0.25s into a 0.5s exit
  assert.ok(parseFloat(mid.opacity) < 1 && parseFloat(mid.opacity) > 0,
    `an authored out:"fade" still fades mid-exit, got opacity ${mid.opacity}`);
}

// ---- CLAMP THE OUTGOING SIDE (regression: every cut style's exit reaches identity at p=1) ----
// formats/scene/scene.js's bg cross-dissolve reads this same function's `opacity` at exit=1 as its
// "the outgoing side is fully gone" signal (via 1 - exitOpacity); a style that never reaches 0 would
// mean the bg jumps early relative to what the frame actually shows. `none` is the one deliberate
// exception (docs comment: "no transition at all").
for (const name of ['fade', 'punch', 'slide', 'zoom', 'whip', 'wipe']) {
  const s = cutStyle(name, { exit: 1, enter: 1 }, { dir: 'left', dist: 90, cx: 50, cy: 50 });
  const op = s.opacity != null ? parseFloat(s.opacity) : 1;
  const masked = s.clipPath !== 'none' || s.maskImage !== 'none';
  assert.ok(op <= 0.001 || masked, `cut style "${name}" should be fully gone at exit=1 (opacity ${op}, masked ${masked})`);
}

// ---- NO DEFAULT ENTRANCE (formats/scene/scene.js setLayerTiming writes `data-anim="none"` for a
// layer that names none). `none` is a real ANIM entry: no transform, and clipStyleAt's `fadeInT`
// special-cases the literal string so the opacity envelope is skipped too. A layer that states no
// `anim` is simply PRESENT for its window from frame one, not faded in.
{
  const el = { dataset: { start: '0', duration: '2', anim: 'none' } };
  const first = clipStyleAt(el, 0);
  assert.equal(first.opacity, '1.000', `anim:"none" is fully opaque on its very first frame, got ${first.opacity}`);
  assert.equal(first.transform, 'none', `anim:"none" writes no transform, got ${first.transform}`);
  // Unauthored `anim` (fresh from setLayerTiming, string "none") reads identically to an explicit one.
  const mid = clipStyleAt(el, 1);
  assert.equal(mid.opacity, '1.000', `anim:"none" stays fully opaque mid-window, got ${mid.opacity}`);
}

console.log('✓ clips.test.mjs: no default fade-out, no default entrance, a held layer stays opaque to its own end, cut exits reach identity');
