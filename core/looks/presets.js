// core/looks/presets.js: THE DATA. A named look is a STACK of pure passes applied to a layer via
// `filter:`. This file owns the pass library (PASSES: each pass is `(o, s) => { fns?, overlays? }`),
// the look definitions themselves (LOOKS: `{ d: default knobs, p: [[passName, fixedArgs?], …] }`, one
// entry per look with its blurb), and the two routing tables the machinery in ./index.js reads
// (KNOB_ROUTES, PASS_READS). Nothing here composes a look at render time; that is ./index.js, the
// runner, mirroring core/backgrounds/ (fx.js + presets.js are DATA, index.js is the RUNNER).
//
// PIPELINE ORDER (the passes of a look are authored in this order; the composer preserves it):
//   distort → color → glow → texture → vignette/frame
// Grade first, glow third, grain/overlay last, framing on top. Get it wrong and the grain blooms or
// the vignette gets recoloured.
//
// CUSTOMIZATION: every look works with ZERO config, but "reskins to the theme" is true of SOME of them,
// not all. A pass that names no colour falls to var(--accent), while a look whose identity is a palette
// (hologram, cyberpunk, nightVision, thermal) stays that colour on every theme, by design.
// Override any of them via `lookOpts: { color, color2, colors, grain, vignette, strength }`,
// or the quick `filter: "neon:0.9"` where the ONE positional arg is always `strength` (0..1). A single
// `strength` dial is threaded into every pass, so one number scales the whole look.
// A knob a look cannot use is an ERROR, not a no-op. See KNOB_ROUTES below and docs/MISTAKES.md #351.
//
// A pass is `(o, s) => { fns?: string[], overlays?: [{ bg, blend?, opacity?, radius? }] }`:
//   o = merged options (look defaults ← per-pass fixed args ← the author's routed knobs), s = 0..1.
//   fns      → CSS filter functions, concatenated in order onto the layer's `filter`.
//   overlays → inset child divs (texture/vignette), appended in order, ungraded stacking on top.

import { resolveFilter, bloomFilter, chromaSplitFilter, convolveFilter, morphFilter, reliefFilter } from './filters.js';
import { lit } from '../color/color.js';

// The theme's accent as a CSS value: every pass here writes CSS, so `var()` resolves for free.
const CSS = { accent: 'var(--accent, #ffffff)' };
// Deliberate constants, each with its reason recorded by core/color.js's `literal()`.
const WARM_FRINGE = lit('rgba(255,60,60,0.75)', 'the red side of a channel split, physics, not brand');
const COOL_FRINGE = lit('rgba(40,120,255,0.75)', 'the blue side of the same split');
const VIGNETTE_BLACK = lit('#000', 'a lens falls off to black; a coloured vignette is a different effect');

const n2 = (x) => (+x).toFixed(2);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- overlay background builders (pure strings) --------------------------------------------------
const scanGrad = (gapPx, a) =>
  `repeating-linear-gradient(0deg, rgba(0,0,0,${n2(a)}) 0px, rgba(0,0,0,${n2(a)}) 1px, transparent 1px, transparent ${gapPx}px)`;
const gridGrad = (gap, color, a) =>
  `repeating-linear-gradient(0deg, ${color} 0 1px, transparent 1px ${gap}px), ` +
  `repeating-linear-gradient(90deg, ${color} 0 1px, transparent 1px ${gap}px)`;
const CORNERS = { tr: '100% 0%', tl: '0% 0%', br: '100% 100%', bl: '0% 100%', c: '50% 50%' };
// A CORNER THIS MAP DOES NOT KNOW IS A TYPO. `CORNERS[corner] || CORNERS.tr` put the leak in the
// top-right and rendered a frame that looks deliberate, which is the whole failure mode. The caller
// supplies `'tr'` when the look names none (core/looks/presets.js `lightLeak`), so ABSENT is already
// handled one level up and only a WRONG NAME reaches here. Two different questions, answered separately.
const leakGrad = (corner, color, a) => {
  const at = CORNERS[corner];
  if (!at) throw new Error(`lightLeak: corner "${corner}" is not one of ${Object.keys(CORNERS).join(', ')}.`);
  return `radial-gradient(60% 60% at ${at}, color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent) 0%, transparent 70%)`;
};
const vignetteGrad = (color, s) =>
  `radial-gradient(120% 120% at 50% 50%, transparent ${(60 - 25 * s).toFixed(0)}%, color-mix(in srgb, ${color} ${Math.round(clamp(s, 0, 1) * 100)}%, transparent) 100%)`;
