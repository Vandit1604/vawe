// blocks/core.mjs: the plain cards and statements (card · quote · stripeCard · kpiRow · comparison ·
// pricingCard · captions · colorCycle), the big variant families (lowerThird · searchEngine) and the
// COMPOSITION containers (splitScreen · screenSwap) that hold another block.
//
// Extracted from blocks/index.mjs so index.mjs owns nothing but assembly. A module cannot discover
// itself, and index.mjs now discovers its siblings, so the factories that used to live inside it had
// to become a sibling too. Same contract as every other family: a PURE function props → an ARRAY of
// scene layers, absolute-positioned on the 1920x1080 stage, deterministic.

// The shared vocabulary: tokens, layer primitives, card chrome, the radius scale, tone colours and
// the one avatar implementation, lives in blocks/kit.mjs. It is PURE (props → plain objects) and it
// exists because every one of those things had been copied per-block and had drifted per-copy.
import {
  TOKENS, HAIR, r2, text, rect, box,
  R, E, SPACE, TYPE, cardChrome,
  stagger, needData, blockFactory,
} from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that ships
// factories and declares none is refused by blocks/index.mjs at load, not discovered later.
export const CATEGORY = 'Core';
const T = TOKENS;

// ─────────────────────────────────────────────────────────────────────────────
// HTML-FIRST FAMILY BELOW. Design Read: plain product cards and statements, no chrome opinion beyond
// the hairline card every other family shares (kit.mjs's cardChrome/htmlCard idiom). VARIANCE low
// (these are the boring, load-bearing surfaces a film composes around, not its loud moment); MOTION
// restrained, either the layer's own envelope `anim` for a single-unit card or `parts` where a family
// stages its own repeating children. engine-doctrine/CRAFT/HTML-FRAGMENTS.md.

// card. One product surface: hairline + a single step of elevation, content, a footer row.
// The tinted inner panel it used to draw is gone by DEFAULT (`tint` now matches the card fill), because
// a panel inside a panel is two surfaces saying one thing, the 2021 SaaS tile. `tint` still paints
// when a caller passes a real one, so the prop keeps its meaning; only the default moved.
export function card({ x, y, w = 740, h = 336, tint = 'var(--card)', title, desc, pills = [],
  cta = 'Explore', start = 0, dur = 4, anim = 'rise', enterDur = 0.5 } = {}) {
  // Neutral chips, not accent pills. A tag is metadata; spending the brand colour on a row of them
  // leaves nothing louder for the thing that matters. Same size/pad/radius as kit.mjs's `pill`.
  const pillsHtml = pills.length ? `<div style="display:flex;flex-wrap:wrap;gap:${SPACE.xs}px;align-items:center">`
    + pills.map((p) => `<span style="display:inline-flex;align-items:center;font:500 ${TYPE.body}px var(--font-sans);`
      + `color:${T.sub};background:${T.surface};border-radius:${R.pill}px;padding:6px 16px">${p}</span>`).join('') + '</div>' : '';
  const html = `<div style="display:flex;flex-direction:column;width:${w}px;height:${h}px;box-sizing:border-box">`
    + `<div style="flex:1;min-height:0;background:${tint};border-radius:${R.chip}px;padding:${SPACE.lg}px;`
    + `box-sizing:border-box;display:flex;flex-direction:column;align-items:flex-start;gap:${SPACE.sm}px">`
    + `<span style="font:700 ${TYPE.head}px var(--font-sans);color:${T.ink};letter-spacing:-0.02em">${title}</span>`
    + (desc ? `<span style="font:400 ${TYPE.base}px var(--font-sans);color:${T.sub}">${desc}</span>` : '')
    + pillsHtml + '</div>'
    // The footer sits BELOW a rule rather than floating under the content: it is a different kind of
    // row (an action, not a fact), and the hairline is what says so.
    + (cta ? `<div style="height:1px;background:${T.hair}"></div>`
      + `<div style="display:flex;justify-content:space-between;align-items:center;padding:${SPACE.sm}px ${SPACE.lg}px">`
      + `<span style="font:600 ${TYPE.body}px var(--font-sans);color:${T.sub}">${cta}</span>`
      + `<span style="font:600 ${TYPE.body}px var(--font-sans);color:${T.accent}">→</span></div>` : '')
    + '</div>';
  return [{ type: 'html', x, y, w, h, html, ...cardChrome({ radius: R.card, elevation: E.card, anim }),
    start, duration: dur, enterDur, exitDur: 0.35 }];
}

// ─────────────────────────────────────────────────────────────────────────────
// colorCycle. One word rendered in a SEQUENCE of hues so it visibly cycles colour (proof of "any
// colour" WITHOUT reintroducing colour everywhere). Deterministic: fixed palette, fixed timing.
//
// The DEFAULT six sit in one luminance band (relative L ≈ 0.13..0.22), which buys two things at once.
// They clear 3:1 against white AND against near-black, so the one block in this file that cannot read
// the theme still lands on all 38; and holding luminance constant leaves HUE as the only thing that
// changes, which is what the block is for. The previous six ranged from a 2.1:1 amber to a dark
// indigo, so on a white ground a third of the cycle was unreadable and the rest flickered in weight.
// Each step is its own top-level layer with its own start/duration window (a hue tenanting one slice
// of the timeline), so this is N independently-timed layers rather than one card with repeating
// children: `html` per step, not one fragment with `parts`.
export function colorCycle({ x, y, word = 'colour', size = 78, weight = 700,
  colors = ['#7F6FE8', '#0C9455', '#B47305', '#E04392', '#2B7FEE', '#D65B26'],
  start = 0, dur = 4, each = 0.5 } = {}) {
  const out = [];
  let t = start;
  for (let i = 0; t < start + dur; i++, t = r2(t + each)) {
    const html = `<span style="display:inline-block;font:${weight} ${size}px var(--font-sans);`
      + `color:${colors[i % colors.length]};letter-spacing:-0.02em">${word}</span>`;
    out.push({ type: 'html', x, y, html,
      start: r2(t), duration: r2(Math.min(each + 0.08, start + dur - t)) });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// stripeCard. A recognizably-"Stripe" payments card: amount + mini bar chart + blurple Pay button.
// Uses Stripe's real product hexes. The "reads a site → rebuilds its look" payoff.
// `amount` is a prop because it is the only figure on the card and it reaches every caller. It was
// baked, so every video that used this block published the same invented number (MISTAKES #67).
// LEFT NATIVE, not a candidate after all: quality/gates/lib-test.mjs asserts the bar chart's total
// width off `card.children[2].children` directly ("the bar chart spans the card's content box"), and
// this pass is not permitted to touch quality/gates/**. A native `group` of `box()` bars is the form
// that invariant can still be read off.
export function stripeCard({ x, y, w = 380, amount = '', start = 0, dur = 4 } = {}) {
  const bars = [38, 52, 44, 66, 58, 80, 72];
  // THE CHART SPANS THE CARD. The bars were a fixed 26px, so the only part of this card that reads as
  // Stripe stopped 62px short of the Pay button beneath it at the catalog's own w:340 (7 x 26 + 6 x 8
  // = 230 of a 292px content box) and 102px short at the default w:380. A dashboard's volume chart is
  // measured against the panel it sits in; one that ends two thirds of the way across is a sparkline
  // someone left in a wide box. Derived from `w`, it fills at every width.
  const barW = r2(Math.max(8, (w - 2 * 24 - 6 * 8) / 7));
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 16, pad: 24,
    bg: T.card, radius: 12, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [
      text({ text: 'Net volume', size: 18, color: T.stripeGrey, font: 'mono' }),
      text({ text: (amount || ''), size: 44, weight: 700, color: T.stripeNavy, ls: '-0.02em' }),
      { type: 'group', layout: 'row', items: 'flex-end', gap: 8, h: 70, children:
        bars.map((b) => box({ w: barW, h: b, radius: 4, bg: T.blurple })) },
      { type: 'group', bg: T.blurple, radius: 4, pad: '12px 0', layout: 'row', justify: 'center',
        children: [text({ text: (amount ? `Pay ${amount}` : 'Pay'), size: 18, weight: 600, color: '#fff' })] },
    ],
  }];
}

