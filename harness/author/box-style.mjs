// box-style.mjs: pure string helpers for the computed-style fields preview-fragment.mjs records per
// box. Kept separate from getFragBoxes (which runs INSIDE the browser via page.evaluate and cannot
// import anything, since puppeteer serialises that function to source text) so the raw-to-final
// mapping is one place, tested without a browser.
//
// getFragBoxes hands back the RAW getComputedStyle strings; these run in Node on the result.

// getComputedStyle always resolves color to rgb()/rgba(), never a name or hex, so that is the only
// shape this has to parse. Fully transparent (alpha 0, or the `transparent` keyword) means "no paint
// here" and is reported as null rather than a colour nobody can see.
export function normalizeColor(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === 'transparent') return null;
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (!m) return s; // already a hex or a named colour some other computed path produced
  const [, r, g, b, aStr] = m;
  const a = aStr === undefined ? 1 : parseFloat(aStr);
  if (a === 0) return null;
  if (a < 1) return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  const hex = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// `box-shadow: none` is the computed value for "no shadow"; every browser reports it as the literal
// string 'none', never absent, so that is the one case worth naming.
export function shadowOrNull(raw) {
  if (!raw || raw === 'none') return null;
  return raw;
}

// font-family's computed value is the whole stack ('"Inter", sans-serif'); the author only wants
// the first, unquoted.
export function firstFontFamily(raw) {
  if (!raw) return null;
  return raw.split(',')[0].trim().replace(/^["']|["']$/g, '');
}

// Each corner's computed radius arrives as its own px string. Report the top-left value plus whether
// any corner disagrees with it, rather than four separate fields nobody asked for.
export function cornerRadii(topLeft, topRight, bottomRight, bottomLeft) {
  const px = (s) => parseFloat(s) || 0;
  const tl = px(topLeft);
  const mixed = [topRight, bottomRight, bottomLeft].some((c) => px(c) !== tl);
  return { borderRadius: tl, borderRadiusMixed: mixed };
}