const vignetteInvGrad = (s) =>
  `radial-gradient(120% 120% at 50% 50%, transparent 45%, color-mix(in srgb, white ${Math.round(clamp(s, 0, 1) * 55)}%, transparent) 100%)`;
const solidWash = (color, a) => `linear-gradient(color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent), color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent))`;
// static film grain: a tiled SVG feTurbulence, url-encoded → deterministic (fixed seed, no animation).
const grainDataUri = (seed) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%23/g, '%23')}")`;
};

// A luminance bloom (core/filters.js), NOT a stack of drop-shadows. This used to be four nested
// `drop-shadow`s, which blur the ALPHA channel: on text or a cut-out that traces the glyph and looks
// right, but on an opaque photo the alpha IS the rectangle, so every glow look painted a glowing box
// around the frame and left the picture untouched. Thresholding luminance instead means the light
// comes from the bright parts of the image and a dark edge emits nothing. See docs/MISTAKES.md #112.
const bloomStack = (size, color, s, key) => {
  const k = size * (0.5 + 0.7 * s);
  return bloomFilter({ color, radius: 14 * k, intensity: 0.55 + 0.75 * s, key });
};
// horizontal-only streak (anamorphic). The SAME luminance bloom, made directional: wide in x, narrow
// in y. It was a `drop-shadow` pair until #351. The construct #112 removed from `bloom` two hundred
// entries earlier for blurring the ALPHA channel, left in place here with no caveat. On an opaque
// photo the alpha is the rectangle, so it streaked the frame's EDGE while its own blurb promised
// "horizontal blue streaks off the highlights". Now it streaks the highlights.
const hStreak = (size, color, s) => {
  const k = size * (0.6 + 0.8 * s);
  // Wide in x, near-flat in y. Tuned against the reel: the first attempt used the old drop-shadow's
  // 22px OFFSET as a blur RADIUS, which is not the same number, a 26px sigma smeared the headline
  // into an unreadable bar. A streak is long and THIN, and it must not eat its own source.
  // A real anamorphic streak is long, thin and FAINT, and only the very brightest pixels throw one.
  // Hence the high threshold and the low intensity. Tuned against the reel: at the bloom's default
  // 0.62 threshold and a normal intensity the flare swallowed the headline it was supposed to flatter.
  return bloomFilter({ color, radius: 34 * k, ry: Math.max(0.6, 1.1 * k), threshold: 0.90, intensity: 0.09 + 0.11 * s });
};
// uniform chromatic split. Also a drop-shadow pair until #351: it at least admitted in a comment that
// it was "a hint, not a true per-pixel split", but a documented approximation that paints a coloured
// bar down the edge of every opaque layer is still the alpha bug. Now a real channel split.
const chromaPair = (px, cWarm, cCool) => chromaSplitFilter({ px, warm: cWarm, cool: cCool });

