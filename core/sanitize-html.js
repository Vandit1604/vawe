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

// htmlSource(o, table, where) → the markup an `html` layer or an html bg window is made of, from either
// `html` (inline, escaped into the scene JSON) or `src` (a .html file, preloaded by preloadHtml into a
// path→text table). ONE resolver, so a layer and a backdrop cannot drift on which source wins.
//
// A `src` with no entry in the table THROWS. Every other asset here degrades to something — an empty
// box, a grey placeholder — because a missing photo still leaves a film. A fragment IS the beat, or the
// whole backdrop, so there is nothing left to degrade to and guessing is how a scene ships blank.
export function htmlSource(o, table, where) {
  if (o == null || typeof o.src !== 'string') return o && o.html;
  const got = table && table[o.src];
  if (got == null)
    throw new Error(`${where}: html fragment "${o.src}" was never loaded. `
      + `Either the file does not exist, or its path is outside the roots the render server allows `
      + `(core/, themes/, formats/, assets/, .vawe-data/scenes/, .vawe-data/uploads/).`);
  return got;
}

// CSS `transition` and `animation` DO NOT RUN in a rendered scene. core/tokens.css kills both globally
// with `!important`, because both are wall-clock: a transition fires off a property change and an
// animation runs against the document timeline, so neither survives being seeked to frame 300 by one of
// 8 parallel render workers. Time in this engine is a parameter, not something that elapses.
//
// The failure that makes this worth a named check: hand-authored CSS animation does not error, it does
// nothing. The fragment animates perfectly in a browser, renders as a dead still in the mp4, and the
// author has no way to find out why. Silent substitution is the worst failure mode this codebase has
// (docs/MISTAKES.md), so the authoring gate names it and points at what does work: `var(--t)` (seconds),
// written every frame, and `var(--p)`, 0→1 across the window — but ONLY if the layer DECLARES it:
//   "vars": { "--p": [0, 1] }, "varsDur": 1.5, "varsDelay": 0.12, "varsEase": "easeOutQuart"
// Without that declaration `--p` is simply undefined, `var(--p, 1)` falls back to 1, and the fragment
// renders permanently settled: the same silent no-op this comment exists to warn about, one level down.
// `blocks/kit.mjs`'s `sweep()` exists to stamp exactly those four fields onto a block's html layer.
// The anchor also accepts a QUOTE, because `style="transition:opacity .3s"` is how hand-authored markup
// and captured site UI write this far more often than a stylesheet rule does — and an inline style is
// the one spelling that opens on a quote. Anchored on nothing at all, the check would fire on the word
// inside a sentence; anchored only on `;{` and whitespace, it read every stylesheet and no attribute.
const TIME_CSS = /(?:^|[;{"'\s])(transition|animation)(?:-[a-z-]+)?\s*:|@keyframes\b/i;
export function timeCssUsed(src) {
  const m = TIME_CSS.exec(String(src || ''));
  return m ? (m[1] ? m[1].toLowerCase() : 'keyframes') : null;
}

// A CSS DECLARATION THE PARSER REJECTS IS NOT AN ERROR ANYWHERE. It drops that one declaration, keeps
// the rest of the rule, and renders on: nothing throws, nothing warns, and the element simply never
// does the thing. It is the same family as the `transition`/`animation` ban above — hand-authored CSS
// that reads correctly and silently no-ops — so it is refused in the same place, at the same moment,
// rather than by a separate pass that runs after the damage is written.
//
// The case that named it: a block emitted `left: -calc(...)`. A leading minus outside calc() is invalid
// (the valid form is `calc(-1 * ...)`), so three of four focus brackets never moved, with every check
// green. It took rendering the frame and noticing with an eye.
//
// WHY ASK THE BROWSER INSTEAD OF PATTERN-MATCHING. `CSS.supports()` and a regex both encode a model of
// what CSS accepts, and that model is wrong the day a property is added. Setting the declaration on a
// scratch element asks the only authority that matters: it either parses or it does not.
//
// IN ISOLATION, one declaration at a time, and that detail is the whole correctness of this function.
// Reading the value back off the REAL element looks equivalent and is not: CSSOM refuses to serialise a
// SHORTHAND whose longhands are not uniform, so `border: 4px solid rgba(...)` plus any `border-*`
// override reads back empty while rendering perfectly. Checked that way, this reported six healthy
// shorthands in this library as broken.
//
// Custom properties (`--x`) are skipped because they accept ANY token by design; an invalid value in one
// only becomes a drop where the variable is USED, and that use is a real declaration this does catch.
let scratch = null;
export function droppedDecls(src) {
  if (typeof document === 'undefined') return []; // not in a browser: nothing to ask
  scratch ||= document.createElement('div');
  const out = [];
  // Style ATTRIBUTES only. A <style> block's rules are the stylesheet's business and are not parsed here.
  for (const m of String(src || '').matchAll(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const raw = m[2] ?? m[3] ?? '';
    // Split on top-level semicolons: a url() or a data: URI may carry one inside parentheses.
    const decls = []; let depth = 0, cur = '';
    for (const ch of raw) {
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ';' && depth === 0) { decls.push(cur); cur = ''; } else cur += ch;
    }
    decls.push(cur);
    for (const d of decls) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const prop = d.slice(0, i).trim(), val = d.slice(i + 1).trim();
      if (!prop || !val || prop.startsWith('--')) continue;
      scratch.style.cssText = '';
      try { scratch.style.setProperty(prop, val); } catch { /* a malformed name throws; that is a drop */ }
      if (scratch.style.getPropertyValue(prop) === '') out.push(`${prop}: ${val}`);
    }
  }
  return out;
}

// The same question for a style OBJECT (the `css` passthrough on a layer), where the author hands over
// {prop: value} rather than markup. Same isolation rule, same reason.
export function droppedProps(css) {
  if (typeof document === 'undefined' || !css || typeof css !== 'object') return [];
  scratch ||= document.createElement('div');
  const out = [];
  for (const [k, v] of Object.entries(css)) {
    if (v == null || k.startsWith('--')) continue;
    // camelCase → kebab, the same conversion `el.style` does when you assign to it.
    const prop = k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    scratch.style.cssText = '';
    try { scratch.style.setProperty(prop, String(v)); } catch { /* malformed name: a drop */ }
    if (scratch.style.getPropertyValue(prop) === '') out.push(`${k}: ${v}`);
  }
  return out;
}
