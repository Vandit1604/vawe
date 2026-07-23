// core/looks.js — composite "looks": a named look is a STACK of pure passes applied to a layer via
// `filter:`. One composer + a small library of pure passes; each look is DATA (an ordered pass list
// plus default knobs). Passes are CSS filter functions + overlay divs, plus a few static SVG defs
// (bloom, displace, gradientMap) injected once at build — no per-frame work and no frame feedback, so
// renderFrame(n) stays deterministic and `make probe` holds.
//
// PIPELINE ORDER (the passes of a look are authored in this order; the composer preserves it):
//   distort → color → glow → texture → vignette/frame
// Grade first, glow third, grain/overlay last, framing on top — get it wrong and the grain blooms or
// the vignette gets recoloured.
//
// CUSTOMIZATION: every look works with ZERO config by reskinning to the theme (colours default to
// var(--accent)/tokens). Override via `lookOpts: { color, color2, strength, grain, vignette, ... }`,
// or the quick `filter: "neon:0.9"` where the ONE positional arg is always `strength` (0..1). A single
// `strength` dial is threaded into every pass, so one number scales the whole look.
//
// A pass is `(o, s) => { fns?: string[], overlays?: [{ bg, blend?, opacity?, radius? }] }`:
//   o = merged options (look defaults ← lookOpts ← per-pass fixed args), s = strength 0..1.
//   fns      → CSS filter functions, concatenated in order onto the layer's `filter`.
//   overlays → inset child divs (texture/vignette), appended in order, ungraded stacking on top.

import { resolveFilter, bloomFilter, convolveFilter, morphFilter, reliefFilter } from './filters.js';

const n2 = (x) => (+x).toFixed(2);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- overlay background builders (pure strings) --------------------------------------------------
const scanGrad = (gapPx, a) =>
  `repeating-linear-gradient(0deg, rgba(0,0,0,${n2(a)}) 0px, rgba(0,0,0,${n2(a)}) 1px, transparent 1px, transparent ${gapPx}px)`;
const gridGrad = (gap, color, a) =>
  `repeating-linear-gradient(0deg, ${color} 0 1px, transparent 1px ${gap}px), ` +
  `repeating-linear-gradient(90deg, ${color} 0 1px, transparent 1px ${gap}px)`;
const CORNERS = { tr: '100% 0%', tl: '0% 0%', br: '100% 100%', bl: '0% 100%', c: '50% 50%' };
const leakGrad = (corner, color, a) =>
  `radial-gradient(60% 60% at ${CORNERS[corner] || CORNERS.tr}, color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent) 0%, transparent 70%)`;
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
const bloomStack = (size, color, s) => {
  const k = size * (0.5 + 0.7 * s);
  return bloomFilter({ color, radius: 14 * k, intensity: 0.55 + 0.75 * s });
};
// horizontal-only streak (anamorphic)
const hStreak = (size, color, s) => {
  const k = size * (0.6 + 0.8 * s);
  return `drop-shadow(${(22 * k).toFixed(1)}px 0 ${(10 * k).toFixed(1)}px color-mix(in srgb, ${color} 60%, transparent)) drop-shadow(${(-22 * k).toFixed(1)}px 0 ${(10 * k).toFixed(1)}px color-mix(in srgb, ${color} 60%, transparent))`;
};
// uniform chromatic split as a coloured drop-shadow pair (cheap, pure CSS — a hint, not a true per-pixel split)
const chromaPair = (px, cWarm, cCool) =>
  `drop-shadow(${n2(px)}px 0 0 ${cWarm}) drop-shadow(${n2(-px)}px 0 0 ${cCool})`;

