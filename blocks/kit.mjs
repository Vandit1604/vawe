// blocks/kit.mjs: the shared vocabulary every factory in blocks/index.mjs is built from, so avatars,
// card chrome and tone→colour maps have one implementation rather than drifting copies.
//
// Pure by contract: these are props → plain-object functions. No DOM, no I/O, no Date, no
// Math.random. Same props → same objects, which is what makes a render reproducible.

// Theme-aware tokens: blocks emit CSS vars (resolved at render from :root, set by applyTheme) and
// color-mix() for tints, so the same block reskins to any brand theme, still deterministic since the
// strings are static. The Stripe hexes stay literal: `codeBlock`'s dark theme is a deliberate
// "reflect Stripe" look, not a generic surface.
export const TOKENS = {
  // `--warn` is written for every theme by core/boot.js, defaulted rather than required, so no brand
  // has to hold an opinion about amber.
  warn: 'var(--warn)',
  ink: 'var(--text)', sub: 'var(--text-2)', dim: 'var(--dim)',
  paper: 'var(--bg)', card: 'var(--card)', hair: 'var(--line)', surface: 'var(--surface-2)',
  accent: 'var(--accent)',
  accentSoft: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  accentInk: 'var(--accent)',
  // Text that reads on an accent fill: core/boot.js computes it per theme from that theme's own
  // accent (25 of 38 could not carry white; higgsfield's lime scored 1.16:1). Not the same as
  // `accentInk`, which is the accent used as text.
  onAccent: 'var(--on-accent)',
  // Same computation for the three status fills, from `--up`/`--down`/`--warn`: white on amber
  // measured 1.87:1 on higgsfield, 1.93:1 on linear.
  onUp: 'var(--on-up)', onDown: 'var(--on-down)', onWarn: 'var(--on-warn)',
  green: 'var(--up)', greenBright: 'var(--up)',
  greenSoft: 'color-mix(in srgb, var(--up) 16%, transparent)',
  down: 'var(--down)',
  blurple: '#635BFF', stripeNavy: '#0A2540', stripeTeal: '#3ECF8E', stripeGrey: '#8898AA',
};
const T = TOKENS;

// SERIES: the categorical chart palette, a single-hue ramp on purpose. `up`/`down` mean direction and
// only `toneColor()` may spend them, so a category chart would otherwise read as a verdict the data
// never carried. The ramp steps the accent toward `--text-2`, the only second colour every one of the
// 38 themes is guaranteed to have; segments separate by value instead.
// Steps are wide (100/62/34/18/8) because a one-hue ramp only has lightness to separate with: a
// tighter 100/72/48/28/14 draft made steps 2 and 3 indistinguishable in a three-segment donut.
export const SERIES = ['var(--accent)',
  'color-mix(in srgb, var(--accent) 62%, var(--text-2))',
  'color-mix(in srgb, var(--accent) 34%, var(--text-2))',
  'color-mix(in srgb, var(--accent) 18%, var(--text-2))',
  'color-mix(in srgb, var(--accent) 8%, var(--text-2))'];
export const seriesAt = (i) => SERIES[i % SERIES.length];

export const HAIR = `1px solid ${T.hair}`;
// The heavier rule. `--line-strong` is written for every theme (core/boot.js:219, the theme contract
// requires `lineStrong`), naming plumbing that already exists.
export const HAIR_STRONG = '1px solid var(--line-strong)';

// ── ELEVATION, NAMED ─────────────────────────────────────────────────────────────────────────────
// core/layers/util.js:199 already clamps `elevation` to 1..4 and stacks a heavier shadow per tier; this
// names the vocabulary, since a bare integer does not say what it is for.
export const E = { flat: 1, card: 2, raised: 3, floating: 4 };

// ── WHEN A HEX LITERAL IS LEGITIMATE ─────────────────────────────────────────────────────────────
// A literal is legitimate only when the colour is the identity of something outside this theme:
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

