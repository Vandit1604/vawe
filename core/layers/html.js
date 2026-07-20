// core/layers/html.js — RAW hand-authored HTML/CSS as ONE layer (full design freedom for a beat, still
// positioned/animated by the engine). MUST be static: any <script> is stripped so renderFrame(n) stays pure.
//
// SANITISED, AND NOT ONLY FOR PURITY. When the engine renders a scene somebody else wrote — which is
// what the MCP product does — this layer is the one place their bytes become markup on our machine.
// The renderer serves the scene over a static file server rooted at the repo, so an
// <iframe src="/docs/…"> renders a private server file INTO the video and hands it back. That was not
// theoretical: it was demonstrated, and it read docs/MISTAKES.md out of a draft.
//
// So embedding elements go, not just scripts. Defence in depth, not the whole defence: the file
// server should ALSO refuse anything outside core/themes/formats/assets. Both, because either alone
// is one mistake away from leaking.
const EMBEDDING = 'script|iframe|object|embed|frame|frameset|portal|link|meta|base';
const EMBED = new RegExp(`<\\s*(${EMBEDDING})\\b[\\s\\S]*?(?:<\\/\\s*\\1\\s*>|>)`, 'gi');
// and any orphan closing tag the pass above leaves behind (harmless to a browser, but "harmless"
// is not a claim worth making twice about the same element)
const EMBED_CLOSE = new RegExp(`<\\s*\\/\\s*(?:${EMBEDDING})\\s*>`, 'gi');
// A src/href that LEAVES the layer: an absolute path reaches the whole file server, a protocol URL
// reaches the network (and breaks determinism). Relative asset paths are untouched.
const ESCAPING_URL = /\s(?:src|href|data|srcset|action|formaction)\s*=\s*("|')?\s*(?:[a-z][a-z0-9+.-]*:|\/\/|\/)[^"'\s>]*\1?/gi;

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  const clean = String(L.html || '')
    .replace(EMBED, '')
    .replace(EMBED_CLOSE, '')
    .replace(ESCAPING_URL, '')
    // on* handlers never fire in a static render, but leaving them is an invitation for the day
    // something does.
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  el.innerHTML = `<div class="hs-html">${clean}</div>`;
}