// ---- the pass library ----------------------------------------------------------------------------
// Each returns { fns, overlays }. `s` = strength. Colours accept var() tokens directly (reskin free).
const PASSES = {
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
  bloom: (o, s) => ({ fns: [bloomStack(o.size ?? 1, o.glowColor || o.color, s)] }),
  hBloom: (o, s) => ({ fns: [hStreak(o.size ?? 1, o.streakColor || '#a9c8ff', s)] }),
  overexpose: (o) => ({ fns: [`brightness(${n2(1 + 0.3 * (o.amt ?? 1))})`] }),
  chromatic: (o, s) => ({ fns: [chromaPair((o.px ?? 2) * (0.5 + s), o.warm || 'rgba(255,60,60,0.75)', o.cool || 'rgba(40,120,255,0.75)')] }),
  // -- texture --
  scanlines: (o, s) => ({ overlays: [{ bg: scanGrad(o.gap ?? 3, (o.alpha ?? 0.28) * (0.4 + 0.9 * s)), blend: 'multiply' }] }),
  grid: (o) => ({ overlays: [{ bg: gridGrad(o.gap ?? 44, o.gridColor || 'color-mix(in srgb, var(--accent) 30%, transparent)', 0.15), blend: 'screen' }] }),
  grain: (o, s) => ({ overlays: [{ bg: grainDataUri(o.seed ?? 7), blend: 'overlay', opacity: clamp((o.grain ?? o.amt ?? 0.3) * (0.5 + 0.9 * s), 0, 0.9) }] }),
  lightLeak: (o, s) => ({ overlays: [{ bg: leakGrad(o.corner || 'tr', o.leakColor || '#ff9a3d', (o.leak ?? o.amt ?? 0.4) * (0.5 + 0.7 * s)), blend: 'screen' }] }),
  // -- vignette / frame --
  vignette: (o, s) => ({ overlays: [{ bg: vignetteGrad(o.vignetteColor || '#000', (o.vignette ?? o.strengthV ?? 0.45) * (0.5 + 0.8 * s)) }] }),
  vignetteInvert: (o, s) => ({ overlays: [{ bg: vignetteInvGrad((o.vignette ?? 0.4) * (0.5 + 0.8 * s)) }], }),
};

