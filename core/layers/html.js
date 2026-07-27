// core/layers/html.js — RAW hand-authored HTML/CSS as ONE layer (full design freedom for a beat, still
// positioned/animated by the engine). MUST be static: any <script> is stripped so renderFrame(n) stays
// pure. The sanitiser and the reasoning behind it live in core/sanitize-html.js, shared with the `html`
// background so the layer and the backdrop cannot drift to different rules.
import { sanitizeHtml } from '../sanitize-html.js';

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  el.innerHTML = `<div class="hs-html">${sanitizeHtml(L.html)}</div>`;
}
