// core/layers/text.js — a text (or count) layer: theme-styled type + chip box + auto-fit safety.
// Also drives the `typing` per-frame effect. `count` reuses this build (styleText handles its content).
import { isPainting } from '../fonts.js';

// The `fit` family is guarded because a fit with no width has nothing to fit INTO, and the typing
// family because a caret with no `typing` has no reveal to trail. Everything the shared kit reads
// (font · colour · the chip box) is declared in core/layers/util.js, which reads it.
export const PROPS = {
  text: {}, size: {}, weight: {}, font: {}, ls: {}, tracking: {}, raw: {}, gradient: {},
  w: {}, h: {}, maxLines: {}, fit: {}, fitH: { when: 'fit' },
  typing: {},
  caret: { when: 'typing' }, caretHold: { when: 'typing' },
  untype: { when: 'typing' }, untypeRate: { when: 'typing' },
};

// The second the layer's settled look is judged at. Both styleText and microType ask the same question
// about the ground under this layer, so they must ask it at the same instant or they disagree.
const midT = (L) => (L.start ?? 0) + (L.duration ?? 2) / 2;

export function build(kit, el, L) {
  kit.styleText(el, L, midT(L));
  kit.chipBox(el, L); // text with bg = button/pill/chip in one layer (no sibling rect to desync)
  microType(kit, el, L); // pro-grade type refinements, on by default (opt out with raw:true)
  gradientFill(el, L); // static gradient text fill (dark→light vertical, etc.), the premium display look
  if (L.fit && L.w) { // auto-size to the layer width; `fitH` → multi-line overflow-safe fit
    kit.cam.appendChild(el); // needs to be in-DOM to measure
    const fam = getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '');
    // NOT document.fonts.check() — it is inverted for this question. Measured in headless Chrome it
    // returns true for a family that does not exist and false for a registered-but-unloaded one, so
    // this warning fired on correct fonts and stayed silent on missing ones. isPainting() width-probes
    // the family against three generics instead (all-equal = it really resolved). See core/fonts.js.
    if (!isPainting(fam)) console.warn(`fit: font "${fam}" is NOT painting (falling back) — fit measurement will be wrong. Run: make font-audit`);
    if (L.fitH) kit.fitBox(el, { maxW: L.w, maxH: L.fitH, max: L.size ?? 96, min: 34 });
    else el.style.fontSize = kit.fitText(el.textContent, L.w, { font: (px) => `${L.weight ?? 800} ${px}px ${fam}`, max: L.size ?? 96, min: 34 }) + 'px';
    el.remove();
  } else if (L.w && !L.split && (L.type === 'text' || !L.type) && L.text) {
    // AUTO-FIT SAFETY: a headline that overflows its box gets shrunk so it never clips. Fires only on
    // real overflow (output changes only where already broken). Pure (measured once).
    kit.cam.appendChild(el);
    const lh = parseFloat(getComputedStyle(el).lineHeight) || (L.size ?? 96) * 1.15;
    const maxLines = L.maxLines ?? 5, maxH = L.h ?? maxLines * lh;
    if (el.scrollHeight > maxH + 2 || el.scrollWidth > L.w + 1) kit.fitBox(el, { maxW: L.w, maxH, max: L.size ?? 96, min: 34 });
    el.remove();
  }
}
// gradientCss(g, t): the gradient's CSS at time t (seconds), PURE in t. Supports 2 colours (`from`/`to`)
// or a `colors` array (3+), and three modes via `animate`:
//   • (none)  — a static linear gradient (`angle` deg, 180 = ↓). The premium display fill.
//   • "spin"  — a conic gradient whose start angle rotates, so the colours travel in a CIRCLE around the
//               glyphs (`speed` = turns/sec, default 0.2). This is the "3-colour gradient moving in a circle".
//   • "flow"  — a linear gradient that slides sideways along `angle` (a flowing sweep).
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

// gradientFill: the gradient text fill via background-clip:text. Applied to the container so it clips
// across the whole line (incl. split spans, which inherit). Animated modes are re-applied per frame in
// frame() below; the build only establishes the clip + the t=0 image.
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