// ---- the look registry ---------------------------------------------------------------------------
// A look: { d: default knobs, p: [[passName, fixedArgs?], …] in canonical pipeline order }.
// `strength` default lives in d.strength; colours default to theme tokens unless the look's identity
// is a fixed palette (cyberpunk/nightVision/thermal), which set signature hexes but still take overrides.
export const LOOKS = {
  // --- glow family ---
  neon: { d: { strength: 0.8 }, p: [['saturate', { k: 1.3 }], ['bloom', { size: 1.1 }], ['brightness', { k: 1.05 }]] },
  dreamyHaze: { d: { strength: 0.7, color: '#ffffff' }, p: [['blurSoft', { px: 0.5 }], ['bloom', { size: 1.4, glowColor: '#ffffff' }], ['brightness', { k: 1.05 }], ['wash', { color: '#ffe7c0', amt: 0.1 }]] },
  halationFilm: { d: { strength: 0.7, color: '#ffdcb0' }, p: [['contrast', { k: 1.05 }], ['bloom', { size: 1.2, glowColor: '#ffd0a0' }], ['grain', { grain: 0.25 }]] },
  angelic: { d: { strength: 0.8, color: '#ffffff' }, p: [['overexpose', { amt: 0.5 }], ['bloom', { size: 1.6, glowColor: '#ffffff' }], ['desaturate', { amt: 0.3 }], ['vignetteInvert', { vignette: 0.4 }]] },
  hologram: { d: { strength: 0.8, color: '#57ffe0' }, p: [['chromatic', { px: 2, warm: 'rgba(255,60,120,0.7)', cool: 'rgba(60,220,255,0.75)' }], ['bloom', { size: 0.8, glowColor: '#57ffe0' }], ['brightness', { k: 1.05 }], ['scanlines', { gap: 3, alpha: 0.3 }]] },
  glitchGlow: { d: { strength: 0.85 }, p: [['chromatic', { px: 3 }], ['bloom', { size: 0.9 }], ['brightness', { k: 1.04 }], ['scanlines', { gap: 5, alpha: 0.3 }]] },
  // --- analog / retro ---
  vhs: { d: { strength: 0.7 }, p: [['chromatic', { px: 3 }], ['saturate', { k: 1.2 }], ['blurSoft', { px: 0.4 }], ['scanlines', { gap: 4, alpha: 0.22 }], ['grain', { grain: 0.3 }]] },
  super8: { d: { strength: 0.7, color: '#ffcf9a' }, p: [['sepia', { a: 0.4 }], ['saturate', { k: 1.2 }], ['brightness', { k: 1.05 }], ['grain', { grain: 0.32 }], ['vignette', { vignette: 0.5 }]] },
  crt: { d: { strength: 0.75 }, p: [['brightness', { k: 1.05 }], ['chromatic', { px: 1.5 }], ['bloom', { size: 0.6, glowColor: '#ffffff' }], ['scanlines', { gap: 3, alpha: 0.34 }], ['vignette', { vignette: 0.45 }]] },
  filmNoir: { d: { strength: 0.7 }, p: [['grayscale', { a: 1 }], ['contrast', { k: 1.3 }], ['bloom', { size: 0.5, glowColor: '#ffffff' }], ['grain', { grain: 0.3 }], ['vignette', { vignette: 0.55 }]] },
  fadedPolaroid: { d: { strength: 0.65, color: '#ffd9a8' }, p: [['sepia', { a: 0.35 }], ['desaturate', { amt: 0.2 }], ['contrast', { k: 0.95 }], ['brightness', { k: 1.05 }], ['wash', { color: '#3a2c1a', amt: 0.12, blend: 'screen' }], ['lightLeak', { corner: 'tr', leak: 0.35 }], ['grain', { grain: 0.24 }], ['vignette', { vignette: 0.4 }]] },
  nostalgia: { d: { strength: 0.7, color: '#ffcf9a' }, p: [['sepia', { a: 0.3 }], ['desaturate', { amt: 0.15 }], ['bloom', { size: 0.8, glowColor: '#ffdcae' }], ['lightLeak', { corner: 'tl', leak: 0.3 }], ['grain', { grain: 0.2 }]] },
  // --- sci-fi / hud ---
  cyberpunk: { d: { strength: 0.8, color: '#08f0e0', color2: '#ff2fd0' }, p: [['contrast', { k: 1.1 }], ['saturate', { k: 1.4 }], ['chromatic', { px: 2, warm: 'rgba(255,47,208,0.7)', cool: 'rgba(8,240,224,0.7)' }], ['bloom', { size: 0.9, glowColor: '#ff2fd0' }], ['scanlines', { gap: 4, alpha: 0.2 }], ['vignette', { vignette: 0.4 }]] },
  nightVision: { d: { strength: 0.75 }, p: [['grayscale', { a: 1 }], ['sepia', { a: 1 }], ['hueRotate', { deg: 65 }], ['saturate', { k: 4 }], ['bloom', { size: 0.6, glowColor: '#8dff8d' }], ['scanlines', { gap: 3, alpha: 0.25 }], ['grain', { grain: 0.3 }], ['vignette', { vignette: 0.5 }]] },
  thermal: { d: { strength: 0.7, colors: ['#05010f', '#3a0aa0', '#e0207a', '#ff8a00', '#ffe45e', '#ffffff'] }, p: [['gradientMap', {}], ['blurSoft', { px: 0.6 }], ['vignette', { vignette: 0.4 }]] },
  // --- camera / lens ---
  lomo: { d: { strength: 0.8, color: '#ff9a3d' }, p: [['saturate', { k: 1.5 }], ['contrast', { k: 1.15 }], ['lightLeak', { corner: 'tr', leak: 0.3 }], ['grain', { grain: 0.25 }], ['vignette', { vignette: 0.6 }]] },
  droneCinematic: { d: { strength: 0.5 }, p: [['contrast', { k: 1.08 }], ['saturate', { k: 1.1 }], ['bloom', { size: 0.4, glowColor: '#ffffff' }], ['grain', { grain: 0.12 }], ['vignette', { vignette: 0.3 }]] },
  vintageAnamorphic: { d: { strength: 0.75, color: '#a9c8ff' }, p: [['hBloom', { size: 1, streakColor: '#7fb0ff' }], ['bloom', { size: 0.5, glowColor: '#ffffff' }], ['chromatic', { px: 2 }], ['grain', { grain: 0.2 }], ['vignette', { vignette: 0.5 }]] },
  // --- motion-emphasis (static "hit" looks; pair with shake/stings for motion) ---
  impact: { d: { strength: 0.9, color: '#ffffff' }, p: [['overexpose', { amt: 0.6 }], ['chromatic', { px: 4 }], ['bloom', { size: 0.8, glowColor: '#ffffff' }], ['vignette', { vignette: 0.5 }]] },
  timeFreeze: { d: { strength: 0.7, color: '#bcd6ff' }, p: [['desaturate', { amt: 0.4 }], ['wash', { color: '#5a8cff', amt: 0.12, blend: 'screen' }], ['bloom', { size: 0.5, glowColor: '#bcd6ff' }], ['chromatic', { px: 1.5 }], ['vignette', { vignette: 0.4 }]] },
  // --- Tier B: distortion looks (static feDisplacementMap — deterministic, no frame hook) ---
  glassWarp: { d: { strength: 0.6, color: '#ffffff' }, p: [['displace', { freq: 0.02, scale: 9 }], ['blurSoft', { px: 0.4 }], ['bloom', { size: 0.4, glowColor: '#ffffff' }]] },
  heatWarp: { d: { strength: 0.6, color: '#ffb060' }, p: [['displace', { freq: 0.01, scale: 12 }], ['wash', { color: '#ff8a2b', amt: 0.1, blend: 'screen' }], ['brightness', { k: 1.04 }]] },
  melt: { d: { strength: 0.7 }, p: [['displace', { freq: 0.006, scale: 24 }], ['blurSoft', { px: 0.5 }], ['contrast', { k: 1.05 }]] },
  watercolor: { d: { strength: 0.6, color: '#eef0e8' }, p: [['displace', { freq: 0.015, scale: 11 }], ['desaturate', { amt: 0.25 }], ['contrast', { k: 0.95 }], ['wash', { color: '#f2ede0', amt: 0.12, blend: 'multiply' }], ['grain', { grain: 0.15 }]] },
  dreamSequence: { d: { strength: 0.7, color: '#ffe7c0' }, p: [['displace', { freq: 0.01, scale: 7 }], ['blurSoft', { px: 0.5 }], ['bloom', { size: 0.7, glowColor: '#ffe7c0' }], ['wash', { color: '#ffd9a8', amt: 0.1, blend: 'screen' }], ['grain', { grain: 0.16 }]] },
  rippleGlass: { d: { strength: 0.55, color: '#bfe0ff' }, p: [['displace', { freq: 0.03, scale: 8 }], ['bloom', { size: 0.35, glowColor: '#bfe0ff' }], ['vignette', { vignette: 0.3 }]] },

  // --- relief family: the SVG primitives (feConvolveMatrix / feMorphology / fe*Lighting) ---
  // These read NEIGHBOURING pixels, which no CSS filter function can do, so they are the only looks
  // here that change an image's apparent SURFACE rather than its colour.
  // emboss — a lit stone rubbing: the kernel reads opposing corners as a light direction, and the
  // grey bias is what stops flat areas going black.
  emboss: { d: { strength: 0.8 }, p: [['convolve', { kernel: 'emboss', amount: 1 }], ['desaturate', { amt: 0.5 }], ['contrast', { k: 1.12 }]] },
  // letterpress — ink pressed INTO paper: diffuse light multiplies the picture, so the surface darkens
  // where it falls away from the lamp. Warm paper wash and grain sell the stock.
  // The brightness lift is not taste, it is arithmetic: diffuse light MULTIPLIES, so without it the
  // whole picture walks toward black and reads as moody stone rather than ink on pale stock.
  letterpress: { d: { strength: 0.7, color: '#f3ece0' },
    p: [['relief', { mode: 'diffuse', azimuth: 225, elevation: 62, surface: 2.2, constant: 1.9 }],
        ['brightness', { k: 1.5 }], ['desaturate', { amt: 0.6 }], ['contrast', { k: 1.04 }],
        ['wash', { color: '#efe6d6', amt: 0.16, blend: 'screen' }], ['grain', { grain: 0.14 }]] },
  // chrome — specular light ADDS instead of multiplying, so highlights sit on top of the metal. The
  // cool tritone under it is what stops it reading as "a shiny photo" and starts it reading as metal.
  chrome: { d: { strength: 0.85, color: '#dfe8ff' },
    p: [['relief', { mode: 'specular', azimuth: 235, elevation: 40, surface: 4, exponent: 24, constant: 1.15, lightColor: '#ffffff' }],
        ['gradientMap', { colors: ['#0b1020', '#8c9bb5', '#f2f6ff'] }], ['contrast', { k: 1.15 }]] },
  // edgeGlow — the edge kernel cancels flat areas to black and keeps only boundaries, which is a
  // line drawing of the subject; blooming that gives neon wire.
  // The edge kernel sums to ~0, so flat areas cancel to black and only boundaries carry signal. On
  // smooth material (polished marble, skin) that signal is very small, and it has to be amplified
  // BEFORE the bloom or it never crosses the luminance threshold and the whole frame renders black.
  edgeGlow: { d: { strength: 0.8, color: 'var(--accent)' },
    p: [['convolve', { kernel: 'edge', amount: 2.2 }], ['brightness', { k: 6 }],
        ['contrast', { k: 1.4 }], ['saturate', { k: 1.6 }],
        ['bloom', { size: 0.8 }], ['vignette', { vignette: 0.3 }]] },
  // fatten — dilate swells the brightest pixels outward: type gains weight, a photo goes chunky and
  // poster-like as highlights eat their neighbours.
  fatten: { d: { strength: 0.6 }, p: [['morph', { op: 'dilate', radius: 1.6 }], ['contrast', { k: 1.08 }], ['saturate', { k: 1.1 }]] },
};

