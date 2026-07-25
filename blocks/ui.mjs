// blocks/ui.mjs — extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, SERIES, seriesAt, HAIR, r2, text, rect, box, pill, onColor,
  R, cardChrome, htmlCard, cardInsetY, barWidth, toneColor, avatarEl,
  sweep, stagger, growUp, fillRight, stackWindows,
} from './kit.mjs';
const T = TOKENS;

// ─────────────────────────────────────────────────────────────────────────────
// browserFrame — window chrome (traffic dots + URL bar). Draw content on top via other layers.
// `url` defaulted to a real company's domain, which put a brand into every caller that did not think
// to override it — the repo's rule is to ship the SHAPE, never a brand lockup. `children` is the
// content slot: without it a caller had to hand-stack absolute coordinates over the chrome and any
// change to w/h silently broke the alignment.
export function browserFrame({ x, y, w = 900, h = 560, url = 'example.com', children = [], start = 0, dur = 4 } = {}) {
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 0,
    bg: T.card, radius: R.card, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [
      { type: 'group', layout: 'row', items: 'center', gap: 8, pad: '14px 18px', children: [
        ...['#FF5F57', '#FEBC2E', '#28C840'].map((c) => box({ w: 12, h: 12, radius: 100, bg: c })),
        { type: 'group', grow: 1, layout: 'row', justify: 'center', children: [
          { type: 'group', bg: T.surface, radius: 100, pad: '6px 20px', children: [text({ text: url, font: 'mono', size: 18, color: T.sub })] },
        ] },
      ] },
      ...(children.length ? [{ type: 'group', grow: 1, layout: 'column', items: 'stretch', pad: '0 18px 18px', children }] : []),
    ],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// pillRow — a horizontal row of chip tags.
export function pillRow({ x, y, items = [], fg = T.accentInk, bg = T.accentSoft, start = 0, dur = 4 } = {}) {
  // the chips POP IN one after another — a tag row filling, not a slab sliding up
  return [{ type: 'group', x, y, layout: 'row', wrap: true, gap: 10, items: 'center',
    start, duration: dur, anim: 'fade', enterDur: 0.2, children: items.map((p, i) => ({
      ...pill(p, fg, bg), ...stagger(i, { step: 0.08, delay: 0.1, anim: 'pop', enterDur: 0.26 }) })) }];
}

// notification — a toast card (icon + title + body). Good for "it just happened" beats.
// `icon` was in this signature, documented by its presence, and rendered NOWHERE — the block drew a
// bare dot and dropped the glyph. `toast` drew the same dot WITH the glyph in it. So the two halves of
// one family disagreed about whether a prop existed, and the half that accepted it lied. Same chip,
// same rule in both: a glyph if one is given, a plain dot if not.
//
// `items` stacks: N alerts arriving in order and EXPIRING, which is what an alert actually does. The
// recursion is the point — one card is the block calling itself with the stack flattened away, so the
// stacked and single forms cannot render differently.
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
  const dot = icon
    ? box({ w: 22, h: 22, radius: 100, bg: accent, layout: 'row', justify: 'center', items: 'center',
        children: [text({ text: String(icon), size: 14, weight: 700, color: onColor(accent) })] })
    : box({ w: 12, h: 12, radius: 100, bg: accent });
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-start', gap: 14, pad: 20,
    // a notification ARRIVES FROM THE EDGE and leaves the way it came — the short, correct entrance
    // for a chip. Nothing inside it should perform; it is one small statement.
    ...cardChrome({ elevation: 2, anim: 'slide-right' }), out: 'slide-right',
    start, duration: dur, enterDur: 0.4, exitDur: 0.3, children: [
      dot,
      { type: 'group', layout: 'column', gap: 6, items: 'flex-start', grow: 1, children: [
        text({ text: title, size: 22, weight: 700, color: T.ink }),
        body && text({ text: body, size: 18, color: T.sub }),
      ].filter(Boolean) },
    ] }];
}

