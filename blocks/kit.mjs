// blocks/kit.mjs — the shared vocabulary every factory in blocks/index.mjs is built from.
//
// WHY: the same four things were retyped in fifty places and drifted apart in every one of them —
// four avatar implementations with two different fallback strategies, three html-card wrappers whose
// inner width disagreed with their own padding, ~15 copies of the hairline-card chrome carrying three
// radii with no rule, and two tone→colour maps where `ok` and `success` were the same state under two
// names. Drift is the failure mode: a copy is only correct until someone fixes one of them.
//
// PURE BY CONTRACT: these are props → plain-object functions. No DOM, no I/O, no Date, no
// Math.random. Same props → same objects, which is what makes a render reproducible.

// THEME-AWARE tokens: blocks emit CSS vars (resolved at render from :root, set by applyTheme) and
// color-mix() for tints — so the SAME block reskins to any brand theme. Still deterministic: the
// strings are static. The Stripe hexes stay literal because stripeCard is a deliberate "reflect
// Stripe" demo, not a generic surface.
export const TOKENS = {
  ink: 'var(--text)', sub: 'var(--text-2)', dim: 'var(--dim)',
  paper: 'var(--bg)', card: 'var(--card)', hair: 'var(--line)', surface: 'var(--surface-2)',
  accent: 'var(--accent)',
  accentSoft: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  accentInk: 'var(--accent)',
  green: 'var(--up)', greenBright: 'var(--up)',
  greenSoft: 'color-mix(in srgb, var(--up) 16%, transparent)',
  down: 'var(--down)',
  blurple: '#635BFF', stripeNavy: '#0A2540', stripeTeal: '#3ECF8E', stripeGrey: '#8898AA',
};
const T = TOKENS;

// SERIES — the theme-derived chart palette (accent → success → danger → two mixes). Charts default
// their per-series/segment colours from this so multi-series graphics reskin with the brand.
export const SERIES = ['var(--accent)', 'var(--up)', 'var(--down)',
  'color-mix(in srgb, var(--accent) 55%, var(--text-2))', 'color-mix(in srgb, var(--up) 55%, var(--text-2))'];
export const seriesAt = (i) => SERIES[i % SERIES.length];

export const HAIR = `1px solid ${T.hair}`;
export const r2 = (n) => Math.round(n * 100) / 100;

// ---- layer primitives ----
export const text = (o) => ({ type: 'text', weight: 500, ...o });
export const rect = (o) => ({ type: 'rect', radius: 0, ...o });   // TOP-LEVEL boxes only
export const box = (o) => ({ type: 'group', radius: 0, ...o });    // a coloured box usable as a GROUP CHILD (rect isn't allowed there)
export const pill = (t, fg = T.accentInk, bg = T.accentSoft) =>
  text({ text: t, size: 17, weight: 500, color: fg, bg, radius: 100, pad: '7px 16px' });

// onColor(bg) — pick a foreground that can actually be READ on `bg`. A block that hardcodes '#fff'
// over a caller-supplied colour is fine until the caller passes a light one: `banner` put white on an
// arbitrary `accent` with no check, and on the amber tone that measures 2.05:1. Only literal hexes can
// be judged at build time; a CSS var resolves at render, and the theme contract already requires its
// accent to carry white, so a var falls through to white by design rather than by omission.
export function onColor(bg, light = '#fff', dark = TOKENS.ink) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(bg || ''));
  if (!m) return light;
  const n = parseInt(m[1], 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return (1.05 / (L + 0.05)) >= 4.5 ? light : dark;   // white clears 4.5:1? else go dark
}

// ─────────────────────────────────────────────────────────────────────────────
// RADIUS. Three values shipped across the library with no rule behind them, so which one a new block
// got was whichever block its author happened to copy. The rule now: RADIUS ENCODES THE SURFACE'S
// REGISTER, not its size.
//   tight — instrument surfaces. Mono readouts and technical chrome: a terminal, a log stream, a
//           status strip. Corners stay close to square because the content is machine output.
//   card  — the default content card. Anything in a hairline card gets this and nothing else.
//   soft  — person-facing surfaces. Social, identity and commerce cards a human is meant to read as
//           an object rather than a panel: a post, a profile, a player, a price.
// A new block picks the role, never the number.
export const R = { tight: 12, card: 14, soft: 16 };