// merge look defaults ← lookOpts ← positional strength; strength stays a clamped master dial.
function mergeOpts(look, opts = {}, positional) {
  const merged = { ...look.d, ...opts };
  const strength = clamp(positional != null ? positional : merged.strength != null ? merged.strength : 0.7, 0, 1);
  merged.strength = strength;
  return merged;
}

// resolveComposite(name, opts, positional) → { filter, overlays } | null.
//   filter:   the CSS `filter` string (fns concatenated in pipeline order)
//   overlays: [{ bg, blend?, opacity?, radius? }] appended as inset child divs, in order
export function resolveComposite(name, opts = {}, positional) {
  const look = LOOKS[name];
  if (!look) return null;
  const o = mergeOpts(look, opts, positional);
  const s = o.strength;
  const fns = [];
  const overlays = [];
  for (const [passName, fixed] of look.p) {
    const pass = PASSES[passName];
    if (!pass) continue;
    const out = pass({ ...o, ...(fixed || {}) }, s);
    if (out.fns) fns.push(...out.fns.filter(Boolean));
    if (out.overlays) overlays.push(...out.overlays);
  }
  return { filter: fns.join(' '), overlays };
}

export const LOOK_NAMES = Object.keys(LOOKS);

// base name of a filter spec ("neon:0.9" → "neon"); isLook tells util.js whether to route here.
export const lookName = (spec) => String(spec || '').split(':')[0].trim();
export const isLook = (spec) => Object.prototype.hasOwnProperty.call(LOOKS, lookName(spec));