// ---- the pass library ----------------------------------------------------------------------------
// Each returns { fns, overlays }. `s` = strength. Colours accept var() tokens directly (reskin free).
export const PASSES = {
  // -- color --
  desaturate: (o) => ({ fns: [`saturate(${n2(1 - (o.amt ?? 0.6))})`] }),
  saturate: (o) => ({ fns: [`saturate(${n2(o.k ?? 1.4)})`] }),
  contrast: (o) => ({ fns: [`contrast(${n2(o.k ?? 1.2)})`] }),
  brightness: (o) => ({ fns: [`brightness(${n2(o.k ?? 1.1)})`] }),
  hueRotate: (o) => ({ fns: [`hue-rotate(${(o.deg ?? 0).toFixed(0)}deg)`] }),
  sepia: (o) => ({ fns: [`sepia(${n2(clamp(o.a ?? 0.4, 0, 1))})`] }),
  grayscale: (o) => ({ fns: [`grayscale(${n2(clamp(o.a ?? 1, 0, 1))})`] }),
  invert: () => ({ fns: ['invert(1)'] }),
  blurSoft: (o) => ({ fns: [`blur(${n2(o.px ?? 0.5)}px)`] }),
  // static SVG turbulence displacement (reuses core/filters.js). scale grows with strength.
  displace: (o, s) => ({ fns: [resolveFilter(`displace:${o.freq ?? 0.012},${n2((o.scale ?? 14) * (0.5 + 0.8 * s))}`).filter] }),
  // gradient map (SVG, reuses core/filters.js). Use sparingly (recolours by luminance).
  gradientMap: (o) => ({ fns: [resolveFilter(o.colors ? `gradientMap:${o.colors.join(',')}` : 'gradientMap').filter] }),
  // a translucent colour wash (screen = lift toward colour; multiply = tint down)
  wash: (o, s) => ({ overlays: [{ bg: solidWash(o.color || 'var(--accent)', (o.amt ?? 0.12) * (0.6 + 0.6 * s)), blend: o.blend || 'screen' }] }),
  // -- relief / kernel (SVG primitives; see core/filters.js) --
  convolve: (o, s) => ({ fns: [convolveFilter({ kernel: o.kernel || 'emboss', amount: (o.amount ?? 1) * (0.4 + 0.9 * s) })] }),
  morph: (o, s) => ({ fns: [morphFilter({ op: o.op || 'dilate', radius: (o.radius ?? 1.5) * (0.4 + 0.9 * s) })] }),
  relief: (o, s) => ({ fns: [reliefFilter({ mode: o.mode || 'diffuse', azimuth: o.azimuth, elevation: o.elevation,
    surface: (o.surface ?? 2) * (0.5 + 0.8 * s), exponent: o.exponent, constant: o.constant, color: o.lightColor })] }),
  // -- glow --
  // no glowColor/color → a source-coloured bloom (the glow keeps the image's own colours, real neon);
  // an explicit colour floods a uniform tint (dreamyHaze/halationFilm/hologram set one on purpose).
  bloom: (o, s) => ({ fns: [bloomStack(o.size ?? 1, o.glowColor || o.color, s, o.key)] }),
  // `#a9c8ff` was the default here and it was DEAD: the one look with an hBloom fixes streakColor, so
  // nothing ever resolved it. A dead default is still a decision nobody made, so it follows the theme now.
  hBloom: (o, s) => ({ fns: [hStreak(o.size ?? 1, o.streakColor || o.color || CSS.accent, s)] }),
  overexpose: (o) => ({ fns: [`brightness(${n2(1 + 0.3 * (o.amt ?? 1))})`] }),
  // Red one way and blue the other is the PHYSICS of a channel split, not a brand decision - so these
  // are literals on purpose, and say so. That is the distinction core/color.js exists to make visible.
  chromatic: (o, s) => ({ fns: [chromaPair((o.px ?? 2) * (0.5 + s), o.warm || WARM_FRINGE, o.cool || COOL_FRINGE)] }),
  // -- texture --
  scanlines: (o, s) => ({ overlays: [{ bg: scanGrad(o.gap ?? 3, (o.alpha ?? 0.28) * (0.4 + 0.9 * s)), blend: 'multiply' }] }),
  // OPT-IN ONLY, and it stays that way: no look in LOOKS lists this pass. A ruled grid is a design
  // tool's canvas and a film wearing one reads as a mock-up of itself, so it is never part of a named
  // look's identity. Same rule `core/backgrounds.js` now follows for the softwash grid. #507.
  grid: (o) => ({ overlays: [{ bg: gridGrad(o.gap ?? 44, o.gridColor || 'color-mix(in srgb, var(--accent) 30%, transparent)', 0.15), blend: 'screen' }] }),
  grain: (o, s) => ({ overlays: [{ bg: grainDataUri(o.seed ?? 7), blend: 'overlay', opacity: clamp((o.grain ?? o.amt ?? 0.3) * (0.5 + 0.9 * s), 0, 0.9) }] }),
  // Falls through to the LOOK'S OWN declared colour before any constant. This is the unfinished half of
  // #351: routing made a user's `color` reach the leak, but the DEFAULT still landed on one fixed orange,
  // so fadedPolaroid and nostalgia each declared a warm colour and leaked a different one regardless.
  lightLeak: (o, s) => ({ overlays: [{ bg: leakGrad(o.corner || 'tr', o.leakColor || o.color || CSS.accent, (o.leak ?? o.amt ?? 0.4) * (0.5 + 0.7 * s)), blend: 'screen' }] }),
  // -- vignette / frame --
  // A vignette is black because a vignette IS black - the lens falls off, it does not take a brand colour.
  vignette: (o, s) => ({ overlays: [{ bg: vignetteGrad(o.vignetteColor || VIGNETTE_BLACK, (o.vignette ?? o.strengthV ?? 0.45) * (0.5 + 0.8 * s)) }] }),
  vignetteInvert: (o, s) => ({ overlays: [{ bg: vignetteInvGrad((o.vignette ?? 0.4) * (0.5 + 0.8 * s)) }] }),
};

