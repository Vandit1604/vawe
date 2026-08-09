// core/layers/html.js — RAW hand-authored HTML/CSS as ONE layer (full design freedom for a beat, still
// positioned/animated by the engine). MUST be static: any <script> is stripped so renderFrame(n) stays
// pure. The sanitiser and the reasoning behind it live in core/sanitize-html.js, shared with the `html`
// background so the layer and the backdrop cannot drift to different rules.
import { sanitizeHtml, htmlSource } from '../sanitize-html.js';

// `h` used to be accepted and then ignored: build() set width and not height, and the `.hs-html` wrapper
// had no height of its own, so hand-authored CSS saying `height:100%` resolved against an auto-height
// parent and collapsed to its own content height. A layer declaring a 580px box rendered 310px of card
// and no gate said anything — the silent-substitution class again (docs/MISTAKES.md #210).
//
// `height:100%` on the wrapper is deliberately a no-op when the layer declares no height: 100% against
// an auto-height parent computes to auto, which is exactly today's behaviour. It changes the render only
// for layers that DID state a box, which is the broken case.
// `html` is the layer. `--t` is written every frame with nothing read off the layer to decide it, so
// there is no per-frame prop here.
//
// `src` is the SAME markup, in a file instead of escaped into the JSON — the alternative to `html`, never
// its replacement (the block generators build their fragments in memory and have no file to point at).
// Exactly one of the two, enforced in core/validate.mjs; a `src` that never loaded throws in htmlSource.
export const PROPS = { html: {}, src: {}, w: {}, h: {} };

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  if (L.h != null) el.style.height = L.h + 'px';
  const src = htmlSource(L, kit.html, `layer${L.id ? ` "${L.id}"` : ''} (html)`);
  el.innerHTML = `<div class="hs-html" style="height:100%">${sanitizeHtml(src)}</div>`;
}

// `--t` is the scene clock in seconds, the one thing hand-authored CSS can be a function of. It was
// written only on the html BACKGROUND, so an html LAYER using `var(--t)` fell back to its default and
// rendered a permanently dead still — while core/sanitize-html.js, shared by both, told the author that
// `var(--t)` was what worked. Documented input, silently ignored: the worst failure mode in this
// codebase, and 12 layers across the library were already sitting on it. Pure in t, so purity holds.
export function frame(kit, el, L, t) {
  el.style.setProperty('--t', t.toFixed(4));
}
