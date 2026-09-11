// core/layers/text.js. A text (or count) layer: theme-styled type + chip box + auto-fit safety.
// Also drives the `typing` per-frame effect. `count` reuses this build (styleText handles its content).
import { isPainting } from '../engine/fonts.js';
import { mergeProps, propsOf } from '../registry/props.js';
import { measureText } from '../type/type.js';
import { clamp01, easeOutCubic } from '../motion/motion.js';

// The `fit` family is guarded because a fit with no width has nothing to fit INTO, and the typing
// family because a caret with no `typing` has no reveal to trail. A guard has no spelling in a
// signature, so these stay hand-written and union with the auto-derived set below. `font`/`ls`/
// `tracking`/`raw` stay hand-written too: they flow through kit.styleText/microType via `L` passed
// wholesale, never destructured directly in this file, so propsOf cannot see them. Everything else
// the shared kit reads (colour, the chip box) is declared in core/layers/util.js, which reads it.
const GUARDED = {
  fitH: { when: 'fit' },
  caret: { when: 'typing' }, caretHold: { when: 'typing' },
  untype: { when: 'typing' }, untypeRate: { when: 'typing' },
  typingColors: { when: 'typing' },
};

// The second the layer's settled look is judged at. Both styleText and microType ask the same question
// about the ground under this layer, so they must ask it at the same instant or they disagree.
const midT = (L) => (L.start ?? 0) + (L.duration ?? 2) / 2;

// ONE default, one owner. `L.size` is a plain px number by the time any of this runs: a named role
// ("headline") already lowered to the theme's real number at boot, before resolveCoords even ran
// (core/engine/produce.js bakeTextSizeRoles). This is only the "no size at all" fallback, collapsed
// off the five separate `size ?? 96` spellings this file used to carry (build:38/39/45/47, microType).
const TEXT_SIZE_DEFAULT = 96;
const sizeOf = (L) => (typeof L.size === 'number' ? L.size : TEXT_SIZE_DEFAULT);

// The one owner of "what font is this typing layer's caret actually measured against". Populated once
// at build (see the end of build() below), read every frame by expose(). A WeakMap so it costs nothing
// for the other 23 layer types and clears itself with the layer object.
const FONT_CACHE = new WeakMap();

