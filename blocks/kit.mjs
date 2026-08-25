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
  // `--warn` is written for every theme by core/boot.js, defaulted rather than required so no brand
  // has to hold an opinion about amber. It exists because TONES.warn was the one status colour with
  // no token behind it.
  warn: 'var(--warn)',
  ink: 'var(--text)', sub: 'var(--text-2)', dim: 'var(--dim)',
  paper: 'var(--bg)', card: 'var(--card)', hair: 'var(--line)', surface: 'var(--surface-2)',
  accent: 'var(--accent)',
  accentSoft: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  accentInk: 'var(--accent)',
  // Text that READS on an accent fill. core/boot.js computes it per theme from that theme's own
  // accent (25 of 38 could not carry white; higgsfield's lime scored 1.16:1). NOT the same thing as
  // `accentInk`, which is the accent used AS text — the names invite confusion and five themes already
  // override `--accent-ink`, which is why this does not reuse that name.
  onAccent: 'var(--on-accent)',
  green: 'var(--up)', greenBright: 'var(--up)',
  greenSoft: 'color-mix(in srgb, var(--up) 16%, transparent)',
  down: 'var(--down)',
  blurple: '#635BFF', stripeNavy: '#0A2540', stripeTeal: '#3ECF8E', stripeGrey: '#8898AA',
};
const T = TOKENS;

// SERIES — the CATEGORICAL chart palette, and it is a SINGLE-HUE RAMP on purpose.
// It used to be [accent, up, down, …], which spent the SEMANTIC colours on categories: a
// three-segment donut of Direct/Search/Social rendered blue/green/red, so a reader saw a verdict
// where the data carried none. `up` and `down` mean direction, and only `toneColor()` may spend them.
// The ramp steps the accent toward `--text-2` instead, which is the only second colour every one of
// the 38 themes is guaranteed to have (only 4 declare an `accent2`, and accentDim/accentGlow are
// alpha versions of the accent, not distinct hues). Segments then separate by VALUE, which is what a
// category legend is for, and every theme keeps one voice.
// The steps are WIDE (100 / 62 / 34 / 18 / 8) because a one-hue ramp only has lightness to separate
// with. A first draft stepped 100/72/48/28/14 and steps 2 and 3 were indistinguishable in a
// three-segment donut on both a dark and a light theme, which is the common case. The tail washes out
// toward the text colour, which is honest: past four categories a chart wants a legend, not a hue.
export const SERIES = ['var(--accent)',
  'color-mix(in srgb, var(--accent) 62%, var(--text-2))',
  'color-mix(in srgb, var(--accent) 34%, var(--text-2))',
  'color-mix(in srgb, var(--accent) 18%, var(--text-2))',
  'color-mix(in srgb, var(--accent) 8%, var(--text-2))'];
export const seriesAt = (i) => SERIES[i % SERIES.length];

export const HAIR = `1px solid ${T.hair}`;
// The heavier rule. `--line-strong` is written for EVERY theme (core/boot.js:219, and the theme
// contract requires `lineStrong`), so this names plumbing that already exists rather than adding any.
// It was missing, so a block that wanted a divider stronger than a hairline had nowhere on-system to
// reach and wrote a literal instead. Found by an impeccable audit of the token set.
export const HAIR_STRONG = '1px solid var(--line-strong)';

// ── ELEVATION, NAMED ─────────────────────────────────────────────────────────────────────────────
// core/layers/util.js:199 already clamps `elevation` to 1..4 and stacks a heavier shadow per tier, so
// the model is real and shipped. What was missing is the vocabulary: every call site wrote a bare
// integer, which is exactly the state `radius` was in before `R` existed. A number does not say what
// it is FOR, and 2 versus 3 is then a guess rather than a choice.
export const E = { flat: 1, card: 2, raised: 3, floating: 4 };

