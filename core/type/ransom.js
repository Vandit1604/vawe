// core/ransom.js: the ransom-note / comic-cutout text treatment. Each glyph is cut from a DIFFERENT
// source: its own typeface, paper swatch, rotation and torn edge, so the word reads as pieces glued
// down rather than typed. PURE: every per-glyph choice is a function of (seed, index), so the note is
// byte-identical across render order. Orthogonal to motion, pair with any entrance preset (`fall`,
// `bounce`, `scale`): the preset animates the outer split unit, ransom styles an inner paper tile.
//
// Determinism note: the per-glyph rotation promotes each tile to its own compositing layer. The
// production renderer waits for raster to settle, so `bin/vawe` output is byte-identical; the fast
// `preview.mjs` screenshot does NOT wait and can vary on rotated tiles. Trust the video, not preview,
// for this effect (see docs/MISTAKES.md).
import { hashSeed, random } from '../motion/motion.js';
import { registeredFamilies } from '../engine/fonts.js';
import { defineRegistry } from '../registry/registry.js';

// Deliberately from DIFFERENT type classes (grotesque · contrast serif · marker hand · geometric ·
// editorial serif · wide display · typewriter mono) so adjacent letters clash the way real cutouts do.
// All are OFL and declared in core/tokens.css; ransomStyle throws if one is not registered rather than
// letting a letter silently fall back to the body face (which would defeat the whole effect).
//
// A REGISTRY, BECAUSE A TYPEFACE IS A CHOICE AN AUTHOR MAKES. This was a bare array, so all eight faces
// reached `make arsenal` with no blurb and were findable only by someone who already typed the name:
// `Q="a handwriting face"` answered nothing while `Caveat` sat here. The catalogue called the family
// self-describing ("a typeface, see it, do not read about it"), which is true of the LOOK and false of
// the SEARCH: nobody looks at a face they cannot reach. The blurbs say what each one feels like and
// what it is for, since the name is already indexed (core/registry.js refuses a blurb that only says
// its own name back).
//
// ORDER IS LOAD-BEARING. ransomGlyph picks by `hash % faces.length`, so the sequence below IS the
// per-glyph choice. Object keys keep insertion order, and RANSOM_FACES is still the same array in the
// same order, so no rendered frame moves.
const FACES = {
  Archivo: { family: 'Archivo', weight: 800 },
  Fraunces: { family: 'Fraunces', weight: 800, italic: true },
  Caveat: { family: 'Caveat', weight: 700 },
  'Space Grotesk': { family: 'Space Grotesk', weight: 700 },
  'Instrument Serif': { family: 'Instrument Serif', weight: 400, italic: true },
  Anybody: { family: 'Anybody', weight: 900 },
  'JetBrains Mono': { family: 'JetBrains Mono', weight: 700 },
  'Hanken Grotesk': { family: 'Hanken Grotesk', weight: 900 },
};

export const RANSOM_REGISTRY = defineRegistry('ransom face', FACES, {
  // PROSE, DELIBERATELY, so no paste is printed. The slot takes a list of `{family, weight}` records
  // and the paste grammar can only put a name at a path, so a path here would print
  // `"faces": "Caveat"`, which the engine reads as a record and renders nothing from.
  slot: 'ransom.faces (a list of {family, weight} records on a text layer)',
  // The words an author types who does not know the face by name, never printed, only searched.
  aka: { Caveat: ['handwriting font', 'handwritten font', 'cursive font', 'sticky note'] },
  blurbs: {
    Archivo: 'a workhorse grotesque cut heavy and wide: the neutral, newspaper-headline shout of the set',
    Fraunces: 'a high-contrast display serif with a soft wobble, old seed-catalogue flavour, slanted here',
    Caveat: 'handwriting, a felt-tip scrawl: the letter somebody wrote by hand and stuck down',
    'Space Grotesk': 'a technical geometric sans, cool and even, the computer-lab voice in the note',
    'Instrument Serif': 'a slanted editorial serif with thin stems: magazine headline, elegant against the noise',
    Anybody: 'an extremely wide display sans at its heaviest: poster shout, sci-fi proportions',
    'JetBrains Mono': 'a monospace typewriter for code and terminals, every letter the same width',
    'Hanken Grotesk': 'a friendly rounded sans at maximum weight: soft, solid, no edge to it',
  },
  catalog: {
    title: 'Ransom faces',
    tag: 'text',
    intro: '`ransom` on a text layer: per-glyph face mixing, from this fixed set. Each glyph is cut from a different one, so the eight are picked to CLASH (grotesque · contrast serif · marker hand · geometric · editorial serif · wide display · typewriter mono). Pick a subset with `ransom: { faces: [...] }` when you want a narrower clash.',
    usage: (n, { text }) => text({ split: 'char', ransom: { faces: [FACES[n]] } }),
    noPreview: 'a typeface is judged by looking. The ransom clip on /showcase sets all eight.',
  },
});

