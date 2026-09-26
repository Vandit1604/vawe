// blocks/ui.mjs: extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, HAIR, r2, text, box, onColor, onInk,
  R, TYPE, SPACE, E, cardChrome, toneColor,
  stackWindows, TONE_NAMES,
  tint, TINT, SHADOW_CARD, labelCss, numCss,
} from './kit.mjs';
// The label this module's blocks are grouped under on the site, declared here rather than in a
// hand-kept name-to-category table. A module that declares none is refused at generation time
// (scripts/site/blocks-json.mjs).
export const CATEGORY = 'Interface';

const T = TOKENS;

// ─────────────────────────────────────────────────────────────────────────────
// browserFrame, window chrome (traffic dots + URL bar). Draw content on top via other layers.
// `url` defaults to a placeholder domain, never a real company's, since this ships the shape, not a
// brand lockup. `children` is the content slot, so a change to w/h never silently breaks alignment.
export function browserFrame({ x, y, w = 900, h = 560, url = 'example.com', children = [], start = 0, dur = 4 } = {}) {
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 0,
    bg: T.card, radius: R.card, elevation: E.card, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [
      { type: 'group', layout: 'row', items: 'center', gap: SPACE.xs, pad: `${SPACE.sm}px ${SPACE.md}px`, children: [
        // The traffic dots are a status triad, not three picked colours: close/minimise/zoom is
        // danger/warn/ok, exactly what `toneColor` maps, the same route every sibling in this file
        // takes for a status colour (`notification`, `badge`, `shield`).
        ...['error', 'warn', 'ok'].map((tone) => box({ w: 12, h: 12, radius: R.pill, bg: toneColor(tone) })),
        { type: 'group', grow: 1, layout: 'row', justify: 'center', children: [
          // A URL is machine text, so it stays mono. That is the one place mono is right for a word.
          { type: 'group', bg: T.surface, radius: R.pill, pad: `${SPACE.snug}px ${SPACE.md}px`, children: [text({ text: url, font: 'mono', size: TYPE.body, color: T.sub })] },
        ] },
      ] },
      // The chrome row is separated from the content by a HAIRLINE, the register's own surface
      // boundary. A one-px box, not a `border` shorthand: `el.style.border` takes the WHOLE box, so
      // a bottom-only rule written there is invalid CSS the browser drops without a word.
      ...(children.length ? [box({ h: 1, bg: T.hair }),
        { type: 'group', grow: 1, layout: 'column', items: 'stretch', pad: `${SPACE.md}px`, children }] : []),
    ],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML-FIRST FAMILIES BELOW. Design Read: flat chips and hairline surfaces, one accent hue at two
// weights (kit.mjs's DATA TREATMENT idiom), mono for figures/sans for words, never a gradient or a
// card-in-card. VARIANCE low (utility chrome, not the film's loud moment); MOTION restrained, either
// the layer's own envelope anim for a single-unit card or `parts` where the family already staggers
// its own children. engine-doctrine/CRAFT/HTML-FRAGMENTS.md.

// pillRow, a horizontal row of chip tags.
export function pillRow({ x, y, items = [], fg = T.accentInk, bg = T.accentSoft, start = 0, dur = 4 } = {}) {
  // the chips POP IN one after another: a tag row filling, not a slab sliding up. `parts` default
  // select (`[data-part]` among others) picks up every chip with no selector to restate.
  const html = `<div style="display:flex;flex-wrap:wrap;gap:${SPACE.xs}px;align-items:center">`
    + items.map((p) => `<span data-part style="display:inline-flex;align-items:center;`
      + `font:500 ${TYPE.body}px var(--font-sans);color:${fg};background:${bg};border-radius:${R.pill}px;`
      + `padding:6px 16px;white-space:nowrap">${p}</span>`).join('') + '</div>';
  return [{ type: 'html', x, y, html, start, duration: dur, anim: 'none', enterDur: 0,
    parts: [{ anim: 'popIn', each: 0.26, stagger: 0.08, delay: 0.1 }] }];
}

// notification: a toast card (icon + title + body). Good for "it just happened" beats. `icon` renders
// a glyph if given, a plain dot if not, the same rule `toast` uses for its dot.
// `items` stacks N alerts arriving in order and expiring; one card is the block calling itself with the
// stack flattened away, so the stacked and single forms cannot render differently.
export function notification({ x, y, w = 460, title, message = '', body, desc = '', icon = null, accent = TOKENS.accent,
  items = null, life = 2.4, step = 1, rowH = 96, gap = 12, start = 0, dur = 4 } = {}) {
  if (items && items.length) {
    return stackWindows({ n: items.length, start, dur, step, life, rowH, gap }).flatMap((wnd, i) => {
      const it = items[i];
      return notification({ x, y: r2(y + wnd.dy), w, title: it.title ?? it.message, body: it.body ?? it.desc,
        icon: it.icon ?? icon, accent: it.accent || accent, start: wnd.start, dur: wnd.dur });
    });
  }
  title = title ?? message; body = body ?? desc;
  // 26/TYPE.body, not 22/14: `make audit` fails any text under 14.04px as unreadable, so the glyph
  // that says WHAT happened was the one part of the alert nobody could read. The dot grows to fit it.
  const dot = icon
    ? `<div style="width:26px;height:26px;border-radius:${R.pill}px;background:${accent};flex:none;`
      + `display:flex;align-items:center;justify-content:center;font:700 ${TYPE.body}px var(--font-sans);`
      + `color:${onColor(accent)}">${icon}</div>`
    : `<div style="width:12px;height:12px;border-radius:${R.pill}px;background:${accent};flex:none"></div>`;
  const html = `<div style="display:flex;align-items:flex-start;gap:${SPACE.sm}px;padding:${SPACE.md}px;`
    + `box-sizing:border-box;width:${w}px">` + dot
    + `<div style="display:flex;flex-direction:column;gap:${SPACE.snug}px;align-items:flex-start;flex:1;min-width:0">`
    + `<span style="font:700 ${TYPE.lead}px var(--font-sans);color:${T.ink}">${title}</span>`
    + (body ? `<span style="font:400 ${TYPE.body}px var(--font-sans);color:${T.sub}">${body}</span>` : '')
    + '</div></div>';
  // a notification ARRIVES FROM THE EDGE and leaves the way it came, the short, correct entrance for a
  // chip. Nothing inside it should perform; it is one small statement, so no `parts` here.
  return [{ type: 'html', x, y, w, html, ...cardChrome({ elevation: E.card, anim: 'slide-right' }), out: 'slide-right',
    start, duration: dur, enterDur: 0.4, exitDur: 0.3 }];
}

// callout: an info/success/warn strip with a leading bar (full-height, per shape lock).
export function callout({ x, y, w = 720, text: msg, body = '', title = '', tone = 'info', start = 0, dur = 4 } = {}) {
  msg = msg ?? body ?? title;
  const ac = toneColor(tone);
  // the strip WIPES OPEN from its leading rule, then the message reads in, the short entrance a
  // status strip is for (a plate arrives edge-first; it does not fly)
  // THE STRIP IS TINTED IN ITS OWN TONE, not painted on the neutral `--surface-2`. A status strip
  // whose only coloured mark is a 4px rule reads as a grey box with a stripe: the tone has to be in
  // the GROUND for the strip to say anything before it is read. Same one-hue-at-two-weights idiom the
  // data family uses, solid rule, soft fill, one colour.
  const html = `<div style="display:flex;align-items:center;gap:${SPACE.md}px;padding:${SPACE.md}px ${SPACE.lg}px;`
    + `box-sizing:border-box;width:${w}px">`
    + `<div style="width:4px;height:30px;background:${ac};flex:none"></div>`
    + `<span data-part style="font:500 ${TYPE.base}px var(--font-sans);color:${T.ink}">${msg}</span></div>`;
  return [{ type: 'html', x, y, w, bg: tint(ac, TINT.chip), radius: R.tight, html,
    start, duration: dur, anim: 'wipe', enterDur: 0.4,
    parts: [{ anim: 'fade', each: 0.28, delay: 0.2 }] }];
}

// phoneFrame: a phone shell (dark bezel, dynamic-island notch, light screen). Draw content on top.
// `children` is the SCREEN. Without it the block was a bezel around an empty card, so any app content
// had to be absolutely placed over it from the scene using coordinates derived by hand from the pad,
// arithmetic that broke silently the moment w or h changed. `status` draws the clock/indicator row,
// without which the frame reads as a black rectangle rather than a phone in use.
export function phoneFrame({ x, y, w = 300, h = 620, children = [], status = true, time = '10:24',
  start = 0, dur = 4 } = {}) {
  // THE CORNER IS A PROPORTION TOO, and for a while it was not: the bezel and the screen both carried
  // `R.pill`, which is 100px, and at the catalog's own w:230 that is 43% of the device width. A radius
  // that large stops describing a corner and describes an end, so the block rendered a capsule. A real
  // handset corner is about a sixth of the width (iPhone 15: 55pt of 393pt of display, the bezel a
  // shade more), and 0.16 lands there at every w.
  const bezelR = Math.round(w * 0.16);
  // CONCENTRIC RADII: an inner corner is the outer corner MINUS the gap between the two curves, or the
  // two arcs are not parallel and the bezel reads as thicker at the corners than along the sides. The
  // gap here is the frame's own `pad`, SPACE.xs.
  const screenR = Math.max(R.micro, bezelR - SPACE.xs);
  // the notch is a PROPORTION of the device, not a fixed 116px. At the catalog's w:230 that constant
  // covered more than half the screen. 0.39 / 0.087 of w reproduce the shipped look at w:300.
  //
  // #0A0A0A ON BOTH, and it is one of this library's few legitimate literals, on the same test
  // blocks/camera-chrome.mjs applies to its REC lamp: the colour belongs to the HARDWARE, not to a
  // brand. A bezel is near-black because it is glass over an unlit edge, and the island is black
  // because those pixels are off. A theme that repainted either would be depicting a different object.
  const screen = [box({ w: Math.round(w * 0.39), h: Math.round(w * 0.087), radius: R.pill, bg: '#0A0A0A' })];
  // The status glyphs are `--text-2`, never `--dim`: `--dim` is the de-emphasised CHROME role and
  // measures 2.6:1 on higgsfield, which `make audit` fails HARD. Quiet is a colour; unread is a bug.
  // THE STATUS TYPE IS PROPORTIONAL UNTIL IT STOPS BEING READABLE, then it floors. At the catalog's
  // own w:230 the clock came out 10px and the indicator 9px, and `make audit` fails anything under
  // 14.04px as unreadable, so did the DEFAULT w:300, at 13.5px. Below about w:380 a phone prop
  // cannot be both proportional and legible, and legible wins: a status bar nobody can read is not
  // depicting a phone in use, it is depicting a smudge.
  const statusSize = (k) => Math.max(TYPE.body, Math.round(w * k));
  if (status) screen.push({ type: 'group', w: w - 44, layout: 'row', items: 'center', justify: 'space-between', pad: `${SPACE.snug}px ${SPACE.tight}px 0`,
    children: [text({ text: time, size: statusSize(0.045), weight: 600, color: T.ink }),
               text({ text: '▮▮▮', size: statusSize(0.038), color: T.sub })] });
  if (children.length) screen.push({ type: 'group', grow: 1, w: w - 44, layout: 'column', items: 'stretch', gap: SPACE.xs, pad: `${SPACE.xs}px 0 0`, children });
  return [{ type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: SPACE.xs,
    bg: '#0A0A0A', radius: bezelR, elevation: E.card, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [{ type: 'group', grow: 1, bg: T.card, radius: screenR, layout: 'column', items: 'center', pad: SPACE.sm,
      children: screen }] }];
}

// tabBar: a segmented control / app tab bar. `active` is the selected index; `activeFrom`+`activeTo`
// make the selection move, which is the only thing a tab bar ever does. `tabs` items are a plain
// string, or `{ label, icon }` for the icon-over-label form.
//
// The selection slides, it does not cross-fade: the lit pill translates by `var(--p)` (the engine's
// animated custom properties, the same mechanism `gauge` and `pressButton` use), and the active-styled
// copy of the label row lives inside the pill, counter-translated by the same expression, so whichever
// tab the pill is over renders in the active style for free, with no second timeline to fall out of sync.
// `var(--p, 1)` rests at 1 so a bar with no sweep sits on `to`, the settled state.
//
// The two label copies must be the same width, differing in colour only: a heavier active weight would
// make it wider than the row beneath, and since the clip window's alignment depends on the rows being
// metrically identical, the lit label would drift out of its own pill as the pill travels.
// Icon and label are both sans, from `labelCss`, to stay on the native type scale. The inactive icon is
// `--text-2` (the muted text role), not `--dim`, to clear 4.5:1 contrast on every theme.
function tabBarHtml({ items, tabW, rowH, innerW, withIcons, w, PAD, GAP, from, to, step }) {
  const pos = `calc((${from} + ${r2(to - from)} * var(--p, 1)) * ${step}px)`;
  const cell = (t, activeStyle) => `<div style="width:${tabW}px;height:${rowH}px;flex:none;display:flex;`
    + `flex-direction:column;align-items:center;justify-content:center;gap:2px">`
    + (t.icon ? `<div style="${labelCss({ size: withIcons ? TYPE.lead : TYPE.base, weight: 400, color: activeStyle ? T.accent : T.sub })};line-height:1">${t.icon}</div>` : '')
    + `<div style="${labelCss({ size: withIcons ? TYPE.body : TYPE.base, weight: 600, color: activeStyle ? T.ink : T.sub })};white-space:nowrap">${t.label || ''}</div></div>`;
  const row = (activeStyle) => `<div style="display:flex;gap:${GAP}px;width:${innerW}px">`
    + items.map((t) => cell(t, activeStyle)).join('') + '</div>';
  return `<div style="position:relative;box-sizing:border-box;width:${w}px;height:${rowH + 2 * PAD}px;`
    + `background:${T.surface};border-radius:${R.tight}px">`
    // the lit pill, and the active-styled row clipped to it
    + `<div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${tabW}px;height:${rowH}px;`
    + `border-radius:${R.chip}px;background:${T.card};box-shadow:${SHADOW_CARD};`
    + `transform:translateX(${pos})"></div>`
    + `<div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${innerW}px;height:${rowH}px;">`
    + row(false) + '</div>'
    + `<div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${tabW}px;height:${rowH}px;`
    + `overflow:hidden;border-radius:${R.chip}px;transform:translateX(${pos})">`
    + `<div style="position:absolute;left:0;top:0;transform:translateX(calc(-1 * ${pos}))">${row(true)}</div>`
    + '</div></div>';
}

export function tabBar({ x, y, w = 520, tabs = [], active = 0, activeFrom = null, activeTo = null,
  switchAt = 0.9, switchDur = 0.5, start = 0, dur = 4 } = {}) {
  const n = Math.max(1, tabs.length);
  const from = Math.min(n - 1, Math.max(0, activeFrom ?? active));
  const to = Math.min(n - 1, Math.max(0, activeTo ?? activeFrom ?? active));
  const PAD = 6, GAP = 6;
  const tabW = r2((w - 2 * PAD - GAP * (n - 1)) / n), step = r2(tabW + GAP);
  const items = tabs.map((t) => (typeof t === 'string' ? { label: t, icon: '' } : t || {}));
  const withIcons = items.some((t) => t.icon);
  const rowH = withIcons ? 64 : 40, innerW = r2(w - 2 * PAD);
  const html = tabBarHtml({ items, tabW, rowH, innerW, withIcons, w, PAD, GAP, from, to, step });
  return [{
    type: 'html', x, y, w, html, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    // only a bar that actually MOVES carries a sweep; a static one leaves `--p` at its resting 1.
    ...(from === to ? {} : { vars: { '--p': [0, 1] }, varsDur: switchDur, varsDelay: Math.max(0, switchAt), varsEase: 'easeOutCubic' }),
  }];
}

// checklist: items with checked/unchecked boxes; done rows dim (reads as completed).
export function checklist({ x, y, w = 480, items = [], start = 0, dur = 4 } = {}) {
  // ITEMS TICK OFF ONE AFTER ANOTHER, top to bottom, the motion a checklist is FOR: `parts` staggers
  // each row (its default select already picks up `[data-part]`), the card itself only fades in.
  // A TINTED CHIP WITH A MIXED TICK, not a solid `--up` fill with white on it. `onColor` cannot grade a
  // `var()` (`--up` returned '#fff' every time, 2.5:1 on linear, a HARD failure); the tinted form is
  // guaranteed on every theme and is the register's own idiom: one hue at two weights, soft fill, solid mark.
  const chip = (done) => done
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;`
      + `flex:none;border-radius:${R.chip}px;background:${tint(T.green, TINT.chip)};border:2px solid ${tint(T.green, 30)};`
      + `font:700 ${TYPE.body}px var(--font-sans);color:${onInk(T.green)}">✓</span>`
    : `<span style="display:inline-flex;width:28px;height:28px;flex:none;border-radius:${R.chip}px;`
      + `background:${T.card};border:2px solid ${T.hair}"></span>`;
  // A completed row is `--text-2`, not `--dim`. Struck-through-quiet is a look; unreadable is a HARD
  // `make audit` failure, and `--dim` measures 2.6:1 on higgsfield.
  const row = (it) => `<div data-part style="display:flex;align-items:center;gap:${SPACE.sm}px">` + chip(it.done)
    + `<span style="font:500 ${TYPE.base}px var(--font-sans);color:${it.done ? T.sub : T.ink}">${it.text}</span></div>`;
  const html = `<div style="display:flex;flex-direction:column;gap:${SPACE.sm}px;padding:${SPACE.lg}px;`
    + `box-sizing:border-box;width:${w}px">` + items.map(row).join('') + '</div>';
  return [{ type: 'html', x, y, w, ...cardChrome({ anim: 'fade' }), html,
    start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    parts: [{ anim: 'fadeUp', each: 0.3, stagger: 0.26, delay: 0.2 }] }];
}

// table. A data table: `cols` header + `rows` of cells, hairline-divided.
export function table({ x, y, w = 640, cols = [], rows = [], start = 0, dur = 4 } = {}) {
  // ROWS FILL IN ONE AFTER ANOTHER under a header that is already there, how a table actually
  // populates: `parts` staggers each `<tr>`-equivalent row, the header sits static above them.
  // MONO CARRIES NUMBERS, SANS CARRIES WORDS, and this block had it backwards: the column HEADINGS
  // ("Plan", "Seats") were set in mono and the cells under them in sans, which spends the one thing
  // mono is for (a column of digits that lines up) on the one row that never holds a figure. A cell
  // that is entirely numeric now gets the theme's tabular face; a heading is a word, so it is sans.
  const NUMERIC = /^[-+]?[$€£]?[\d,]+(\.\d+)?%?$/;
  const cellCss = (v, head) => { const numeric = !head && NUMERIC.test(String(v).trim());
    return `flex:1;font:${head ? 600 : 500} ${head ? TYPE.body : TYPE.base}px var(--font-${numeric ? 'num' : 'sans'});color:${head ? T.sub : T.ink}`; };
  const headRow = `<div style="display:flex;gap:${SPACE.md}px;align-items:center;padding:${SPACE.sm}px 0">`
    + cols.map((c) => `<span style="${cellCss(c, true)}">${c}</span>`).join('') + '</div>';
  // every body row carries its own top hairline, which is the divider after the header AND between rows.
  const bodyRows = rows.map((r) => `<div data-part style="display:flex;gap:${SPACE.md}px;align-items:center;`
    + `padding:${SPACE.sm}px 0;border-top:${HAIR}">` + r.map((c) => `<span style="${cellCss(c, false)}">${c}</span>`).join('') + '</div>').join('');
  const html = `<div style="display:flex;flex-direction:column;padding:${SPACE.md}px ${SPACE.lg}px;`
    + `box-sizing:border-box;width:${w}px">` + headRow + bodyRows + '</div>';
  return [{ type: 'html', x, y, w, ...cardChrome({ anim: 'fade' }), html,
    start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    parts: [{ anim: 'slide-left', each: 0.32, stagger: 0.16, delay: 0.3 }] }];
}

// timeline: a vertical rail (dot + connecting line) with entries; `done` fills the dot accent.
export function timeline({ x, y, w = 480, items = [], start = 0, dur = 4 } = {}) {
  // THE RAIL ADVANCES DOWN THE SEQUENCE: each dot lands and its entry arrives beside it, in order, so
  // the eye travels the timeline instead of being handed the whole thing at once. `parts` staggers one
  // dot+entry row at a time; the connecting rail stays static, as scaffolding.
  // An unreached dot sits on a TINT of the accent, not on `--line`. `--line` is the BORDER colour:
  // painting the rest of a sequence with it says "divider", not "step not yet taken". The same
  // correction the meters got when their tracks stopped being hairline-coloured.
  const row = (it, last) => `<div data-part style="display:flex;align-items:stretch;gap:${SPACE.md}px">`
    + `<div style="display:flex;flex-direction:column;align-items:center;width:18px;flex:none">`
    + `<span style="width:14px;height:14px;border-radius:${R.pill}px;flex:none;`
    + `background:${it.done ? T.accent : tint(T.accent, TINT.track)}"></span>`
    + (!last ? `<span style="width:2px;flex:1;background:${T.hair}"></span>` : '') + '</div>'
    // The meta line is a date or a figure, so mono is right here. Its colour is not: `--dim` again.
    + `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding-bottom:${SPACE.lg}px">`
    + `<span style="font:600 ${TYPE.base}px var(--font-sans);color:${T.ink}">${it.title}</span>`
    + (it.meta ? `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">${it.meta}</span>` : '')
    + '</div></div>';
  const html = `<div style="display:flex;flex-direction:column;padding:${SPACE.lg}px;box-sizing:border-box;width:${w}px">`
    + items.map((it, i) => row(it, i === items.length - 1)).join('') + '</div>';
  return [{ type: 'html', x, y, w, ...cardChrome({ anim: 'fade' }), html,
    start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    parts: [{ anim: 'slide-left', each: 0.3, stagger: 0.3, delay: 0.2 }] }];
}

// stepFlow: a horizontal numbered progress track; `active` is the current step (connectors fill behind it).
// `active` is where the track stands; `activeFrom` + `activeTo` are where it travels between.
//
// The progress is one number: `--p` sweeps 0→1 across the window and `pos` maps that onto the step
// index; a ring lights when `pos` reaches it and a connector fills by the fraction of the gap crossed.
// That is why this is one `html` layer: three ring states occupy the same 44px, which a flow layout
// cannot express, and both fall out of the one number. Pure in n.
// A step number is a figure, so all three copies use the theme's tabular face via `numCss` (a sans
// digit sits at a different optical width per glyph inside a fixed ring). The unreached digit is
// `--text-2`, not `--dim` (2.6:1 on higgsfield fails contrast).
function stepFlowRing(i, { RING, lit, done }) {
  const digit = (color) => `${numCss({ size: TYPE.base, color, weight: 700 })};letter-spacing:0`;
  return `<div style="position:relative;width:${RING}px;height:${RING}px;flex:none">`
    + `<div style="position:absolute;inset:0;border-radius:100%;background:${T.surface};display:flex;`
    // The unreached digit fades out as the ring lights, rather than staying painted and merely
    // covered: a hidden-but-live element still reads as `--text-2` on the accent to a contrast probe.
    + `align-items:center;justify-content:center;${digit(T.sub)};opacity:calc(1 - ${lit(i)})">${i + 1}</div>`
    + `<div style="position:absolute;inset:0;border-radius:100%;background:${T.accent};opacity:${lit(i)}"></div>`
    + `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;`
    + `${digit(onColor(T.accent))};opacity:calc(${lit(i)} - ${done(i)})">${i + 1}</div>`
    + `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;`
    + `${digit(onColor(T.accent))};opacity:${done(i)}">✓</div></div>`;
}

// the label is drawn twice, the reached copy fading in over the unreached one. Same string, so the
// two copies are the same width and nothing shifts as a step lights.
function stepFlowLabel(s, i, { lit }) {
  return `<div style="position:relative;margin-top:${SPACE.xs}px;white-space:nowrap">`
    + `<div style="${labelCss({ size: TYPE.body, weight: 500 })}">${s}</div>`
    + `<div style="position:absolute;left:0;top:0;${labelCss({ size: TYPE.body, weight: 600, color: T.ink })};`
    + `opacity:${lit(i)}">${s}</div></div>`;
}

// THE UNFILLED RAIL IS A TINT OF THE FILL, not `--line`. Painting the part of a track still to be
// crossed with the theme's BORDER colour made it read as a divider between two rings instead of as
// the rest of the journey, and on a dark theme it vanished into the card. Same correction `gauge`
// and `progressRing` got, and the same reason.
function stepFlowConnector(i, { RING, RAIL, pos }) {
  return `<div style="flex:1 1 auto;height:${RAIL}px;margin-top:${(RING - RAIL) / 2}px;`
    + `border-radius:${RAIL / 2}px;background:${tint(T.accent, TINT.track)};position:relative;overflow:hidden">`
    + `<div style="position:absolute;inset:0;background:${T.accent};transform-origin:left center;`
    + `transform:scaleX(clamp(0, calc(${pos} - ${i}), 1))"></div></div>`;
}

function stepFlowHtml(steps, { w, RING, GAP, RAIL, pos }) {
  const lit = (i) => `clamp(0, calc((${pos} - ${i}) * 6 + 1), 1)`;   // ring i reached
  const done = (i) => lit(i + 1);                                     // ...and passed
  const ctx = { RING, RAIL, pos, lit, done };
  const cells = steps.map((s, i) => `<div style="display:flex;flex-direction:column;align-items:center;flex:none">`
    + stepFlowRing(i, ctx) + stepFlowLabel(s, i, ctx) + '</div>');
  const track = cells.flatMap((c, i) => (i < steps.length - 1 ? [c, stepFlowConnector(i, ctx)] : [c])).join('');
  return `<div style="width:${w}px;display:flex;align-items:flex-start;gap:${GAP}px">${track}</div>`;
}

export function stepFlow({ x, y, w = 720, steps = [], active = 0, activeFrom = null, activeTo = null,
  buildAt = 0.3, buildDur = 0, start = 0, dur = 4 } = {}) {
  const from = Math.max(0, activeFrom ?? active);
  const to = Math.max(0, activeTo ?? activeFrom ?? active);
  const RING = 44, GAP = 14, RAIL = 2;
  // `pos` is a bare parenthesised expression so it can nest inside calc()/clamp() without doubling up.
  const pos = `(${from} + ${r2(to - from)} * var(--p, 1))`;
  const html = stepFlowHtml(steps, { w, RING, GAP, RAIL, pos });
  return [{
    type: 'html', x, y, w, html, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    ...(from === to ? {} : { vars: { '--p': [0, 1] }, varsEase: 'easeOutCubic',
      varsDur: buildDur || r2(0.55 * Math.max(1, Math.abs(to - from))), varsDelay: Math.max(0, buildAt) }),
  }];
}

// kanban: columns of small cards. columns = [{title, cards:[string]}].
export function kanban({ x, y, w = 720, columns = [], start = 0, dur = 4 } = {}) {
  const colW = r2((w - 16 * (columns.length - 1)) / Math.max(1, columns.length));
  // THE BOARD DEALS ITSELF: `parts` staggers every marked child in DOM order, column by column (a
  // header then its own cards, then the next column). The original native version read the board
  // across-then-down; `parts` staggers in document order and has no per-element delay override, so a
  // column-major reveal is the honest shape here rather than a hand-computed one it cannot express.
  // A column heading is a WORD ("In review"), so it is sans. It was mono, which is the library's
  // standing inversion, and `--dim`, which `make audit` fails HARD on a dark theme.
  // HAIRLINE, NO SHADOW. A card sitting inside a board already has a boundary; giving it a drop
  // shadow as well is two pieces of chrome saying the same thing, and the register spends one.
  const col = (c) => `<div style="display:flex;flex-direction:column;gap:${SPACE.xs}px;width:${colW}px;flex:none">`
    + `<span data-part style="font:600 ${TYPE.body}px var(--font-sans);color:${T.sub}">${c.title}</span>`
    + c.cards.map((card) => `<span data-part style="font:500 ${TYPE.body}px var(--font-sans);color:${T.ink};`
      + `background:${T.card};border-radius:${R.card}px;border:${HAIR};padding:${SPACE.sm}px ${SPACE.md}px">${card}</span>`).join('')
    + '</div>';
  const html = `<div style="display:flex;align-items:flex-start;gap:${SPACE.md}px;width:${w}px">`
    + columns.map(col).join('') + '</div>';
  return [{ type: 'html', x, y, w, html, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    parts: [{ anim: 'popIn', each: 0.3, stagger: 0.1, delay: 0.15 }] }];
}

// OPTICAL_NUDGE: one line of type, centred by eye rather than by box. Measured on the toast plate: a
// centred box (0.01px) still places the ink ~2.8px above centre, since a 21.9px line box's ascender
// starts ~1px down and its baseline leaves ~6.5px of descender room.
// The nudge goes on the text, not the plate: shifting the plate's padding would move the status disc
// too (its optical centre is its geometric one). 6px of top padding on the text shifts the ink by half
// that, landing the type's optical centre on the disc's.
// Written as `css` because `pad` is silently dropped on a layer with no background
// (core/layers/util.js:202 returns before writing it, the same drop that clipped the badge's label).
const OPTICAL_NUDGE = { paddingTop: `${SPACE.snug}px` };

// toast. A dark snackbar: status dot · message · action link. (notification is the light card variant.)
// The alert family (notification · toast · callout · banner) shares one vocabulary: `title` and `body`.
// Old names stay as aliases: a shared vocabulary is worth nothing if adopting it breaks every caller
// (MISTAKES #67).
export function toast({ x, y, w = 420, title, message = '', body: _body = '', action = '', icon = '✓', accent = TOKENS.green,
  items = null, life = 2.2, step = 0.9, rowH = 58, gap = 12, start = 0, dur = 4 } = {}) {
  // see `notification`, same stack, same helper, same recursion into the single-card form.
  if (items && items.length) {
    return stackWindows({ n: items.length, start, dur, step, life, rowH, gap }).flatMap((wnd, i) => {
      const it = items[i];
      const [card] = toast({ x, y: r2(y + wnd.dy), w, title: it.title ?? it.message, body: it.body, action: it.action,
        icon: it.icon ?? icon, accent: it.accent || accent, start: wnd.start, dur: wnd.dur });
      // A stack is depth, not a column: `w` is a floor (the row's own content sets the real width) and
      // overlap buries older messages, so depth (opacity/elevation) is the register left; the newest
      // card holds full weight and light, each older one sits back a step.
      const back = items.length - 1 - i;   // 0 is the newest
      return [{ ...card, elevation: back ? E.card : E.raised, opacity: r2(1 - Math.min(back, 2) * 0.1) }];
    });
  }
  message = title ?? message;
  // T.ink/T.paper is the theme contract's guaranteed-legible inverted pair, so the plate stays
  // dark-on-light and flips to light-on-dark, never merging into the ground on either.
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: SPACE.sm, pad: SPACE.md,
    bg: T.ink, radius: R.card, elevation: E.card, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3, children: [
      // 26/TYPE.body, not 22/14: `make audit` fails anything under 14.04px.
      // This card is inverted (`--text` is the ground, `--bg` is the type), so `onInk` would pull the
      // dot toward `--text`, the background here, at 1.8:1. Holding the fill at 45% of the status
      // colour over the plate colour keeps `--bg` on it reading as well as `--bg` on the plate does.
      box({ w: 26, h: 26, radius: R.pill, bg: `color-mix(in srgb, ${accent} 45%, ${T.ink})`, layout: 'row', justify: 'center', items: 'center',
        children: [text({ text: icon, size: TYPE.body, weight: 700, color: T.paper, css: OPTICAL_NUDGE })] }),
      text({ text: message, size: TYPE.base, weight: 500, color: T.paper, grow: 1, css: OPTICAL_NUDGE }),
      // The plate is inverted, so the action link is mixed toward `--bg`, not left as the bare accent
      // (a bare lime accent measured 1.1:1 on higgsfield's near-white plate).
      // Mixed at 40%, not 55%: at 55% the link fails 4.5:1 on 7 of 38 themes, bottoming out at 3.26:1
      // on ledgerline-neon; at 40% the worst theme measures 5.32:1 and the link is still plainly the
      // accent. No on-dark accent token exists (`--on-accent` is ink for an accent fill), so the
      // plate's own text colour is the only thing every theme promises will read here.
      action && text({ text: action, size: TYPE.body, weight: 600, color: `color-mix(in srgb, ${T.accent} 40%, var(--bg))`,
        css: OPTICAL_NUDGE }),
    ].filter(Boolean) }];
}