// ── WHEN A HEX LITERAL IS LEGITIMATE ─────────────────────────────────────────────────────────────
// 36 factories emit a raw hex instead of a token, and some of those are CORRECT. The instinct was
// already in this codebase, scattered: the CODE_THEMES in blocks/dev.mjs and the macOS traffic-light
// dots in blocks/ui.mjs both carry a comment defending their literals, and both defences hold. What
// was missing is a single test an author can apply BEFORE adding the thirty-seventh.
//
// A literal is legitimate ONLY when the colour IS the identity of something outside this theme:
//   * a real brand's own palette (Stripe's blurple, in TOKENS below, is Stripe's not ours)
//   * an operating system's chrome (macOS traffic lights are red/amber/green by definition)
//   * a named editor theme being reproduced (dev.mjs CODE_THEMES)
//   * a physical phenomenon (an RGB split is red/green/blue, or it is not an RGB split)
//   * a value the AUTHOR passed in through a prop
// Anything else is a token you have not found yet. If no token fits, the gap belongs in TOKENS, not
// in the block: a literal is a private decision the theme can never repaint.

export const r2 = (n) => Math.round(n * 100) / 100;

// ---- layer primitives ----
export const text = (o) => ({ type: 'text', weight: 500, ...o });
export const rect = (o) => ({ type: 'rect', radius: 0, ...o });   // TOP-LEVEL boxes only
export const box = (o) => ({ type: 'group', radius: 0, ...o });    // a coloured box usable as a GROUP CHILD (rect isn't allowed there)
export const pill = (t, fg = T.accentInk, bg = T.accentSoft) =>
  text({ text: t, size: 17, weight: 500, color: fg, bg, radius: 100, pad: '6px 16px' });