// callout — an info/success/warn strip with a leading bar (full-height, per shape lock).
export function callout({ x, y, w = 720, text: msg, body = '', title = '', tone = 'info', start = 0, dur = 4 } = {}) {
  msg = msg ?? body ?? title;
  const ac = toneColor(tone);
  // the strip WIPES OPEN from its leading rule, then the message reads in — the short entrance a
  // status strip is for (a plate arrives edge-first; it does not fly)
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: '18px 22px',
    bg: T.surface, radius: R.tight, start, duration: dur, anim: 'wipe', enterDur: 0.4, children: [
      box({ w: 4, h: 30, radius: 2, bg: ac }),
      text({ text: msg, size: 22, weight: 500, color: T.ink, delay: 0.2, anim: 'fade', enterDur: 0.28 }),
    ] }];
}

// phoneFrame — a phone shell (dark bezel, dynamic-island notch, light screen). Draw content on top.
// `children` is the SCREEN. Without it the block was a bezel around an empty card, so any app content
// had to be absolutely placed over it from the scene using coordinates derived by hand from the pad —
// arithmetic that broke silently the moment w or h changed. `status` draws the clock/indicator row,
// without which the frame reads as a black rectangle rather than a phone in use.
export function phoneFrame({ x, y, w = 300, h = 620, children = [], status = true, time = '10:24',
  start = 0, dur = 4 } = {}) {
  // the notch is a PROPORTION of the device, not a fixed 116px — at the catalog's w:230 that constant
  // covered more than half the screen. 0.39 / 0.087 of w reproduce the shipped look at w:300.
  const screen = [box({ w: Math.round(w * 0.39), h: Math.round(w * 0.087), radius: 100, bg: '#0A0A0A' })];
  if (status) screen.push({ type: 'group', w: w - 44, layout: 'row', items: 'center', justify: 'space-between', pad: '6px 4px 0',
    children: [text({ text: time, size: Math.round(w * 0.045), weight: 600, color: T.ink }),
               text({ text: '▮▮▮', size: Math.round(w * 0.038), color: T.dim })] });
  if (children.length) screen.push({ type: 'group', grow: 1, w: w - 44, layout: 'column', items: 'stretch', gap: 10, pad: '10px 0 0', children });
  return [{ type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 10,
    bg: '#0A0A0A', radius: 44, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [{ type: 'group', grow: 1, bg: T.card, radius: 34, layout: 'column', items: 'center', pad: 12,
      children: screen }] }];
}

