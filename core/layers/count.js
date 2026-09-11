// core/layers/count.js: a number that counts from→to over local time (stats, timers). Build is the
// text build (styleText renders count content); this adds the per-frame value.
import { mergeProps, propsOf } from '../registry/props.js';
import { PROPS as TEXT_PROPS } from './text.js';
export { build } from './text.js';

// THE TEXT BUILD IS REUSED; THE TEXT FRAME IS NOT, and the vocabulary has to say so. This file exports
// its own frame(), so nothing in text.js's frame ever runs on a count layer: the typing reveal and its
// caret/untype family live there, and the auto-fit branch that reads `maxLines` is restricted to
// `type === "text"` at text.js:36. Merging the whole text vocabulary advertised all five on a count
// layer, where they were accepted and read by nothing (found by quality/gates/prop-probe.mjs; no scene
// in the library sets one). `typing` itself stays: the keyclick generator reads it for any layer
// (formats/scene/scene.js:1529). `fit`/`fitH` stay too, they are read in the shared BUILD.
const TEXT_FRAME_ONLY = ['caret', 'caretHold', 'untype', 'untypeRate', 'typingColors', 'maxLines'];
const textShared = Object.fromEntries(
  Object.entries(TEXT_PROPS).filter(([k]) => !TEXT_FRAME_ONLY.includes(k)));

// The pattern sits in the SIXTH slot: core/layers/index.js calls frame(kit, el, L, t, scene) with
// five arguments, so a pattern any earlier destructures `scene` and every prop reads undefined
// (lib-test asserts the arity). `scene` itself is unused here. `start`/`duration` stay `L.x`: shared
// vocabulary props, not this file's to declare. `decimals` stays hand-written below: it is read only
// inside fmtCount/displayNum, never destructured on this signature, so propsOf cannot see it.
export function frame(kit, el, L, t, scene, { countStart, countDur, from, to, ease, unit, suffix, prefix, roll } = L) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cs = countStart ?? 0.2, cd = countDur ?? 1.6;
  const v = kit.interpolate(t - start, [cs, cs + cd], [from ?? 0, to ?? 100], { easing: kit.resolveEasing(ease || 'easeOutCubic') });
  // A leading currency symbol in `unit` is hoisted to the front: `unit:"$B"` reads "$880B", which is
  // what CLAUDE.md documents and what the catalog's own statBig.currency assumed. Appending it
  // verbatim produced "880$B". The doc, the manifest and the engine each said something different
  // (docs/MISTAKES.md #76). Plain units (%/k/ms) are untouched.
  const rawUnit = unit || suffix || '';
  const cur = /^([$€£¥])(.*)$/.exec(rawUnit);
  const text = (prefix || '') + (cur ? cur[1] : '') + fmtCount(v, L) + (cur ? cur[2] : rawUnit);
  if (roll) { rollInto(el, text, displayNum(v, L)); return; }
  el.textContent = text;
}

// The count's own vocabulary, on top of the text build it reuses (the same shape as `export { build }`).
// `decimals` is hand-written: it never appears on frame()'s own signature, only inside fmtCount/displayNum.
export const PROPS = mergeProps(textShared, propsOf(frame), { decimals: {} });