// ---- the author's knobs, and where each one lands ------------------------------------------------
// A look's `p` entries carry FIXED per-pass arguments; they are what give the look its identity, and
// they are PRIVATE. `lookOpts` is the author's half, and the two used to collide in silence: the merge
// put `fixed` LAST, so `dreamyHaze` fixing the bloom's `glowColor` meant `lookOpts.color` rode into
// every pass and was read by none. Measured across all 31 looks, five of the six documented knobs
// changed nothing on any look and `color` worked on three. See docs/MISTAKES.md #351.
//
// A public knob therefore NAMES the private arguments it controls, and supplying it writes them last.
// Routing is broad on purpose: fadedPolaroid, lomo, heatWarp, watercolor and letterpress carry no
// bloom at all, so routing `color` to the glow alone would have left their `color` dead a second time.
// `color` means "recolour this look"; `strength` stays the fine dial.
export const KNOB_ROUTES = {
  color: ['glowColor', 'streakColor', 'leakColor', 'lightColor', 'color', 'cool'],
  color2: ['warm'],
  colors: ['colors'],
  grain: ['grain'],
  vignette: ['vignette', 'strengthV'],
};

// The other half of KNOB_ROUTES: which routed argument each pass can actually READ. Without it a knob
// that lands nowhere (`grain` on a look with no grain pass) would be accepted and ignored, the same
// bug one level up. With it, `liveKnobs` can say what a given look takes, so an unusable knob throws.
// lib-test proves this table against BEHAVIOUR, so it cannot drift from the passes above.
export const PASS_READS = {
  bloom: ['glowColor', 'color'], hBloom: ['streakColor', 'color'], wash: ['color'],
  // `relief` reads o.lightColor and NOT o.color (see the relief pass above). Listing `color` here was
  // wrong and it mattered in one direction only: an author's `color` still reaches relief, because
  // KNOB_ROUTES expands it into `lightColor`. What the wrong entry hid is the OTHER reader of this
  // table. A look's own `d.color` is never routed, so on letterpress and chrome it resolved against a
  // pass that does not read it and rendered nothing. docs/MISTAKES.md #366.
  lightLeak: ['leakColor', 'color'], relief: ['lightColor'], gradientMap: ['colors'],
  chromatic: ['warm', 'cool'], grain: ['grain'], vignette: ['vignette', 'strengthV'],
  vignetteInvert: ['vignette'], grid: ['gridColor'],
};

