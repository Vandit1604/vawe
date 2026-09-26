// core/theme/surface-looks.js: named token BUNDLES for a block's SHAPE (radius, border, shadow, blur,
// pad/gap density), never its colour. Pure data + pure functions, importable by node (blocks/*.mjs, at
// author time) and the browser (core/engine/boot.js, at render time) alike.
//
// WHY THIS EXISTS. blocks/kit.mjs already owns the shared vocabulary for a block's shape (R, HAIR,
// SHADOW_CARD): every family reads those same constants, which is why a theme's COLOUR reaches every
// block (blocks/kit.mjs TOKENS are `var(--accent)` etc, resolved per theme) while its SHAPE never has:
// R.card is always 14, HAIR is always a 1px hairline, on every theme. `look.surface` is the lever a
// theme (or a scene, or one block instance) sets to repaint radius/border/shadow/blur/pad/gap/density
// together, the same way colour already repaints per theme, with zero edits to the block itself.
//
// THE MECHANISM IS THE SAME ONE COLOUR ALREADY USES: a CSS custom property with a fallback, so a block
// that writes `var(--v-radius-card, 14px)` renders EXACTLY 14px until something sets `--v-radius-card`,
// then repaints with zero changes to the block itself.
import { defineRegistry } from '../registry/registry.js';

const isObj = (o) => o != null && typeof o === 'object' && !Array.isArray(o);

// THE TOKENS. Not a `--surface` enum a block branches on in JS: an enum would be a SECOND
// mechanism beside the one CSS custom properties already give for free, so a look is only ever a
// bundle of concrete values for these names. The first ten are the CONTAINER (radius, border, shadow,
// blur, pad/gap/density); the rest are the MARKS AND TYPE drawn inside it (stroke weight and cap, the
// area/track paint, and the number/label typography), so two themes with the same container no longer
// read as the same kit with a different frame: the drawing itself changes too. Every one of these is a
// plain CSS value (a stroke-linecap keyword, a paint, a font-family, a text-transform keyword, a bare
// number for a `calc()`/font-weight), never a second enum a block has to branch on.
// The last four are COMPOSITION, not paint: where the label sits against the number
// (`labelPos`: above/below/inline), how big the number reads relative to its kit default
// (`numScale`), how the block's content aligns in its box (`align`: left/center/split, `split`
// pins the label to one edge and the number to the other), and whether the number dominates the
// card or sits balanced with its label (`emphasis`: balanced/oversized). Author-time only, like
// `density`: a factory reads these off the resolved bundle directly, never as a CSS var, because
// they decide which elements a factory emits and in what order, not a paintable property.
export const SURFACE_TOKEN_KEYS = [
  'radius', 'borderW', 'borderStyle', 'borderColor', 'bg', 'shadow', 'pad', 'gap', 'blur', 'density',
  'strokeCap', 'strokeScale', 'areaFill', 'trackDash',
  'numFont', 'numWeight', 'labelFont', 'labelCase', 'labelVariant', 'labelTracking', 'labelWeight',
  'labelPos', 'numScale', 'align', 'emphasis',
];
// Composition keys never become `--v-*` custom properties (see `surfaceCssVars` below): a factory
// reads them off the resolved bundle to decide its OWN markup, the same reason `density` is excluded.
const COMPOSITION_KEYS = new Set(['density', 'labelPos', 'numScale', 'align', 'emphasis']);

// KIT_DEFAULTS: today's literals, named once so "no look set" and "look: kit" are the same bundle by
// construction. blocks/kit.mjs's own R.card/HAIR/SHADOW_CARD/STROKE/capCss/labelCss/numCss stay the
// single source for the NUMBER; this only names which token each one becomes.
export const KIT_DEFAULTS = {
  radius: 14, borderW: 1, borderStyle: 'solid', borderColor: 'var(--line)', bg: 'var(--card)',
  shadow: '0 1px 1px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.05)',
  pad: 22, gap: 16, blur: 0, density: 1,
  strokeCap: 'round', strokeScale: 1, areaFill: null, trackDash: 'none',
  numFont: 'var(--font-num)', numWeight: 700,
  labelFont: 'var(--font-mono)', labelCase: 'none', labelVariant: 'normal', labelTracking: '0.02em', labelWeight: 600,
  labelPos: 'below', numScale: 1, align: 'center', emphasis: 'balanced',
};

