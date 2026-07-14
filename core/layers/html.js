// core/layers/html.js — RAW hand-authored HTML/CSS as ONE layer (full design freedom for a beat, still
// positioned/animated by the engine). MUST be static: any <script> is stripped so renderFrame(n) stays pure.
export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  el.innerHTML = `<div class="hs-html">${String(L.html || '').replace(/<script[\s\S]*?<\/script>/gi, '')}</div>`;
}
