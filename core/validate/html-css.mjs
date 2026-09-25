// The `html` LAYER has always had the same trap as the `html` background: CSS transition/animation is
// disabled engine-wide, so a hand-authored fragment that animates in the browser renders as a still and
// says nothing about it. Same check, same message, both places.
//
// A GROUP's children were invisible to this: the walk was a flat pass over cfg.layers, so the identical
// fragment was checked at the top level and unchecked one nesting deep. Nesting is not an exemption.
import { isObj } from './util.mjs';
import { timeCssUsed } from '../type/sanitize-html.js';

export function htmlLayerErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (L.type !== 'html') return;
    // ONE source per fragment, and at least one. `html` is the markup inline; `src` names a .html file
    // preloaded into the same place. Both is ambiguous rather than layered, and neither renders nothing.
    if (L.html != null && L.src != null)
      out.push(`${at} (html) declares BOTH \`html\` and \`src\`. A fragment has ONE source. \`html\` is the markup inline; \`src\` is the same markup in a file. Delete whichever is the leftover.`);
    if (L.html == null && L.src == null)
      out.push(`${at} (html) declares neither \`html\` nor \`src\`, so it renders an empty box. Put the markup inline in \`html\`, or point \`src\` at a .html fragment.`);
    if (L.html == null) return;
    const timeCss = timeCssUsed(L.html);
    if (timeCss) out.push(`${at} (html) uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Animate the layer with the engine's own motion (\`anim\`/\`motion\`/\`vars\`), or drive your CSS from a \`vars\` custom property.`);
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  return out;
}

// CSS PASSTHROUGH. `css` on a layer reaches CSS the layer vocabulary does not name (a box gradient,
// `clip-path`, a layered `box-shadow`, `backdrop-filter`, `mask-image`, pseudo decoration), see
// core/layers/util.js's `applyCss`, which is the ONLY place that reads it, and reads it ONCE, at build
// time. That is exactly why a key the ENGINE rewrites every frame must be refused here rather than
// applied: a build-time write to `opacity`/`transform`/etc. is silently erased the instant the render
// advances past frame 0, and this repo's most-logged bug class is an accepted prop the engine then
// ignores (engine-doctrine/MISTAKES.md #213, #369, #373, #375). Every refusal names the vocabulary that already
// owns the job, never just "no".
const OWNED_CSS = {
  opacity: 'written every frame from the enter/exit envelope (core/timeline/clips.js:220), use `anim` / `motion`',
  transform: 'written every frame by motion tracks and named entrances (core/timeline/clips.js, GSAP), use `motion`',
  animation: 'killed engine-wide (core/tokens.css:28, `* { animation: none !important }`) because a frame is seeked, not played, use `parts` for a seeked entrance into your own markup, or drive a value from `vars`',
  transition: 'killed engine-wide (core/tokens.css:28, `* { transition: none !important }`) for the same reason as `animation`, use `parts` or `vars`',
  position: 'the coordinate system the engine lays the layer out with (films/scene/scene.js), use `x` / `y` / `w`',
  left: "written from the layer's `x` on every build (films/scene/scene.js), set `x` instead",
  top: "written from the layer's `y` on every build (films/scene/scene.js), set `y` instead",
  width: "written from the layer's `w`, and again by the type-specific builder, set `w` instead",
  height: "written from the layer's `h` by the type-specific builder (core/layers/*.js), set `h` instead",
  zIndex: "written every frame from the layer's stacking order (core/timeline/clips.js:150, driven by `track`), set `track` instead",
  pointerEvents: 'written every frame from the layer\'s on/off-window state (core/timeline/clips.js), there is no authoring override for it',
};

export function cssErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (!isObj(L.css)) return;
    for (const k of Object.keys(L.css)) {
      if (OWNED_CSS[k]) out.push(`${at}: css.${k} is engine-owned, ${OWNED_CSS[k]}.`);
    }
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  return out;
}

// EXTERNAL HTML, markup a scene NAMES but does not contain. Two kinds: a `src` fragment on an html
// layer or a bg window, and a CAPTURED component's markup. Both hit the same dead-CSS trap the inline
// `html` string has been checked for all along, and neither was ever looked at: `grep component` in this
// file returned nothing, while core/tokens.css:28 disables transition and animation for all three alike.
// Captured site UI carries hover transitions almost by definition, so this was the loudest silence here.
//
// `read(p)` returns a file's text or null, so this stays pure and browser-safe; only the CLI supplies one.
// A fragment is an ERROR (it is the author's own markup, held to the same bar as `html`). A capture is a
// WARN: the dead CSS was written by the site, not by us, and it costs a still, not a broken render.
export function externalHtmlErrors(cfg, read) {
  const out = [];
  const seen = new Set();
  const checkSrc = (src, at, level, pick) => {
    if (typeof src !== 'string' || seen.has(at + src)) return;
    seen.add(at + src);
    const text = read(src);
    if (text == null) return; // existence is asset-check's question, and the render's
    let markup;
    try { markup = pick(text); } catch (e) { out.push({ level: 'error', msg: `${at} "${src}" is unreadable, ${e.message}` }); return; }
    const timeCss = timeCssUsed(markup);
    if (timeCss) out.push({ level, msg: `${at} "${src}" uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Drive the motion from \`var(--t)\` / a \`vars\` custom property instead.` });
  };
  const asHtml = (t) => t;
  const asCapture = (t) => { const j = JSON.parse(t); return [j.html, ...(j.parts || []).map((p) => p && p.html)].filter((s) => typeof s === 'string').join('\n'); };
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (L.type === 'html') checkSrc(L.src, `${at} (html)`, 'error', asHtml);
    if (L.type === 'component') checkSrc(L.src, `${at} (component)`, 'warn', asCapture);
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  (Array.isArray(cfg.bg) ? cfg.bg : []).forEach((b, i) => { if (isObj(b)) checkSrc(b.src, `bg[${i}]`, 'error', asHtml); });
  return out;
}
