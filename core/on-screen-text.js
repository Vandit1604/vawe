// core/on-screen-text.js — THE definition of "what does this string READ AS on screen".
//
// It lives in core/, not scripts/lib/, for one reason: core/validate.mjs and core/captions.js both
// need it and both ship to the BROWSER with the rest of core/. Engine code cannot reach into
// scripts/, so a definition parked there could never be the only one. scripts/lib/text.mjs re-exports
// this module, so tooling and engine read one rule. Zero imports here on purpose: anything core/ or a
// gate or a browser can load.
//
// WHY THIS EXISTS. A layer's `text` is HTML (`docs/PRIMITIVES.md` documents <b>/<em>, and every
// shipped film uses them to carry the accent word), and an `html` layer's value is a whole fragment
// with its own <style> block. So the authored string and the string a viewer reads are different, and
// a gate that counts, matches or measures the authored one is measuring markup. This was implemented
// eight times with three different answers; the drift, and what settled it, is recorded below.

// Tags that do NOT break a word. Everything else does.
//
// THIS DISTINCTION IS THE WHOLE POINT, and neither of the two previous answers had it. Substituting
// EMPTY for every tag glued `"Financial infrastructure to<br>grow"` into `"...togrow"` — 5 words where
// the frame shows 6, in stripe.json and 21 other live strings. Substituting a SPACE for every tag split
// `"North<b>wind</b>"` into `"North wind"` — 2 words where the frame shows 1. HTML already answers
// this: an inline element does not interrupt the run of text, a block-level one does. So `<br>` and
// `<div>` yield a space and `<b>` and `<span>` yield nothing, and both strings read as they look.
// Unknown or custom tags fall to the block side deliberately: a `<div>` is the overwhelmingly likely
// case in a hand-authored fragment, and a missing break glues two words together, which is the error
// that actually changed word counts here.
const INLINE = /^(a|abbr|b|cite|code|em|i|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|tspan|u|var|wbr)$/i;

// Source that is never rendered as copy at all. A <style> body, a <script> body and an HTML comment
// are all present in the string and absent from the frame. Reading them as copy is docs/MISTAKES.md
// #214 / #216 / #217 / #242, one bug logged five times, each time in a different consumer: it reported
// a frosted pane's own CSS comment as a brand-voice defect, its stylesheet as clipped text, and its
// selectors as unreadably small type. Dropped FIRST, before any tag stripping, because after the tags
// go the CSS body is indistinguishable from prose.
const stripSource = (s) => s
  .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

// The tag pattern needs a letter (optionally after `/`) immediately inside `<`, so a plain sentence
// like "a < b" and a stray "<3" are untouched, and a string carrying no markup comes through
// unchanged. The older `/<[^>]*>/g` also ate `<>` and `< anything >`.
const TAG = /<\/?([a-zA-Z][\w:-]*)[^>]*>/g;

/**
 * onScreenText(s) → the words a viewer reads, as prose. THE DEFAULT: use this to count words, match a
 * needle, scan for jargon or an em-dash, or label a finding. Whitespace is collapsed and trimmed, so
 * the result is comparable against plain prose from a storyboard.
 */
export function onScreenText(s) {
  return stripSource(String(s ?? ''))
    .replace(TAG, (m, tag) => (INLINE.test(tag) ? '' : ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * glyphText(s) → the CHARACTERS the DOM would report, i.e. `element.textContent`. A named variant
 * because it is genuinely different, not drift: `core/layers/text.js` measures a typing line with
 * `stripLen()`, which sets innerHTML and reads textContent, and textContent inserts NOTHING for a
 * `<br>`. So any gate predicting how long a line takes to type (`typedLen`'s `visLen`) or how wide its
 * glyph run is must count what the engine counts, or it predicts a different film from the one that
 * renders. Every tag yields nothing here, and whitespace is left exactly as authored, because a space
 * the author typed is a character the caret still has to walk past.
 */
export function glyphText(s) {
  return stripSource(String(s ?? '')).replace(TAG, '');
}
