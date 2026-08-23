// blocks/ui.mjs — extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, SERIES, seriesAt, HAIR, r2, text, rect, box, pill, onColor,
  R, cardChrome, htmlCard, cardInsetY, barWidth, toneColor, avatarEl,
  sweep, stagger, growUp, fillRight, stackWindows, TONE_NAMES,
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
      { type: 'group', layout: 'row', items: 'center', gap: 8, pad: '12px 16px', children: [
        ...['#FF5F57', '#FEBC2E', '#28C840'].map((c) => box({ w: 12, h: 12, radius: 100, bg: c })),
        { type: 'group', grow: 1, layout: 'row', justify: 'center', children: [
          { type: 'group', bg: T.surface, radius: 100, pad: '6px 16px', children: [text({ text: url, font: 'mono', size: 18, color: T.sub })] },
        ] },
      ] },
      ...(children.length ? [{ type: 'group', grow: 1, layout: 'column', items: 'stretch', pad: '0 16px 16px', children }] : []),
    ],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// pillRow — a horizontal row of chip tags.
export function pillRow({ x, y, items = [], fg = T.accentInk, bg = T.accentSoft, start = 0, dur = 4 } = {}) {
  // the chips POP IN one after another — a tag row filling, not a slab sliding up
  return [{ type: 'group', x, y, layout: 'row', wrap: true, gap: 8, items: 'center',
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
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-start', gap: 12, pad: 16,
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
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: '16px 24px',
    bg: T.surface, radius: R.tight, start, duration: dur, anim: 'wipe', enterDur: 0.4, children: [
      box({ w: 4, h: 30, radius: 0, bg: ac }),
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
  if (children.length) screen.push({ type: 'group', grow: 1, w: w - 44, layout: 'column', items: 'stretch', gap: 8, pad: '8px 0 0', children });
  return [{ type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 8,
    bg: '#0A0A0A', radius: 100, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [{ type: 'group', grow: 1, bg: T.card, radius: 100, layout: 'column', items: 'center', pad: 12,
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
    + `flex-direction:column;align-items:center;justify-content:center;gap:2px">`
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
  const CHIP = { text: '✓', size: 16, weight: 700, radius: 8, pad: '4px 6px' };
  const beat = (i, extra) => stagger(i, { step: 0.26, delay: 0.2, enterDur: 0.3, ...extra });
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 12, pad: 24,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: items.map((it, i) => ({ type: 'group', layout: 'row', items: 'center', gap: 12, children: [
      it.done
        // ink ON a coloured fill: onColor picks legible text for whatever T.green resolves to, rather
        // than assuming white always clears the bar (the badge fix showed white fails on some fills).
        ? text({ ...CHIP, color: onColor(T.green), bg: T.green, border: '2px solid transparent', ...beat(i, { anim: 'pop', delay: 0.34 }) })
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
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 0, pad: '16px 24px',
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
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 0, pad: 24,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: items.map((it, i) => ({ type: 'group', layout: 'row', items: 'stretch', gap: 16, children: [
      { type: 'group', layout: 'column', items: 'center', gap: 0, w: 18, children: [
        text({ text: '', w: 14, h: 14, radius: 100, bg: it.done ? T.accent : T.hair, ...beat(i, { anim: 'pop', enterDur: 0.26 }) }),
        i < items.length - 1 && box({ w: 2, grow: 1, bg: T.hair }),
      ].filter(Boolean) },
      { type: 'group', layout: 'column', items: 'flex-start', gap: 2, pad: '0 0 24px', children: [
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
    + `<div style="position:absolute;inset:0;border-radius:100%;background:${T.surface};display:flex;`
    + `align-items:center;justify-content:center;font:700 20px var(--font-sans);color:${T.dim}">${i + 1}</div>`
    + `<div style="position:absolute;inset:0;border-radius:100%;background:${T.accent};opacity:${lit(i)}"></div>`
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
    + `border-radius:0px;background:${T.hair};position:relative;overflow:hidden">`
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
    children: columns.map((col, ci) => ({ type: 'group', w: colW, layout: 'column', items: 'stretch', gap: 8, children: [
      text({ text: col.title, font: 'mono', size: 16, weight: 600, color: T.dim, ...stagger(ci, { step: 0.09, delay: 0.15, enterDur: 0.28 }) }),
      // reading order across the board: card row `ri` in every column lands before row `ri + 1` does
      ...col.cards.map((c, ri) => text({ text: c, size: 18, weight: 500, color: T.ink,
        bg: T.card, radius: R.tight, border: HAIR, elevation: 1, pad: '12px 16px',
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
  // Same defect the badge carried: a hardcoded dark plate ('#0A0A0A') with hardcoded light text
  // disappears on a dark theme's page background instead of popping off it. T.ink/T.paper is the
  // theme contract's guaranteed-legible inverted pair, so the plate stays dark-on-light and flips to
  // light-on-dark exactly where it needs to, instead of merging into the ground on one of the two.
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 12, pad: '16px 16px',
    bg: T.ink, radius: R.tight, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3, children: [
      box({ w: 22, h: 22, radius: 100, bg: accent, layout: 'row', justify: 'center', items: 'center', children: [text({ text: icon, size: 14, weight: 700, color: onColor(accent) })] }),
      text({ text: message, size: 19, weight: 500, color: T.paper, grow: 1 }),
      action && text({ text: action, size: 18, weight: 600, color: T.accentInk }),
    ].filter(Boolean) }];
}

// logoWall — a grid of wordmark (or logo image) cells. logos = [{text}] or [{src}].
export function logoWall({ x, y, w = 640, logos = [], cols = 3, start = 0, dur = 4 } = {}) {
  const rows = []; for (let i = 0; i < logos.length; i += cols) rows.push(logos.slice(i, i + cols));
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 12, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: rows.map((r) => ({ type: 'group', layout: 'row', gap: 12, items: 'stretch', children:
      r.map((lg) => ({ type: 'group', grow: 1, bg: T.card, radius: R.tight, border: HAIR, elevation: 1, pad: '24px 0', layout: 'row', justify: 'center', items: 'center',
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
  // THEME TOKENS, NOT LITERALS. The plate was `#3A3A38` and its text `#fff`, so the block rendered a
  // dark grey rectangle on every theme, including the dark ones where it disappears into the ground.
  // The site captions this block "theme-aware" directly under the picture, which made the claim false
  // rather than merely incomplete. `T.ink` on `T.paper` is the theme contract's own guaranteed pair,
  // used inverted: a dark plate with light text on a light theme, the reverse on a dark one, legible
  // on both by construction rather than by a colour somebody picked once.
  // `shadow` and `border` DO apply to a group, which is worth stating because both are labelled
  // "(rect)" in the schema and the label reads as a restriction. Rendered both ways to be sure: the
  // flat version reads as two rectangles, this one reads as an object sitting on the frame. A shield
  // is a pastiche of a physical sticker, and it needs to look stuck ON something.
  return [{ type: 'group', x, y, bg: TOKENS.ink, radius: 8, pad: 4, layout: 'row', items: 'center', gap: 0,
    shadow: true,
    start, duration: dur, anim: 'pop', enterDur: 0.32, exitDur: 0.3, children: [
      text({ text: label, font: 'mono', size: 17, weight: 600, color: TOKENS.paper, pad: '4px 12px' }),
      { type: 'group', bg: ac, radius: 4, pad: '6px 12px', children: [text({ text: value, font: 'mono', size: 17, weight: 700, color: onAc, delay: 0.22, anim: 'pop', enterDur: 0.26 })] },
    ] }];
}

// banner — a full-width accent announcement bar: icon · message · CTA.
export function banner({ x, y, w = 720, text: msg = '', body = '', title = '', cta = '', icon = '★', accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  msg = msg || body || title;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 12, pad: '16px 24px',
    // a full-width bar arrives EDGE-FIRST (broadcast grammar), then its CTA lands
    bg: accent, radius: 12, start, duration: dur, anim: 'wipe', enterDur: 0.45, exitDur: 0.3, children: [
      text({ text: icon, size: 20, color: onColor(accent) }), text({ text: msg, size: 20, weight: 600, color: onColor(accent), grow: 1 }),
      cta && { type: 'group', bg: 'rgba(255,255,255,0.18)', radius: 8, pad: '8px 16px', children: [text({ text: cta, size: 17, weight: 600, color: onColor(accent), delay: 0.35, anim: 'pop', enterDur: 0.3 })] },
    ].filter(Boolean) }];
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