// The props are read off this signature (propsOf, core/props.js), for what build() reads DIRECTLY.
// `fitH` stays off it (guarded, see GUARDED above); `split`/`type` stay `L.x` (shared vocabulary,
// declared centrally, not this file's to declare).
export function build(kit, el, L, { fit, w, h, size, weight, text, maxLines } = L) {
  kit.styleText(el, L, midT(L));
  kit.chipBox(el, L); // text with bg = button/pill/chip in one layer (no sibling rect to desync)
  microType(kit, el, L); // pro-grade type refinements, on by default (opt out with raw:true)
  gradientFill(el, L); // static gradient text fill (dark→light vertical, etc.), the premium display look
  if (fit && w) { // auto-size to the layer width; `fitH` → multi-line overflow-safe fit
    kit.cam.appendChild(el); // needs to be in-DOM to measure
    const fam = getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '');
    // NOT document.fonts.check(): it is inverted for this question. Measured in headless Chrome it
    // returns true for a family that does not exist and false for a registered-but-unloaded one, so
    // this warning fired on correct fonts and stayed silent on missing ones. isPainting() width-probes
    // the family against three generics instead (all-equal = it really resolved). See core/fonts.js.
    if (!isPainting(fam)) console.warn(`fit: font "${fam}" is NOT painting (falling back), fit measurement will be wrong. Run: make font-audit`);
    if (L.fitH) kit.fitBox(el, { maxW: w, maxH: L.fitH, max: sizeOf(L), min: 34 });
    else el.style.fontSize = kit.fitText(el.textContent, w, { font: (px) => `${weight ?? 800} ${px}px ${fam}`, max: sizeOf(L), min: 34 }) + 'px';
    el.remove();
  } else if (w && !L.split && (L.type === 'text' || !L.type) && text) {
    // AUTO-FIT SAFETY: a headline that overflows its box gets shrunk so it never clips. Fires only on
    // real overflow (output changes only where already broken). Pure (measured once).
    kit.cam.appendChild(el);
    const lh = parseFloat(getComputedStyle(el).lineHeight) || sizeOf(L) * 1.15;
    const maxH = h ?? (maxLines ?? 5) * lh;
    if (el.scrollHeight > maxH + 2 || el.scrollWidth > w + 1) kit.fitBox(el, { maxW: w, maxH, max: sizeOf(L), min: 34 });
    el.remove();
  }
  // CACHE THE RESTING FONT, ONCE, for `expose()` below to measure the caret against. `fitText`/`fitBox`
  // above may have shrunk `fontSize` from what `L.size` says, and getComputedStyle only resolves the
  // real cascade while `el` sits under a document (the same reason the fit branches attach-then-remove
  // above), so this reads it the same way rather than re-deriving a font string from the raw JSON,
  // which would silently disagree with the fit branches the moment either one changed alone. Keyed by
  // L, not by id, matching `measured` in scene.js: an id names an AUTHOR'S layer, this is an internal
  // fact about that same object regardless of whether it named itself.
  if (L.typing) {
    kit.cam.appendChild(el);
    const cs = getComputedStyle(el);
    FONT_CACHE.set(L, `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
    el.remove();
  }
}
// gradientCss(g, t): the gradient's CSS at time t (seconds), PURE in t. Supports 2 colours (`from`/`to`)
// or a `colors` array (3+), and three modes via `animate`:
//   • (none): a static linear gradient (`angle` deg, 180 = ↓). The premium display fill.
//   • "spin": a conic gradient whose start angle rotates, so the colours travel in a CIRCLE around the
//               glyphs (`speed` = turns/sec, default 0.2). This is the "3-colour gradient moving in a circle".
//   • "flow": a linear gradient that slides sideways along `angle` (a flowing sweep).
// The trailing colour repeat makes the loop seamless. Because it depends only on t, every frame is
// reproducible regardless of render order (canvas-purity / probe safe).
export function gradientCss(g, t = 0) {
  if (!g || typeof g !== 'object') return null;
  const cols = (Array.isArray(g.colors) && g.colors.length >= 2) ? g.colors : (g.from && g.to ? [g.from, g.to] : null);
  if (!cols) return null;
  const speed = g.speed ?? 0.2; // turns per second
  if (g.animate === 'spin' || g.animate === true) {
    const deg = (((t * speed * 360) % 360) + 360) % 360;
    return { backgroundImage: `conic-gradient(from ${deg.toFixed(2)}deg at 50% 50%, ${[...cols, cols[0]].join(', ')})`, backgroundSize: '100% 100%', backgroundPosition: '0 0' };
  }
  if (g.animate === 'flow') {
    const pos = (((t * speed * 100) % 100) + 100) % 100;
    return { backgroundImage: `linear-gradient(${g.angle ?? 100}deg, ${[...cols, ...cols].join(', ')})`, backgroundSize: '200% 100%', backgroundPosition: `${pos.toFixed(2)}% 0` };
  }
  if (g.animate === 'shimmer') {
    // a bright sheen band sweeps across a solid base fill (the "AI loading" shimmer). colors = [base,
    // highlight]; the base holds the word's colour and a narrow highlight travels through it.
    const base = cols[0], bright = cols[1] || '#ffffff';
    const pos = 100 - (((t * speed * 100) % 100) + 100) % 100;
    return { backgroundImage: `linear-gradient(${g.angle ?? 100}deg, ${base} 0%, ${base} 38%, ${bright} 50%, ${base} 62%, ${base} 100%)`, backgroundSize: '260% 100%', backgroundPosition: `${pos.toFixed(2)}% 0` };
  }
  return { backgroundImage: `linear-gradient(${g.angle ?? 180}deg, ${cols.join(', ')})`, backgroundSize: '100% 100%', backgroundPosition: '0 0' };
}

// gradientFill: the gradient text fill via background-clip:text, on the container. Animated modes are
// re-applied per frame in frame() below; the build only establishes the clip + the t=0 image.
//
// THE CONTAINER IS NOT ENOUGH WHEN THE LAYER IS SPLIT, and this comment used to claim it was. `split`
// moves every glyph into a child span AFTER this runs (scene.js calls core/type.js splitText post-build),
// and `background-image` is not an inherited property while `color`/`-webkit-text-fill-color` are. So the
// units inherited the transparency and none of the paint, and `gradient` + `split` rendered NOTHING.
// Live in a shipped film, and invisible to every gate because a transparent glyph still measures as a
// full-size opaque box (docs/MISTAKES.md #399). paintSplitUnits below gives each unit its own copy.
export function gradientFill(el, L) {
  const g = L.gradient;
  const css = gradientCss(g, 0);
  if (!css) return;
  el.style.backgroundImage = css.backgroundImage;
  // Only animated fills need the size/position/repeat scaffolding; a static gradient stays byte-identical
  // to before (image + clip only), so existing scenes don't re-baseline.
  if (g.animate) {
    el.style.backgroundSize = css.backgroundSize;
    el.style.backgroundPosition = css.backgroundPosition;
    el.style.backgroundRepeat = 'no-repeat';
  }
  el.style.webkitBackgroundClip = 'text';
  el.style.backgroundClip = 'text';
  el.style.color = 'transparent';
  el.style.webkitTextFillColor = 'transparent';
}

// splitFillCss(css, box, offset): the fill ONE split unit must carry, resolved in the CONTAINER's
// coordinates. PURE, and exported so `make lib-test` can assert the resolved paint with no browser.
// The trap this bug set is that a DOM check passes on transparent glyphs, so geometry proves nothing.
//
// The offset is the whole point. A unit painted with the raw gradient restarts the ramp inside every
// word, which reads as stripes rather than one sweep. Resolving the image box against the container and
// then shifting it back by the unit's own position makes every unit sample the same continuous field.
export function splitFillCss(css, { w, h }, { dx, dy }) {
  // percentages in `background-size` resolve against the box; in `background-position`, against the
  // slack between box and image. gradientCss only ever emits `<n>% <n>%` and `<n>% 0`, so both parse.
  const pct = (v, base) => (String(v).trim().endsWith('%') ? (parseFloat(v) / 100) * base : parseFloat(v) || 0);
  const [sw, sh] = String(css.backgroundSize || '100% 100%').trim().split(/\s+/);
  const bw = pct(sw, w), bh = pct(sh ?? sw, h);
  const [px, py] = String(css.backgroundPosition || '0 0').trim().split(/\s+/);
  const x0 = pct(px, w - bw), y0 = pct(py ?? '0', h - bh);
  return {
    backgroundImage: css.backgroundImage,
    backgroundSize: `${bw.toFixed(2)}px ${bh.toFixed(2)}px`,
    backgroundPosition: `${(x0 - dx).toFixed(2)}px ${(y0 - dy).toFixed(2)}px`,
    backgroundRepeat: 'no-repeat',
    webkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    webkitTextFillColor: 'transparent',
  };
}

// offset of a node in the page's offset chain. Read through offsetLeft/offsetTop and NOT through
// getBoundingClientRect, because the units are transformed every frame by the kinetic presets: a rect
// would move with the animation and the fill would swim, an offset does not.
const offsetXY = (n) => { let x = 0, y = 0; for (let p = n; p; p = p.offsetParent) { x += p.offsetLeft; y += p.offsetTop; } return { x, y }; };

// paintSplitUnits: hand every `.ku` unit its own copy of the container's fill. Runs per frame rather
// than at build because the units do not exist yet when build() runs, and it stays pure in t: the
// offsets come from layout, which is fixed once the layer is built.
function paintSplitUnits(el, L, t) {
  const units = el.querySelectorAll('.ku');
  if (!units.length) return;
  const css = gradientCss(L.gradient, t);
  if (!css) return;
  const box = { w: el.clientWidth, h: el.clientHeight };
  const base = offsetXY(el);
  for (const u of units) {
    const o = offsetXY(u);
    Object.assign(u.style, splitFillCss(css, box, { dx: o.x - base.x, dy: o.y - base.y }));
  }
}

// microType: the micro-typography pass, refinements that separate produced from generated, applied to
// every text/count layer by default. Static styles, measured once → deterministic. Skips mono (code)
// where tracking/wrap/ligatures are wrong. Author opts out with raw:true, or overrides ls explicitly.
function microType(kit, el, L) {
  if (L.raw) return;
  const size = sizeOf(L);
  const mono = L.font === 'mono';
  // NO LETTER-SPACING HERE, EVER. This pass used to re-write it one statement after styleText had
  // resolved it, and that single statement silently discarded two different upstream decisions: the
  // author's own `tracking` in 12 shipped scenes (MISTAKES #28) and the light-on-dark optical
  // correction (#388). Both were patched by threading one more argument into this line, which left the
  // trap set for whoever wrote the third. The resolution now happens exactly once, in `trackingCss` in
  // core/layers/util.js, and it already knows about mono, `raw`, `ls`/`tracking` and the polarity.
  // A new opinion about tracking belongs in that function. `make lib-test` fails if it is written here.
  // widow/orphan control: balance headlines (even line lengths), pretty on body (no lone last word).
  if (!mono && !L.split) el.style.textWrap = size >= 40 ? 'balance' : 'pretty';
  // legibility: real kerning + ligatures on display type; crisp rasterization.
  el.style.textRendering = 'optimizeLegibility';
  el.style.fontKerning = mono ? 'none' : 'normal';
  if (!mono) el.style.fontFeatureSettings = '"kern" 1, "liga" 1, "calt" 1';
}

// typedLen: how many characters are visible at local second `lt`. EXPORTED because the rule was
// inline in frame(), which needs a DOM, so the one part of typing that can actually be wrong (the
// count) could not be proven by any test, and only its wiring was checked. Out here `make lib-test`
// asserts the real behaviour with no browser. There is exactly one definition; frame() calls this.
//
// BACKSPACE (`untype`): the line types in, holds, then DELETES itself character by character, the
// "wrote it, thought better of it" beat. Faking it with a fade is the tell, because a fade removes
// the whole line at once and the caret stops meaning anything. Opt-in: `untype` is the local second
// deletion starts, `untypeRate` its speed (defaults to the typing rate, most lines delete as fast
// as they arrived). Still a PURE function of lt: the count is forward-progress minus delete-progress,
// never a running total, so any frame can be rendered on its own out of order.
export function typedLen(lt, { cps, visLen, untype, untypeRate }) {
  let n = Math.floor(lt * cps);
  if (untype != null && lt >= untype) n = Math.min(n, visLen) - Math.floor((lt - untype) * (untypeRate ?? cps));
  return Math.max(0, Math.min(visLen, n));
}

// refreshGradient: the per-frame half of the gradient fill, split out of frame() so its own two
// branches (animated recompute, split-unit repaint) do not count against the typing state machine
// below. Pure in t; the clip + colour were established at build.
function refreshGradient(el, L, gradient, t) {
  // animated gradient fill (spin/flow): recompute the moving image from t.
  // Runs every frame the layer is on screen (opacity gates it when off).
  if (gradient.animate) {
    const css = gradientCss(gradient, t);
    if (css) { el.style.backgroundImage = css.backgroundImage; el.style.backgroundPosition = css.backgroundPosition; }
  }
  // Static fills come through here too: for a split layer the container's paint reaches no glyph, so
  // this is not a refresh of an already-correct frame, it is the only thing that paints one.
  paintSplitUnits(el, L, t);
}

// typing: reveal char-by-char over local time (chars/sec) with a blinking caret. Pure fn of n.
// HTML-SAFE: if the copy carries markup (an accent <span>, <b>…), the VISIBLE characters are revealed
// while the tags are kept intact, so an accent word types IN its colour, exactly like the reference.
// Plain text takes the cheap textContent path. Deterministic (output depends only on n = floor(t·cps)).
// The pattern sits in the SIXTH slot: core/layers/index.js calls frame(kit, el, L, t, scene) with
// five arguments, so a pattern any earlier destructures `scene` and every prop reads undefined
// (lib-test asserts the arity). `scene` itself is unused here. `caret`/`caretHold`/`untype`/
// `untypeRate` stay off the signature (guarded, see GUARDED above); `start`/`duration` stay `L.x`
// (shared vocabulary).
export function frame(kit, el, L, t, scene, { gradient, typing, text } = L) {
  if (gradient) refreshGradient(el, L, gradient, t);
  if (!typing) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  // THE BUILT LINE, STASHED ON THE FIRST FRAME THIS LAYER IS ASKED FOR, and put back the moment the
  // layer is off its window. The early return used to leave the element holding whatever the LAST
  // in-window frame typed, so `renderFrame(72)` produced "Mee▏" on a tab that had already drawn frame
  // 66 and the whole line on a tab that had not. The capture shards round-robin, so which frames a tab
  // drew before this one is decided by the worker count: one render at -workers 1 and the same render
  // at -workers 6 disagreed (docs/MISTAKES.md #507). Every per-frame write in this engine is
  // authoritative; this one had an exit that was not.
  if (el.__hsTypeBase == null) el.__hsTypeBase = el.innerHTML;
  if (!(t >= start && t < end)) {
    if (el.innerHTML !== el.__hsTypeBase) el.innerHTML = el.__hsTypeBase;
    return;
  }
  const cps = typing === true ? 24 : typing;
  const full = text || '';
  const visLen = /[<&]/.test(full) ? stripLen(full) : full.length;
  const lt = t - start;
  const n = typedLen(lt, { cps, visLen, untype: L.untype, untypeRate: L.untypeRate });
  const caret = (L.caret !== false && Math.floor((t - start) * 2.2) % 2 === 0 && (n < visLen || L.caretHold)) ? '▏' : '';
  if (L.typingColors) el.innerHTML = colorizeTyped(full, n, lt, cps, L.typingColors) + caret;
  else if (/[<&]/.test(full)) el.innerHTML = revealHtml(full, n) + caret;
  else el.textContent = full.slice(0, n) + caret;
}

// typingColorFor: pure fn of (dt, i) → the CSS colour for word `i`, `dt` seconds after ITS OWN first
// character was revealed. Reuses colorWave's ramp shape and dial names (core/kinetic/presets.js):
// `colors` cycles per word (like colorWave's `colors[i % n]`), `hold` is the same 0..1 fraction of
// the ramp spent at full flash before easing out. TYPING_RAMP is the ramp's fixed length in seconds:
// typing has no per-unit `each` window to borrow (that belongs to `split`, which typing can't combine
// with), so the ramp needs its own clock instead.
const TYPING_RAMP = 0.6;
export function typingColorFor(dt, i, { colors, hold = 0.5 } = {}) {
  if (!colors || !colors.length || dt == null) return null;
  const flash = colors[i % colors.length];
  if (dt <= 0) return flash;
  const u = clamp01(dt / TYPING_RAMP);
  const e = easeOutCubic(clamp01((u - hold) / (1 - hold)));
  return `color-mix(in srgb, ${flash} ${((1 - e) * 100).toFixed(1)}%, var(--layer-ink, var(--ink)))`;
}

// colorizeTyped: the shown text (revealHtml's output for markup, a plain slice otherwise), with
// each revealed WORD wrapped in a span coloured by typingColorFor. Word index and each word's own
// start char are read off the FULL text (untruncated), so a word already fully typed keeps the same
// identity and start time frame to frame, out of order or not: no state, only (full, n, lt, cps) in.
//
// PLAIN TEXT NEVER TOUCHES A DOM: the branch below is a pure string splice (words come from the same
// full-text slice frame() already committed to using), which is what makes typingColorFor's ramp and
// the word-boundary maths independently testable with plain node:assert (make lib-test). Markup
// (`<b>`, an entity) is the one case that must go through a real HTML tree, exactly as revealHtml
// already does for the same reason, and colorizeMarkup below does that walk.
export function colorizeTyped(full, n, lt, cps, opts) {
  const hasMarkup = /[<&]/.test(full);
  const words = [...(hasMarkup ? plainTextOf(full) : full).matchAll(/\S+/g)];
  if (hasMarkup) return colorizeMarkup(full, n, words, lt, cps, opts);
  const shown = full.slice(0, n);
  let out = '', pos = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    if (w.index >= shown.length) break;
    out += shown.slice(pos, w.index); // whitespace/gap before this word, verbatim
    const end = Math.min(shown.length, w.index + w[0].length);
    out += `<span style="color:${typingColorFor(lt - w.index / cps, wi, opts)}">${shown.slice(w.index, end)}</span>`;
    pos = end;
    if (end < w.index + w[0].length) break; // n cut this word mid-way: nothing after it is shown
  }
  return out + shown.slice(pos);
}
// the markup branch of colorizeTyped: walks revealHtml's DOM (tags already preserved, truncated to
// n) and wraps each text run's word-characters in a coloured span, leaving existing tags (`<b>`,
// caret-adjacent empties) exactly where revealHtml put them.
function colorizeMarkup(full, n, words, lt, cps, opts) {
  const wordAt = (pos) => words.findIndex((w) => pos >= w.index && pos < w.index + w[0].length);
  const root = document.createElement('div');
  root.innerHTML = revealHtml(full, n);
  let charIdx = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const text = child.textContent;
        const frag = document.createDocumentFragment();
        let i = 0;
        while (i < text.length) {
          const pos = charIdx + i;
          const wi = wordAt(pos);
          if (wi === -1) { frag.appendChild(document.createTextNode(text[i])); i++; continue; }
          const w = words[wi];
          const end = Math.min(text.length, i + (w.index + w[0].length - pos));
          const span = document.createElement('span');
          span.style.color = typingColorFor(lt - w.index / cps, wi, opts);
          span.textContent = text.slice(i, end);
          frag.appendChild(span);
          i = end;
        }
        child.replaceWith(frag);
        charIdx += text.length;
      } else if (child.nodeType === 1) walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}
// the plain textContent of an HTML (or plain) string. One owner: stripLen and colorizeTyped both
// need "what does this read as, tags gone", never two ways to strip the same markup.
function plainTextOf(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }

// expose(L, t, scene): the caret's LOCAL x (px from the text's own flow start, no chip padding, no
// layer transform) and how far through the line typing has got, 0..1. `scene` is unread, kept only
// for the shape every `expose` shares (core/layers/index.js).
//
// LOCAL ON PURPOSE, matching the split `boxOf` already makes between unscaled geometry and the
// scale/rotation composed elsewhere: a consumer that wants a SCREEN position combines this with
// `scene.boxOf(L.id).x`, rather than this file re-deriving the layer's own box a second way.
//
// Measured with the SAME reveal `frame()` just wrote (typedLen, then the tags stripped the same way
// `stripLen` does), so a caret binding can never drift from what the eye actually sees: one owner of
// "how much of the line is showing", read twice instead of computed twice.
export function expose(L, t) {
  if (!L.typing) return null;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return null;
  const font = FONT_CACHE.get(L);
  if (!font) return null; // build() only caches this for a typing layer; absence means expose ran before build
  const cps = L.typing === true ? 24 : L.typing;
  const full = L.text || '';
  const visLen = /[<&]/.test(full) ? stripLen(full) : full.length;
  const n = typedLen(t - start, { cps, visLen, untype: L.untype, untypeRate: L.untypeRate });
  const shown = /[<&]/.test(full) ? plainPrefix(full, n) : full.slice(0, n);
  return Object.freeze({ caretX: measureText(shown, font), progress: visLen ? n / visLen : 1 });
}
// visible-character length of an HTML string (text content only, not tags)
function stripLen(html) { return plainTextOf(html).length; }
// return the HTML with only the first `n` VISIBLE characters shown, tags preserved (empty tags kept.
// Harmless, and they keep the caret's colour context stable across frames).
function revealHtml(html, n) {
  const root = document.createElement('div');
  root.innerHTML = html;
  let count = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const text = child.textContent;
        if (count >= n) child.textContent = '';
        else if (count + text.length <= n) count += text.length;
        else { child.textContent = text.slice(0, n - count); count = n; }
      } else if (child.nodeType === 1) walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}
// the plain visible text of revealHtml's first n characters (tags stripped, for measureText: canvas
// text has no tags to render, so measuring markup would count characters that never draw as pixels).
function plainPrefix(html, n) { const d = document.createElement('div'); d.innerHTML = revealHtml(html, n); return d.textContent || ''; }

// Both signatures declare, because a prop read only on the frame path is just as real as one read at
// build time. `GUARDED` is unioned in alongside them: a guard has no spelling in a signature (mergeProps,
// core/props.js).
export const PROPS = mergeProps(propsOf(build), propsOf(frame), GUARDED, {
  font: {}, ls: {}, tracking: {}, raw: {},
});

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "theme-styled words in an optional chip box, auto-fit to a width; the typewriter reveal and caret live here too; `typingColors` flashes each word its own accent colour the instant it types, then settles to ink";