// quote: a pull quote with attribution. The one place big italic-ish restraint reads as premium.
export function quote({ x, y, w = 900, text: q, author, start = 0, dur = 4 } = {}) {
  // Without this the template literal below stringified `undefined` and printed the WORD
  // "undefined" in quotation marks, at display size, in the finished film. An empty block is bad;
  // one that renders a JavaScript artefact as its headline is worse.
  needData('text', q, 'quote');
  // The attribution is a label, so it is set like every other label in this file: mono, tracked, quiet.
  const html = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:${SPACE.md}px;width:${w}px">`
    + `<span style="font:600 ${TYPE.display}px var(--font-sans);color:${T.ink};letter-spacing:-0.02em">“${q}”</span>`
    + (author ? `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub};letter-spacing:0.04em">${author}</span>` : '')
    + '</div>';
  return [{ type: 'html', x, y, w, html, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35 }];
}

// kpiRow: a row of stat cells (value + label). Scale contrast without a card grid.
// THE FIGURES COUNT UP, cell by cell across the row. An item that gives a numeric `to` becomes a
// native `count` layer and runs (no html counter exists, so this path stays native by construction);
// one that gives a formatted string `value` (`$2.4M`, `42ms`, shapes the count layer cannot render)
// lands as one `html` fragment carrying value + label. Hybrid by construction: the two paths need
// different layer types, so a caller opts into the counting by giving a number, not by rewriting the row.
export function kpiRow({ x, y, items = [], gap = 80, start = 0, dur = 4 } = {}) {
  const cell = (it, beat) => {
    if (it.to != null) return { type: 'group', layout: 'column', items: 'flex-start', gap: SPACE.tight, children: [
      { type: 'count', from: it.from ?? 0, to: it.to, unit: it.unit || '', font: 'sans', size: 64, weight: 700,
        color: T.ink, ls: '-0.02em', countStart: 0.15, countDur: 1.1, ease: 'easeOutExpo', ...beat },
      text({ text: it.label, size: TYPE.body, tracking: '0.06em', color: T.dim, font: 'mono', ...beat }),
    ] };
    const html = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:${SPACE.tight}px">`
      + `<span style="font:700 ${TYPE.hero}px var(--font-sans);color:${T.ink};letter-spacing:-0.02em">${it.value}</span>`
      + `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.dim};letter-spacing:0.06em">${it.label}</span></div>`;
    return { type: 'html', html, ...beat };
  };
  return [{ type: 'group', x, y, layout: 'row', items: 'flex-start', gap, start, duration: dur, anim: 'fade', enterDur: 0.25,
    children: items.map((it, i) => cell(it, stagger(i, { step: 0.14, delay: 0.15, enterDur: 0.35 }))) }];
}

