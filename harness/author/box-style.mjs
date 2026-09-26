
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

export function shadowOrNull(raw) {
  if (!raw || raw === 'none') return null;
  return raw;
}

export function firstFontFamily(raw) {
  if (!raw) return null;
  return raw.split(',')[0].trim().replace(/^["']|["']$/g, '');
}

export function cornerRadii(topLeft, topRight, bottomRight, bottomLeft) {
  const px = (s) => parseFloat(s) || 0;
  const tl = px(topLeft);
  const mixed = [topRight, bottomRight, bottomLeft].some((c) => px(c) !== tl);
  return { borderRadius: tl, borderRadiusMixed: mixed };
}