// cardChrome — the hairline card. `{bg, border, elevation, anim}` was retyped in ~15 factories; every
// one of those was a chance for the set to drift, and it did. Timing stays at the call site because
// entrance duration is a per-block motion decision, not chrome.
export function cardChrome({ radius = R.card, elevation = 1, border = HAIR, bg = T.card } = {}) {
  // `elevation: 0` means NO shadow, and the schema's minimum is 1 — so a flat card omits the key
  // rather than emitting a value the validator rejects. Asking for flat is legitimate (an empty-state
  // surface is meant to read as unfilled); a block that silently emits an unrenderable layer is not.
  return { bg, radius, border, ...(elevation ? { elevation } : {}), anim: 'rise' };
}

// htmlCard — the same hairline card for the html+SVG blocks (charts and gauges, which need curves).
// THE INNER WIDTH IS DERIVED FROM THE PAD. It used to be restated by hand and two of the three
// wrappers were wrong against their own padding (`w - 48` on padding 22, `w - 44` on padding 24).
// `body` receives the real inner width so a caller cannot restate it either.
const CARD_LABEL_H = 30;   // the heading row: an 18px mono line + its 14px margin, as rendered below
export function htmlCard({ w, pad = 22, label = '', align = '', body = () => '' } = {}) {
  const inner = Math.max(0, w - 2 * pad);
  return `<div style="background:${T.card};border:${HAIR};border-radius:${R.card}px;padding:${pad}px;`
    + `box-sizing:border-box;width:${w}px${align ? `;text-align:${align}` : ''}">`
    + (label ? `<div style="font:600 18px var(--font-mono);color:${T.dim};margin-bottom:14px">${label}</div>` : '')
    + body(inner) + '</div>';
}
// the vertical space htmlCard's own chrome consumes — what a plot area has to subtract from `h`.
export const cardInsetY = ({ pad = 22, label = '' } = {}) => 2 * pad + (label ? CARD_LABEL_H : 0);

// barWidth — one bar's width inside a padded, gapped row. Shared by the bar families, which had the
// identical expression with the pad and gap baked in as 44 and 14.
export const barWidth = ({ w, n, pad = 22, gap = 14, min = 22, inset = 8 }) =>
  Math.max(min, (w - 2 * pad - gap * Math.max(0, n - 1)) / Math.max(1, n) - inset);

// ─────────────────────────────────────────────────────────────────────────────
// TONE. `callout` and `badge` each carried their own map, so "success" and "ok" were the same state
// under two names and the two fallbacks disagreed. One key set, both spellings accepted.
const TONES = {
  ok: T.green, success: T.green,
  info: T.accent, accent: T.accent,
  warn: '#F6A417', danger: T.down, error: T.down,
};
export function toneColor(tone, fallback = T.accent) { return TONES[tone] || fallback; }

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY. Four blocks drew an avatar and no two agreed: two took `initials`, two derived them from
// a name prop spelled differently in each, and one had no avatar at all. One implementation, one
// rule: an explicit `initials` wins, otherwise they are derived from the name. Deterministic, and it
// means an identity block still reads as a real account without shipping an image asset.
export const initialsOf = (s) => String(s ?? '').trim().split(/\s+/).slice(0, 2)
  .map((w) => (w[0] || '').toUpperCase()).join('') || '•';

export function avatarEl({ avatar = '', initials = '', name = '', size = 56, radius = 100,
  bg = TOKENS.accentSoft, color = TOKENS.accentInk } = {}) {
  if (avatar) return { type: 'image', src: avatar, w: size, h: size, radius };
  return box({ w: size, h: size, radius, bg, layout: 'row', justify: 'center', items: 'center',
    children: [text({ text: initials || initialsOf(name), size: Math.round(size * 0.4), weight: 700, color })] });
}