// onColor(bg): pick a foreground that can actually be read on `bg`. A CSS var like `TOKENS.accent`
// cannot be judged at build time (it resolves in the browser), so a var bg defers to the answer
// core/boot.js already computed per theme (--on-accent, --on-up, --on-down, --on-warn), rather than
// falling through to a hardcoded '#fff' that fails on themes like higgsfield's lime accent (1.16:1).
const ON_TOKEN = {
  __proto__: null,   // a colour string must never reach Object.prototype ('constructor' is not an ink)
  [TOKENS.accent]: TOKENS.onAccent,
  [TOKENS.green]: TOKENS.onUp,          // greenBright is the same var, so it maps by the same key
  [TOKENS.down]: TOKENS.onDown,
  [TOKENS.warn]: TOKENS.onWarn,
};
export function onColor(bg, light = '#fff', dark = TOKENS.ink) {
  const on = ON_TOKEN[bg];
  if (on) return on;
  const m = /^#([0-9a-f]{6})$/i.exec(String(bg || ''));
  if (!m) return light;
  const n = parseInt(m[1], 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return (1.05 / (L + 0.05)) >= 4.5 ? light : dark;   // white clears 4.5:1? else go dark
}

// ─────────────────────────────────────────────────────────────────────────────
// RADIUS ENCODES THE SURFACE'S REGISTER, not its size.
//   tight: instrument surfaces (a terminal, a log stream, a status strip); corners stay close to
//          square because the content is machine output.
//   card: the default content card. Anything in a hairline card gets this and nothing else.
//   soft: person-facing surfaces a human reads as an object rather than a panel (a post, a profile,
//         a player, a price).
// A new block picks the role, never the number.
// ── THE SCALES ───────────────────────────────────────────────────────────────────────────────────
// Measured across every factory's emitted output before these were chosen: gap 232 values/20 distinct,
// pad 277/25, size 452/29 (19/22/18/20/17/21 alone are 316 uses), radius 271/17 (216 already on R.*/100/0).
// A scale turns "what number looks right here" into "which step", checkable in a way a nudge never is.
//
// SPACE is 4-based with fine steps at the bottom, since the small end is where real distinctions live
// (a dot beside its label is 6, not 4 or 8) and the large end never needs that resolution.
export const SPACE = { none: 0, hair: 2, tight: 4, snug: 6, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };
export const SPACE_STEPS = Object.values(SPACE);

// TYPE collapses the nudge band: adjacent steps are far enough apart to read as a decision, 20 next to
// 19 is an accident, 20 next to 24 is a hierarchy.
export const TYPE = { fine: 14, body: 17, base: 20, lead: 24, head: 32, display: 48, hero: 64, mega: 92 };
export const TYPE_STEPS = Object.values(TYPE);

// Radius is not a linear quantity: past a certain fraction of the box it stops meaning "a bit
// rounded" and starts meaning "fully rounded" (`radius: 100` appears 52 times, `radius: 0` 18 times),
// so the top of this scale is a jump, not a step. `micro` exists because 1-4px radii appear 20 times
// to take the hard edge off a hairline, which 0 would lose.
export const R = { none: 0, micro: 4, chip: 8, tight: 12, card: 14, soft: 16, round: 24, pill: 100 };
export const R_STEPS = Object.values(R);

// needData(prop, value, block): a block whose subject is missing refuses instead of rendering a shell.
// A bare block name does not inherit the catalog's demo props (only a namespaced one does,
// MISTAKES.md #449), so an author writing {"type":"block","block":"barChart"} would otherwise get an
// empty track or a literal "undefined" on screen. Merging demo props for bare names is the wrong fix
// (it substitutes example content for a field the author left unset), so the block refuses instead,
// and the message points at the catalog row that holds a working example.
export const needData = (what, v, block) => {
  if (Array.isArray(v) ? v.length : (v != null && v !== '')) return;
  throw new Error(`block "${block}": \`${what}\` is empty, so there is nothing to draw. `
    + `A bare block name does NOT inherit the example in blocks/catalog.mjs (only a namespaced one `
    + `does), so this renders an empty shell rather than the block you saw on the site. `
    + `Pass \`${what}\`, or copy the example from this block's catalog row.`);
};

// cardChrome: the hairline card. `{bg, border, elevation, anim}` was retyped in ~15 factories; every
// one of those was a chance for the set to drift, and it did. Timing stays at the call site because
// entrance duration is a per-block motion decision, not chrome.
export function cardChrome({ radius = R.card, elevation = 1, border = HAIR, bg = T.card, anim = 'rise' } = {}) {
  // `elevation: 0` means NO shadow, and the schema's minimum is 1, so a flat card omits the key
  // rather than emitting a value the validator rejects. Asking for flat is legitimate (an empty-state
  // surface is meant to read as unfilled); a block that silently emits an unrenderable layer is not.
  return { bg, radius, border, ...(elevation ? { elevation } : {}), anim };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTION. Three shapes cover the whole library, each a pure function of the layer's own window.
//
//   sweep(). The content performs: the engine interpolates `--p` across the layer's window and the
//               block writes var(--p) into its own CSS/SVG (an arc's dash, a line's dashoffset). The
//               card just fades in, fast, and gets out of the way.
//   stagger(): one row's own start inside its group. Group children are driven off `delay` (relative
//               to the group's start), never `start`: the engine overwrites a child's `start` with
//               the group's, so an authored one is accepted and silently ignored.
//   growUp() / fillRight(): a bar grows from its baseline / a fill wipes L→R. A group child's height
//               is written as inline px so it cannot be a calc(); the equivalent is a hard-edged mask
//               whose visible fraction is `--p`, measured from the anchored edge.

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

// stackWindows: N transient surfaces that arrive in order, sit for `life`, and EXPIRE.
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

// htmlCard: the same hairline card for the html+SVG blocks (charts and gauges, which need curves).
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
// the vertical space htmlCard's own chrome consumes: what a plot area has to subtract from `h`.
export const cardInsetY = ({ pad = 22, label = '' } = {}) => 2 * pad + (label ? CARD_LABEL_H : 0);

// barWidth: one bar's width inside a padded, gapped row. Shared by the bar families, which had the
// identical expression with the pad and gap baked in as 44 and 14.
export const barWidth = ({ w, n, pad = 22, gap = 14, min = 22, inset = 8 }) =>
  Math.max(min, (w - 2 * pad - gap * Math.max(0, n - 1)) / Math.max(1, n) - inset);

// ─────────────────────────────────────────────────────────────────────────────
// DATA TREATMENT. The product-surface register, owned here so all 176 blocks read as one system.
//
// The whole idiom is ONE HUE AT TWO WEIGHTS: a solid mark carries the reading, a soft tint of the
// SAME hue carries the ground it is read against (a bar's track, a line's area, a ring's remainder).
// Every family had a private answer to that and they disagreed: lineChart washed a flat
// `opacity:0.12` polygon, the bar families drew onto empty card with no ground at all, and gauge and
// progressRing used `--line` (a BORDER colour) for a track, so the unfilled part of a meter was
// painted with the same ink as a divider and read as chrome instead of as the rest of the reading.

// tint: one hue, lighter. The percentage is the only dial, so a track and an area fill can be
// deliberately different weights and still be obviously the same system.
export const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
export const TINT = { track: 8, area: 16, chip: 8 };   // the three weights the families actually need

// TWO QUESTIONS, TWO HELPERS, AND THE NAMES DO NOT TELL THEM APART. Read this before reaching for
// either.
//   `onColor(fill)`: "what ink reads ON this fill?" The fill is the subject; the answer is a
//     contrasting ink, and for a token fill it defers to `--on-accent`/`--on-up`/`--on-down`/
//     `--on-warn`, which core/boot.js computes per theme.
//   `onInk(c)`: "this status colour IS the glyph; make it readable on a card." The colour is
//     the subject and it stays that hue. There is no token for this direction, and none of
//     `--accent`/`--up`/`--down` clears 4.5:1 against a card ground: `--up` measured 2.5:1 on
//     linear and 1.3:1 on higgsfield's lime, both HARD `make audit` failures. `onColor` cannot see
//     it, because a `var()` has no value at build time.
// Mixing toward `--text` raises contrast in BOTH directions, it brightens the hue on a dark theme
// and deepens it on a light one, so a block never has to know which kind of theme it is in.
export const onInk = (c) => `color-mix(in srgb, ${c} 66%, var(--text))`;

// DATA_CAP: the radius on a data mark's free end. Named because a bar, its track and a stacked
// band must agree: a track squarer than the bar inside it shows a sliver of the wrong shape at the
// top. 6 is one step under R.chip; at 0..4 a bar reads as default chart-library output.
export const DATA_CAP = 6;

// STROKE: how heavy an arc or a plotted line is drawn. The families each guessed (15 / 10 / 9 / 2.6),
// which is why a donut read as a thick toy ring beside a hairline-thin trend line in the same film.
export const STROKE = { line: 2.4, arc: 9 };

// SHADOW_CARD. ONE step of elevation, matching what `elevation: 1` stacks in core/layers/util.js:216
// for a native layer. html cards had NO shadow at all, so an html chart and a native stat card sat at
// visibly different depths on the same stage. Drop shadow only: the inset ring the engine adds needs
// to know light-from-dark, and CSS in a fragment cannot.
export const SHADOW_CARD = '0 1px 1px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.05)';

// THE THREE TEXT ROLES INSIDE A DATA SURFACE, as CSS `font:` shorthands so an html block and a native
// `text` layer cannot drift apart on them. Mono carries numbers, sans carries words.
//   capCss()   the surface's own caption: what this instrument reads. Mono, muted, small.
//   labelCss() an axis tick or a legend name. Sans, muted, same size as cap so a card has one small step.
//   numCss()   a figure. Mono, tabular, tight, ink. Never smaller than the label beside it.
// TYPE.body (17) is the floor, not TYPE.fine (14): `make audit` fails text under 14.04px as unreadable.
// The muted colour is `--text-2`, not `--dim`: `--dim` is the chrome role and measures 2.6:1 against
// the card on higgsfield (a hard audit failure); `--text-2` clears 4.5:1 on every theme.
export const capCss = ({ size = TYPE.body, color = TOKENS.sub, weight = 600 } = {}) =>
  `font:${weight} ${size}px var(--font-mono);color:${color};letter-spacing:0.02em`;
export const labelCss = ({ size = TYPE.body, color = TOKENS.sub, weight = 500 } = {}) =>
  `font:${weight} ${size}px var(--font-sans);color:${color}`;
export const numCss = ({ size = TYPE.lead, color = TOKENS.ink, weight = 700 } = {}) =>
  `font:${weight} ${size}px var(--font-num);color:${color};letter-spacing:-0.01em;font-variant-numeric:tabular-nums`;

// deltaChip. The verdict on a reading: a tinted pill carrying an arrow and a figure, in the tone's
// own colour. It is a PAIR with the value it sits under and must never outweigh it, so it is one
// TYPE step down and its fill is the lightest tint weight. `up`/`down` are spent here, on real
// direction, which is the only place SERIES is forbidden from spending them.
export function deltaChip({ delta = '', up = true, size = TYPE.body, ...rest } = {}) {
  const c = up ? TOKENS.green : TOKENS.down;
  // The GLYPH is pushed toward `--text`, the FILL is not: a tinted pill darkens the ground under its
  // own text, and `--down` is the lowest-contrast token most themes ship (3.1:1 on a dark card).
  const ink = onInk(c);
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
export function toneColor(tone) {
  if (!(tone in TONES)) throw new Error(`blocks/kit.mjs toneColor: unknown tone "${tone}". `
    + `Known: ${Object.keys(TONES).join(', ')}`);
  return TONES[tone];
}
// The accepted spellings, read off the map itself so a `tone` dial cannot drift from what paints.
export const TONE_NAMES = Object.keys(TONES);

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY. Four blocks drew an avatar and no two agreed: two took `initials`, two derived them from
// a name prop spelled differently in each, and one had no avatar at all. One implementation, one
// rule: an explicit `initials` wins, otherwise they are derived from the name. Deterministic, and it
// means an identity block still reads as a real account without shipping an image asset.
export const initialsOf = (s) => String(s ?? '').trim().split(/\s+/).slice(0, 2)
  .map((w) => (w[0] || '').toUpperCase()).join('') || '•';

// AN AVATAR IS AN OPAQUE OBJECT. The default fill mixes toward `--card`, not `transparent`: a stacked
// avatar overlaps its neighbour by 35% of its size, and a transparent fill would let both show through,
// making the 2px `--card` ring meant to cut discs apart cut nothing.
export function avatarEl({ avatar = '', initials = '', name = '', size = 56, radius = 100,
  bg = 'color-mix(in srgb, var(--accent) 14%, var(--card))', color = TOKENS.accentInk } = {}) {
  if (avatar) return { type: 'image', src: avatar, w: size, h: size, radius };
  return box({ w: size, h: size, radius, bg, layout: 'row', justify: 'center', items: 'center',
    children: [text({ text: initials || initialsOf(name), size: Math.round(size * 0.4), weight: 700, color })] });
}

// avatarHtml: avatarEl's twin for a caller building a raw html fragment (an html-first family cannot
// nest a scene layer inside its own markup string). Same rule, same fallback: an explicit avatar wins,
// otherwise initials derived from the name, one implementation so the two forms cannot drift apart.
export function avatarHtml({ avatar = '', initials = '', name = '', size = 56,
  bg = 'color-mix(in srgb, var(--accent) 14%, var(--card))', color = TOKENS.accentInk } = {}) {
  if (avatar) return `<img src="${avatar}" style="width:${size}px;height:${size}px;border-radius:100%;object-fit:cover;flex:none">`;
  const glyph = initials || initialsOf(name);
  return `<div style="width:${size}px;height:${size}px;border-radius:100%;background:${bg};flex:none;`
    + `display:flex;align-items:center;justify-content:center;font:700 ${Math.round(size * 0.4)}px var(--font-sans);color:${color}">${glyph}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE REGISTRY, name → factory. blocks/index.mjs discovers the family modules and fills this; every
// other reader imports it from there.
//
// It lives HERE, in the shared vocabulary, for one reason: a CONTAINER block (splitScreen, screenSwap)
// resolves another block BY NAME, and a family module importing index.mjs back would deadlock the
// discovery, index.mjs awaits the family, the family awaits index.mjs. kit.mjs is imported by every
// family and imports none of them, so it is the only place with no cycle to make.
export const BLOCKS = {};

// Resolve a `{ block, props }` descriptor to its factory, or say precisely why not.
export function blockFactory(name, at) {
  const f = name && BLOCKS[name];
  if (typeof f === 'function') return f;
  if (!Object.keys(BLOCKS).length) {
    throw new Error(`${at}: the block registry is empty. A container resolves another block by name, and `
      + 'the names are filled in by blocks/index.mjs: import that (not the family module) before calling it.');
  }
  throw new Error(`${at}: unknown block "${name}". A side is { block, props }.`);
}
