// core/color/engine.js: the engine's one colour grammar (parseColor/colorAlpha/parseColorRGB) and
// its canonical WCAG contrast/lightness check (isLightBg/contrastRatio/ensureContrast). Moved
// verbatim out of core/motion/motion.js: colour is not motion, and this is the backward dependency
// core/color/linear.js and core/color/parse.js used to reach OUT of the package for. Pure, DOM-free,
// safe to import in node (lib-test).
//
// THE colour parser for the whole engine. Everything that reads a colour string reads it here:
// core/filters.js (grade stops, glow flood), the WCAG maths below, core/lightfield/colour.js, and
// the designspec gate.
//
// WHY IT LIVES IN ONE PLACE NOW. There used to be four copies with three axes of drift, and the
// damage was the usual shape: a colour the GATE accepted, the ENGINE rejected, and nothing said so.
//   · core/filters.js          #rgb · #rrggbb · rgb()/rgba() with INTEGER parts → [r,g,b]
//   · core/motion.js           the same, plus an array passthrough, and its rgb() form was
//                              UNANCHORED, so "foo rgb(1,2,3)" parsed and filters.js said null
//   · core/lightfield/colour.js 6-digit hex ONLY, deliberately (see that file)
//   · quality/gates/designspec-check.mjs  #rgb · #rgba · #rrggbb · #rrggbbaa · rgb()/rgba() with
//                              FLOAT parts → {r,g,b}. The gate alone understood 8-digit hex, so a
//                              scene could carry "#0b0b0fcc", be graded against the palette, and
//                              then reach a grade or a glow that read null and silently fell back.
// This accepts the UNION of those grammars and is ANCHORED at both ends. The unanchored form was a
// bug, not a feature: it made a typo ("colour: #fff rgb(1,2,3)") parse as a colour instead of
// failing, which is exactly the silent substitution engine-doctrine/MISTAKES.md keeps warning about.
//
// Return shape is [r,g,b], because that is what the engine's own call sites already destructure.
// Channels are NOT rounded: the gate measures palette distance on floats, and rounding here would
// move its numbers. `parseColorRGB` is the thin {r,g,b} adapter for the gate and the lightfield.
//
// Grammar, exactly:
//   [r,g,b]        passed through untouched (a caller that already resolved a colour)
//   #rgb  #rgba    each digit doubled; the alpha digit is parsed and dropped
//   #rrggbb  #rrggbbaa   the alpha pair is parsed and dropped
//   rgb()/rgba()   3+ finite numbers separated by commas, whitespace or a slash; alpha dropped
// Anything else → null. Alpha is dropped everywhere because every consumer wants opaque channels;
// a caller that needs the alpha must read it off the source string itself.
export function parseColor(c) {
  if (Array.isArray(c)) return c;
  const s = String(c ?? '').trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((d) => d + d).join('');
    else if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6) return null; // 5 and 7 digits are a typo, not a colour
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) return p.slice(0, 3);
  }
  return null;
}

// The alpha parseColor deliberately drops, for the one caller that needs it: an SVG filter cannot use
// a CSS colour, so a tint written `rgba(255,60,60,0.75)` has to arrive as components AND a weight.
// Same grammar as above, read off the source string exactly as that header instructs. 1 when absent.
export function colorAlpha(c) {
  const s = String(c ?? '').trim();
  const hex = /^#([0-9a-f]{4}|[0-9a-f]{8})$/i.exec(s);
  if (hex) {
    const h = hex[1];
    const a = h.length === 4 ? h[3] + h[3] : h.slice(6, 8);
    return parseInt(a, 16) / 255;
  }
  const m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length >= 4 && Number.isFinite(p[3])) return Math.max(0, Math.min(1, p[3]));
  }
  return 1;
}

// {r,g,b} adapter. The gate and the lightfield read named channels; the engine reads the tuple.
// One parser, two shapes, so neither side had to be rewritten to share the grammar.
export function parseColorRGB(c) {
  const t = parseColor(c);
  return t ? { r: t[0], g: t[1], b: t[2] } : null;
}

// THE one colour distance, alpha included. quality/gates/design-drift.mjs and harness/lib/design-spec.mjs
// each had their own euclidean RGB distance, and both dropped alpha the way parseColorRGB does for its
// own callers (they want opaque channels). A gate comparing DECLARED colours can't afford that drop:
// `rgba(255,255,255,0.72)` and `#ffffff` are the same RGB triple and a different colour on screen, so a
// gate that reads only RGB calls a 72%-white a match for solid white. Alpha is scaled to 0-255 and
// folded into the same euclidean sum as a fourth channel, so it sits on the existing tolerances
// (COLOR_TOL = 6) instead of needing one of its own: a 0.28 alpha gap is ~71 units, far past any of them.
// Returns Infinity when either colour fails to parse, same as an unmatched candidate.
export function colorDistance(a, b) {
  const ca = parseColor(a), cb = parseColor(b);
  if (!ca || !cb) return Infinity;
  const aa = colorAlpha(a) * 255, ab = colorAlpha(b) * 255;
  return Math.sqrt((ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2 + (ca[2] - cb[2]) ** 2 + (aa - ab) ** 2);
}

// ---------- color contrast (WCAG) ----------
// contrastRatio >= 1 (21 = black/white).
// ensureContrast: keep fg if it clears min against bg, else return whichever of light/dark reads.
/** Is this background LIGHT? One answer, in linear light, for every consumer that has to choose
 *  between dark ink and light ink.
 *
 *  There were two answers and they disagreed on 5.8% of the sRGB cube. `core/engine/boot.js` and
 *  `core/engine/produce.js` both weighted the GAMMA-ENCODED channels, `0.2126r + 0.7152g + 0.0722b` on the
 *  raw 0-1 values, while the four copies that grade contrast linearise first, as WCAG requires. The
 *  disagreement is concentrated exactly where it hurts: SATURATED colours. `#ef720b`, a hot orange,
 *  reads 0.522 gamma (dark) and 0.304 linear (light), so a brand shipping an orange backdrop got the
 *  producer choosing dark ink for a surface the auditor then graded as light. Neutrals agree, which is
 *  why nothing had surfaced: 0 of the 78 background colours across every theme in this repo changes
 *  classification under this fix.
 *
 *  The threshold is 0.26 because that is where the old ones already sat. Gamma 0.55 and 140/255 = 0.549
 *  are the same point, and 0.55 in sRGB linearises to ≈0.26, so this is the SAME line, drawn in the
 *  space where the weights mean something. */
export const isLightBg = (c) => {
  const rgb = parseColor(c);
  return rgb ? relLum(rgb) > 0.26 : true;   // unreadable → light, the white-first common case
};

const relLum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrastRatio(fg, bg) {
  const a = parseColor(fg), b = parseColor(bg);
  if (!a || !b) return 21;
  const [hi, lo] = relLum(a) > relLum(b) ? [relLum(a), relLum(b)] : [relLum(b), relLum(a)];
  return (hi + 0.05) / (lo + 0.05);
}
export function ensureContrast(fg, bg, { min = 3, light = '#ffffff', dark = '#141414' } = {}) {
  if (contrastRatio(fg, bg) >= min) return fg;
  return contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
}