// logoWall: a grid of wordmark (or logo image) cells. logos = [{text}] or [{src}].
export function logoWall({ x, y, w = 640, logos = [], cols = 3, start = 0, dur = 4 } = {}) {
  const rows = []; for (let i = 0; i < logos.length; i += cols) rows.push(logos.slice(i, i + cols));
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: SPACE.sm, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: rows.map((r) => ({ type: 'group', layout: 'row', gap: SPACE.sm, items: 'stretch', children:
      // Hairline, no shadow: a grid of cells reads as a grid because of its rules, and one drop
      // shadow per cell turns a wall into a pile.
      r.map((lg) => ({ type: 'group', grow: 1, bg: T.card, radius: R.card, border: HAIR, pad: `${SPACE.lg}px 0`, layout: 'row', justify: 'center', items: 'center',
        children: [lg.src ? { type: 'image', src: lg.src, h: 28 } : text({ text: lg.text, size: TYPE.lead, weight: 700, color: T.sub, ls: '-0.02em' })] })) })) }];
}

// badge. A CI-shield token: dark label + a coloured value chip. tone picks the value colour.
export function badge({ x, y, label = '', value = '', tone = 'ok', start = 0, dur = 4 } = {}) {
  const ac = toneColor(tone);
  // core/boot.js writes `--on-up`/`--on-down`/`--on-warn` beside `--on-accent`, each white-or-black
  // chosen per theme off that theme's own fill, clearing all 152 theme x tone pairs (floor 4.69:1).
  // `onColor` defers to them so this block holds no colour opinion of its own.
  const onAc = onColor(ac);
  // A shield stamps in, its value chip a beat later; nothing more, to keep it reading as a vocabulary.
  // Plate and text use `T.ink`/`T.paper` (the theme contract's guaranteed pair), inverted: a dark plate
  // with light text on a light theme, and vice versa, legible on both by construction.
  // `shadow` and `border` do apply to a group, despite both being labelled "(rect)" in the schema. The
  // shadow says the sticker sits above the frame (elevation); a border would be the wrong instrument,
  // and the seam inside the badge is drawn with a colour change instead.
  // Mono on both halves is deliberate, not the library's inversion: a CI shield is machine chrome end
  // to end ("build | passing", "v2.4.1"), the same register as a terminal.
  //
  // One rectangle in two halves, which is what a shields.io badge is: same padding, one height, and the
  // plate owns the only radius and clips them so the seam is square. `pad` on a layer with no background
  // is dropped (core/layers/util.js:202 returns before writing padding), so each half is a group with
  // its own fill, which is what makes its padding real.
  const half = `${SPACE.snug}px ${SPACE.sm}px`;
  // The label half stamps in with the plate, the value half pops a beat later. `parts` on the value
  // half alone reproduces that; the label is plain content, not a separately-timed part.
  const html = `<div style="display:flex;align-items:stretch">`
    + `<div style="background:${TOKENS.ink};padding:${half};display:flex;align-items:center">`
    + `<span style="font:600 ${TYPE.body}px var(--font-mono);color:${TOKENS.paper}">${label}</span></div>`
    + `<div data-part style="background:${ac};padding:${half};display:flex;align-items:center">`
    + `<span style="font:700 ${TYPE.body}px var(--font-mono);color:${onAc}">${value}</span></div>`
    + '</div>';
  return [{ type: 'html', x, y, bg: TOKENS.ink, radius: R.chip,
    // The clip is what keeps the coloured half square at the seam and round at the plate's edge, so
    // one radius describes the whole object and there is no nested radius to get wrong.
    css: { overflow: 'hidden' }, shadow: true, html,
    start, duration: dur, anim: 'pop', enterDur: 0.32, exitDur: 0.3,
    parts: [{ anim: 'popIn', each: 0.26, delay: 0.22 }] }];
}