// fmtCount: number formatting that reads RIGHT. With a `unit` (%/k/$B) the author owns scale, so just apply
// smart decimals (1 for a non-integer target < 100 → "0.4%", not "0"). Without a unit, auto-compact big raw
// numbers (2.5e9 → "2.5B", documented in CLAUDE.md) so a stat never renders a wall of digits.
function fmtCount(v, L) {
  if (L.unit || L.suffix || L.decimals != null) {
    const dec = L.decimals ?? ((L.to ?? 0) % 1 !== 0 && Math.abs(L.to ?? 0) < 100 ? 1 : 0);
    return v.toFixed(dec);
  }
  // The scale comes from the TARGET, not from the value on screen this frame. Picking it per-frame made a
  // count to 2.5M spend most of its run as a churning 6-digit wall ("486887") and then snap to "2.4M": the
  // format, the digit count and the layer's width all changed mid-animation, which reads as a glitch. The
  // target is fixed for the whole run, so the unit is stable and only the digits move. Settled frames were
  // always right, which is exactly why nothing caught it.
  const scale = Math.abs(L.to ?? 0);
  if (scale >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (scale >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return v.toFixed((L.to ?? 0) % 1 !== 0 && Math.abs(v) < 100 ? 1 : 0);
}

// -------------------------------------------------------------------------------------------------
// roll: the ODOMETER. `roll: true` turns every digit into its own wheel, and each wheel slides
// vertically to its next value instead of the whole number being re-typed.
//
// THE NAME FIRST. This is the rolling-number / odometer rig, built in After Effects as one masked
// column per digit place holding 0-9 stacked, moved by that place's own value. Two steps of the recipe
// cannot be guessed from the look:
//
//   1. A WHEEL'S POSITION IS CONTINUOUS IN ITS PLACE, not a function of the rounded digit. The last
//      wheel sits at (value mod 10), genuinely between two glyphs mid-count. Snapping each wheel to its
//      digit gives a bank of flip cards, which is a different effect with a different rhythm.
//   2. A HIGHER WHEEL TURNS ONLY IN THE LAST TENTH OF THE WHEEL BELOW IT. That is the geneva drive in a
//      real odometer, and it is the whole reason the thing reads as one mechanism instead of ten
//      independent sliders: the tens wheel is still while the units wheel crosses 3, and carries exactly
//      as it crosses 9.
//
// The strip carries ELEVEN cells, 0-9 and a second 0, so the 9 → 0 wrap travels forward off the end of
// the strip rather than snapping back up through the whole column.
//
// Every character sits in the same 1em box, digits and separators alike, so the row stays aligned with
// itself. The markup is derived from this frame's own value with no state to seek past, the same
// argument every other per-frame write in this file makes.

const CELL = 'display:block;height:1em;line-height:1em';
const BOX = 'display:inline-block;height:1em;line-height:1em;vertical-align:top';
const esc = (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c);

// displayNum(v, L): the value in the units the TEXT is written in, kept continuous. fmtCount may divide
// by 1e6 or 1e9, and a wheel driven by the undivided value would spin a thousand times too fast.
export function displayNum(v, L) {
  if (L.unit || L.suffix || L.decimals != null) return v;
  const scale = Math.abs(L.to ?? 0);
  if (scale >= 1e9) return v / 1e9;
  if (scale >= 1e6) return v / 1e6;
  return v;
}

/** rollOffsets(text, num): one wheel offset in [0,11) per DIGIT of `text`, in order. Exported for the gate. */
export function rollOffsets(text, num) {
  const isDigit = (c) => c >= '0' && c <= '9';
  const digits = [...text].filter(isDigit).length;
  const dot = text.indexOf('.');
  const intDigits = dot < 0 ? digits : [...text.slice(0, dot)].filter(isDigit).length;
  const n = Math.abs(num);
  const out = [];
  for (let k = 0; k < digits; k++) {
    const p = n / Math.pow(10, intDigits - 1 - k);   // the place this wheel shows, 10^e
    const base = Math.floor(p) % 10;
    const f = p - Math.floor(p);
    // the last displayed place is the driven wheel; every wheel above it is geared off the one below
    const carry = k === digits - 1 ? f : Math.max(0, Math.min(1, (f - 0.85) / 0.15));
    out.push(base + carry);
  }
  return out;
}

function rollInto(el, text, num) {
  const offs = rollOffsets(text, num);
  const strip = '0123456789'.split('').concat('0').map((g) => `<span style="${CELL}">${g}</span>`).join('');
  let d = 0, html = '';
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      html += `<span style="${BOX};overflow:hidden"><span style="display:block;transform:translateY(${(-offs[d++]).toFixed(4)}em)">${strip}</span></span>`;
    } else {
      html += `<span style="${BOX}">${esc(ch)}</span>`;
    }
  }
  if (el.__rollHTML !== html) { el.innerHTML = html; el.__rollHTML = html; }
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a number that counts from -> to across its own window, formatted (compacts at 1e6, prefix/suffix/decimals). The text build plus a per-frame value. `roll: true` makes it an ODOMETER: one masked wheel per digit, each sliding to its next value, geared so a wheel only turns as the wheel below it crosses 9";