// tabBar — a segmented control / app tab bar. `active` is the selected index; `activeFrom`+`activeTo`
// make the selection MOVE, which is the only thing a tab bar ever does.
//
// TWO DEFECTS, one shape. `active` was a frozen index, so a scene could show a tab bar before a switch
// or after one and never the switch itself — the single most-filmed interaction in a product demo was
// the one state this block could not reach. And `tabs` were text-only while every real app tab bar is
// icon-over-label, so the block depicted a segmented control and was catalogued as a tab bar.
//
// THE SELECTION SLIDES, IT DOES NOT CROSS-FADE, and that is why this is one `html` layer rather than
// the native group it used to be. The lit pill translates by `var(--p)` (the engine's animated custom
// properties — the same mechanism `gauge` and `pressButton` use), and the ACTIVE-styled copy of the
// label row lives INSIDE the pill, counter-translated by the same expression. So whichever tab the
// pill is currently over renders in the active style, for free, at every frame — no per-label opacity
// arithmetic, and no second timeline that can fall out of sync with the first.
//
// `tabs` items are a plain string, or `{ label, icon }` for the icon-over-label form.
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
  // the pill's offset, as ONE expression used three times (pill, clip window, counter-translate).
  // `var(--p, 1)` rests at 1 so a bar with no sweep sits on `to` — the settled state, which is what a
  // still of a tab bar should show.
  const pos = `calc((${from} + ${r2(to - from)} * var(--p, 1)) * ${step}px)`;
  // THE TWO COPIES MUST BE THE SAME WIDTH, so they differ in COLOUR ONLY. Weighting the active copy
  // heavier made it wider than the copy beneath it, and since the clip window's alignment depends on
  // the two rows being metrically identical, the lit label drifted out of its own pill as the pill
  // travelled — a bold half-word sticking out of a white box. Colour carries the state; the pill
  // carries the emphasis. (Real tab bars do exactly this, for exactly this reason.)
  const cell = (t, activeStyle) => `<div style="width:${tabW}px;height:${rowH}px;flex:none;display:flex;`
    + `flex-direction:column;align-items:center;justify-content:center;gap:3px">`
    + (t.icon ? `<div style="font:400 ${withIcons ? 22 : 18}px var(--font-sans);line-height:1;`
        + `color:${activeStyle ? T.accent : T.dim}">${t.icon}</div>` : '')
    + `<div style="font:600 ${withIcons ? 15 : 18}px var(--font-sans);`
    + `color:${activeStyle ? T.ink : T.sub};white-space:nowrap">${t.label || ''}</div></div>`;
  const row = (activeStyle) => `<div style="display:flex;gap:${GAP}px;width:${innerW}px">`
    + items.map((t) => cell(t, activeStyle)).join('') + '</div>';
  const html = `<div style="position:relative;box-sizing:border-box;width:${w}px;height:${rowH + 2 * PAD}px;`
    + `background:${T.surface};border-radius:${R.tight}px">`
    // the lit pill, and the active-styled row clipped to it
    + `<div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${tabW}px;height:${rowH}px;`
    + `border-radius:8px;background:${T.card};box-shadow:0 1px 2px color-mix(in srgb, var(--text) 14%, transparent);`
    + `transform:translateX(${pos})"></div>`
    + `<div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${innerW}px;height:${rowH}px;">`
    + row(false) + '</div>'
    + `<div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${tabW}px;height:${rowH}px;`
    + `overflow:hidden;border-radius:8px;transform:translateX(${pos})">`
    + `<div style="position:absolute;left:0;top:0;transform:translateX(calc(-1 * ${pos}))">${row(true)}</div>`
    + '</div></div>';
  return [{
    type: 'html', x, y, w, html, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    // only a bar that actually MOVES carries a sweep; a static one leaves `--p` at its resting 1.
    ...(from === to ? {} : { vars: { '--p': [0, 1] }, varsDur: switchDur, varsDelay: Math.max(0, switchAt), varsEase: 'easeOutCubic' }),
  }];
}

// checklist — items with checked/unchecked boxes; done rows dim (reads as completed).
export function checklist({ x, y, w = 480, items = [], start = 0, dur = 4 } = {}) {
  // ITEMS TICK OFF ONE AFTER ANOTHER, top to bottom — the motion a checklist is FOR. The card only
  // fades in; the rows perform.
  //
  // The box is a LEAF (a chip on a text layer) rather than a group wrapping a glyph, because only a
  // leaf child is handed to the clip driver: a nested group child is built and then never registered,
  // so it cannot carry its own timing. Both states are the SAME glyph in the SAME chip, the open one
  // simply unpainted, so a row does not resize at the moment it completes.
  const CHIP = { text: '✓', size: 16, weight: 700, radius: 8, pad: '5px 7px' };
  const beat = (i, extra) => stagger(i, { step: 0.26, delay: 0.2, enterDur: 0.3, ...extra });
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 12, pad: 26,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: items.map((it, i) => ({ type: 'group', layout: 'row', items: 'center', gap: 14, children: [
      it.done
        ? text({ ...CHIP, color: '#fff', bg: T.green, border: '2px solid transparent', ...beat(i, { anim: 'pop', delay: 0.34 }) })
        : text({ ...CHIP, color: 'transparent', bg: T.card, border: `2px solid ${T.hair}`, ...beat(i, { anim: 'fade' }) }),
      text({ text: it.text, size: 21, weight: 500, color: it.done ? T.dim : T.ink, ...beat(i) }),
    ] })) }];
}

