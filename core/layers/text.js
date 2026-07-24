// core/layers/text.js — a text (or count) layer: theme-styled type + chip box + auto-fit safety.
// Also drives the `typing` per-frame effect. `count` reuses this build (styleText handles its content).
import { isPainting } from '../fonts.js';

export function build(kit, el, L) {
  kit.styleText(el, L, (L.start ?? 0) + (L.duration ?? 2) / 2);
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
// gradientFill: a STATIC gradient across the glyphs via background-clip:text (distinct from the animated
// `gradient` PRESET, which sweeps a shimmer). The premium display treatment real motion-graphics use —
// e.g. a dark-top→light-bottom fade on a hero word. `gradient: { from, to, angle? }` (angle 180 = ↓).
// Applied to the container so it clips across the whole line (incl. split spans, which inherit).
export function gradientFill(el, L) {
  const g = L.gradient;
  if (!g || typeof g !== 'object' || !g.from || !g.to) return;
  el.style.backgroundImage = `linear-gradient(${g.angle ?? 180}deg, ${g.from}, ${g.to})`;
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
  if (L.ls == null && L.tracking == null && !mono && kit.trackingFor) el.style.letterSpacing = kit.trackingFor(size);
  // widow/orphan control: balance headlines (even line lengths), pretty on body (no lone last word).
  if (!mono && !L.split) el.style.textWrap = size >= 40 ? 'balance' : 'pretty';
  // legibility: real kerning + ligatures on display type; crisp rasterization.
  el.style.textRendering = 'optimizeLegibility';
  el.style.fontKerning = mono ? 'none' : 'normal';
  if (!mono) el.style.fontFeatureSettings = '"kern" 1, "liga" 1, "calt" 1';
}

// typing: reveal char-by-char over local time (chars/sec) with a blinking caret. Pure fn of n.
// HTML-SAFE: if the copy carries markup (an accent <span>, <b>…), the VISIBLE characters are revealed
// while the tags are kept intact — so an accent word types IN its colour, exactly like the reference.
// Plain text takes the cheap textContent path. Deterministic (output depends only on n = floor(t·cps)).
export function frame(kit, el, L, t) {
  if (!L.typing) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cps = L.typing === true ? 24 : L.typing;
  const full = L.text || '';
  const visLen = /[<&]/.test(full) ? stripLen(full) : full.length;
  const n = Math.max(0, Math.min(visLen, Math.floor((t - start) * cps)));
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