// onColor(bg) — pick a foreground that can actually be READ on `bg`. A block that hardcodes '#fff'
// over a caller-supplied colour is fine until the caller passes a light one: `banner` put white on an
// arbitrary `accent` with no check, and on the amber tone that measures 2.05:1.
//
// THE ACCENT CASE WAS A GUARD THAT NEVER RAN. `TOKENS.accent` is the STRING 'var(--accent)', so the
// hex regex below misses it and this returned `light` — '#fff' — every single time. Four blocks called
// it on the accent believing they were protected, and blocks/social.mjs even carried a comment saying
// it "picks its ink with onColor rather than assuming white clears it", describing a check that did
// not happen. The old note here claimed the theme contract requires an accent to carry white; it never
// did, and 25 of 38 themes could not (higgsfield's lime: 1.16:1).
//
// A var still cannot be judged at build time — it resolves in the browser — so the answer is not to
// measure it here but to defer to the one that was already computed: core/boot.js writes --on-accent
// per theme from that theme's own accent.
export function onColor(bg, light = '#fff', dark = TOKENS.ink) {
  if (bg === TOKENS.accent) return TOKENS.onAccent;
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
// ── THE SCALES ───────────────────────────────────────────────────────────────────────────────────
// Measured across every factory's emitted output before these were chosen, because a scale that does
// not absorb what is already there is a rewrite pretending to be a convention:
//   gap     232 emitted values, 20 DISTINCT
//   pad     277 emitted values, 25 DISTINCT
//   size    452 emitted values, 29 DISTINCT, of which 19/22/18/20/17/21 alone are 316 uses
//   radius  271 emitted values, 17 distinct, but 216 of those already sit on R.* / 100 / 0
//
// Six adjacent integers carrying 316 type sizes is not six decisions, it is one decision nudged 316
// times. That is what a scale is for: it turns "what number looks right here" into "which step", and a
// step is checkable in a way a nudge never is. It also makes every future block cheaper to build well,
// which is the whole argument for having one at all.
//
// SPACE is 4-based with fine steps at the bottom, because the small end is where real distinctions
// live (a dot beside its label is 6, not 4 or 8) and the large end never needs that resolution. The
// `layout` skill makes the same argument: an 8-only scale misses the useful middle.
export const SPACE = { none: 0, hair: 2, tight: 4, snug: 6, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };
export const SPACE_STEPS = Object.values(SPACE);

// TYPE collapses the nudge band. Adjacent steps are far enough apart to read as a decision: 20 next to
// 19 is an accident, 20 next to 24 is a hierarchy.
export const TYPE = { fine: 14, body: 17, base: 20, lead: 24, head: 32, display: 48, hero: 64, mega: 92 };
export const TYPE_STEPS = Object.values(TYPE);

// R already existed and is already 80% adopted once `pill` and `none` are named, which they were not:
// `radius: 100` appears 52 times and `radius: 0` 18 times, both spelled as bare numbers.
//
// THE STEPS CAME FROM THE HISTOGRAM, and the first draft of them was wrong in a way a dry run caught:
// a scale of 0/6/12/14/16/100 snapped `radius: 100` to 16, which squares off a pill. Radius is not a
// linear quantity. Past a certain fraction of the box it stops meaning "a bit rounded" and starts
// meaning "fully rounded", so the top of this scale is a jump, not a step. `chip` is 8 rather than 6
// because 8 is what the library actually reaches for (12 uses against 8), and `micro` exists because
// 1/2/3/4px radii appear 20 times to take the hard edge off a hairline, which 0 would lose.
export const R = { none: 0, micro: 4, chip: 8, tight: 12, card: 14, soft: 16, round: 24, pill: 100 };
export const R_STEPS = Object.values(R);

// needData(prop, value, block) — a block whose SUBJECT is missing refuses instead of rendering a shell.
//
// WHY THIS IS NOT PEDANTRY. A catalog row's `props` are the block's documented example, and
// blocks/index.mjs merges them only for a NAMESPACED name — a BARE name gets the raw factory with
// nothing in it (docs/MISTAKES.md #429). So the site renders `barChart` WITH its demo data and an
// author writing {"type":"block","block":"barChart"} gets an empty track, `statBig` counts to 0, and
// `quote` printed the literal string "undefined" on screen. The site was showing one thing and the
// engine doing another, silently, for every bare name in the library.
//
// Merging the demo props for bare names is the WRONG fix: it would give every field an author left
// unset some example content, which is the same substitution wearing the other coat. So the block
// refuses, and the message points at the catalog row that holds a working example.
export const needData = (what, v, block) => {
  if (Array.isArray(v) ? v.length : (v != null && v !== '')) return;
  throw new Error(`block "${block}": \`${what}\` is empty, so there is nothing to draw. `
    + `A bare block name does NOT inherit the example in blocks/catalog.mjs (only a namespaced one `
    + `does), so this renders an empty shell rather than the block you saw on the site. `
    + `Pass \`${what}\`, or copy the example from this block's catalog row.`);
};

// cardChrome — the hairline card. `{bg, border, elevation, anim}` was retyped in ~15 factories; every
// one of those was a chance for the set to drift, and it did. Timing stays at the call site because
// entrance duration is a per-block motion decision, not chrome.
export function cardChrome({ radius = R.card, elevation = 1, border = HAIR, bg = T.card, anim = 'rise' } = {}) {
  // `elevation: 0` means NO shadow, and the schema's minimum is 1 — so a flat card omits the key
  // rather than emitting a value the validator rejects. Asking for flat is legitimate (an empty-state
  // surface is meant to read as unfilled); a block that silently emits an unrenderable layer is not.
  return { bg, radius, border, ...(elevation ? { elevation } : {}), anim };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTION. Every factory in the library wore `anim: 'rise'` — a CONTAINER entrance — because the
// engine could only animate transform/opacity, so a block could only ever ARRIVE. That made the
// registry unbrowsable: 101 tiles all swiped up and none of them showed what the block is FOR.
// Three shapes cover the whole library, and each is a pure function of the layer's own window.
//
//   sweep()   — the CONTENT performs. The engine interpolates `--p` across the layer's window and
//               the block writes var(--p) into its own CSS/SVG (an arc's dash, a line's dashoffset).
//               The card just fades in, fast, and gets out of the way.
//   stagger() — one row's own start INSIDE its group. Group children are driven off `delay`
//               (relative to the group's start), never `start`: the engine overwrites a child's
//               `start` with the group's, so an authored one is accepted and silently ignored.
//   growUp() / fillRight() — a bar grows from its baseline / a fill wipes L→R. A group child's
//               height is written as inline px so it cannot be a calc(); the honest equivalent is a
//               hard-edged mask whose visible fraction IS `--p`, measured from the anchored edge.

const P_EASE = 'easeOutCubic';

export const sweep = ({ to = 1, dur = 1.1, delay = 0.15, ease = P_EASE } = {}) => ({
  anim: 'fade', enterDur: 0.25, exitDur: 0.3,
  vars: { '--p': [0, to] }, varsDur: dur, varsDelay: delay, varsEase: ease,
});

export const stagger = (i, { step = 0.1, delay = 0.15, anim = 'rise', enterDur = 0.32 } = {}) => ({
  delay: r2(delay + i * step), anim, enterDur,
});

// The mask is a two-stop gradient with BOTH stops at `--p`, so the edge is hard: the bar reads as
// growing rather than fading up a gradient.
const revealMask = (dir) => `linear-gradient(to ${dir}, #000 0 calc(var(--p, 1) * 100%), transparent calc(var(--p, 1) * 100%))`;
const reveal = (dir) => ({ delay = 0.15, dur = 0.75, ease = P_EASE } = {}) => ({
  mask: revealMask(dir), vars: { '--p': [0, 1] }, varsDur: dur, varsDelay: delay, varsEase: ease,
});
export const growUp = reveal('top');
export const fillRight = reveal('right');

// stackWindows — N transient surfaces that arrive in order, sit for `life`, and EXPIRE.
// `toast` and `notification` each rendered exactly one card that lived for the whole beat, so a scene
// showing two alerts had to place two blocks and hand-compute the second one's y and start. Both of
// those are geometry, and geometry belongs to the block. One definition, because a second copy of
// "where does the next one go and when does this one die" is a second copy that drifts.
//
// A window is CLIPPED to the block's own end (`start + dur`), never extended past it: an item that
// outlives its block is a layer the author cannot see the end of.
export const stackWindows = ({ n = 0, start = 0, dur = 4, step = 0.9, life = 2.2, rowH = 60, gap = 12 } = {}) =>
  Array.from({ length: Math.max(0, n) }, (_, i) => {
    const st = r2(start + i * step);
    return { start: st, dur: Math.max(0.4, r2(Math.min(life, start + dur - st))), dy: i * (rowH + gap) };
  });

// htmlCard — the same hairline card for the html+SVG blocks (charts and gauges, which need curves).
// THE INNER WIDTH IS DERIVED FROM THE PAD. It used to be restated by hand and two of the three
// wrappers were wrong against their own padding (`w - 48` on padding 22, `w - 44` on padding 24).
// `body` receives the real inner width so a caller cannot restate it either.
const CARD_LABEL_H = 31;   // the heading row: one TYPE.body cap line (17 * 1.2 ≈ 21) + its 10px margin
export function htmlCard({ w, pad = 22, label: caption = '', align = '', body = () => '' } = {}) {
  const inner = Math.max(0, w - 2 * pad);
  // The card matches a native `elevation: 1` layer: hairline, R.card, one soft step of depth. It had
  // no shadow at all, so html charts sat flat beside native stat cards on the same stage.
  return `<div style="background:${T.card};border:${HAIR};border-radius:${R.card}px;padding:${pad}px;`
    + `box-sizing:border-box;width:${w}px;box-shadow:${SHADOW_CARD}${align ? `;text-align:${align}` : ''}">`
    + (caption ? `<div style="${capCss()};margin-bottom:10px">${caption}</div>` : '')
    + body(inner) + '</div>';
}
// the vertical space htmlCard's own chrome consumes — what a plot area has to subtract from `h`.
export const cardInsetY = ({ pad = 22, label = '' } = {}) => 2 * pad + (label ? CARD_LABEL_H : 0);

// barWidth — one bar's width inside a padded, gapped row. Shared by the bar families, which had the
// identical expression with the pad and gap baked in as 44 and 14.
export const barWidth = ({ w, n, pad = 22, gap = 14, min = 22, inset = 8 }) =>
  Math.max(min, (w - 2 * pad - gap * Math.max(0, n - 1)) / Math.max(1, n) - inset);

// ─────────────────────────────────────────────────────────────────────────────
// DATA TREATMENT — the product-surface register, owned here so all 176 blocks read as one system.
//
// The whole idiom is ONE HUE AT TWO WEIGHTS: a solid mark carries the reading, a soft tint of the
// SAME hue carries the ground it is read against (a bar's track, a line's area, a ring's remainder).
// Every family had a private answer to that and they disagreed: lineChart washed a flat
// `opacity:0.12` polygon, the bar families drew onto empty card with no ground at all, and gauge and
// progressRing used `--line` — a BORDER colour — for a track, so the unfilled part of a meter was
// painted with the same ink as a divider and read as chrome instead of as the rest of the reading.

// tint — one hue, lighter. The percentage is the only dial, so a track and an area fill can be
// deliberately different weights and still be obviously the same system.
export const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
export const TINT = { track: 8, area: 16, chip: 8 };   // the three weights the families actually need

// DATA_CAP — the radius on a data mark's free end. Named because a bar, its track and a stacked
// band must agree: a track squarer than the bar inside it shows a sliver of the wrong shape at the
// top. 6 is one step under R.chip; at 0..4 a bar reads as default chart-library output.
export const DATA_CAP = 6;

// STROKE — how heavy an arc or a plotted line is drawn. The families each guessed (15 / 10 / 9 / 2.6),
// which is why a donut read as a thick toy ring beside a hairline-thin trend line in the same film.
export const STROKE = { line: 2.4, arc: 9 };

// SHADOW_CARD — ONE step of elevation, matching what `elevation: 1` stacks in core/layers/util.js:216
// for a native layer. html cards had NO shadow at all, so an html chart and a native stat card sat at
// visibly different depths on the same stage. Drop shadow only: the inset ring the engine adds needs
// to know light-from-dark, and CSS in a fragment cannot.
export const SHADOW_CARD = '0 1px 1px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.05)';

// THE THREE TEXT ROLES INSIDE A DATA SURFACE, as CSS `font:` shorthands so an html block and a native
// `text` layer cannot drift apart on them. The split is the register's: MONO CARRIES NUMBERS, SANS
// CARRIES WORDS. The library had it exactly backwards — axis ticks ("Mon", "Q3") were set in mono and
// the figures above them in sans — which loses the one thing mono is for, a column of digits that
// lines up.
//   capCss()   the surface's own caption: what this instrument reads. Mono, muted, small.
//   labelCss() an axis tick or a legend name. Sans, muted, same size as cap so a card has one small step.
//   numCss()   a figure. Mono, tabular, tight, ink. Never smaller than the label beside it.
// TYPE.body (17) is the floor, not TYPE.fine (14): `make audit` fails text under 14.04px as
// unreadable, so the scale's smallest step is four hundredths of a pixel below what will pass.
// THE MUTED COLOUR IS `--text-2`, NOT `--dim`. The charts reached for `--dim` for every caption and
// tick, and `--dim` is the de-emphasised CHROME role: on higgsfield it measures 2.6:1 against the
// card and `make audit` fails it HARD, on linear 4.3:1 and it warns. `--text-2` is the secondary
// TEXT role and clears 4.5:1 on every theme, which is the whole difference between quiet and unread.
export const capCss = ({ size = TYPE.body, color = TOKENS.sub, weight = 600 } = {}) =>
  `font:${weight} ${size}px var(--font-mono);color:${color};letter-spacing:0.02em`;
export const labelCss = ({ size = TYPE.body, color = TOKENS.sub, weight = 500 } = {}) =>
  `font:${weight} ${size}px var(--font-sans);color:${color}`;
export const numCss = ({ size = TYPE.lead, color = TOKENS.ink, weight = 700 } = {}) =>
  `font:${weight} ${size}px var(--font-num);color:${color};letter-spacing:-0.01em;font-variant-numeric:tabular-nums`;

// deltaChip — the verdict on a reading: a tinted pill carrying an arrow and a figure, in the tone's
// own colour. It is a PAIR with the value it sits under and must never outweigh it, so it is one
// TYPE step down and its fill is the lightest tint weight. `up`/`down` are spent here, on real
// direction, which is the only place SERIES is forbidden from spending them.
export function deltaChip({ delta = '', up = true, size = TYPE.body, ...rest } = {}) {
  const c = up ? TOKENS.green : TOKENS.down;
  // The GLYPH is pushed toward `--text`, the FILL is not. A tinted pill darkens the ground under its
  // own text, and `--down` is already the lowest-contrast token most themes ship: on a dark card it
  // measured 3.1:1 and `make audit` wants 4.5:1. Mixing toward the theme's text colour raises
  // contrast in BOTH directions — it brightens the red on a dark theme and deepens it on a light one —
  // without the block ever knowing which kind of theme it is in.
  const ink = `color-mix(in srgb, ${c} 66%, var(--text))`;
  return box({ layout: 'row', items: 'center', gap: SPACE.tight, radius: R.chip,
    bg: tint(c, TINT.chip), pad: '4px 10px', children: [
      // The arrow is the SAME size as the figure. At 0.8x it came out 13px and `make audit` fails
      // anything under 14.04px as unreadable, so the glyph that says which way was the one part of
      // the chip nobody could read.
      text({ text: up ? '▲' : '▼', size, color: ink }),
      text({ text: delta, size, weight: 600, color: ink, font: 'num' }),
    ], ...rest });
}

// ─────────────────────────────────────────────────────────────────────────────
// TONE. `callout` and `badge` each carried their own map, so "success" and "ok" were the same state
// under two names and the two fallbacks disagreed. One key set, both spellings accepted.
const TONES = {
  ok: T.green, success: T.green,
  info: T.accent, accent: T.accent,
  warn: 'var(--warn)', danger: T.down, error: T.down,
};
export function toneColor(tone, fallback = T.accent) { return TONES[tone] || fallback; }
// The accepted spellings, read off the map itself so a `tone` dial cannot drift from what paints.
export const TONE_NAMES = Object.keys(TONES);

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

// ─────────────────────────────────────────────────────────────────────────────
// THE REGISTRY, name → factory. blocks/index.mjs discovers the family modules and fills this; every
// other reader imports it from there.
//
// It lives HERE, in the shared vocabulary, for one reason: a CONTAINER block (splitScreen, screenSwap)
// resolves another block BY NAME, and a family module importing index.mjs back would deadlock the
// discovery — index.mjs awaits the family, the family awaits index.mjs. kit.mjs is imported by every
// family and imports none of them, so it is the only place with no cycle to make.
export const BLOCKS = {};

// Resolve a `{ block, props }` descriptor to its factory, or say precisely why not.
export function blockFactory(name, at) {
  const f = name && BLOCKS[name];
  if (typeof f === 'function') return f;
  if (!Object.keys(BLOCKS).length) {
    throw new Error(`${at}: the block registry is empty. A container resolves another block by name, and `
      + 'the names are filled in by blocks/index.mjs — import that (not the family module) before calling it.');
  }
  throw new Error(`${at}: unknown block "${name}". A side is { block, props }.`);
}