// table — a data table: `cols` header + `rows` of cells, hairline-divided.
export function table({ x, y, w = 640, cols = [], rows = [], start = 0, dur = 4 } = {}) {
  // ROWS FILL IN ONE AFTER ANOTHER under a header that is already there — how a table actually
  // populates. The timing rides the CELLS, not the row: only a leaf child is registered with the clip
  // driver, so a row wrapper cannot carry its own window. Every cell in a row shares one delay, so
  // the row still reads as a single arrival.
  const cell = (t, head, beat) => text({ text: String(t), grow: 1, font: head ? 'mono' : 'sans', size: head ? 16 : 19, weight: head ? 600 : 500, color: head ? T.dim : T.ink, ...beat });
  const row = (cells, head, beat = {}) => ({ type: 'group', layout: 'row', gap: 16, items: 'center', pad: '12px 0', children: cells.map((c) => cell(c, head, beat)) });
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 0, pad: '20px 24px',
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: [row(cols, true), box({ h: 1, bg: T.hair }),
      ...rows.flatMap((r, i) => [i > 0 && box({ h: 1, bg: T.hair }),
        row(r, false, stagger(i, { step: 0.16, delay: 0.3, anim: 'slide-left', enterDur: 0.32 }))].filter(Boolean))] }];
}

// timeline — a vertical rail (dot + connecting line) with entries; `done` fills the dot accent.
export function timeline({ x, y, w = 480, items = [], start = 0, dur = 4 } = {}) {
  // THE RAIL ADVANCES DOWN THE SEQUENCE: each dot lands and its entry arrives beside it, in order,
  // so the eye travels the timeline instead of being handed the whole thing at once. The dot is a
  // LEAF (an empty text layer carrying the chip) because a nested group child is never registered
  // with the clip driver and so cannot be timed; the connecting rail stays static, as scaffolding.
  const beat = (i, extra) => stagger(i, { step: 0.3, delay: 0.2, enterDur: 0.3, ...extra });
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 0, pad: 26,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: items.map((it, i) => ({ type: 'group', layout: 'row', items: 'stretch', gap: 16, children: [
      { type: 'group', layout: 'column', items: 'center', gap: 0, w: 18, children: [
        text({ text: '', w: 14, h: 14, radius: 100, bg: it.done ? T.accent : T.hair, ...beat(i, { anim: 'pop', enterDur: 0.26 }) }),
        i < items.length - 1 && box({ w: 2, grow: 1, bg: T.hair }),
      ].filter(Boolean) },
      { type: 'group', layout: 'column', items: 'flex-start', gap: 2, pad: '0 0 22px', children: [
        text({ text: it.title, size: 20, weight: 600, color: T.ink, ...beat(i, { anim: 'slide-left', delay: 0.3 }) }),
        it.meta && text({ text: it.meta, font: 'mono', size: 15, color: T.dim, ...beat(i, { anim: 'fade', delay: 0.36 }) }),
      ].filter(Boolean) },
    ] })) }];
}

