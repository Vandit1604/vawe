// core/ransom.js — the ransom-note / comic-cutout text treatment. Each glyph is cut from a DIFFERENT
// source: its own typeface, paper swatch, rotation and torn edge, so the word reads as pieces glued
// down rather than typed. PURE: every per-glyph choice is a function of (seed, index), so the note is
// byte-identical across render order. Orthogonal to motion — pair with any entrance preset (`fall`,
// `bounce`, `scale`): the preset animates the outer split unit, ransom styles an inner paper tile.
//
// Determinism note: the per-glyph rotation promotes each tile to its own compositing layer. The
// production renderer waits for raster to settle, so `bin/vawe` output is byte-identical; the fast
// `preview.mjs` screenshot does NOT wait and can vary on rotated tiles. Trust the video, not preview,
// for this effect (see docs/MISTAKES.md).
import { hashSeed, random } from './motion.js';
import { registeredFamilies } from './fonts.js';

// Deliberately from DIFFERENT type classes (grotesque · contrast serif · marker hand · geometric ·
// editorial serif · wide display · typewriter mono) so adjacent letters clash the way real cutouts do.
// All are OFL and declared in core/tokens.css; ransomStyle throws if one is not registered rather than
// letting a letter silently fall back to the body face (which would defeat the whole effect).
export const RANSOM_FACES = [
  { family: 'Archivo', weight: 800 },
  { family: 'Fraunces', weight: 800, italic: true },
  { family: 'Caveat', weight: 700 },
  { family: 'Space Grotesk', weight: 700 },
  { family: 'Instrument Serif', weight: 400, italic: true },
  { family: 'Anybody', weight: 900 },
  { family: 'JetBrains Mono', weight: 700 },
  { family: 'Hanken Grotesk', weight: 900 },
];

// Two swatch palettes. `paper` is muted newsprint/kraft (a kidnapper note); `color` is the vivid
// magazine-cutout look — saturated construction-paper grounds, wood-type, a neon tile, colored ink on
// colored stock. `accent` seeds one tile from the theme so either palette still reskins per brand.
// `w` is the pick weight; `mat` marks a material the applier renders specially (neon glow / wood grain).
export function ransomSwatches(accent = '#c8342b') {
  return [
    { bg: '#f5f1e6', ink: '#1a1712', w: 3 }, // newsprint
    { bg: '#efe6cf', ink: '#231d12', w: 3 }, // cream
    { bg: '#fbfaf5', ink: '#111111', w: 2 }, // bright white
    { bg: '#e7d9bd', ink: '#2a2013', w: 2 }, // aged
    { bg: '#dcc7a2', ink: '#2a1d0c', w: 1 }, // kraft
    { bg: '#161009', ink: '#f3ecd9', w: 1 }, // black cutout, light ink
    { bg: accent, ink: '#ffffff', w: 1 },    // accent block
  ];
}
export function ransomColorSwatches(accent = '#d62828') {
  return [
    { bg: '#131313', ink: '#ff2d8b', w: 2, mat: 'neon' }, // black card, hot-pink neon outline
    { bg: '#d62828', ink: '#f4ecd0', w: 2 },              // pillar-box red
    { bg: '#2a9d3f', ink: '#f4ecd0', w: 2 },              // grass green, cream ink
    { bg: '#7a4a1e', ink: '#f0e2c0', w: 2, mat: 'wood' }, // wood type, cream ink
    { bg: '#efe3c0', ink: '#7a4a1e', w: 2 },              // cream stock, brown ink
    { bg: '#e86aa6', ink: '#2f5fd0', w: 2 },              // pink stock, blue ink
    { bg: '#f2c14e', ink: '#141414', w: 2 },              // mustard, black ink
    { bg: '#2f5fd0', ink: '#f4ecd0', w: 1 },              // cobalt, cream ink
    { bg: accent, ink: '#ffffff', w: 1 },                 // theme accent
  ];
}

// weighted pick from a table of { w } entries, deterministic in r∈[0,1).
function pickWeighted(list, r) {
  const total = list.reduce((s, x) => s + (x.w ?? 1), 0);
  let acc = r * total;
  for (const x of list) { acc -= (x.w ?? 1); if (acc < 0) return x; }
  return list[list.length - 1];
}

// A torn-paper clip-path: walk the tile perimeter and jitter each point inward, so the edge is ragged
// on every side. Percentages, so it scales with the tile and stays a pure function of the seed.
//
// Only near-axis-aligned tears here, deliberately. Steeper cuts (a pennant point, a sheared
// parallelogram) read great on paper but their long diagonal edges rasterise non-deterministically
// under the per-glyph rotation — the production render was byte-identical 4/4 with torn edges and
// varied across runs the moment a diagonal shape entered. Determinism wins; the shape stays ragged.
function tornClip(rnd, depth = 7) {
  const n = 4, jit = () => rnd() * depth, pts = [];
  for (let k = 0; k <= n; k++) pts.push([(k / n) * 100, jit()]);                 // top L→R
  for (let k = 1; k <= n; k++) pts.push([100 - jit(), (k / n) * 100]);           // right T→B
  for (let k = 1; k <= n; k++) pts.push([100 - (k / n) * 100, 100 - jit()]);     // bottom R→L
  for (let k = 1; k < n; k++) pts.push([jit(), 100 - (k / n) * 100]);            // left B→T
  return 'polygon(' + pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(',') + ')';
}

