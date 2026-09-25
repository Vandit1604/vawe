// tests/layers/text.test.mjs: the runnable self-check for `typingColors` (core/layers/text.js), the
// per-word flash-then-settle colour on a `typing` text layer.
//   node --test tests/layers/text.test.mjs
//
// PLAIN TEXT NEEDS NO DOM: colorizeTyped's plain-text branch is a pure string splice (see the comment
// on it in text.js), so it and typingColorFor are asserted here with plain node:assert, no browser.
// The `<b>`-markup branch (colorizeMarkup) does walk a real HTML tree, exactly as revealHtml already
// does, and is covered by render-harness tests elsewhere (make judge/snap-all) rather than duplicated
// here as a hand-mocked DOM, which would just drift from the real parser (the trap util.test.mjs's
// own header warns about).
import test from 'node:test';
import assert from 'node:assert/strict';
import { typingColorFor, colorizeTyped, typedLen } from '../../core/layers/text.js';

test('typingColorFor is pure and out-of-order calls agree', () => {
  const opts = { colors: ['#ff742e', '#2e6bff'], hold: 0.4 };
  const atZero = typingColorFor(0, 0, opts);
  assert.equal(atZero, '#ff742e', 'the instant a word types, it is its own flash colour, no mix yet');
  // calling in a different order (as a jittered capture shard would) must give the same answer:
  // no state, only (dt, i, opts) in.
  const late = typingColorFor(2, 0, opts);
  const early = typingColorFor(0, 1, opts);
  assert.equal(typingColorFor(2, 0, opts), late, 'same (dt, i) twice must agree, called out of order');
  assert.equal(typingColorFor(0, 1, opts), early, 'a second word cycles to the second colour, index 1');
  assert.equal(early, '#2e6bff');
});

test('typingColorFor settles from flash to ink as dt grows, never overshoots', () => {
  const opts = { colors: ['#ff742e'], hold: 0 };
  const early = typingColorFor(0.01, 0, opts);
  const late = typingColorFor(5, 0, opts); // well past the ramp
  assert.match(early, /color-mix\(in srgb, #ff742e/, 'still mostly flash just after reveal');
  assert.match(late, /0\.0%, var\(--layer-ink/, 'fully settled to ink (0% flash left) after the ramp completes');
});

test('typingColorFor with no colors given is a no-op (null), never throws', () => {
  assert.equal(typingColorFor(1, 0, {}), null);
  assert.equal(typingColorFor(1, 0), null);
});

test('colorizeTyped: word 2 is accent-coloured just after its own reveal, ink after the ramp', () => {
  const full = 'one two three';
  const cps = 10; // word "two" starts at char index 4 -> its own reveal time is 0.4s
  const opts = { colors: ['#ff742e'], hold: 0.5 }; // hold=0.5 of a 0.6s ramp: full flash for its first 0.3s
  const visLen = full.length;
  // t=0.7s: "two" has JUST finished typing (dt = 0.7 - 0.4 = 0.3s, still inside the hold window)
  const n1 = typedLen(0.7, { cps, visLen });
  const justAfter = colorizeTyped(full, n1, 0.7, cps, opts);
  assert.match(justAfter, /<span style="color:color-mix\(in srgb, #ff742e 100\.0%, var\(--layer-ink[^"]*\)">two<\/span>/,
    'word 2 is still full flash colour right after it finishes typing (inside the hold window)');
  // long after "two" was typed, still within the line's window, well past the 0.6s ramp
  const n2 = typedLen(2, { cps, visLen });
  const later = colorizeTyped(full, n2, 2, cps, opts);
  assert.match(later, /color-mix\(in srgb, #ff742e 0\.0%, var\(--layer-ink[^"]*\)">two<\/span>/,
    'word 2 has fully settled to ink (0% flash) by t=2s');
});

test('colorizeTyped leaves whitespace and an unstarted tail untouched', () => {
  const full = 'one two';
  const cps = 10;
  const n = typedLen(0.25, { cps, visLen: full.length }); // mid-way through "one", "two" not reached
  const out = colorizeTyped(full, n, 0.25, cps, { colors: ['#ff742e'] });
  assert.doesNotMatch(out, /two/, 'a word not yet typed does not appear, exactly like the plain path');
  assert.match(out, /^<span style="color:[^"]+">on<\/span>$/, 'a word cut mid-way by n stops exactly there');
});