// SURFACE_LOOKS: named design languages a theme's `look.surface` points at (by name, or an inline
// object that overrides one). Nine disagree on nearly every token, not just colour, by design: a
// theme's surface reads as a different material, not a recoloured copy of the last one.
const SURFACE_LOOKS = {
  glass: {
    radius: 20, borderW: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.28)',
    bg: 'color-mix(in srgb, var(--card) 55%, transparent)',
    shadow: '0 8px 32px rgba(0,0,0,0.18)', pad: 24, gap: 16, blur: 18, density: 1.05,
    strokeCap: 'round', strokeScale: 1, trackDash: 'none',
    numFont: 'var(--font-sans)', numWeight: 600,
    labelFont: 'var(--font-sans)', labelCase: 'none', labelVariant: 'normal', labelTracking: '0.01em', labelWeight: 500,
    labelPos: 'below', numScale: 1, align: 'center', emphasis: 'balanced',
  },
  soft: {
    radius: 24, borderW: 0, borderStyle: 'none', borderColor: 'transparent',
    shadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.08)', pad: 24, gap: 16, blur: 0, density: 1,
    strokeCap: 'round', strokeScale: 1.1, trackDash: 'none',
    numFont: 'var(--font-sans)', numWeight: 700,
    labelFont: 'var(--font-sans)', labelCase: 'none', labelVariant: 'normal', labelTracking: '0', labelWeight: 600,
    labelPos: 'below', numScale: 1, align: 'center', emphasis: 'balanced',
  },
  outlined: {
    radius: 12, borderW: 1.5, borderStyle: 'solid', borderColor: 'var(--line-strong)',
    shadow: 'none', pad: 20, gap: 14, blur: 0, density: 0.95,
    strokeCap: 'butt', strokeScale: 0.85, trackDash: 'none',
    numFont: 'var(--font-num)', numWeight: 600,
    labelFont: 'var(--font-mono)', labelCase: 'none', labelVariant: 'normal', labelTracking: '0.02em', labelWeight: 500,
    labelPos: 'below', numScale: 1, align: 'center', emphasis: 'balanced',
  },
  // brutalist: square, heavy, loud. Square caps on a thick stroke, a flat solid area (never a
  // gradient wash), bold uppercase sans labels wide-tracked to read as stencilled, not typeset.
  brutalist: {
    radius: 0, borderW: 3, borderStyle: 'solid', borderColor: 'var(--ink)',
    shadow: '8px 8px 0 0 var(--ink)', pad: 20, gap: 20, blur: 0, density: 1,
    strokeCap: 'square', strokeScale: 1.5, areaFill: 'color-mix(in srgb, var(--accent) 35%, transparent)', trackDash: 'none',
    numFont: 'var(--font-sans)', numWeight: 800,
    labelFont: 'var(--font-sans)', labelCase: 'uppercase', labelVariant: 'normal', labelTracking: '0.08em', labelWeight: 800,
    // The label sits ABOVE as a stencilled header, not tucked under the number: brutalist reads
    // top-down like a hazard sign. Left-aligned, and the number itself runs big: the loudest
    // reading in the set.
    labelPos: 'above', numScale: 1.3, align: 'left', emphasis: 'oversized',
  },
  // editorial: hairline, quiet, set like a magazine page. Butt-capped thin strokes, a fine dashed
  // rule in place of a filled track, serif numerals, small-caps labels, generous tracking.
  editorial: {
    radius: 2, borderW: 1, borderStyle: 'solid', borderColor: 'var(--line)',
    shadow: 'none', pad: 28, gap: 24, blur: 0, density: 1.15,
    strokeCap: 'butt', strokeScale: 0.75, areaFill: 'none', trackDash: '1 3',
    numFont: 'var(--font-serif)', numWeight: 400,
    labelFont: 'var(--font-serif)', labelCase: 'none', labelVariant: 'small-caps', labelTracking: '0.06em', labelWeight: 500,
    // Label above as a small-caps kicker, the figure held small-caps-serif quiet rather than
    // shouted, split left/right like a caption line under a plate.
    labelPos: 'above', numScale: 0.85, align: 'split', emphasis: 'balanced',
  },
  // neon: glowing rim, terminal-bright marks: round caps, mono numerals, wide-tracked uppercase
  // mono labels, the register a cyberpunk/console brand already carries in its borders.
  neon: {
    radius: 16, borderW: 1, borderStyle: 'solid', borderColor: 'var(--accent)',
    shadow: '0 0 1px var(--accent), 0 0 18px var(--accent-glow, var(--accent)), 0 0 42px var(--accent-glow, var(--accent))',
    pad: 22, gap: 16, blur: 0, density: 1,
    strokeCap: 'round', strokeScale: 1.1, trackDash: 'none',
    numFont: 'var(--font-mono)', numWeight: 700,
    labelFont: 'var(--font-mono)', labelCase: 'uppercase', labelVariant: 'normal', labelTracking: '0.1em', labelWeight: 700,
    // The label sits INLINE with the number, like a terminal readout ("42% ONLINE"), oversized
    // and centred so the glow reads as one emissive unit.
    labelPos: 'inline', numScale: 1.15, align: 'center', emphasis: 'oversized',
  },
  // playful: pill radii, no border, a bold saturated fill: bubbly and light, for a friendly brand.
  // Chunky round-capped strokes and bold rounded sans type carry the same bounce into the marks.
  playful: {
    radius: 28, borderW: 0, borderStyle: 'none', borderColor: 'transparent',
    bg: 'color-mix(in srgb, var(--card) 92%, var(--accent) 8%)',
    shadow: '0 6px 0 0 color-mix(in srgb, var(--accent) 22%, transparent)', pad: 22, gap: 18, blur: 0, density: 1.1,
    strokeCap: 'round', strokeScale: 1.35,
    // A BOLD FLAT FILL, not the soft translucent wash every other look falls back to. Unset, an
    // area chart read as the same faint gradient on every look regardless of the theme's own
    // accent, so a warm-accent theme in `playful` still read as a cool, washed-out area: bumping
    // the mix to 55% against the theme's OWN accent makes the fill visibly that theme's colour,
    // not a generic tint.
    areaFill: 'color-mix(in srgb, var(--accent) 55%, transparent)', trackDash: 'none',
    numFont: 'var(--font-sans)', numWeight: 800,
    labelFont: 'var(--font-sans)', labelCase: 'none', labelVariant: 'normal', labelTracking: '0', labelWeight: 700,
    labelPos: 'below', numScale: 1.2, align: 'center', emphasis: 'oversized',
  },
  // print: paper-flat, a hairline rule, near-square corners, no shadow at all: reads as ink on stock.
  // No area wash (a wash has no ink-on-paper equivalent), a fine dotted track standing in for a
  // halftone screen, mono numerals and tracked uppercase mono labels like a caption under a plate.
  print: {
    radius: 3, borderW: 1, borderStyle: 'solid', borderColor: 'var(--ink)',
    shadow: 'none', pad: 26, gap: 20, blur: 0, density: 1.1,
    strokeCap: 'butt', strokeScale: 0.9, areaFill: 'none', trackDash: '1 2',
    numFont: 'var(--font-mono)', numWeight: 400,
    labelFont: 'var(--font-mono)', labelCase: 'uppercase', labelVariant: 'normal', labelTracking: '0.06em', labelWeight: 500,
    // A caption under a plate: label above, split to the margins, held modest like set type.
    labelPos: 'above', numScale: 0.9, align: 'split', emphasis: 'balanced',
  },
  // cinematic: deep glass with a glow ring, more depth than `glass`, for a dark, high-production brand.
  cinematic: {
    radius: 18, borderW: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.10)',
    bg: 'color-mix(in srgb, var(--card) 62%, transparent)',
    shadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 40px var(--accent-glow, transparent)',
    pad: 26, gap: 18, blur: 24, density: 1.05,
    strokeCap: 'round', strokeScale: 1, trackDash: 'none',
    numFont: 'var(--font-sans)', numWeight: 600,
    labelFont: 'var(--font-sans)', labelCase: 'uppercase', labelVariant: 'normal', labelTracking: '0.12em', labelWeight: 500,
  },
  // industrial: heavy square hardware, thick dark border, hard low shadow, tight padding. Square
  // caps and a heavier stroke read as milled metal; mono numerals and tracked uppercase labels read
  // as stencilled equipment markings.
  industrial: {
    radius: 4, borderW: 2, borderStyle: 'solid', borderColor: 'var(--line-strong)',
    shadow: '0 4px 0 0 var(--line-strong)', pad: 18, gap: 14, blur: 0, density: 0.9,
    strokeCap: 'square', strokeScale: 1.2, trackDash: 'none',
    numFont: 'var(--font-mono)', numWeight: 700,
    labelFont: 'var(--font-mono)', labelCase: 'uppercase', labelVariant: 'normal', labelTracking: '0.04em', labelWeight: 700,
  },
};