// The ARRAY view, in the order above, because every reader here wants the sequence and not the map.
export const RANSOM_FACES = Object.values(FACES);
// Two swatch palettes. `paper` is muted newsprint/kraft (a kidnapper note); `color` is the vivid
// magazine-cutout look, saturated construction-paper grounds, wood-type, a neon tile, colored ink on
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
// EVERY PAIR IN THIS TABLE HAS TO BE READABLE. It is a house palette: two scenes drew the pink/blue
// pair and the audit reported it once per CHARACTER, which reads as fifteen problems and is one. Cobalt
// ink on pink stock measured 1.92:1 and cream on grass green 2.96:1, both under the large-text bar of
// 3.0. Deepening the two inks keeps the ransom-note look (the hues are unchanged, a blue ink on pink
// stock is still a blue ink on pink stock) and makes the letters legible. Checked in linear light with
// the same relative-luminance formula core/motion.js and quality/audit.mjs use. docs/MISTAKES.md #378.
export function ransomColorSwatches(accent = '#d62828') {
  return [
    { bg: '#131313', ink: '#ff2d8b', w: 2, mat: 'neon' }, // black card, hot-pink neon outline
    { bg: '#d62828', ink: '#f4ecd0', w: 2 },              // pillar-box red
    { bg: '#238a35', ink: '#f4ecd0', w: 2 },              // grass green, cream ink · darkened from #2a9d3f, which put cream at 2.96:1
    { bg: '#7a4a1e', ink: '#f0e2c0', w: 2, mat: 'wood' }, // wood type, cream ink
    { bg: '#efe3c0', ink: '#7a4a1e', w: 2 },              // cream stock, brown ink
    { bg: '#e86aa6', ink: '#1e3270', w: 2 },              // pink stock, blue ink · the cobalt #2f5fd0 read 1.92:1 here
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
// under the per-glyph rotation. The production render was byte-identical 4/4 with torn edges and
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
export function ransomGlyph(seed, i, { accent, faces = RANSOM_FACES, swatches, torn = true, palette = 'paper', variant = 0 } = {}) {
  const sw = swatches || (palette === 'color' ? ransomColorSwatches(accent) : ransomSwatches(accent));
  // `variant` re-rolls the same letter into a different cutout (see ransomTick). Deliberately absent
  // from the seed when 0, so a static note keeps the exact bytes it rendered before cycling existed.
  const v = variant ? `:${variant}` : '';
  const r = (salt) => random(`${seed}:${i}${v}:${salt}`);
  const face = faces[hashSeed(`${seed}:${i}${v}:face`) % faces.length];
  const swatch = pickWeighted(sw, r('sw'));
  return {
    family: face.family, weight: face.weight, italic: !!face.italic,
    bg: swatch.bg, ink: swatch.ink, mat: swatch.mat || null,
    rot: +((r('rot') - 0.5) * 12).toFixed(2),   // ±6°
    scale: +(0.9 + r('scale') * 0.24).toFixed(3), // 0.90–1.14
    dy: +((r('dy') - 0.5) * 0.14).toFixed(3),   // ±0.07em baseline wander
    pick: r('sprite'),                          // 0..1, chooses which cutout when sprites are in use
    clip: torn ? tornClip((() => { let k = 0; return () => r('clip' + (k++)); })()) : null,
  };
}

// SPRITE MODE: the real thing. When a cut-out letter pack has been baked (`make ransom-sprites`),
// each glyph is a photograph of actual torn paper instead of a webfont glyph on a coloured box. That
// is the whole difference in look: real fibre, real ink, and a tear no clip-path polygon imitates.
// Sizing is in `em` so one `size` on the layer drives the line, and the WIDTH comes from the sprite's
// own aspect. A real set has a different width per letter, which is what stops it reading as typed.
function paintSprite(img, glyph, g, sprites) {
  const key = glyph.toUpperCase();
  const variants = sprites.manifest[key];
  if (!variants || !variants.length) {
    throw new Error(`ransom sprites: no cutout for "${glyph}" in assets/ransom/manifest.json, add one to assets/ransom-src/${key}/ and re-run \`make ransom-sprites\``);
  }
  const v = variants[Math.min(variants.length - 1, Math.floor(g.pick * variants.length))];
  img.src = sprites.base + v.file;
  img.alt = glyph;
  img.style.cssText =
    `display:block;height:1em;width:${(v.w / v.h).toFixed(4)}em;` +
    `transform:translateY(${g.dy}em) rotate(${g.rot}deg) scale(${g.scale});transform-origin:center`;
}

// Apply the ransom treatment to split units (from splitText(el,'char')). Structure per glyph:
//   .ku  (unit; the motion preset animates THIS)              ← translate/scale/opacity from the preset
//    └ span.rns-lift  (static drop-shadow, so the tile looks peeled off the page)
//        └ span.rns   (paper tile: face + bg + ink + rotation + torn clip-path)
// Three levels so appearance and motion never fight over `transform`/`filter`. Pure in n.
export function ransomStyle(units, { seed = '', accent, faces = RANSOM_FACES, swatches, palette = 'paper', sprites = false } = {}) {
  // Fail loud if a ransom face is not registered. A silent fallback would make every letter the body
  // font, which is exactly the effect's opposite. Skipped only where there is no DOM (Node gates).
  const pack = sprites ? (window.__ransomSprites || null) : null;
  if (sprites && !pack) throw new Error('ransom: sprites:true but no sprite set loaded, run `make ransom-sprites` (see assets/ransom-src/)');
  if (!sprites && typeof document !== 'undefined') {
    const reg = registeredFamilies();
    const missing = [...new Set(faces.map((f) => f.family))].filter((f) => !reg.has(f));
    if (missing.length) throw new Error(`ransom: face(s) not registered in tokens.css: ${missing.join(', ')}. Add an @font-face or drop them from RANSOM_FACES`);
  }
  // Colour cutouts sit on a real surface, so they cast a stronger, more directional shadow than the
  // flat paper scraps; the vivid grounds also carry a hard-edge letterpress bite.
  const shadow = palette === 'color'
    ? 'drop-shadow(0 3px 3px rgba(15,15,20,.5)) drop-shadow(0 8px 10px rgba(15,15,25,.28))'
    : 'drop-shadow(0 2px 2px rgba(0,0,0,.45))';
  units.forEach((el, i) => {
    const glyph = el.textContent;
    el.textContent = '';
    el.style.overflow = 'visible';
    const lift = document.createElement('span');
    lift.className = 'rns-lift';
    lift.style.cssText = `display:inline-block;filter:${shadow}`;
    const g = ransomGlyph(seed, i, { accent, faces, swatches, palette });
    const tile = document.createElement(pack ? 'img' : 'span');
    tile.className = 'rns';
    if (pack) { tile.dataset.ch = glyph; paintSprite(tile, glyph, g, pack); }
    else { tile.textContent = glyph; paintTile(tile, g); }
    lift.appendChild(tile);
    el.appendChild(lift);
  });
}

// Write one glyph spec onto its tile. Shared by the build-time stamp and the per-frame re-roll so the
// two can never drift. `pop` (0..1) is a momentary swell applied right after a swap.
// Materials give a colour note its variety of SOURCES: `neon` is a lit tube (dark card, the ink colour
// glowing through a thin stroke), `wood` is letterpress block (a faint grain over the ground). Both are
// pure CSS layered onto the same tile, no assets, still deterministic in n.
function paintTile(tile, g, pop = 0) {
  let material = `background:${g.bg};color:${g.ink};`;
  if (g.mat === 'neon') {
    material += `text-shadow:0 0 4px ${g.ink},0 0 9px ${g.ink};-webkit-text-stroke:.5px ${g.ink};`;
  } else if (g.mat === 'wood') {
    material += `background-image:repeating-linear-gradient(92deg,rgba(0,0,0,.14) 0 1px,rgba(255,255,255,.05) 1px 4px);`;
  }
  tile.style.cssText =
    `display:inline-block;font-family:'${g.family}',sans-serif;font-weight:${g.weight};` +
    `${g.italic ? 'font-style:italic;' : ''}${material}` +
    `padding:.06em .16em;margin:0 .03em;` +
    (g.clip ? `-webkit-clip-path:${g.clip};clip-path:${g.clip};` : '') +
    `transform:translateY(${g.dy}em) rotate(${(g.rot * (1 + pop * 0.5)).toFixed(2)}deg) ` +
    `scale(${(g.scale * (1 + pop * 0.09)).toFixed(3)});transform-origin:center`;
}

// Per-frame: re-roll every glyph into a DIFFERENT cutout of the SAME letter, in place. `cycle` is how
// long one cutout holds (s) and `stagger` offsets each letter's clock so the note shuffles like a board
// being re-pinned rather than flipping in unison.
//
// The tile is repainted ONLY when its variant changes, not every frame. That is a determinism
// requirement, not an optimisation: rewriting a rotated, clip-pathed tile's style on all ~35 glyphs
// every frame keeps the compositor re-rasterising and the capture starts sampling mid-raster, which
// made the render vary run to run (same family as MISTAKES #104/#105). Writing ~2x a second per tile
// leaves the frame settled.
//
// It stays pure in n despite the cached `data-v`: the painted style is a function of `variant` ALONE,
// and whenever the computed variant differs from the applied one the tile is fully repainted. So any
// render order converges on the same DOM for frame n, which is why there is no easing/pop term here;
// a per-frame swell would reintroduce the per-frame write it exists to avoid.
export function ransomTick(units, t, { seed = '', accent, faces = RANSOM_FACES, swatches, palette = 'paper', sprites = false, cycle = 1.2, stagger = 0.16 } = {}) {
  if (!(cycle > 0)) return;
  units.forEach((el, i) => {
    const tile = el.querySelector('.rns');
    if (!tile) return;
    const variant = Math.floor((t + i * stagger) / cycle);
    if (tile.dataset.v === String(variant)) return;
    const g = ransomGlyph(seed, i, { accent, faces, swatches, palette, variant });
    const pack = sprites ? window.__ransomSprites : null;
    if (pack) paintSprite(tile, tile.dataset.ch || '', g, pack);
    else paintTile(tile, g);
    tile.dataset.v = String(variant);
  });
}