// Apply a composite look to a built layer element (browser only). Sets the CSS `filter` on the layer
// and appends the look's overlay divs as inset children (ordered, pointer/layout-inert, radius-inherit).
// Idempotent: guarded so a re-apply is a no-op. Pure inputs → deterministic DOM.
export function applyComposite(el, spec, lookOpts) {
  if (!el || el.__lookApplied) return;
  const name = lookName(spec);
  const after = String(spec).slice(name.length + 1).trim();
  const positional = after !== '' && !isNaN(+after) ? +after : undefined;
  const resolved = resolveComposite(name, lookOpts || {}, positional);
  if (!resolved) return;
  el.__lookApplied = name;
  // On an IMAGE layer the picture is the <img> inside the wrap, and the wrap already clips (it sets
  // overflow:hidden for `radius`/`ken`). Filtering the wrap put the glow passes OUTSIDE the picture:
  // a bloom is a drop-shadow, drop-shadows paint beyond the box, and nothing was there to stop them,
  // so `neon` on a photo lit up the container's border instead of the photo. Filter the <img> and the
  // wrap clips the bloom to the frame. Overlays stay on the wrap: they are inset:0 and inherit its
  // radius, which is exactly the coverage they want.
  const picture = el.classList?.contains('hs-img-wrap') ? el.querySelector('img') : null;
  if (resolved.filter) (picture || el).style.filter = resolved.filter;
  resolved.overlays.forEach((ov, i) => {
    const d = document.createElement('div');
    d.className = 'hs-look-ov';
    d.style.cssText = `position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:${3 + i}`;
    d.style.background = ov.bg;
    if (ov.blend) d.style.mixBlendMode = ov.blend;
    if (ov.opacity != null) d.style.opacity = String(ov.opacity);
    el.appendChild(d);
  });
}