// microType: the micro-typography pass — refinements that separate produced from generated, applied to
// every text/count layer by default. Static styles, measured once → deterministic. Skips mono (code)
// where tracking/wrap/ligatures are wrong. Author opts out with raw:true, or overrides ls explicitly.
function microType(kit, el, L) {
  if (L.raw) return;
  const size = L.size ?? 96;
  const mono = L.font === 'mono';
  // Per-size optical tracking (tighter as type scales up) — only when the author set NEITHER
  // letter-spacing prop. The schema declares two synonyms for this one CSS property, `ls` and
  // `tracking`, and this guard used to name only `ls`: styleText applied the author's `tracking`
  // and then this line immediately overwrote it. So `tracking` was accepted, applied, and discarded
  // one statement later — silently, in 12 shipped scenes. (MISTAKES #28; found by `make conformance`.)
  // The polarity argument is the other half of the same lesson: a one-argument call here discards what
  // styleText resolved one statement earlier. #28 was the author's `tracking`; #388 was the light-on-dark
  // optical correction. Light ink irradiates into the dark counters around it, so the same face reads
  // heavier and tighter inverted and needs the gaps opened back up at display sizes.
  if (L.ls == null && L.tracking == null && !mono && kit.trackingFor) {
    el.style.letterSpacing = kit.trackingFor(size, kit.onDark?.(L, midT(L)) ?? false);
  }
  // widow/orphan control: balance headlines (even line lengths), pretty on body (no lone last word).
  if (!mono && !L.split) el.style.textWrap = size >= 40 ? 'balance' : 'pretty';
  // legibility: real kerning + ligatures on display type; crisp rasterization.
  el.style.textRendering = 'optimizeLegibility';
  el.style.fontKerning = mono ? 'none' : 'normal';
  if (!mono) el.style.fontFeatureSettings = '"kern" 1, "liga" 1, "calt" 1';
}

// typedLen: how many characters are visible at local second `lt`. EXPORTED because the rule was
// inline in frame(), which needs a DOM — so the one part of typing that can actually be wrong (the
// count) could not be proven by any test, and only its wiring was checked. Out here `make lib-test`
// asserts the real behaviour with no browser. There is exactly one definition; frame() calls this.
//
// BACKSPACE (`untype`): the line types in, holds, then DELETES itself character by character — the
// "wrote it, thought better of it" beat. Faking it with a fade is the tell, because a fade removes
// the whole line at once and the caret stops meaning anything. Opt-in: `untype` is the local second
// deletion starts, `untypeRate` its speed (defaults to the typing rate — most lines delete as fast
// as they arrived). Still a PURE function of lt: the count is forward-progress minus delete-progress,
// never a running total, so any frame can be rendered on its own out of order.
export function typedLen(lt, { cps, visLen, untype, untypeRate }) {
  let n = Math.floor(lt * cps);
  if (untype != null && lt >= untype) n = Math.min(n, visLen) - Math.floor((lt - untype) * (untypeRate ?? cps));
  return Math.max(0, Math.min(visLen, n));
}

// typing: reveal char-by-char over local time (chars/sec) with a blinking caret. Pure fn of n.
// HTML-SAFE: if the copy carries markup (an accent <span>, <b>…), the VISIBLE characters are revealed
// while the tags are kept intact — so an accent word types IN its colour, exactly like the reference.
// Plain text takes the cheap textContent path. Deterministic (output depends only on n = floor(t·cps)).
export function frame(kit, el, L, t) {
  // animated gradient fill (spin/flow) — recompute the moving image from t. Pure in t; the clip + colour
  // were established at build. Runs every frame the layer is on screen (opacity gates it when off).
  if (L.gradient && L.gradient.animate) {
    const css = gradientCss(L.gradient, t);
    if (css) { el.style.backgroundImage = css.backgroundImage; el.style.backgroundPosition = css.backgroundPosition; }
  }
  if (!L.typing) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cps = L.typing === true ? 24 : L.typing;
  const full = L.text || '';
  const visLen = /[<&]/.test(full) ? stripLen(full) : full.length;
  const lt = t - start;
  const n = typedLen(lt, { cps, visLen, untype: L.untype, untypeRate: L.untypeRate });
  const caret = (L.caret !== false && Math.floor((t - start) * 2.2) % 2 === 0 && (n < visLen || L.caretHold)) ? '▏' : '';
  if (/[<&]/.test(full)) el.innerHTML = revealHtml(full, n) + caret;
  else el.textContent = full.slice(0, n) + caret;
}
// visible-character length of an HTML string (text content only, not tags)
function stripLen(html) { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').length; }
// return the HTML with only the first `n` VISIBLE characters shown, tags preserved (empty tags kept —
// harmless, and they keep the caret's colour context stable across frames).
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