// ---- the look registry ---------------------------------------------------------------------------
// A look: { d: default knobs, p: [[passName, fixedArgs?], …] in canonical pipeline order }.
// `strength` default lives in d.strength. A colour belongs in ONE of two places and the choice is the
// whole design: a pass that names no colour follows the theme (`wash` and `hBloom` fall to var(--accent)),
// and a look whose identity IS a palette, hologram's cyan, cyberpunk's magenta, thermal's ramp, fixes
// it in that pass's argument bag, where it renders.
//
// `d` IS NOT THE PLACE FOR ONE. `d` is merged BEFORE the fixed bag, so a pass that names the same key
// shadows it and the declared colour never reaches a frame. Sixteen looks carried a `d.color` in exactly
// that position; every one was a decision nobody could see the result of, and deleting all sixteen moved
// zero pixels across 104 scenes. `d` holds knobs the passes leave open. docs/MISTAKES.md #366.
// Each look carries its own `blurb`, so adding a look is ONE edit. docs/CRAFT/SELECTION.md §4 groups
// the looks by REGISTER (the era each evokes). That picks the group. The blurb picks the MEMBER: what
// the pass stack visibly does, and where it is expensive (a bloom is an SVG blur, a displace is
// turbulence + a displacement map, relief/convolve read neighbouring pixels).
export const LOOKS = {
  // --- glow family ---
  neon: { d: { strength: 0.8 }, p: [['saturate', { k: 1.3 }], ['bloom', { size: 1.1, key: 'value' }], ['brightness', { k: 1.05 }]],
    blurb: 'the bright parts bloom in their OWN colours, nothing is tinted. Real sign-light, the one glow look that keeps the palette' },
  dreamyHaze: { d: { strength: 0.7 }, p: [['blurSoft', { px: 0.5 }], ['bloom', { size: 1.4, glowColor: '#ffffff' }], ['brightness', { k: 1.05 }], ['wash', { color: '#ffe7c0', amt: 0.1 }]],
    blurb: 'half-pixel defocus under a wide white bloom and a cream wash, soft-focus romance, no grain and no edges' },
  halationFilm: { d: { strength: 0.7 }, p: [['contrast', { k: 1.05 }], ['bloom', { size: 1.2, glowColor: '#ffd0a0' }], ['grain', { grain: 0.25 }]],
    blurb: 'warm amber bloom off the highlights plus grain, contrast barely touched. The restrained glow: no blur, no vignette, colours survive' },
  angelic: { d: { strength: 0.8 }, p: [['overexpose', { amt: 0.5 }], ['bloom', { size: 1.6, glowColor: '#ffffff' }], ['desaturate', { amt: 0.3 }], ['vignetteInvert', { vignette: 0.4 }]],
    blurb: 'blown out, desaturated, the widest bloom in the library and an INVERTED vignette that whitens the corners. Heaven light, heavy-handed by design' },
  hologram: { d: { strength: 0.8 }, p: [['chromatic', { px: 2, warm: 'rgba(255,60,120,0.7)', cool: 'rgba(60,220,255,0.75)' }], ['bloom', { size: 0.8, glowColor: '#57ffe0' }], ['brightness', { k: 1.05 }], ['scanlines', { gap: 3, alpha: 0.3 }]],
    blurb: 'pink/cyan split, cyan flood-bloom and tight scanlines. A projected image, colour forced to teal' },
  glitchGlow: { d: { strength: 0.85 }, p: [['chromatic', { px: 3 }], ['bloom', { size: 0.9, key: 'value' }], ['brightness', { k: 1.04 }], ['scanlines', { gap: 5, alpha: 0.3 }]],
    blurb: 'wide 3px red/blue split, source-coloured bloom, sparse scanlines. Hologram with the tint removed and the split doubled: a signal fault, not a projection' },
  // --- analog / retro ---
  vhs: { d: { strength: 0.7 }, p: [['chromatic', { px: 3 }], ['saturate', { k: 1.2 }], ['blurSoft', { px: 0.4 }], ['scanlines', { gap: 4, alpha: 0.22 }], ['grain', { grain: 0.3 }]],
    blurb: 'colour split 3px, slight defocus, scanlines and heavy grain. Tape: no vignette and no glow, so the frame stays flat and dirty' },
  // no `color`: super8's passes are sepia/saturate/brightness/grain/vignette, and not one of them
  // reads a colour. It declared one for a year and nothing could have applied it.
  super8: { d: { strength: 0.7 }, p: [['sepia', { a: 0.4 }], ['saturate', { k: 1.2 }], ['brightness', { k: 1.05 }], ['grain', { grain: 0.32 }], ['vignette', { vignette: 0.5 }]],
    blurb: 'sepia, lifted, the heaviest grain here and a deep vignette. Warmth and dirt only, no split and no lines: film stock, not video' },
  crt: { d: { strength: 0.75 }, p: [['brightness', { k: 1.05 }], ['chromatic', { px: 1.5 }], ['bloom', { size: 0.6, glowColor: '#ffffff' }], ['scanlines', { gap: 3, alpha: 0.34 }], ['vignette', { vignette: 0.45 }]],
    blurb: 'half the split of vhs plus a white bloom and the densest, darkest scanlines, corners pulled down. A lit phosphor tube: vhs glows and closes in' },
  filmNoir: { d: { strength: 0.7 }, p: [['grayscale', { a: 1 }], ['contrast', { k: 1.3 }], ['bloom', { size: 0.5, glowColor: '#ffffff' }], ['grain', { grain: 0.3 }], ['vignette', { vignette: 0.55 }]],
    blurb: 'full grayscale, contrast crushed up, a small white bloom, grain and the deepest vignette, monochrome drama' },
  fadedPolaroid: { d: { strength: 0.65, color: '#ffd9a8' }, p: [['sepia', { a: 0.35 }], ['desaturate', { amt: 0.2 }], ['contrast', { k: 0.95 }], ['brightness', { k: 1.05 }], ['wash', { color: '#3a2c1a', amt: 0.12, blend: 'screen' }], ['lightLeak', { corner: 'tr', leak: 0.35 }], ['grain', { grain: 0.24 }], ['vignette', { vignette: 0.4 }]],
    blurb: 'eight passes: sepia, desaturated, contrast LOWERED, brown wash, corner leak, grain, vignette. A print left in the sun, the flattest look here' },
  nostalgia: { d: { strength: 0.7, color: '#ffcf9a' }, p: [['sepia', { a: 0.3 }], ['desaturate', { amt: 0.15 }], ['bloom', { size: 0.8, glowColor: '#ffdcae' }], ['lightLeak', { corner: 'tl', leak: 0.3 }], ['grain', { grain: 0.2 }]],
    blurb: 'fadedPolaroid without the wash, the flattening or the vignette, plus a warm bloom, same memory register, lighter and open at the edges' },
  // --- sci-fi / hud ---
  cyberpunk: { d: { strength: 0.8 }, p: [['contrast', { k: 1.1 }], ['saturate', { k: 1.4 }], ['chromatic', { px: 2, warm: 'rgba(255,47,208,0.7)', cool: 'rgba(8,240,224,0.7)' }], ['bloom', { size: 0.9, glowColor: '#ff2fd0' }], ['scanlines', { gap: 4, alpha: 0.2 }], ['vignette', { vignette: 0.4 }]],
    blurb: 'saturated hard, magenta/cyan split, magenta bloom over faint scanlines. A fixed neon-noir palette laid over your colours' },
  nightVision: { d: { strength: 0.75 }, p: [['grayscale', { a: 1 }], ['sepia', { a: 1 }], ['hueRotate', { deg: 65 }], ['saturate', { k: 4 }], ['bloom', { size: 0.6, glowColor: '#8dff8d' }], ['scanlines', { gap: 3, alpha: 0.25 }], ['grain', { grain: 0.3 }], ['vignette', { vignette: 0.5 }]],
    blurb: 'grayscale then sepia then hue-rotated and saturated 4x to ONE green, green bloom, lines, grain, vignette. Image intensifier; the original colour is gone, not tinted' },
  thermal: { d: { strength: 0.7, colors: ['#05010f', '#3a0aa0', '#e0207a', '#ff8a00', '#ffe45e', '#ffffff'] }, p: [['gradientMap', {}], ['blurSoft', { px: 0.6 }], ['vignette', { vignette: 0.4 }]],
    blurb: 'luminance remapped to a six-stop black-purple-pink-orange-white ramp, softened. A heat camera; three passes, the cheapest sci-fi look and the most total recolour' },
  // --- camera / lens ---
  lomo: { d: { strength: 0.8, color: '#ff9a3d' }, p: [['saturate', { k: 1.5 }], ['contrast', { k: 1.15 }], ['lightLeak', { corner: 'tr', leak: 0.3 }], ['grain', { grain: 0.25 }], ['vignette', { vignette: 0.6 }]],
    blurb: 'the strongest saturation and the heaviest vignette in the library, plus a corner leak and grain. Plastic-camera punch: no glow, no split, just crush and corners' },
  droneCinematic: { d: { strength: 0.5 }, p: [['contrast', { k: 1.08 }], ['saturate', { k: 1.1 }], ['bloom', { size: 0.4, glowColor: '#ffffff' }], ['grain', { grain: 0.12 }], ['vignette', { vignette: 0.3 }]],
    blurb: 'every dial turned down (0.5 default strength, faint grain, shallow vignette). A grade rather than a look, safe under type and product UI' },
  vintageAnamorphic: { d: { strength: 0.75 }, p: [['hBloom', { size: 1, streakColor: '#7fb0ff' }], ['bloom', { size: 0.5, glowColor: '#ffffff' }], ['chromatic', { px: 2 }], ['grain', { grain: 0.2 }], ['vignette', { vignette: 0.5 }]],
    blurb: 'the only look with horizontal blue streaks off the highlights, plus split, grain and a deep vignette, old spherical glass' },
  // --- motion-emphasis (static "hit" looks; pair with shake/stings for motion) ---
  impact: { d: { strength: 0.9 }, p: [['overexpose', { amt: 0.6 }], ['chromatic', { px: 4 }], ['bloom', { size: 0.8, glowColor: '#ffffff' }], ['vignette', { vignette: 0.5 }]],
    blurb: 'overexposed with the widest colour split here (4px) and a white bloom. The frame taking a punch, for one frozen hit only' },
  timeFreeze: { d: { strength: 0.7 }, p: [['desaturate', { amt: 0.4 }], ['wash', { color: '#5a8cff', amt: 0.12, blend: 'screen' }], ['bloom', { size: 0.5, glowColor: '#bcd6ff' }], ['chromatic', { px: 1.5 }], ['vignette', { vignette: 0.4 }]],
    blurb: 'drained of colour, washed cold blue with a matching bloom and a hairline split, the world stopped' },
  // --- Tier B: distortion looks (static feDisplacementMap, deterministic, no frame hook) ---
  glassWarp: { d: { strength: 0.6 }, p: [['displace', { freq: 0.02, scale: 9 }], ['blurSoft', { px: 0.4 }], ['bloom', { size: 0.4, glowColor: '#ffffff' }]],
    blurb: 'medium-frequency turbulence pushes the image around behind a faint white bloom, seen through thick glass, still readable' },
  heatWarp: { d: { strength: 0.6 }, p: [['displace', { freq: 0.01, scale: 12 }], ['wash', { color: '#ff8a2b', amt: 0.1, blend: 'screen' }], ['brightness', { k: 1.04 }]],
    blurb: 'coarser, larger displacement under an orange wash and a lift, air over tarmac' },
  melt: { d: { strength: 0.7 }, p: [['displace', { freq: 0.006, scale: 24 }], ['blurSoft', { px: 0.5 }], ['contrast', { k: 1.05 }]],
    blurb: 'the lowest frequency and by far the largest displacement here, big slow lumps that destroy legibility, so never under type' },
  watercolor: { d: { strength: 0.6 }, p: [['displace', { freq: 0.015, scale: 11 }], ['desaturate', { amt: 0.25 }], ['contrast', { k: 0.95 }], ['wash', { color: '#f2ede0', amt: 0.12, blend: 'multiply' }], ['grain', { grain: 0.15 }]],
    blurb: 'displaced, desaturated, contrast lowered under a multiplied paper wash and grain, pigment on stock' },
  dreamSequence: { d: { strength: 0.7 }, p: [['displace', { freq: 0.01, scale: 7 }], ['blurSoft', { px: 0.5 }], ['bloom', { size: 0.7, glowColor: '#ffe7c0' }], ['wash', { color: '#ffd9a8', amt: 0.1, blend: 'screen' }], ['grain', { grain: 0.16 }]],
    blurb: 'the mildest warp plus defocus, cream bloom and a warm wash. DreamyHaze with the picture set drifting' },
  rippleGlass: { d: { strength: 0.55 }, p: [['displace', { freq: 0.03, scale: 8 }], ['bloom', { size: 0.35, glowColor: '#bfe0ff' }], ['vignette', { vignette: 0.3 }]],
    blurb: 'the highest frequency and a small offset, so the distortion reads as tight ripples not lumps, over a cool bloom, water on the lens' },

  // --- relief family: the SVG primitives (feConvolveMatrix / feMorphology / fe*Lighting) ---
  // These read NEIGHBOURING pixels, which no CSS filter function can do, so they are the only looks
  // here that change an image's apparent SURFACE rather than its colour.
  // emboss. A lit stone rubbing: the kernel reads opposing corners as a light direction, and the
  // grey bias is what stops flat areas going black.
  emboss: { d: { strength: 0.8 }, p: [['convolve', { kernel: 'emboss', amount: 1 }], ['desaturate', { amt: 0.5 }], ['contrast', { k: 1.12 }]],
    blurb: 'the kernel turns the picture into a grey lit rubbing and half the colour is thrown away, carved surface, per-pixel and not cheap' },
  // letterpress, ink pressed INTO paper: diffuse light multiplies the picture, so the surface darkens
  // where it falls away from the lamp. Warm paper wash and grain sell the stock.
  // The brightness lift is not taste, it is arithmetic: diffuse light MULTIPLIES, so without it the
  // whole picture walks toward black and reads as moody stone rather than ink on pale stock.
  letterpress: { d: { strength: 0.7 },
    p: [['relief', { mode: 'diffuse', azimuth: 225, elevation: 62, surface: 2.2, constant: 1.9 }],
        ['brightness', { k: 1.5 }], ['desaturate', { amt: 0.6 }], ['contrast', { k: 1.04 }],
        ['wash', { color: '#efe6d6', amt: 0.16, blend: 'screen' }], ['grain', { grain: 0.14 }]],
    blurb: 'diffuse light multiplies the image so it sinks into a warm paper wash, lifted 1.5x to stop it going black, ink pressed into stock' },
  // chrome: specular light ADDS instead of multiplying, so highlights sit on top of the metal. The
  // cool tritone under it is what stops it reading as "a shiny photo" and starts it reading as metal.
  chrome: { d: { strength: 0.85 },
    p: [['relief', { mode: 'specular', azimuth: 235, elevation: 40, surface: 4, exponent: 24, constant: 1.15, lightColor: '#ffffff' }],
        ['gradientMap', { colors: ['#0b1020', '#8c9bb5', '#f2f6ff'] }], ['contrast', { k: 1.15 }]],
    blurb: 'specular highlights ADDED on top, then remapped to a navy/steel/white tritone. Polished metal; two SVG filter passes, the most expensive look here' },
  // edgeGlow: the edge kernel cancels flat areas to black and keeps only boundaries, which is a
  // line drawing of the subject; blooming that gives neon wire.
  // The edge kernel sums to ~0, so flat areas cancel to black and only boundaries carry signal. On
  // smooth material (polished marble, skin) that signal is very small, and it has to be amplified
  // BEFORE the bloom or it never crosses the luminance threshold and the whole frame renders black.
  edgeGlow: { d: { strength: 0.8, color: 'var(--accent)' },
    p: [['convolve', { kernel: 'edge', amount: 2.2 }], ['brightness', { k: 6 }],
        ['contrast', { k: 1.4 }], ['saturate', { k: 1.6 }],
        ['bloom', { size: 0.8 }], ['vignette', { vignette: 0.3 }]],
    blurb: 'flat areas cancel to black and only boundaries survive, amplified 6x and bloomed. A neon wire drawing; six passes, and a smooth subject can come out empty' },
  // fatten, dilate swells the brightest pixels outward: type gains weight, a photo goes chunky and
  // poster-like as highlights eat their neighbours.
  fatten: { d: { strength: 0.6 }, p: [['morph', { op: 'dilate', radius: 1.6 }], ['contrast', { k: 1.08 }], ['saturate', { k: 1.1 }]],
    blurb: 'dilation swells the bright pixels into their neighbours, type gains weight and a photo goes chunky and poster-like' },
};

// The words a person types who is describing the look, not naming it: an author reaching for `vhs`
// says "old videotape", never "vhs". Searched, never printed.
export const LOOK_AKA = {
  vhs: ['videotape', 'retro tape', 'analog video', 'camcorder footage', 'old video'],
};
