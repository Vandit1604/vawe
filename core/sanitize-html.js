// core/sanitize-html.js — the ONE definition of "hand-authored markup we are willing to render".
//
// Two callers: the `html` LAYER (raw markup as one layer) and the `html` BACKGROUND (raw markup as the
// backdrop). Both take bytes somebody else wrote and turn them into markup on our machine — which is
// exactly what the MCP product does — so they must agree on what is allowed. They lived as one inline
// regex set in core/layers/html.js; the background would have been a second copy, and two copies of a
// security rule is one copy that gets fixed.
//
// The renderer serves the scene over a static file server rooted at the repo, so an
// <iframe src="/docs/…"> renders a private server file INTO the video and hands it back. That was not
// theoretical: it was demonstrated, and it read docs/MISTAKES.md out of a draft.
//
// So embedding elements go, not just scripts. Defence in depth, not the whole defence: the file server
// should ALSO refuse anything outside core/themes/formats/assets. Both, because either alone is one
// mistake away from leaking.
const EMBEDDING = 'script|iframe|object|embed|frame|frameset|portal|link|meta|base';
const EMBED = new RegExp(`<\\s*(${EMBEDDING})\\b[\\s\\S]*?(?:<\\/\\s*\\1\\s*>|>)`, 'gi');
// and any orphan closing tag the pass above leaves behind (harmless to a browser, but "harmless" is
// not a claim worth making twice about the same element)
const EMBED_CLOSE = new RegExp(`<\\s*\\/\\s*(?:${EMBEDDING})\\s*>`, 'gi');
// A src/href that LEAVES the fragment: an absolute path reaches the whole file server, a protocol URL
// reaches the network (and breaks determinism). Relative asset paths are untouched.
const ESCAPING_URL = /\s(?:src|href|data|srcset|action|formaction)\s*=\s*("|')?\s*(?:[a-z][a-z0-9+.-]*:|\/\/|\/)[^"'\s>]*\1?/gi;
// on* handlers never fire in a static render, but leaving them is an invitation for the day something does.
const ON_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

export function sanitizeHtml(src) {
  return String(src || '')
    .replace(EMBED, '')
    .replace(EMBED_CLOSE, '')
    .replace(ESCAPING_URL, '')
    .replace(ON_HANDLER, '');
}

// CSS `transition` and `animation` DO NOT RUN in a rendered scene. core/tokens.css kills both globally
// with `!important`, because both are wall-clock: a transition fires off a property change and an
// animation runs against the document timeline, so neither survives being seeked to frame 300 by one of
// 8 parallel render workers. Time in this engine is a parameter, not something that elapses.
//
// The failure that makes this worth a named check: hand-authored CSS animation does not error, it does
// nothing. The fragment animates perfectly in a browser, renders as a dead still in the mp4, and the
// author has no way to find out why. Silent substitution is the worst failure mode this codebase has
// (docs/MISTAKES.md), so the authoring gate names it and points at what does work: `var(--t)` (seconds)
// and `var(--p)` (0→1 across the window), written every frame and safe inside calc().
const TIME_CSS = /(?:^|[;{\s])(transition|animation)(?:-[a-z-]+)?\s*:|@keyframes\b/i;
export function timeCssUsed(src) {
  const m = TIME_CSS.exec(String(src || ''));
  return m ? (m[1] ? m[1].toLowerCase() : 'keyframes') : null;
}