export const SURFACE_LOOK_REGISTRY = defineRegistry('surface look', SURFACE_LOOKS, {
  slot: 'look.surface',
  aka: {
    glass: ['frosted panel', 'translucent surface', 'glassmorphism'],
    soft: ['rounded pillowy surface', 'gentle elevated panel'],
    outlined: ['flat quiet panel', 'no-shadow surface'],
    brutalist: ['square blocky surface', 'hard-edge panel'],
    editorial: ['magazine-style surface', 'airy quiet panel'],
    neon: ['glowing surface', 'cyberpunk panel'],
    playful: ['pill-shaped surface', 'bubbly friendly panel'],
    print: ['paper surface', 'ink-on-stock panel'],
    cinematic: ['deep glass surface', 'glowing dark panel'],
    industrial: ['heavy hardware surface', 'square dark-edged panel'],
  },
  blurbs: {
    glass: '20px radius, a 55%-opacity fill behind an 18px backdrop blur, a 1px translucent rim',
    soft: '24px radius, no rule at all, a wide 12px/24px double shadow: reads as an object, not a panel',
    outlined: '12px radius, a firm 1.5px hairline rule, no shadow at all: flat and quiet',
    brutalist: 'square (0px) corners, a thick 3px ink rule, an 8px hard offset shadow with no blur',
    editorial: 'near-square (2px) corners, a plain hairline, no shadow, 28px of padding for generous air',
    neon: '16px radius, a 1px accent-coloured rim, a three-layer glow in place of a shadow',
    playful: '28px pill radius, no rule, a tinted fill, a flat coloured shadow ledge underneath',
    print: '3px radius, a solid 1px ink rule, no shadow: flat ink on stock',
    cinematic: '18px radius, a 24px backdrop blur behind a 62%-opacity fill, a deep shadow plus an accent glow',
    industrial: '4px radius, a thick 2px rule, a flat 4px hard-edge shadow, tighter padding than the rest',
  },
  catalog: {
    title: 'Surface looks', tag: 'theme',
    intro: 'A named bundle of shape tokens (`core/theme/surface-looks.js`) a theme, a scene or one '
      + 'block instance can set as `look.surface`, repainting radius/border/shadow/blur/pad/gap/density '
      + 'together without editing a single block.',
    usage: (n) => ({ theme: { look: { surface: n } } }),
    noPreview: 'a shape bundle, not a rendered effect: render one block in each look to compare',
  },
});
export const SURFACE_LOOK_NAMES = SURFACE_LOOK_REGISTRY.names;

