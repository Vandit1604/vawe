// core/surfaces/palette.js — `L.colors` as GL float triples, or null for "use the effect's own
// colourful default". Its own file rather than a helper in index.js so a surface importing it does
// not import the registry that imports the surface.
export const palette = (L) => (Array.isArray(L.colors) && L.colors.length
  ? L.colors.map((h) => { const n = parseInt(String(h).replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; })
  : null);
