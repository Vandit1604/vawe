// core/layers/text.js — a text (or count) layer: theme-styled type + chip box + auto-fit safety.
// Also drives the `typing` per-frame effect. `count` reuses this build (styleText handles its content).
import { isPainting } from '../fonts.js';

export function build(kit, el, L) {
  kit.styleText(el, L, (L.start ?? 0) + (L.duration ?? 2) / 2);
  kit.chipBox(el, L); // text with bg = button/pill/chip in one layer (no sibling rect to desync)
  microType(kit, el, L); // pro-grade type refinements, on by default (opt out with raw:true)
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
export function frame(kit, el, L, t) {
  if (!L.typing) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cps = L.typing === true ? 24 : L.typing;
  const full = L.text || '';
  const n = Math.max(0, Math.min(full.length, Math.floor((t - start) * cps)));
  const caretOn = L.caret !== false && Math.floor((t - start) * 2.2) % 2 === 0;
  el.textContent = full.slice(0, n) + (caretOn && (n < full.length || L.caretHold) ? '▏' : '');
}