// PURE: the full visual spec for glyph `i` of a ransom note. No DOM. Unit-testable, and identical for
// the same (seed, i) on every machine and render pass. `palette`: 'paper' (default) | 'color'.
export function ransomGlyph(seed, i, { accent, faces = RANSOM_FACES, swatches, torn = true, palette = 'paper' } = {}) {
  const sw = swatches || (palette === 'color' ? ransomColorSwatches(accent) : ransomSwatches(accent));
  const r = (salt) => random(`${seed}:${i}:${salt}`);
  const face = faces[hashSeed(`${seed}:${i}:face`) % faces.length];
  const swatch = pickWeighted(sw, r('sw'));
  return {
    family: face.family, weight: face.weight, italic: !!face.italic,
    bg: swatch.bg, ink: swatch.ink, mat: swatch.mat || null,
    rot: +((r('rot') - 0.5) * 12).toFixed(2),   // ±6°
    scale: +(0.9 + r('scale') * 0.24).toFixed(3), // 0.90–1.14
    dy: +((r('dy') - 0.5) * 0.14).toFixed(3),   // ±0.07em baseline wander
    clip: torn ? tornClip((() => { let k = 0; return () => r('clip' + (k++)); })()) : null,
  };
}

// Apply the ransom treatment to split units (from splitText(el,'char')). Structure per glyph:
//   .ku  (unit; the motion preset animates THIS)              ← translate/scale/opacity from the preset
//    └ span.rns-lift  (static drop-shadow, so the tile looks peeled off the page)
//        └ span.rns   (paper tile: face + bg + ink + rotation + torn clip-path)
// Three levels so appearance and motion never fight over `transform`/`filter`. Pure in n.
export function ransomStyle(units, { seed = '', accent, faces = RANSOM_FACES, swatches, palette = 'paper' } = {}) {
  // Fail loud if a ransom face is not registered — a silent fallback would make every letter the body
  // font, which is exactly the effect's opposite. Skipped only where there is no DOM (Node gates).
  if (typeof document !== 'undefined') {
    const reg = registeredFamilies();
    const missing = [...new Set(faces.map((f) => f.family))].filter((f) => !reg.has(f));
    if (missing.length) throw new Error(`ransom: face(s) not registered in tokens.css: ${missing.join(', ')} — add an @font-face or drop them from RANSOM_FACES`);
  }
  // Colour cutouts sit on a real surface, so they cast a stronger, more directional shadow than the
  // flat paper scraps; the vivid grounds also carry a hard-edge letterpress bite.
  const shadow = palette === 'color'
    ? 'drop-shadow(0 3px 3px rgba(15,15,20,.5)) drop-shadow(0 8px 10px rgba(15,15,25,.28))'
    : 'drop-shadow(0 2px 2px rgba(0,0,0,.45))';
  units.forEach((el, i) => {
    const g = ransomGlyph(seed, i, { accent, faces, swatches, palette });
    const glyph = el.textContent;
    el.textContent = '';
    el.style.overflow = 'visible';
    const lift = document.createElement('span');
    lift.className = 'rns-lift';
    lift.style.cssText = `display:inline-block;filter:${shadow}`;
    const tile = document.createElement('span');
    tile.className = 'rns';
    tile.textContent = glyph;
    // Materials give a colour note its variety of SOURCES: `neon` is a lit tube (dark card, the ink
    // colour glowing through a thin stroke), `wood` is letterpress block (a faint grain over the
    // ground). Both are pure CSS layered onto the same tile — no assets, still deterministic in n.
    let material = `background:${g.bg};color:${g.ink};`;
    if (g.mat === 'neon') {
      material = `background:${g.bg};color:${g.ink};` +
        `text-shadow:0 0 4px ${g.ink},0 0 9px ${g.ink};-webkit-text-stroke:.5px ${g.ink};`;
    } else if (g.mat === 'wood') {
      material = `background:${g.bg};color:${g.ink};` +
        `background-image:repeating-linear-gradient(92deg,rgba(0,0,0,.14) 0 1px,rgba(255,255,255,.05) 1px 4px);`;
    }
    tile.style.cssText =
      `display:inline-block;font-family:'${g.family}',sans-serif;font-weight:${g.weight};` +
      `${g.italic ? 'font-style:italic;' : ''}${material}` +
      `padding:.06em .16em;margin:0 .03em;` +
      (g.clip ? `-webkit-clip-path:${g.clip};clip-path:${g.clip};` : '') +
      `transform:translateY(${g.dy}em) rotate(${g.rot}deg) scale(${g.scale});transform-origin:center`;
    lift.appendChild(tile);
    el.appendChild(lift);
  });
}
