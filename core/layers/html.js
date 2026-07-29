// core/layers/html.js — RAW hand-authored HTML/CSS as ONE layer (full design freedom for a beat, still
// positioned/animated by the engine). MUST be static: any <script> is stripped so renderFrame(n) stays
// pure. The sanitiser and the reasoning behind it live in core/sanitize-html.js, shared with the `html`
// background so the layer and the backdrop cannot drift to different rules.
import { sanitizeHtml } from '../sanitize-html.js';

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  el.innerHTML = `<div class="hs-html">${sanitizeHtml(L.html)}</div>`;
}

// `--t` is the scene clock in seconds, the one thing hand-authored CSS can be a function of. It was
// written only on the html BACKGROUND, so an html LAYER using `var(--t)` fell back to its default and
// rendered a permanently dead still — while core/sanitize-html.js, shared by both, told the author that
// `var(--t)` was what worked. Documented input, silently ignored: the worst failure mode in this
// codebase, and 12 layers across the library were already sitting on it. Pure in t, so purity holds.
export function frame(kit, el, L, t) {
  el.style.setProperty('--t', t.toFixed(4));
}