// stepFlow — a horizontal numbered progress track; `active` is the current step (connectors fill behind it).
// `active` is where the track STANDS; `activeFrom` + `activeTo` are where it TRAVELS between, so the
// build sequence a step flow describes can actually be watched instead of only reported finished.
//
// THE PROGRESS IS ONE NUMBER, and every piece of the track reads it. `--p` sweeps 0→1 across the
// window and `pos` maps that onto the step index; a ring lights when `pos` reaches it and a connector
// fills by exactly the fraction of the gap `pos` has crossed. That is why this is one `html` layer:
// three states of a ring have to occupy the SAME 44px, which a flow layout cannot express, and the
// connector's fill is a continuous fraction rather than an on/off. Both fall out of the one number.
// Pure in n: every value here is a function of `--p` and nothing else.
export function stepFlow({ x, y, w = 720, steps = [], active = 0, activeFrom = null, activeTo = null,
  buildAt = 0.3, buildDur = 0, start = 0, dur = 4 } = {}) {
  const n = steps.length;
  const from = Math.max(0, activeFrom ?? active);
  const to = Math.max(0, activeTo ?? activeFrom ?? active);
  const RING = 44, GAP = 14, RAIL = 2;
  // `pos` is a bare parenthesised expression so it can nest inside calc()/clamp() without doubling up.
  const pos = `(${from} + ${r2(to - from)} * var(--p, 1))`;
  const lit = (i) => `clamp(0, calc((${pos} - ${i}) * 6 + 1), 1)`;   // ring i reached
  const done = (i) => lit(i + 1);                                     // ...and passed
  const ring = (i) => `<div style="position:relative;width:${RING}px;height:${RING}px;flex:none">`
    + `<div style="position:absolute;inset:0;border-radius:50%;background:${T.surface};display:flex;`
    + `align-items:center;justify-content:center;font:700 20px var(--font-sans);color:${T.dim}">${i + 1}</div>`
    + `<div style="position:absolute;inset:0;border-radius:50%;background:${T.accent};opacity:${lit(i)}"></div>`
    + `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;`
    + `font:700 20px var(--font-sans);color:${onColor(T.accent)};opacity:calc(${lit(i)} - ${done(i)})">${i + 1}</div>`
    + `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;`
    + `font:700 20px var(--font-sans);color:${onColor(T.accent)};opacity:${done(i)}">✓</div></div>`;
  // the label is drawn twice, the reached copy fading in over the unreached one. Same string, so the
  // two copies are the same width and nothing shifts as a step lights.
  const label = (s, i) => `<div style="position:relative;margin-top:10px;white-space:nowrap">`
    + `<div style="font:500 18px var(--font-sans);color:${T.sub}">${s}</div>`
    + `<div style="position:absolute;left:0;top:0;font:600 18px var(--font-sans);color:${T.ink};`
    + `opacity:${lit(i)}">${s}</div></div>`;
  const connector = (i) => `<div style="flex:1 1 auto;height:${RAIL}px;margin-top:${(RING - RAIL) / 2}px;`
    + `border-radius:1px;background:${T.hair};position:relative;overflow:hidden">`
    + `<div style="position:absolute;inset:0;background:${T.accent};transform-origin:left center;`
    + `transform:scaleX(clamp(0, calc(${pos} - ${i}), 1))"></div></div>`;
  const cells = steps.map((s, i) => `<div style="display:flex;flex-direction:column;align-items:center;flex:none">`
    + ring(i) + label(s, i) + '</div>');
  const track = cells.flatMap((c, i) => (i < n - 1 ? [c, connector(i)] : [c])).join('');
  const html = `<div style="width:${w}px;display:flex;align-items:flex-start;gap:${GAP}px">${track}</div>`;
  return [{
    type: 'html', x, y, w, html, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    ...(from === to ? {} : { vars: { '--p': [0, 1] }, varsEase: 'easeOutCubic',
      varsDur: buildDur || r2(0.55 * Math.max(1, Math.abs(to - from))), varsDelay: Math.max(0, buildAt) }),
  }];
}

// kanban — columns of small cards. columns = [{title, cards:[string]}].
export function kanban({ x, y, w = 720, columns = [], start = 0, dur = 4 } = {}) {
  const colW = (w - 16 * (columns.length - 1)) / columns.length;
  // THE BOARD DEALS ITSELF: column headers first, then the cards drop in reading order — across the
  // columns, then down — so the eye is led through the board instead of watching it arrive as a slab.
  // Each card is a LEAF with the card chrome on it (a group child is never registered with the clip
  // driver, so a card wrapping its own text could not be timed).
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-start', gap: 16, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    children: columns.map((col, ci) => ({ type: 'group', w: colW, layout: 'column', items: 'stretch', gap: 10, children: [
      text({ text: col.title, font: 'mono', size: 16, weight: 600, color: T.dim, ...stagger(ci, { step: 0.09, delay: 0.15, enterDur: 0.28 }) }),
      // reading order across the board: card row `ri` in every column lands before row `ri + 1` does
      ...col.cards.map((c, ri) => text({ text: c, size: 18, weight: 500, color: T.ink,
        bg: T.card, radius: R.tight, border: HAIR, elevation: 1, pad: '14px 16px',
        ...stagger(ri * columns.length + ci, { step: 0.11, delay: 0.4, anim: 'pop', enterDur: 0.3 }) })),
    ] })) }];
}