// comparison: two columns (e.g. Before / After, Others / Vawe). Rows are simple strings.
//
// …OR TWO SCREENS. A before/after beat is the most standard product-demo shape there is, and this
// block could only hold two lists of sentences: it could SAY the interface changed and never show it.
// `leftScreen`/`rightScreen` are block descriptors (`{ block, props }`), and when either is present
// the columns become panes and `splitScreen` owns the geometry, one definition of "two things, side
// by side, aligned", not a second one living here.
//
// The string form is untouched and takes precedence by absence, so every existing caller renders
// exactly what it rendered before. An extension that requires editing its callers is a rewrite.
export function comparison({ x, y, w = 900, leftTitle = 'Others', rightTitle = 'Vawe', left = [], right = [],
  leftScreen = null, rightScreen = null, gap = 40, start = 0, dur = 4 } = {}) {
  const colW = (w - gap) / 2;
  if (leftScreen || rightScreen) {
    const TITLE_H = 46;
    const cap = ({ t, cx, color, st }) => text({ text: t, x: cx, y, w: colW, size: 26, weight: 700, color,
      start: st, duration: r2(start + dur - st), anim: 'slide-down', enterDur: 0.35, exitDur: 0.3 });
    return [
      cap({ t: leftTitle, cx: x, color: T.dim, st: start }),
      cap({ t: rightTitle, cx: r2(x + colW + gap), color: TOKENS.accent, st: r2(start + 0.18) }),
      // no divider: this block does not know how tall its panes are, and a rule drawn to a guessed
      // height is a line that is wrong at every size but one. The two titles already separate them.
      ...splitScreen({ x, y: r2(y + TITLE_H), w, gap, left: leftScreen, right: rightScreen, start, dur }),
    ];
  }
  // The rule under the heading spans the column. The heading stays at TYPE.lead rather than dropping
  // to a mono eyebrow: below 24px a normal-weight dim heading has to clear 4.5:1 instead of 3:1, and
  // both column colours are chosen to be subordinate. Each column is one `html` fragment; its own rows
  // stage with `parts` so the two lists fill in rather than land as one slab per side.
  const col = ({ title, items, accent, st }) => {
    const html = `<div style="display:flex;flex-direction:column;align-items:stretch;gap:${SPACE.sm}px;`
      + `width:${colW}px;box-sizing:border-box">`
      + `<span style="font:700 ${TYPE.lead}px var(--font-sans);color:${accent}">${title}</span>`
      + `<div style="height:1px;background:${T.hair}"></div>`
      + items.map((it) => `<span data-part style="font:400 ${TYPE.base}px var(--font-sans);color:${T.sub}">${it}</span>`).join('')
      + '</div>';
    return { type: 'html', w: colW, html, ...cardChrome({ radius: R.card, elevation: E.flat }),
      start: st, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
      parts: [{ anim: 'slide-left', each: 0.28, stagger: 0.12, delay: 0.3 }] };
  };
  return [
    { ...col({ title: leftTitle, items: left, accent: T.dim, st: start }), x, y },
    { ...col({ title: rightTitle, items: right, accent: TOKENS.accent, st: start }), x: r2(x + colW + gap), y },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// captions, timed subtitle chips at the bottom (accessibility + muted-autoplay reach). Each line
// is {t, text, dur?}; `t` is relative to `start`. Deterministic. Pair with a future VO track.
export function captions({ lines = [], x = 460, y = 980, size = 30, start = 0 } = {}) {
  return lines.map((ln) => ({
    type: 'html', x, y, bg: 'rgba(10,10,10,0.82)', radius: 8,
    html: `<span style="display:inline-block;padding:8px 16px;font:600 ${size}px var(--font-sans);color:#fff">${ln.text}</span>`,
    start: r2(start + ln.t), duration: ln.dur ?? 2.2, anim: 'fade', enterDur: 0.2, exitDur: 0.2,
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 1 families, charts + card variants. Charts that need curves/arcs use ONE `html`+SVG layer
// (crisp, deterministic, animates as a unit); bar-family stays native boxes for per-bar life.

// pricingCard: plan · price · feature ticks · CTA. highlight = the featured plan (accent border + CTA).
// `price` defaults to nothing. A DEFAULT price is a figure published by every caller who forgets to
// set one, which is the same defect as deploySuccess's baked "Ready in 1.2s".
export function pricingCard({ x, y, w = 360, plan = 'Pro', price = '', period = '/mo', features = [], cta = 'Start free', highlight = false, start = 0, dur = 4 } = {}) {
  // The tick was `--up`. Green there means nothing directional: a feature is INCLUDED, not up, and
  // spending the success colour on a static list is the stoplight-palette bug in miniature.
  const featuresHtml = features.map((f) => `<div style="display:flex;align-items:center;gap:${SPACE.xs}px">`
    + `<span style="font:700 ${TYPE.body}px var(--font-sans);color:${T.accent}">✓</span>`
    + `<span style="font:400 ${TYPE.body}px var(--font-sans);color:${T.sub}">${f}</span></div>`).join('');
  // T.onAccent, not '#fff'. This CTA is filled with the accent, and on higgsfield's acid lime white
  // measured 1.16:1, shipped, unreadable. The theme computes a readable ink for its own accent
  // (core/boot.js); the block asks for it rather than assuming.
  const html = `<div style="display:flex;flex-direction:column;gap:${SPACE.md}px;padding:${SPACE.lg}px;`
    + `box-sizing:border-box;width:${w}px">`
    // The plan name reads as an eyebrow, not a heading: the price is the heading. Held at TYPE.base
    // and 600 so it stays WCAG "large text" and the accent spelling keeps its 3:1 allowance.
    + `<span style="font:600 ${TYPE.base}px var(--font-mono);color:${highlight ? T.accentInk : T.dim};`
    + `letter-spacing:0.1em">${String(plan).toUpperCase()}</span>`
    + `<div style="display:flex;align-items:flex-end;gap:${SPACE.tight}px">`
    + `<span style="font:700 ${TYPE.display}px var(--font-sans);color:${T.ink};letter-spacing:-0.03em">${price}</span>`
    + `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.dim}">${period}</span></div>`
    + `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:${SPACE.xs}px">${featuresHtml}</div>`
    + `<div style="background:${highlight ? T.accent : T.surface};border-radius:${R.chip}px;padding:${SPACE.sm}px 0;`
    + `display:flex;justify-content:center">`
    + `<span style="font:600 ${TYPE.body}px var(--font-sans);color:${highlight ? T.onAccent : T.ink}">${cta}</span></div>`
    + '</div>';
  return [{ type: 'html', x, y, w, html,
    bg: T.card, radius: R.card, border: highlight ? `1.5px solid ${T.accent}` : HAIR, elevation: highlight ? E.card : E.flat,
    start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35 }];
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 2 families, dev blocks + device/UI chrome.

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 3 families, lists & structure.

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 4 families, social & messaging.

// ── social SHAPES: player card, creator lower third, follow card. Shapes only, on purpose: no
//    platform logos, wordmarks, or lockups (licence rule). The silhouette carries the recognition.

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 5 families, brand & motion. Arcs/rings use html+SVG; spinner wraps the lottie runtime.

// ─────────────────────────────────────────────────────────────────────────────
// lowerThird. The name/role identifier broadcast has used for sixty years: who is speaking, while
// they speak. ONE component, twelve chromes, because what differs between a BILD front page and a
// Vercel keynote caption is not the layout (name over role, lower left) but the material around it.
// `variant` picks the material; everything else is shared.
//
// The spine every variant honours:
//   name: the identifier (a person, a product, a place). Always the dominant element.
//   role. The qualifier underneath. Always subordinate: smaller, dimmer, or set in mono. Optional.
//   x, y: TOP-LEVEL of the block, as everywhere in this file. y ~820 sits it in the lower third of a
//          1080 stage; the caller places it, because "lower third" is a convention, not a rule.
//
// Motion: `wipe` for anything with a plate (a plate arrives edge-first, which is what reads as
// broadcast rather than as a fading label), `rise` for bare text. Every variant is pure in n: entrances
// are driven by driveClips off data-start, and the two kinetic presets used here (`underline`,
// `riseClip`) are pure functions of unit progress. Nothing steps from a previous frame.
const LT_FONT = { name: { size: 46, weight: 700, tracking: '-0.02em' }, role: { size: 21, weight: 500 } };

// Twelve independent looks, one per key, each a pure function of the shared context lowerThird
// builds once. A lookup table rather than a switch: every variant's own shape and its own comment
// stay together, and dispatch below is one lookup instead of twelve branches.
const LOWER_THIRD_VARIANTS = {
  // A plate the colour of the page, hairline-bordered. The quiet one: use it when the frame is busy
  // and the identifier must not compete with it.
  cleanBar: ({ x, y, name, role, N, RF, wipeIn, stackL }) => [{ type: 'group', x, y, ...stackL, gap: 2,
    pad: '16px 24px', bg: T.card, radius: 4, border: HAIR, ...wipeIn, children: [
      text({ text: name, ...N, color: T.ink }),
      role && text({ text: role, ...RF, color: T.dim }),
    ].filter(Boolean) }],

  // Name reversed out of a solid accent block, role in an ink block beneath. The default broadcast
  // read: two hard rectangles, no radius, no apology.
  boldBlock: ({ x, y, name, role, accent, N, RF, s2, wipeIn, HARD }) => [
    { type: 'group', x, y, pad: '12px 16px', bg: accent, ...HARD, ...wipeIn,
      children: [text({ text: name, ...N, color: T.onAccent })] },
    role ? { type: 'group', x, y: r2(y + N.size + 24), pad: '8px 16px', bg: T.ink, ...HARD,
      ...wipeIn, start: s2, children: [text({ text: role, ...RF, color: T.onAccent })] } : null,
  ].filter(Boolean),

  // BILD: the German tabloid front page. Caps, reversed out of accent, tracked TIGHT and set huge.
  // The loudest variant in the set, and it is supposed to be.
  bild: ({ x, y, name, role, accent, s2, wipeIn, HARD }) => [
    { type: 'group', x, y, pad: '8px 16px', bg: accent, ...HARD, ...wipeIn, enterDur: 0.3, children: [
      text({ text: String(name).toUpperCase(), size: 62, weight: 800, tracking: '-0.03em', color: T.onAccent }),
    ] },
    role ? { type: 'group', x: r2(x + 14), y: r2(y + 84), pad: '8px 16px', bg: T.ink, ...HARD, ...wipeIn,
      start: s2, enterDur: 0.3, children: [
        text({ text: String(role).toUpperCase(), size: 22, weight: 700, tracking: '0.04em', color: T.onAccent }),
      ] } : null,
  ].filter(Boolean),

  // A dark elevated card. The only variant that works over bright photography without a scrim.
  darkCard: ({ x, y, name, role, N, RF, riseIn, stackL }) => [{ type: 'group', x, y, ...stackL, gap: 4,
    pad: '16px 24px', bg: 'rgba(16,18,24,0.92)', radius: 12, ...riseIn, children: [
      text({ text: name, ...N, color: '#fff' }),
      role && text({ text: role, ...RF, color: 'rgba(255,255,255,0.72)' }),
    ].filter(Boolean) }],

  // A thick accent rule, then the text. No plate at all: the rule alone carries the identity, so it
  // needs a calm backdrop to land on. (A rule beside text is broadcast grammar, not a card stripe.)
  sideRule: ({ x, y, name, role, accent, N, RF, riseIn, stackL }) => [{ type: 'group', x, y, layout: 'row',
    items: 'center', gap: 16, ...riseIn, children: [
      box({ w: 6, h: r2(N.size + (role ? RF.size + 14 : 0)), bg: accent }),
      { type: 'group', ...stackL, gap: 2, children: [
        text({ text: name, ...N, color: T.ink }),
        role && text({ text: role, ...RF, color: T.dim }),
      ].filter(Boolean) },
    ] }],

  // Kicker above, name below: the role becomes a small mono label that INTRODUCES the name rather
  // than trailing it. Reverses the usual hierarchy without weakening it.
  kickerName: ({ x, y, name, role, accent, riseIn, stackL }) => [{ type: 'group', x, y, ...stackL, gap: 6,
    ...riseIn, children: [
      // 18 matches the schema's floor for a top-level text layer. As a group child it would be
      // allowed to go smaller, and a kicker is exactly the element that wants to: don't. Carry the
      // emphasis with tracking and colour, which cost no legibility.
      role && text({ text: String(role).toUpperCase(), font: 'mono', size: 18, weight: 600,
        tracking: '0.12em', color: accent }),
      text({ text: name, size: 54, weight: 700, tracking: '-0.025em', color: T.ink }),
    ].filter(Boolean) }],

  // The underline DRAWS under the name (kinetic `underline`, pure in unit progress). Bare text, so
  // it inherits whatever the frame is doing behind it.
  accentUnderline: ({ x, y, name, role, accent, N, RF, start, dur }) => [
    text({ text: name, x, y, ...N, color: T.ink, split: 'word', preset: 'underline',
      presetOpts: { color: accent }, each: 0.5, stagger: 0.06, start, duration: dur, exitDur: 0.3 }),
    role && text({ text: role, x, y: r2(y + N.size + 16), ...RF, color: T.dim,
      start: r2(start + 0.35), duration: r2(dur - 0.35), anim: 'fade', enterDur: 0.4, exitDur: 0.3 }),
  ].filter(Boolean),

  // The name rises out of a clipped baseline, one word at a time (kinetic `riseClip`), type moving
  // the way it reads. The most "designed" entrance in the set; give it a slow beat.
  maskReveal: ({ x, y, name, role, N, RF, start, dur }) => [
    text({ text: name, x, y, ...N, color: T.ink, split: 'word', preset: 'riseClip',
      each: 0.55, stagger: 0.08, start, duration: dur, exitDur: 0.3 }),
    role && text({ text: role, x, y: r2(y + N.size + 16), ...RF, color: T.dim,
      start: r2(start + 0.4), duration: r2(dur - 0.4), anim: 'fade', enterDur: 0.4, exitDur: 0.3 }),
  ].filter(Boolean),

  // Soft accent pill, fully rounded. The friendly one: product tours, not news.
  softPill: ({ x, y, name, role, riseIn }) => [{ type: 'group', x, y, layout: 'row', items: 'center',
    gap: 12, pad: '12px 24px', bg: T.accentSoft, radius: 100, ...riseIn, children: [
      text({ text: name, size: 34, weight: 700, tracking: '-0.02em', color: T.accentInk }),
      role && text({ text: role, size: 19, weight: 500, color: T.accentInk }),
    ].filter(Boolean) }],

  // Two blocks, offset and staggered in time so the eye reads name → role as one gesture, not two
  // labels. The offset is what stops it being `boldBlock` with extra steps.
  colourBlock: ({ x, y, name, role, accent, N, RF, s2, wipeIn, HARD }) => [
    { type: 'group', x, y, pad: '12px 24px', bg: T.ink, ...HARD, ...wipeIn,
      children: [text({ text: name, ...N, color: T.onAccent })] },
    // Nine name-card sites here painted a literal '#fff' on an accent fill. --on-accent has
    // existed since this morning and these never adopted it; on higgsfield's acid lime that
    // is white-on-lime at 1.16:1. The token knows what reads on the theme's own accent.
    role ? { type: 'group', x: r2(x + 40), y: r2(y + N.size + 26), pad: '8px 16px', bg: accent, ...HARD,
      ...wipeIn, start: s2, children: [text({ text: role, ...RF, weight: 600, color: T.onAccent })] } : null,
  ].filter(Boolean),

  // A plate over a deliberately shorter accent bar. Reads as a mark rather than a plate.
  stackBars: ({ x, y, name, role, accent, N, RF, s2, wipeIn, HARD }) => [
    { type: 'group', x, y, pad: '12px 24px', bg: T.card, border: HAIR, ...HARD, ...wipeIn,
      children: [text({ text: name, ...N, color: T.ink })] },
    role ? { type: 'group', x, y: r2(y + N.size + 26), pad: '6px 24px', bg: accent, ...HARD, ...wipeIn,
      start: s2, enterDur: 0.32, children: [text({ text: role, ...RF, weight: 600, color: T.onAccent })] } : null,
  ].filter(Boolean),

  // A ticker bar: accent chip, then the line. `role` is the chip (LIVE / BREAKING / 09:41), which is
  // why this variant reads the props in the opposite order to every other one.
  newsTicker: ({ x, y, name, role, accent, wipeIn }) => [{ type: 'group', x, y, layout: 'row',
    items: 'stretch', gap: 0, bg: T.ink, radius: 4, ...wipeIn, children: [
      { type: 'group', bg: accent, pad: '12px 16px', items: 'center',
        children: [text({ text: String(role || 'LIVE').toUpperCase(), font: 'mono', size: 18,
          weight: 700, tracking: '0.08em', color: T.onAccent })] },
      { type: 'group', pad: '12px 24px', items: 'center',
        children: [text({ text: name, size: 30, weight: 600, color: T.onAccent })] },
    ] }],
};

export function lowerThird({ x = 120, y = 820, name = '', role = '', variant = 'cleanBar',
  accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  const fn = LOWER_THIRD_VARIANTS[variant];
  if (!fn) throw new Error(`lowerThird: unknown variant "${variant}", see blocks/catalog.mjs for the twelve`);
  const N = LT_FONT.name, RF = LT_FONT.role;
  const s2 = r2(start + 0.12);                      // the role trails the name by ~2 frames: reading order
  const wipeIn = { start, duration: dur, anim: 'wipe', enterDur: 0.42, exitDur: 0.28 };
  const riseIn = { start, duration: dur, anim: 'rise', enterDur: 0.45, exitDur: 0.3 };
  // Two group defaults actively fight a lower third, so every variant states its intent:
  //   radius ?? 16. A "hard block" silently arrives with soft corners (util.js chipBox).
  //   items ?? center. A column CENTRES its children, so the role floats under the name instead of
  //                     sharing its left edge. A lower third is a left-aligned form; the edge IS the design.
  const HARD = { radius: 0 };
  const stackL = { layout: 'column', items: 'flex-start' };
  return fn({ x, y, name, role, accent, start, dur, N, RF, s2, wipeIn, riseIn, HARD, stackL });
}

// ─────────────────────────────────────────────────────────────────────────────
// The REGISTRY. Bare family factories + namespaced `family.variant` entries from the manifest.
// ─────────────────────────────────────────────────────────────────────────────
// searchEngine. A search page in the two states that actually tell a story:
//   variant 'home'    → the wordmark over an empty pill, the query TYPING into it
//   variant 'results' → a compact bar carrying the query, ranked results, a cursor clicking one
//
// The wordmark is a PROP, never baked in. A block that hardcodes one company's mark is a picture of
// that company, not a reusable piece: pass `brand` for a plain wordmark, or `word` for a per-letter
// coloured one. Every layer is top-level and absolutely placed rather than flowed inside a group,
// because the query is a `typing` layer and its per-character key clicks are derived by the engine
// from (start, cps, text). Keeping it top-level keeps that timing readable at the call site.
const SEARCH_LINK = 'color-mix(in srgb, var(--accent) 82%, var(--text))';
const SEARCH_BAR_H = 60, SEARCH_PAD = 22, SEARCH_ICON = 24;
const searchTextX = (bx) => bx + SEARCH_PAD + SEARCH_ICON + 16;   // clears the magnifier
const searchTextW = (bw) => bw - (SEARCH_PAD + SEARCH_ICON + 16) - (SEARCH_PAD + SEARCH_ICON + 12);

// THE MARK. `logo` (a real SVG) is the preferred form and wins: a wordmark re-typed in whatever face
// the theme happens to ship is a lookalike, not the brand, the authoring rules call this out directly
// ("recreating a brand asset from memory is off-brand by definition"). `word` (per-letter colours)
// and `brand` (plain text) remain for marks you do not have a file for. `logotype` applies the WCAG
// 1.4.3 contrast exemption; centring is the engine's job, never arithmetic.
function searchMark(cy, h, { x, w, brand, word, logo, logoW, logoH, markAlign, start, dur }) {
  const common = { start, duration: dur, anim: 'lift', enterDur: 0.55, exitDur: 0.3, logotype: true };
  if (logo) {
    const iw = Math.round(h * (logoW / logoH));
    return { type: 'image', src: logo, w: iw, h, y: cy,
      x: markAlign === 'left' ? x : Math.round(x + (w - iw) / 2), ...common };
  }
  if (word && word.length) {
    return { type: 'group', x, y: cy, w, layout: 'row', gap: 0, items: 'baseline', ...common,
      justify: markAlign === 'left' ? 'flex-start' : 'center',
      children: word.map((L) => text({ text: L.c, size: h, weight: 700, color: L.color, ls: '-0.04em' })) };
  }
  return text({ text: brand, x, y: cy, w, align: markAlign === 'left' ? 'left' : 'center',
    size: h, weight: 700, color: T.ink, ls: '-0.04em', ...common });
}

// THE BAR. One pill, a magnifier inset at the leading edge, a mic at the trailing edge, the real
// furniture of a search field. The icons are Lucide (ISC) with the stroke baked, because an SVG
// loaded as an <img> has no currentColor to inherit and would render invisible.
function searchBar({ bx, by, bw, st, d }) {
  return [
    rect({ x: bx, y: by, w: bw, h: SEARCH_BAR_H, radius: SEARCH_BAR_H / 2, bg: T.card, border: HAIR, elevation: 1,
      start: st, duration: d, anim: 'rise', enterDur: 0.45, exitDur: 0.3 }),
    { type: 'image', src: '/assets/icons/ui/search.svg', w: SEARCH_ICON, h: SEARCH_ICON,
      x: bx + SEARCH_PAD, y: by + (SEARCH_BAR_H - SEARCH_ICON) / 2,
      start: r2(st + 0.06), duration: r2(d - 0.06), anim: 'fade', enterDur: 0.4, exitDur: 0.25 },
    { type: 'image', src: '/assets/icons/ui/mic.svg', w: SEARCH_ICON - 2, h: SEARCH_ICON - 2,
      x: bx + bw - SEARCH_PAD - (SEARCH_ICON - 2), y: by + (SEARCH_BAR_H - SEARCH_ICON + 2) / 2,
      start: r2(st + 0.1), duration: r2(d - 0.1), anim: 'fade', enterDur: 0.4, exitDur: 0.25 },
  ];
}

function searchEngineHome({ x, y, w, query, cps, keyCue, keyGain, start, dur, markCtx }) {
  const barY = y + 180;
  const out = [searchMark(y, 92, markCtx),
    ...searchBar({ bx: x, by: barY, bw: w, st: r2(start + 0.35), d: r2(dur - 0.35) })];
  // the query types INTO the bar, clear of the magnifier. `typing` is chars/sec and the engine
  // derives one key click per revealed character from (start, cps, text). keyCue/keyGain are the
  // SOUND of this block, so they must reach the typing layer the engine derives key clicks from.
  // They were accepted at the call site and dropped here, which is the silent-substitution class
  // again: the JSON said 0.055 and the render stayed at the default.
  out.push(text({ text: query, x: searchTextX(x), y: barY + 16, w: searchTextW(w), size: 26, color: T.ink,
    typing: cps, ...(keyCue ? { keyCue } : {}), ...(keyGain != null ? { keyGain } : {}),
    start: r2(start + 0.75), duration: r2(dur - 0.75), anim: 'fade', enterDur: 0.12, exitDur: 0.25 }));
  return out;
}

function searchResultRows(results, { x, w, top, start, dur, RX }) {
  return results.flatMap((res, i) => {
    const ry = top + i * 128;
    const st = r2(start + 0.3 + i * 0.1);       // staggered: motion order is reading order
    const d = r2(start + dur - st);
    return [
      text({ text: res.url, x: RX, y: ry, w: w - (RX - x), size: 19, font: 'mono', color: T.dim,
        start: st, duration: d, anim: 'slide-left', out: 'slide-right', enterDur: 0.4, exitDur: 0.25 }),
      text({ text: res.title, x: RX, y: ry + 26, w: w - (RX - x), size: 32, weight: 500, color: SEARCH_LINK,
        start: r2(st + 0.04), duration: r2(d - 0.04), anim: 'slide-left', out: 'slide-right', enterDur: 0.4, exitDur: 0.25 }),
      res.snippet ? text({ text: res.snippet, x: RX, y: ry + 72, w: w - (RX - x), size: 19, color: T.sub,
        start: r2(st + 0.08), duration: r2(d - 0.08), anim: 'fade', enterDur: 0.45, exitDur: 0.25 }) : null,
    ].filter(Boolean);
  });
}

// the pointer travels to the chosen result and clicks it. A click needs a consequence, so callers
// cut on `cursorStart + 0.9`. The block places the click, the scene pays it off.
function searchClickCursor(results, { x, w, top, clickIndex, cursorStart, start, dur, RX }) {
  if (!(results.length && clickIndex != null)) return null;
  const cs = cursorStart != null ? cursorStart : r2(start + dur - 1.5);
  return { type: 'cursor', size: 36, start: cs, duration: r2(start + dur - cs),
    path: [{ t: 0, x: x + w - 120, y: top + results.length * 128 },
           { t: 0.75, x: RX + 60, y: top + clickIndex * 128 + 40 }],
    clicks: [0.9] };
}

function searchEngineResults({ x, y, w, query, results, clickIndex, cursorStart, start, dur, markCtx }) {
  // the mark shrinks to the top-left and the bar sits beside it, as it really does
  const markW = Math.round(34 * (markCtx.logoW / markCtx.logoH));
  const barX = x + (markCtx.logo || markCtx.word ? markW + 40 : 150);
  const barW = Math.min(w - (barX - x), 720);
  const out = [
    { ...searchMark(y + 12, 34, markCtx), x, logotype: true },
    ...searchBar({ bx: barX, by: y, bw: barW, st: start, d: dur }),
    text({ text: query, x: searchTextX(barX), y: y + 15, w: searchTextW(barW), size: 22, color: T.ink,
      start: r2(start + 0.08), duration: r2(dur - 0.08), anim: 'fade', enterDur: 0.3, exitDur: 0.25 }),
  ];
  const top = y + 124;
  out.push(...searchResultRows(results, { x, w, top, start, dur, RX: barX }));
  out.push(searchClickCursor(results, { x, y, w, top, clickIndex, cursorStart, start, dur, RX: barX }));
  return out.filter(Boolean);
}

export function searchEngine({ x = 0, y = 0, w = 900, variant = 'home',
  brand = 'Search', word = null, logo = null, logoW = 272, logoH = 92,
  query = '', results = [], markAlign = 'center',
  cps = 11, keyCue, keyGain, clickIndex = 0, cursorStart, start = 0, dur = 5 } = {}) {
  const markCtx = { x, w, brand, word, logo, logoW, logoH, markAlign, start, dur };
  if (variant === 'home') return searchEngineHome({ x, y, w, query, cps, keyCue, keyGain, start, dur, markCtx });
  return searchEngineResults({ x, y, w, query, results, clickIndex, cursorStart, start, dur, markCtx });
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 6, COMPOSITION. Blocks whose content is OTHER BLOCKS.
//
// Everything above places itself and draws itself. Nothing above places anything ELSE, so every
// "split" archetype in every scene was two blocks at two hand-chosen x coordinates, and the rule
// keeping them aligned lived in the author's head and in arithmetic they re-did per beat. Layout
// discipline that is not in the engine is not discipline; it is a habit, and habits drift silently.
//
// A SIDE IS A BLOCK DESCRIPTOR: `{ block: 'listRow', props: { … } }`, the same `{type:"block"}` shape
// a scene already writes, so a container costs an author no new vocabulary. The container computes
// the pane box and injects `x`/`y`/`w`/`start`/`dur`; the pane's own props decide everything else.
//
// IT INJECTS `w` AND NOT `h`, deliberately. Most factories in this library size themselves off their
// content and accept no `h` at all, and a prop a factory does not destructure is dropped in silence.
// The exact failure this repo has logged repeatedly. `h` is used for the container's own geometry
// (the divider, the inset), never handed to a pane that may not understand it.
const pane = (side, at) => (side ? blockFactory(side && side.block, 'splitScreen')({ ...side.props, ...at }) : []);

// splitScreen: two panes, one geometry. `orient:'row'` splits left|right, `'column'` splits top/bottom,
// and `pip` insets the second pane into a corner of the first instead of sitting beside it.
//
// `split` is the FRACTION of the long axis the first pane gets, so a 60/40 is `split: 0.6` and not two
// widths a caller has to keep summing to the whole. `lead` staggers the second pane behind the first:
// two panes landing on the same frame read as one slab arriving, which is the thing a split is not.
// PICTURE-IN-PICTURE: the second pane is a small inset over the first, and it arrives LAST because
// it is the aside, not the subject.
function splitScreenPip({ x, y, w, h, left, right, pipScale, pipInset, pipCorner, start, dur, second }) {
  const iw = Math.round(w * pipScale);
  const right2 = pipCorner.endsWith('right');
  const px = right2 ? x + w - iw - pipInset : x + pipInset;
  const py = pipCorner.startsWith('top') ? y + pipInset : y + h - Math.round(h * pipScale) - pipInset;
  return [...pane(left, { x, y, w, start, dur }), ...pane(right, { x: px, y: py, w: iw, ...second })];
}

// the rule OPENS along the seam rather than fading in: a divider is a cut being made.
function splitScreenDivider({ col, x, y, w, h, aW, aH, gap, start, dur }) {
  return [rect({
    x: col ? x : r2(x + aW + gap / 2 - 0.5), y: col ? r2(y + aH + gap / 2 - 0.5) : y,
    w: col ? w : 1, h: col ? 1 : h, bg: T.hair,
    start: r2(start + 0.08), duration: r2(dur - 0.08), anim: col ? 'wipe' : 'wipe-down', enterDur: 0.5, exitDur: 0.3,
  })];
}

// The side-by-side (non-pip) geometry: two panes and an optional seam rule between them, sized off
// `orient` and `split`.
function splitScreenSideBySide({ x, y, w, h, orient, split, gap, left, right, divider, start, dur, second }) {
  const f = Math.min(0.9, Math.max(0.1, split));
  const col = orient === 'column';
  const aW = col ? w : r2((w - gap) * f), bW = col ? w : r2(w - gap - aW);
  const aH = col ? r2((h - gap) * f) : h;
  const bX = col ? x : r2(x + aW + gap), bY = col ? r2(y + aH + gap) : y;
  const rule = divider ? splitScreenDivider({ col, x, y, w, h, aW, aH, gap, start, dur }) : [];
  return [...pane(left, { x, y, w: aW, start, dur }), ...rule, ...pane(right, { x: bX, y: bY, w: bW, ...second })];
}

export function splitScreen({ x = 0, y = 0, w = 1200, h = 560, orient = 'row', split = 0.5, gap = 24,
  left = null, right = null, pip = false, pipScale = 0.36, pipInset = 20, pipCorner = 'bottom-right',
  divider = false, lead = 0.18, start = 0, dur = 4 } = {}) {
  const second = { start: r2(start + lead), dur: r2(dur - lead) };
  if (pip) return splitScreenPip({ x, y, w, h, left, right, pipScale, pipInset, pipCorner, start, dur, second });
  return splitScreenSideBySide({ x, y, w, h, orient, split, gap, left, right, divider, start, dur, second });
}

// screenSwap: screen A becomes screen B (becomes C…) in one place. The single most common motion in
// a product demo, and the registry could not make it: `phoneFrame` held content and nothing changed
// the content, so a demo could show one screen per beat and never the move between two.
//
// EVERY SCREEN SHARES ONE BOX. That is the whole point. A swap is two screens at the SAME coordinates
// with handed-over windows, and hand-authoring it means writing the same x/y twice and the handover
// arithmetic once per pair, which is where it goes wrong.
//
// `transition` defaults to `wipe` because a wipe is a CLIP: the outgoing screen is uncovered in place
// and never travels outside its own box, so a swap inside a device frame does not slide across the
// bezel. `slide` is offered for a swap that is meant to read as travel, and it pairs its directions
// (enter from the right, leave to the left) rather than entering and retreating.
const SWAP = {
  wipe: { anim: 'wipe', out: 'wipe-left' },
  slide: { anim: 'slide-right', out: 'slide-left' },
  fade: { anim: 'fade', out: 'fade' },
  defocus: { anim: 'defocus', out: 'defocus' },
};
export function screenSwap({ x = 0, y = 0, w = 320, screens = [], hold = 1.6, overlap = 0.45,
  transition = 'wipe', start = 0, dur = 5 } = {}) {
  if (!(transition in SWAP)) throw new Error(`blocks/core.mjs screenSwap: unknown transition "${transition}". `
    + `Known: ${Object.keys(SWAP).join(', ')}`);
  const move = SWAP[transition];
  const end = start + dur;
  return screens.flatMap((s, i) => {
    const st = r2(start + i * hold);
    if (st >= end) return [];   // a screen whose turn falls past the block's end never gets one
    // the LAST screen holds to the end of the block; every other one hands over, overlapping its
    // successor so the two transitions are one move rather than a gap between two.
    const stop = i === screens.length - 1 ? end : Math.min(end, start + (i + 1) * hold + overlap);
    return pane(s, { x, y, w, start: st, dur: r2(stop - st) }).map((L) => ({
      ...L, ...move, enterDur: 0.45, exitDur: 0.4,
    }));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for the families that live in THIS file. Vocabulary and checker:
// blocks/schema.mjs; the doctrine is core/lightfield/options.js, mirrored key for key.
//
// x · y · start · dur are excluded from every table on purpose. They are placement and timing the
// SCENE supplies, never content an author dials.
export const CORE_SCHEMAS = {
  card: {
    w: { kind: 'int', min: 160, max: 1920, def: 740 },
    h: { kind: 'int', min: 120, max: 1080, def: 336 },
    // The content region's fill. Defaults to the CARD's own fill, so the card reads as one surface;
    // pass a real tint to get a panel back.
    tint: { kind: 'color', def: 'var(--card)' },
    title: { kind: 'str', max: 60 },
    desc: { kind: 'str', max: 160 },
    pills: { kind: 'list', of: { kind: 'str', max: 24 }, def: [] },
    // Empty draws no footer row at all.
    cta: { kind: 'str', max: 24, def: 'Explore' },
    anim: { kind: 'str', max: 24, def: 'rise' },
    enterDur: { kind: 'num', min: 0, max: 4, def: 0.5 },
  },

  colorCycle: {
    word: { kind: 'str', max: 40, def: 'colour' },
    size: { kind: 'int', min: 18, max: 400, def: 78 },
    weight: { kind: 'int', min: 100, max: 900, def: 700 },
    colors: { kind: 'hexlist', max: 12, def: ['#7F6FE8', '#0C9455', '#B47305', '#E04392', '#2B7FEE', '#D65B26'] },
    // Seconds per hue. The block emits one layer per step across `dur`, so a very small `each` is a
    // very large layer count for one word.
    each: { kind: 'num', min: 0.05, max: 5, def: 0.5 },
  },

  stripeCard: {
    w: { kind: 'int', min: 200, max: 1080, def: 380 },
    // The only figure on the card, and empty by default: it was baked once and every caller
    // published the same invented number.
    amount: { kind: 'str', max: 20, def: '' },
  },

  quote: {
    w: { kind: 'int', min: 200, max: 1920, def: 900 },
    text: { kind: 'str', max: 240 },
    author: { kind: 'str', max: 60 },
  },

  kpiRow: {
    // A cell counts UP when it gives a numeric `to`, and lands as text when it gives a formatted
    // `value` ("$2.4M") the count layer cannot render.
    items: { kind: 'list', of: { kind: 'row', fields: {
      to: { kind: 'num', min: -1e12, max: 1e12 },
      from: { kind: 'num', min: -1e12, max: 1e12 },
      unit: { kind: 'str', max: 8 },
      value: { kind: 'str', max: 20 },
      label: { kind: 'str', max: 40 },
    } }, def: [] },
    gap: { kind: 'int', min: 0, max: 400, def: 80 },
  },

  comparison: {
    w: { kind: 'int', min: 200, max: 1920, def: 900 },
    leftTitle: { kind: 'str', max: 40, def: 'Others' },
    rightTitle: { kind: 'str', max: 40, def: 'Vawe' },
    left: { kind: 'list', of: { kind: 'str', max: 80 }, def: [] },
    right: { kind: 'list', of: { kind: 'str', max: 80 }, def: [] },
    // …OR two SCREENS. Either screen present turns the columns into panes and hands the geometry to
    // splitScreen, so the string form above is untouched and takes precedence by absence.
    leftScreen: { kind: 'block', def: null },
    rightScreen: { kind: 'block', def: null },
    gap: { kind: 'int', min: 0, max: 400, def: 40 },
  },

  captions: {
    // `t` is relative to the block's start, `dur` is this line's own life.
    lines: { kind: 'list', of: { kind: 'row', fields: {
      t: { kind: 'num', min: 0, max: 3600 },
      text: { kind: 'str', max: 120 },
      dur: { kind: 'num', min: 0.2, max: 30 },
    } }, def: [] },
    size: { kind: 'int', min: 18, max: 120, def: 30 },
  },

  pricingCard: {
    w: { kind: 'int', min: 200, max: 1080, def: 360 },
    plan: { kind: 'str', max: 24, def: 'Pro' },
    // Empty by default: a default price is a figure published by every caller who forgets to set one.
    price: { kind: 'str', max: 16, def: '' },
    period: { kind: 'str', max: 12, def: '/mo' },
    features: { kind: 'list', of: { kind: 'str', max: 60 }, def: [] },
    cta: { kind: 'str', max: 24, def: 'Start free' },
    // The featured plan: accent border, accent CTA, one step more elevation.
    highlight: { kind: 'bool', def: false },
  },

  lowerThird: {
    name: { kind: 'str', max: 60, def: '' },
    role: { kind: 'str', max: 60, def: '' },
    // Twelve chromes, one layout. The factory throws on anything else, which is what this states.
    variant: { kind: 'enum', of: ['cleanBar', 'boldBlock', 'bild', 'darkCard', 'sideRule', 'kickerName',
      'accentUnderline', 'maskReveal', 'softPill', 'colourBlock', 'stackBars', 'newsTicker'], def: 'cleanBar' },
    accent: { kind: 'color', def: 'var(--accent)' },
  },

  searchEngine: {
    w: { kind: 'int', min: 300, max: 1920, def: 900 },
    variant: { kind: 'enum', of: ['home', 'results'], def: 'home' },
    // The mark, in three forms. `logo` wins: a wordmark re-typed in the theme's face is a lookalike.
    brand: { kind: 'str', max: 40, def: 'Search' },
    word: { kind: 'list', of: { kind: 'row', fields: {
      c: { kind: 'str', max: 2 },
      color: { kind: 'color' },
    } }, def: null },
    logo: { kind: 'str', max: 200, def: null },
    // The logo file's own aspect, used to scale it into the mark height. Both must be above zero or
    // the ratio is undefined.
    logoW: { kind: 'int', min: 1, max: 4000, def: 272 },
    logoH: { kind: 'int', min: 1, max: 4000, def: 92 },
    query: { kind: 'str', max: 120, def: '' },
    results: { kind: 'list', of: { kind: 'row', fields: {
      url: { kind: 'str', max: 120 },
      title: { kind: 'str', max: 120 },
      snippet: { kind: 'str', max: 200 },
    } }, def: [] },
    markAlign: { kind: 'enum', of: ['center', 'left'], def: 'center' },
    // Characters per second for the query. The engine derives one key click per revealed character.
    cps: { kind: 'num', min: 1, max: 120, def: 11 },
    keyCue: { kind: 'str', max: 40 },
    keyGain: { kind: 'num', min: 0, max: 2 },
    clickIndex: { kind: 'int', min: 0, max: 20, def: 0 },
    cursorStart: { kind: 'num', min: 0, max: 3600 },
  },

  splitScreen: {
    w: { kind: 'int', min: 200, max: 1920, def: 1200 },
    // A row split uses `h` for the divider and the pip inset only, so a two-row-tall split is a real
    // and shipped case (the catalog's own example is 96). A column split divides it, so it has to
    // clear the gap with something left over.
    h: { kind: 'int', min: 40, max: 1920, def: 560 },
    orient: { kind: 'enum', of: ['row', 'column'], def: 'row' },
    // The FRACTION of the long axis the first pane gets, clamped to 0.1..0.9 inside the factory so
    // neither pane can vanish.
    split: { kind: 'num', min: 0.1, max: 0.9, def: 0.5 },
    gap: { kind: 'int', min: 0, max: 400, def: 24 },
    left: { kind: 'block', def: null },
    right: { kind: 'block', def: null },
    // Picture-in-picture: the second pane insets into a corner of the first instead of sitting beside it.
    pip: { kind: 'bool', def: false },
    pipScale: { kind: 'unit', def: 0.36 },
    pipInset: { kind: 'int', min: 0, max: 400, def: 20 },
    pipCorner: { kind: 'enum', of: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], def: 'bottom-right' },
    divider: { kind: 'bool', def: false },
    // How far the second pane trails the first. Zero lands both on one frame, which reads as one slab
    // arriving, which is the thing a split is not.
    lead: { kind: 'num', min: 0, max: 5, def: 0.18 },
  },

  screenSwap: {
    w: { kind: 'int', min: 100, max: 1920, def: 320 },
    screens: { kind: 'list', of: { kind: 'block' }, def: [] },
    // One screen's turn. A screen whose turn falls past the block's end never gets one.
    hold: { kind: 'num', min: 0.2, max: 60, def: 1.6 },
    // How far a screen outlives its successor's arrival, so the two transitions are one move.
    overlap: { kind: 'num', min: 0, max: 5, def: 0.45 },
    transition: { kind: 'enum', of: Object.keys(SWAP), def: 'wipe' },
  },
};