// banner. A full-width accent announcement bar: icon · message · CTA.
export function banner({ x, y, w = 720, text: msg = '', body = '', title = '', cta = '', icon = '★', accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  msg = msg || body || title;
  const ink = onColor(accent);
  // THE CTA CHIP IS A TINT OF ITS OWN INK, not a hardcoded white wash. `rgba(255,255,255,0.18)` assumes
  // the bar is dark; on a light accent (higgsfield's lime) it was a white chip carrying dark text, i.e.
  // invisible against the bar it sits on. Tinting the colour `onColor` already chose lifts the chip off
  // the bar in both directions without the block knowing which it is in.
  const html = `<div style="display:flex;align-items:center;gap:${SPACE.sm}px;padding:${SPACE.md}px ${SPACE.lg}px;`
    + `box-sizing:border-box;width:${w}px">`
    + `<span style="font:400 ${TYPE.base}px var(--font-sans);color:${ink}">${icon}</span>`
    + `<span style="flex:1;font:600 ${TYPE.base}px var(--font-sans);color:${ink}">${msg}</span>`
    + (cta ? `<div data-part style="background:${tint(ink, 18)};border-radius:${R.chip}px;padding:${SPACE.xs}px ${SPACE.md}px">`
      + `<span style="font:600 ${TYPE.body}px var(--font-sans);color:${ink}">${cta}</span></div>` : '')
    + '</div>';
  // a full-width bar arrives EDGE-FIRST (broadcast grammar), then its CTA lands
  return [{ type: 'html', x, y, w, bg: accent, radius: R.tight, html,
    start, duration: dur, anim: 'wipe', enterDur: 0.45, exitDur: 0.3,
    ...(cta ? { parts: [{ anim: 'popIn', each: 0.3, delay: 0.35 }] } : {}) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
//
// The alert family (notification · toast · callout · banner) shares one vocabulary, `title` + `body`.
// The older spellings are still accepted, so they are declared as aliases rather than dropped: a dial
// that hides a name the engine answers to is a second, quieter contract.
export const UI_SCHEMAS = {
  browserFrame: {
    w: { kind: 'int', min: 200, max: 1920, def: 900 },
    h: { kind: 'int', min: 100, max: 1080, def: 560 },
    url: { kind: 'str', max: 80, def: 'example.com' },
  },

  pillRow: {
    items: { kind: 'list', of: { kind: 'str', max: 40 }, def: [] },
    fg: { kind: 'color', def: 'var(--accent)' },
    bg: { kind: 'color', def: 'color-mix(in srgb, var(--accent) 14%, transparent)' },
  },

  notification: {
    w: { kind: 'int', min: 200, max: 1080, def: 460 },
    title: { kind: 'str', max: 80 },
    message: { kind: 'str', max: 80, def: '' },      // alias of title
    body: { kind: 'str', max: 200 },
    desc: { kind: 'str', max: 200, def: '' },        // alias of body
    // A glyph rides inside the dot; without one the dot stays plain. One character, not a sentence.
    icon: { kind: 'str', max: 4, def: null },
    accent: { kind: 'color', def: 'var(--accent)' },
    // The stacked form. Null renders the single card; a list renders N alerts that arrive and EXPIRE.
    items: { kind: 'list', of: { kind: 'row', fields: {
      title: { kind: 'str', max: 80 },
      body: { kind: 'str', max: 200 },
      icon: { kind: 'str', max: 4 },
      accent: { kind: 'color' },
    } }, def: null },
    // How long one alert sits. Clipped to the block's own end, never extended past it.
    life: { kind: 'num', min: 0.4, max: 30, def: 2.4 },
    // The pitch between arrivals. Below the enter+exit ramps the stack reads as one arrival.
    step: { kind: 'num', min: 0.1, max: 10, def: 1 },
    // The row pitch the stack steps down by. It is the card's own height, not a gap.
    rowH: { kind: 'int', min: 40, max: 400, def: 96 },
    gap: { kind: 'int', min: 0, max: 80, def: 12 },
  },

  callout: {
    w: { kind: 'int', min: 200, max: 1920, def: 720 },
    text: { kind: 'str', max: 200 },
    body: { kind: 'str', max: 200, def: '' },        // alias of text
    title: { kind: 'str', max: 200, def: '' },       // alias of text
    tone: { kind: 'enum', of: TONE_NAMES, def: 'info' },
  },

  phoneFrame: {
    // Every piece of the shell is a proportion of `w` (the notch, the status type), so the device
    // stays a device at any size instead of growing a fixed 116px notch on a 230px phone.
    w: { kind: 'int', min: 120, max: 900, def: 300 },
    h: { kind: 'int', min: 200, max: 1920, def: 620 },
    status: { kind: 'bool', def: true },
    time: { kind: 'str', max: 8, def: '10:24' },
  },

  tabBar: {
    w: { kind: 'int', min: 160, max: 1920, def: 520 },
    // A tab is a bare label, or an icon over a label.
    tabs: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 24 },
      { kind: 'row', fields: { label: { kind: 'str', max: 24 }, icon: { kind: 'str', max: 4 } } },
    ] }, def: [] },
    // Where the selection STANDS. `activeFrom` + `activeTo` are where it TRAVELS between.
    // All three are clamped to the tab count inside the factory, so the ceiling here is a sanity bound.
    active: { kind: 'int', min: 0, max: 20, def: 0 },
    activeFrom: { kind: 'int', min: 0, max: 20, def: null },
    activeTo: { kind: 'int', min: 0, max: 20, def: null },
    switchAt: { kind: 'num', min: 0, max: 60, def: 0.9 },
    switchDur: { kind: 'num', min: 0.05, max: 10, def: 0.5 },
  },

  checklist: {
    w: { kind: 'int', min: 160, max: 1920, def: 480 },
    items: { kind: 'list', of: { kind: 'row', fields: {
      text: { kind: 'str', max: 120 },
      done: { kind: 'bool' },
    } }, def: [] },
  },

  table: {
    w: { kind: 'int', min: 200, max: 1920, def: 640 },
    cols: { kind: 'list', of: { kind: 'str', max: 40 }, def: [] },
    // One row is a list of cells, and a cell is stringified, so a number is fine.
    rows: { kind: 'list', of: { kind: 'list', of: { kind: 'str', max: 60 } }, def: [] },
  },

  timeline: {
    w: { kind: 'int', min: 160, max: 1920, def: 480 },
    items: { kind: 'list', of: { kind: 'row', fields: {
      title: { kind: 'str', max: 120 },
      meta: { kind: 'str', max: 40 },
      done: { kind: 'bool' },
    } }, def: [] },
  },

  stepFlow: {
    w: { kind: 'int', min: 200, max: 1920, def: 720 },
    steps: { kind: 'list', of: { kind: 'str', max: 24 }, def: [] },
    active: { kind: 'int', min: 0, max: 20, def: 0 },
    activeFrom: { kind: 'int', min: 0, max: 20, def: null },
    activeTo: { kind: 'int', min: 0, max: 20, def: null },
    buildAt: { kind: 'num', min: 0, max: 60, def: 0.3 },
    // Zero means "derive it from the distance travelled", which is what the factory does.
    buildDur: { kind: 'num', min: 0, max: 20, def: 0 },
  },

  kanban: {
    w: { kind: 'int', min: 200, max: 1920, def: 720 },
    columns: { kind: 'list', of: { kind: 'row', fields: {
      title: { kind: 'str', max: 40 },
      cards: { kind: 'list', of: { kind: 'str', max: 80 } },
    } }, def: [] },
  },

  toast: {
    w: { kind: 'int', min: 160, max: 1080, def: 420 },
    title: { kind: 'str', max: 120 },
    message: { kind: 'str', max: 120, def: '' },     // alias of title
    // `body` is NOT declared. It is destructured and never rendered, so a dial for it would be a
    // control that does nothing. It is listed in the gate's OMIT with that reason, and reported.
    action: { kind: 'str', max: 24, def: '' },
    icon: { kind: 'str', max: 4, def: '✓' },
    accent: { kind: 'color', def: 'var(--up)' },
    items: { kind: 'list', of: { kind: 'row', fields: {
      title: { kind: 'str', max: 120 },
      // no `body` here either: the stack hands it to the single-card form, which drops it.
      action: { kind: 'str', max: 24 },
      icon: { kind: 'str', max: 4 },
      accent: { kind: 'color' },
    } }, def: null },
    life: { kind: 'num', min: 0.4, max: 30, def: 2.2 },
    step: { kind: 'num', min: 0.1, max: 10, def: 0.9 },
    rowH: { kind: 'int', min: 30, max: 400, def: 58 },
    gap: { kind: 'int', min: 0, max: 80, def: 12 },
  },

  logoWall: {
    w: { kind: 'int', min: 160, max: 1920, def: 640 },
    // A cell is a wordmark or a real logo file. `src` is preferred: a mark re-typed in the theme's
    // face is a lookalike, not the brand.
    logos: { kind: 'list', of: { kind: 'row', fields: {
      text: { kind: 'str', max: 40 },
      src: { kind: 'str', max: 200 },
    } }, def: [] },
    cols: { kind: 'int', min: 1, max: 8, def: 3 },
  },

  badge: {
    label: { kind: 'str', max: 24, def: '' },
    value: { kind: 'str', max: 24, def: '' },
    tone: { kind: 'enum', of: TONE_NAMES, def: 'ok' },
  },

  banner: {
    w: { kind: 'int', min: 200, max: 1920, def: 720 },
    text: { kind: 'str', max: 200, def: '' },
    body: { kind: 'str', max: 200, def: '' },        // alias of text
    title: { kind: 'str', max: 200, def: '' },       // alias of text
    cta: { kind: 'str', max: 24, def: '' },
    icon: { kind: 'str', max: 4, def: '★' },
    accent: { kind: 'color', def: 'var(--accent)' },
  },
};