// toast — a dark snackbar: status dot · message · action link. (notification is the light card variant.)
// The alert family (notification · toast · callout · banner) now shares ONE vocabulary: `title` and
// `body`. Each block had invented its own words for the same two slots, so an author relearned the
// block every time. Old names stay as aliases — a shared vocabulary is worth nothing if adopting it
// breaks every caller (MISTAKES #67).
export function toast({ x, y, w = 420, title, message = '', body = '', action = '', icon = '✓', accent = TOKENS.green,
  items = null, life = 2.2, step = 0.9, rowH = 58, gap = 12, start = 0, dur = 4 } = {}) {
  // see `notification` — same stack, same helper, same recursion into the single-card form.
  if (items && items.length) {
    return stackWindows({ n: items.length, start, dur, step, life, rowH, gap }).flatMap((wnd, i) => {
      const it = items[i];
      return toast({ x, y: r2(y + wnd.dy), w, title: it.title ?? it.message, body: it.body, action: it.action,
        icon: it.icon ?? icon, accent: it.accent || accent, start: wnd.start, dur: wnd.dur });
    });
  }
  message = title ?? message;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 14, pad: '16px 20px',
    bg: '#0A0A0A', radius: R.tight, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3, children: [
      box({ w: 22, h: 22, radius: 100, bg: accent, layout: 'row', justify: 'center', items: 'center', children: [text({ text: icon, size: 14, weight: 700, color: '#fff' })] }),
      text({ text: message, size: 19, weight: 500, color: '#F5F5F3', grow: 1 }),
      action && text({ text: action, size: 18, weight: 600, color: T.accentInk }),
    ].filter(Boolean) }];
}

// logoWall — a grid of wordmark (or logo image) cells. logos = [{text}] or [{src}].
export function logoWall({ x, y, w = 640, logos = [], cols = 3, start = 0, dur = 4 } = {}) {
  const rows = []; for (let i = 0; i < logos.length; i += cols) rows.push(logos.slice(i, i + cols));
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 14, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: rows.map((r) => ({ type: 'group', layout: 'row', gap: 14, items: 'stretch', children:
      r.map((lg) => ({ type: 'group', grow: 1, bg: T.card, radius: R.tight, border: HAIR, elevation: 1, pad: '22px 0', layout: 'row', justify: 'center', items: 'center',
        children: [lg.src ? { type: 'image', src: lg.src, h: 28 } : text({ text: lg.text, size: 22, weight: 700, color: T.sub, ls: '-0.02em' })] })) })) }];
}

// badge — a CI-shield token: dark label + a coloured value chip. tone picks the value colour.
export function badge({ x, y, label = '', value = '', tone = 'ok', start = 0, dur = 4 } = {}) {
  const ac = toneColor(tone);
  // White on the amber fill measures 2.05:1. Ink on it measures 8.86:1, and dark-on-amber is what a
  // warning chip looks like anyway — the fix keeps the brand colour and changes the text.
  const onAc = onColor(ac);
  // a shield STAMPS IN, and its value chip lands a beat later — the whole motion of a status token.
  // Nothing more: over-animating a static chip is how a registry stops reading as a vocabulary.
  return [{ type: 'group', x, y, bg: '#3A3A38', radius: 8, pad: 4, layout: 'row', items: 'center', gap: 0,
    start, duration: dur, anim: 'pop', enterDur: 0.32, exitDur: 0.3, children: [
      text({ text: label, font: 'mono', size: 17, weight: 600, color: '#fff', pad: '4px 12px' }),
      { type: 'group', bg: ac, radius: 6, pad: '6px 12px', children: [text({ text: value, font: 'mono', size: 17, weight: 700, color: onAc, delay: 0.22, anim: 'pop', enterDur: 0.26 })] },
    ] }];
}

// banner — a full-width accent announcement bar: icon · message · CTA.
export function banner({ x, y, w = 720, text: msg = '', body = '', title = '', cta = '', icon = '★', accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  msg = msg || body || title;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 14, pad: '16px 22px',
    // a full-width bar arrives EDGE-FIRST (broadcast grammar), then its CTA lands
    bg: accent, radius: 12, start, duration: dur, anim: 'wipe', enterDur: 0.45, exitDur: 0.3, children: [
      text({ text: icon, size: 20, color: onColor(accent) }), text({ text: msg, size: 20, weight: 600, color: onColor(accent), grow: 1 }),
      cta && { type: 'group', bg: 'rgba(255,255,255,0.18)', radius: 8, pad: '8px 16px', children: [text({ text: cta, size: 17, weight: 600, color: onColor(accent), delay: 0.35, anim: 'pop', enterDur: 0.3 })] },
    ].filter(Boolean) }];
}