// resolveSurfaceLook(spec) -> a COMPLETE bundle (every key of SURFACE_TOKEN_KEYS present), or `null` if
// spec names nothing (no look set: every block falls back to its own KIT_DEFAULTS-equal literal). `spec`
// is either a preset name (string) or `{ preset?, ...token overrides }`.
export function resolveSurfaceLook(spec) {
  if (spec == null) return null;
  if (typeof spec === 'string') {
    SURFACE_LOOK_REGISTRY.pick(spec); // throws with a near-word hint on an unknown name
    return { ...KIT_DEFAULTS, ...SURFACE_LOOKS[spec] };
  }
  if (!isObj(spec)) throw new Error(`look.surface must be a preset name or an object, got ${JSON.stringify(spec)}`);
  const { preset, ...overrides } = spec;
  const base = preset ? { ...KIT_DEFAULTS, ...SURFACE_LOOK_REGISTRY.pick(preset) } : KIT_DEFAULTS;
  const unknown = Object.keys(overrides).filter((k) => !SURFACE_TOKEN_KEYS.includes(k));
  if (unknown.length) throw new Error(`look.surface: unknown token(s) ${unknown.join(', ')}. Known: ${SURFACE_TOKEN_KEYS.join(', ')}`);
  return { ...base, ...overrides };
}

// CSS_VAR_NAMES: the one place a token name becomes its `--v-*` custom property.
export const CSS_VAR_NAMES = Object.fromEntries(SURFACE_TOKEN_KEYS.map((k) => [k, `--v-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`]));

const UNITLESS = new Set([
  'borderStyle', 'borderColor', 'bg', 'shadow', 'density',
  'strokeCap', 'strokeScale', 'areaFill', 'trackDash',
  'numFont', 'numWeight', 'labelFont', 'labelCase', 'labelVariant', 'labelTracking', 'labelWeight',
]);
// `blur` is a bare px NUMBER in a bundle (so it can also be READ, not just written), but CSS's
// `backdrop-filter` needs the function form.
const cssValue = (key, v) => (key === 'blur' ? `blur(${v}px)` : UNITLESS.has(key) ? String(v) : `${v}px`);

// surfaceCssVars(bundle) -> { '--v-radius': '14px', ... }, only the keys `bundle` actually carries.
// `density` is NOT written as a CSS var: it scales AUTHOR-TIME padding numbers, so a caller reads
// `bundle.density` directly instead.
export function surfaceCssVars(bundle) {
  if (!bundle) return {};
  const out = {};
  for (const key of SURFACE_TOKEN_KEYS) {
    if (COMPOSITION_KEYS.has(key) || bundle[key] == null) continue;
    out[CSS_VAR_NAMES[key]] = cssValue(key, bundle[key]);
  }
  return out;
}

// cssVar(key, fallbackPx): the one expression every block reads instead of a literal, e.g.
// `border-radius:${cssVar('radius', 14)}` -> `border-radius:var(--v-radius, 14px)`.
export function cssVar(key, fallback) {
  return `var(${CSS_VAR_NAMES[key]}, ${cssValue(key, fallback)})`;
}
