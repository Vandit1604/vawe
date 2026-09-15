// core/color.js: a colour default is a DECISION ABOUT THE THEME, or it is a deliberate constant.
// Nothing in this engine could tell those apart, so they were all written the same way: a hex.
//
// WHAT THAT COST (engine-doctrine/MISTAKES.md #352, #354, #356). `bgPreset` defaulted its whole palette to
// `PAL_PLINTH`, one specific brand's colours, so the engine's own default theme painted in plinthai.xyz
// blue. `inkflash` defaulted to `#ff742e` settling onto `#1c1613`, themes/brew.json's accent and ink,
// copied verbatim out of a reference film into a preset every theme may use. Both were fixed by hand,
// and both had the same cause: an effect author writes the colour they are looking at, and the source
// gives no way to say whether that colour is "the accent" or "this particular blue on purpose".
//
//   token('--accent')        → follows the theme. Reskins. The right default for anything brand-ish.
//   literal('#000')          → a constant, ON PURPOSE. A vignette is black because a vignette is black.
//
// Both are legal. The point is that the choice is now VISIBLE in the source, so a reviewer can see a
// brand colour that should have been a token instead of it being indistinguishable from an oversight.
//
// RESOLUTION CONTEXT matters, which is why this is a marker resolved late rather than a string resolved
// early. A CSS property wants `var(--accent)`; an SVG presentation attribute cannot resolve var() at all
// and needs literal components (core/filters.js has carried `glowRGB` for exactly this since bloom
// shipped); a 2D canvas cannot read custom properties either. One marker, three renderings.
import { parseColor } from './engine.js';

const TOKEN = Symbol('token');
const LITERAL = Symbol('literal');

/** A colour that FOLLOWS THE THEME. `name` is a CSS custom property the theme sets (core/boot.js). */
export const token = (name, { fallback } = {}) => ({ [TOKEN]: name, fallback: fallback || '#ffffff' });

/** A colour that is deliberately constant. `why` is required, it is the whole reason this exists. */
export const literal = (value, why) => {
  if (!why) throw new Error(`literal(${value}): pass a reason. A constant colour with no stated reason is `
    + `indistinguishable from a brand colour someone forgot to tokenise, which is the bug this file exists to prevent.`);
  return { [LITERAL]: value, why };
};

/**
 * lit(value, why): a deliberate constant used INLINE, where a marker object would be in the way
 * (a canvas fillStyle, a CSS template). Returns the plain value; the point is that the reason is
 * recorded at the call site and the constant can no longer be mistaken for a forgotten tokenisation.
 */
export const lit = (value, why) => {
  if (!why) throw new Error(`lit(${value}): pass a reason, see literal() above for why.`);
  return value;
};

export const isToken = (v) => !!(v && typeof v === 'object' && v[TOKEN]);
export const isLiteral = (v) => !!(v && typeof v === 'object' && v[LITERAL]);
export const isMarked = (v) => isToken(v) || isLiteral(v);

/**
 * resolveColor(value, as): value may be a marker, a plain string (back-compat) or undefined.
 *   as 'css'    → a CSS colour value; a token becomes `var(--name, fallback)`
 *   as 'rgb'    → [r,g,b], for SVG attributes and canvas; a token is read off the live theme
 *   as 'canvas' → 'r,g,b' the string form canvas/rgba() templates in this repo already use
 * `readVar` is injected so this file stays DOM-free and testable in node.
 */
export function resolveColor(value, as = 'css', readVar = defaultReadVar) {
  if (value == null) return null;
  if (isLiteral(value)) return shape(value[LITERAL], as);
  if (isToken(value)) {
    const name = value[TOKEN];
    if (as === 'css') return `var(${name}, ${value.fallback})`;
    const live = readVar(name);
    return shape(live || value.fallback, as);
  }
  return shape(value, as);   // a bare string still works. Every existing call site keeps its meaning
}

function shape(v, as) {
  if (as === 'css') return v;
  const rgb = parseColor(v) || [255, 255, 255];
  return as === 'canvas' ? rgb.join(',') : rgb;
}

function defaultReadVar(name) {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return null;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || null;
}
