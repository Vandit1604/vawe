// blocks/glass.mjs. The GLASS SURFACE family: frosted panels that BLUR WHAT MOVES BEHIND THEM.
//
// One rule decides whether any of this works: glass only reads as glass when the backdrop MOVES.
// A frosted panel over a flat fill is a grey box, and no gate will tell you so. Every factory below
// names the living `bg` it wants in its comment; put one there or do not use the block.
//
// The look is GENERIC ON PURPOSE. This is a frosted-surface vocabulary any brand reskins, not a
// recreation of anybody's operating system: no vendor marks, no wallpaper, no traffic lights, no
// brand hex. Colour comes from the theme (`var(--accent)` and friends) and from white alpha, which is
// physics. An edge lit from above and a sheen are what glass DOES, not what a company owns.
//
// Motion comes from the engine and never from CSS: `anim`/`out` presets, a keyed `motion` track, or
// `parts` (a selector into a fragment's own markup that earns a staggered, seeked entrance). CSS
// `transition`/`animation` are refused at boot, so a fragment animated that way renders as a still.
//
// PURE BY CONTRACT, like every factory in blocks/: props → array of scene-layer JSON. No Date, no
// Math.random, absolute coords on the 1920x1080 stage, `{x, y}` = the block's top-left.
import { TOKENS as T, text, rect, box, stagger, R, SPACE, TYPE, E, r2 } from './kit.mjs';
import { glassCard } from './sleek.mjs';
import { svgIcon } from '../core/icons.js';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Surfaces';


// The three constants the whole family shares, so the edge, the sheen and the readable ink cannot
// drift between six blocks the way fifteen copies of the hairline card once did.
const EDGE = 'rgba(255,255,255,0.18)';
const EDGE_SOFT = 'rgba(255,255,255,0.10)';
const INK = '#fff';
const INK_SUB = 'rgba(255,255,255,0.78)';   // the floor for readable copy on frosted white-over-dark
const HILITE = 'color-mix(in srgb, var(--accent) 30%, transparent)';

// frost. The frosted-surface chrome. `tint` is how milky the glass is: at 0 the panel is only its
// edge and its blur, at 1 it is opaque white and the moving backdrop it exists to blur stops reading.
//
// THE SCRIM IS NOT DECORATION, IT IS WHAT MAKES THE COPY READABLE. A white tint alone tracks whatever
// is behind it: over a pale backdrop the panel goes pale, and white copy on it measured 1.5:1 in
// `make audit`. A real dark frosted surface DARKENS what it blurs. So the fill is a white tint over a
// dark scrim, which holds the panel inside a readable band whichever way the field behind it swings,
// and still lets the moving colour through, that is the whole point of the block.
const frost = ({ radius = R.round, tint = 0.09, blur = 18, edge = EDGE, elevation = E.floating,
  scrim = 0.62 } = {}) => ({
  bg: `linear-gradient(180deg, rgba(255,255,255,${r2(tint + 0.03)}), rgba(255,255,255,${tint})), rgba(9,11,17,${scrim})`,
  radius, border: `1.5px solid ${edge}`, glass: blur, elevation,
});

// scrimFor: the same dark band under a panel this family does NOT own the fill of (the `glassCard`
// hero below). Placed behind it so the borrowed surface sits in the same readable band as ours,
// rather than growing a second copy of glassCard here just to change one colour.
const scrimFor = ({ x, y, w, h, radius = R.round, alpha = 0.62, start, dur, anim = 'pop', enterDur = 0.55 }) =>
  rect({ x, y, w, h, radius, bg: `rgba(9,11,17,${alpha})`, start, duration: dur, anim, enterDur,
    out: 'defocus', exitDur: 0.4 });

// the top sheen: a bright hairline reading as light caught on the panel's upper edge.
const sheen = (w) => rect({ w, h: 2, radius: R.pill,
  bg: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' });

// an icon in its own soft tile: the one identity element these surfaces have, drawn from OUR icon
// set (core/icons.js refuses an unknown name rather than rendering an icon-shaped hole).
const iconTile = (name, { size = 52, glyph = 26, radius = R.tight, color = INK } = {}) => box({
  w: size, h: size, radius, bg: 'rgba(255,255,255,0.15)', border: `1px solid ${EDGE_SOFT}`,
  layout: 'row', justify: 'center', items: 'center',
  children: [{ type: 'html', w: glyph, h: glyph, html: svgIcon(name, { size: glyph, color }) }],
});

// spreadFrom: a keyed track that carries a panel OUT of a collapsed centre into its resting place.
// The layer's base position is where it ENDS (offsets are relative), so the collapsed state is key 0.
const spreadFrom = (dx, dy, { at = 0.15, dur = 0.75, ease = 'spring' } = {}) => ([
  { t: 0, x: r2(dx), y: r2(dy), scale: 0.42, opacity: 0 },
  { t: r2(at), x: r2(dx), y: r2(dy), scale: 0.42, opacity: 1, ease: 'easeOutCubic' },
  { t: r2(at + dur), x: 0, y: 0, scale: 1, opacity: 1, ease },
]);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1. glassWidgets. The SCALE-CONTRAST member of the family: one large showcase panel beside a
// column of small stat tiles, with chips under it. Deliberately unequal, because six equal cards is
// the grid tell the taste system fights. The showcase panel IS `glassCard` from blocks/sleek.mjs.
// This block places and times it rather than growing a second copy of the same surface.
// BACKDROP: `aurora` or `blobs`. It wants big slow colour moving under the blur.
// NO KICKER, and the reason is a measurement rather than a preference: `glassCard` paints its kicker
// in `var(--accent)`, and an accent line on a frosted panel measured 2.3:1 in `make audit` against a
// 4.5:1 floor. Darkening the scrim under it does not save it, the accent is the light half of that
// pair. The eyebrow's job is done by the stat tiles' labels instead. See `frameworkFindings`.
export function glassWidgets({ x, y, w = 1080, h = 560, title = 'Frosted surfaces',
  desc = 'Everything behind the panel keeps moving.', stats = [], chips = [], gap = SPACE.lg,
  split = 0.58, start = 0, dur = 5 } = {}) {
  const chipsH = chips.length ? 60 : 0;
  const bodyH = h - (chipsH ? chipsH + gap : 0);
  const heroW = Math.round((w - gap) * Math.min(0.85, Math.max(0.35, split)));
  const sideW = w - gap - heroW;
  const n = Math.max(1, stats.length);
  const tileH = (bodyH - gap * (n - 1)) / n;

  const out = [scrimFor({ x, y, w: heroW, h: bodyH, radius: R.round, start, dur }),
    ...glassCard({ x, y, w: heroW, h: bodyH, title, desc, tint: 0.09,
      radius: R.round, start, dur, anim: 'pop', enterDur: 0.55 })];

  stats.forEach((s, i) => {
    out.push({
      type: 'group', x: x + heroW + gap, y: r2(y + i * (tileH + gap)), w: sideW, h: r2(tileH),
      layout: 'column', justify: 'center', items: 'flex-start', gap: SPACE.snug, pad: SPACE.lg,
      ...frost({ radius: R.soft, tint: 0.11, blur: 16 }),
      start: r2(start + 0.25 + i * 0.14), duration: r2(dur - 0.25 - i * 0.14),
      anim: 'slide-right', enterDur: 0.42, out: 'defocus', exitDur: 0.4,
      children: [
        text({ text: s.label, size: TYPE.body, weight: 600, color: INK_SUB, ls: '0.10em' }),
        text({ text: `${s.value ?? ''}${s.unit ?? ''}`, size: TYPE.display, weight: 700, color: INK, ls: '-0.02em' }),
        // the theme's own success colour, lifted toward white: `var(--up)` straight measured 1.6:1
        // on this panel, and a status colour nobody can read is decoration.
        s.delta && text({ text: s.delta, size: TYPE.body, weight: 700,
          color: 'color-mix(in srgb, var(--up) 45%, #fff)' }),
      ].filter(Boolean),
    });
  });

  if (chips.length) {
    out.push({
      type: 'group', x, y: r2(y + bodyH + gap), layout: 'row', items: 'center', gap: SPACE.sm,
      start: r2(start + 0.55), duration: r2(dur - 0.55), anim: 'rise', enterDur: 0.4,
      out: 'defocus', exitDur: 0.35,
      children: chips.map((c, i) => text({
        text: c, size: TYPE.body, weight: 600, color: INK, pad: '11px 22px',
        ...frost({ radius: R.pill, tint: 0.13, blur: 14, elevation: E.card }),
        ...stagger(i, { step: 0.07, anim: 'pop', enterDur: 0.3 }),
      })),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2. glassNotification, frosted alert cards that fly in from the right and STACK, each one a little
// narrower and a little further in than the one above it, so the pile reads as depth rather than as
// a list. They enter right and leave left: one direction of travel, never a retreat.
// BACKDROP: `mesh` or `gradientWash`. A card is small, so the movement under it must be fine-grained.
export function glassNotification({ x, y, w = 600, items = [], step = 0.5, indent = 26, rowGap = SPACE.sm,
  cardH = 108, start = 0, dur = 5 } = {}) {
  return items.map((it, i) => ({
    type: 'group', x: r2(x + i * (indent / 2)), y: r2(y + i * (cardH + rowGap)),
    w: r2(w - i * indent), h: cardH,
    layout: 'row', items: 'center', gap: SPACE.md, pad: SPACE.md,
    ...frost({ radius: R.soft, tint: r2(0.12 - i * 0.015), blur: 20 }),
    start: r2(start + i * step), duration: r2(dur - i * step),
    anim: 'slide-right', enterDur: 0.45, out: 'slide-left', exitDur: 0.4,
    children: [
      iconTile(it.icon || 'spark', { size: 56, glyph: 28 }),
      box({ layout: 'column', items: 'flex-start', gap: SPACE.tight, grow: 1, children: [
        text({ text: it.title || '', size: TYPE.base, weight: 700, color: INK }),
        it.body && text({ text: it.body, size: TYPE.body, weight: 500, color: INK_SUB, w: r2(w - i * indent - 200) }),
      ].filter(Boolean) }),
      it.meta && text({ text: it.meta, size: TYPE.body, weight: 600, color: INK_SUB }),
    ].filter(Boolean),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 3. glassMenu. A frosted command panel: an icon column, labelled rows, hairline separators, and one
// row lit with the brand accent. The rows arrive one after another off the group's own clock (a group
// child is driven by `delay`, never `start`. The engine overwrites a child's start with its group's).
// BACKDROP: `dotmatrix` or `constellation`. Fine structure behind a small panel proves the blur.
export function glassMenu({ x, y, w = 440, title = '', rows = [], highlight = -1,
  rowH = 54, start = 0, dur = 4 } = {}) {
  const inner = w - 2 * SPACE.sm;
  const children = [];
  if (title) children.push(text({ text: title, size: TYPE.body, weight: 700, color: INK_SUB,
    ls: '0.12em', pad: '6px 14px 10px', ...stagger(0, { step: 0, delay: 0.1, anim: 'fade', enterDur: 0.25 }) }));

  rows.forEach((r, i) => {
    const d = stagger(i, { step: 0.055, delay: 0.16, anim: 'fade', enterDur: 0.26 });
    if (r.sep) {
      children.push(rect({ w: inner, h: 1, bg: EDGE_SOFT, ...d }));
      return;
    }
    const lit = i === highlight;
    children.push(box({
      w: inner, h: rowH, radius: R.tight, layout: 'row', items: 'center', gap: SPACE.sm,
      pad: '0 14px', ...(lit ? { bg: HILITE, border: `1px solid ${EDGE}` } : {}), ...d,
      children: [
        { type: 'html', w: 22, h: 22, html: svgIcon(r.icon || 'arrowRight', { size: 22, color: lit ? INK : INK_SUB }) },
        text({ text: r.label || '', size: TYPE.body, weight: lit ? 700 : 500, color: lit ? INK : INK_SUB, grow: 1 }),
        r.hint && text({ text: r.hint, font: 'mono', size: TYPE.body, weight: 500, color: 'rgba(255,255,255,0.62)' }),
      ].filter(Boolean),
    }));
  });

  return [{
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: SPACE.tight, pad: SPACE.sm,
    ...frost({ radius: R.soft, tint: 0.10, blur: 22 }),
    start, duration: dur, anim: 'scale', enterDur: 0.36, out: 'defocus', exitDur: 0.32,
    children,
  }];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 4. glassControls. Three frosted control panels that SPREAD OUT of one collapsed point: a wide
// scrubber, a transport row, and a level meter standing beside it. The spread is a keyed `motion`
// track (offsets are relative to the resting position, so key 0 IS the collapsed state); the scrubber
// fill and the meter bars are `parts`, the bridge that hands hand-written markup the engine's clock.
// BACKDROP: `liquid` or `metallicSheen`. Controls float over a surface, so give them one that flows.
export function glassControls({ x, y, w = 760, track = 'Deterministic render', elapsed = '01:12',
  total = '03:40', progress = 0.34, bars = 9, gap = SPACE.md, start = 0, dur = 5 } = {}) {
  const scrubH = 116, rowH = 104, meterW = 150;
  const transW = w - meterW - gap;
  const cx = x + w / 2, cy = y + (scrubH + gap + rowH) / 2;   // the collapsed point everything leaves
  const p = Math.min(1, Math.max(0, progress));
  const trackW = w - 2 * SPACE.lg;

  // the scrubber: one fragment, so the track / fill / playhead are one measured line rather than
  // three boxes an author has to keep in agreement.
  const scrub = `<div style="font:600 ${TYPE.body}px var(--font-sans);color:${INK_SUB};letter-spacing:.08em">${track}</div>`
    + `<div class="gc-track" style="position:relative;height:8px;border-radius:99px;background:rgba(255,255,255,0.20);margin:14px 0 12px">`
    + `<div class="gc-fill" style="position:absolute;left:0;top:0;height:8px;width:${r2(p * 100)}%;border-radius:99px;background:var(--accent)"></div>`
    + `<div class="gc-head" style="position:absolute;top:-6px;left:${r2(p * 100)}%;margin-left:-10px;width:20px;height:20px;border-radius:99px;background:${INK};box-shadow:0 2px 10px rgba(0,0,0,0.35)"></div>`
    + `</div>`
    + `<div style="display:flex;justify-content:space-between;font:600 ${TYPE.body}px var(--font-mono);color:${INK_SUB}">`
    + `<span>${elapsed}</span><span>${total}</span></div>`;

  // the meter: N bars at deterministic heights, each growing from its own baseline in turn.
  const barH = (i) => 26 + ((i * 37) % 11) * 5;   // fixed pattern, no Math.random
  const meter = `<div style="display:flex;align-items:flex-end;gap:7px;height:88px">`
    + Array.from({ length: bars }, (_, i) =>
      `<div class="gc-bar" style="flex:1;height:${barH(i)}px;border-radius:4px;background:linear-gradient(180deg,var(--accent),rgba(255,255,255,0.35))"></div>`).join('')
    + `</div>`;

  const btn = (icon, size) => box({ w: size, h: size, radius: R.pill,
    bg: size > 64 ? INK : 'rgba(255,255,255,0.16)', border: `1px solid ${EDGE}`,
    layout: 'row', justify: 'center', items: 'center',
    children: [{ type: 'html', w: Math.round(size * 0.42), h: Math.round(size * 0.42),
      html: svgIcon(icon, { size: Math.round(size * 0.42), color: size > 64 ? 'var(--accent)' : INK }) }] });

  return [
    { type: 'html', x, y, w, h: scrubH, pad: SPACE.lg, html: scrub,
      ...frost({ radius: R.round, tint: 0.10, blur: 20 }),
      start, duration: dur, anim: 'fade', enterDur: 0.3, out: 'defocus', exitDur: 0.4,
      motion: spreadFrom(0, r2(cy - (y + scrubH / 2))),
      parts: [{ select: '.gc-fill', anim: 'widen', delay: 0.85, ease: 'easeOutCubic', out: true },
        { select: '.gc-head', anim: 'popIn', delay: 1.25, out: true }] },

    { type: 'group', x, y: r2(y + scrubH + gap), w: transW, h: rowH,
      layout: 'row', justify: 'center', items: 'center', gap: SPACE.lg, pad: SPACE.md,
      ...frost({ radius: R.pill, tint: 0.12, blur: 20 }),
      start: r2(start + 0.1), duration: r2(dur - 0.1), anim: 'fade', enterDur: 0.3,
      out: 'defocus', exitDur: 0.4,
      motion: spreadFrom(r2(cx - (x + transW / 2)), r2(cy - (y + scrubH + gap + rowH / 2)), { at: 0.2 }),
      children: [btn('arrowLeft', 52), btn('bolt', 72), btn('arrowRight', 52)] },

    { type: 'html', x: r2(x + transW + gap), y: r2(y + scrubH + gap), w: meterW, h: rowH,
      pad: SPACE.xs, html: meter,
      ...frost({ radius: R.soft, tint: 0.12, blur: 20 }),
      start: r2(start + 0.2), duration: r2(dur - 0.2), anim: 'fade', enterDur: 0.3,
      out: 'defocus', exitDur: 0.4,
      motion: spreadFrom(r2(cx - (x + transW + gap + meterW / 2)), r2(cy - (y + scrubH + gap + rowH / 2)), { at: 0.28 }),
      parts: [{ select: '.gc-bar', anim: 'growUp', delay: 0.7, stagger: 0.06, out: true }] },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 5. glassHome. A launcher grid of frosted tiles with labels under them, led by one WIDE tile that
// spans the row. Generic tiles drawn with our own iconography; the shape is a grid of frosted squares,
// which belongs to nobody. Tiles arrive on the diagonal, so the grid fills like a wave rather than a
// list.
// BACKDROP: `blobs` or `aurora`. A big soft field, because a grid of small panels samples it widely.
export function glassHome({ x, y, tiles = [], cols = 4, size = 132, gap = SPACE.lg, label = true,
  widget = null, start = 0, dur = 5 } = {}) {
  const w = cols * size + (cols - 1) * gap;
  // the glyph is a PROPORTION of its tile, the way glassDock's already is. A fixed 56px happened to be
  // right at the catalog's size:132 and nowhere else: at size:200 the same glyph covers 28% of the tile
  // instead of 42% and the launcher reads as empty plates. 0.424 reproduces 56 at 132.
  const glyph = Math.round(size * 0.424);
  const labelH = label ? 34 : 0;
  const widgetH = widget ? 160 : 0;
  const out = [];

  if (widget) {
    out.push({
      type: 'group', x, y, w, h: widgetH, layout: 'column', justify: 'center', items: 'flex-start',
      gap: SPACE.snug, pad: SPACE.lg, ...frost({ radius: R.round, tint: 0.11, blur: 22 }),
      start, duration: dur, anim: 'pop', enterDur: 0.5, out: 'defocus', exitDur: 0.4,
      children: [
        sheen(Math.round(w * 0.5)),
        text({ text: widget.label || '', size: TYPE.body, weight: 600, color: INK_SUB, ls: '0.10em' }),
        text({ text: widget.value || '', size: TYPE.hero, weight: 700, color: INK, ls: '-0.03em' }),
        widget.sub && text({ text: widget.sub, size: TYPE.body, weight: 500, color: INK_SUB }),
      ].filter(Boolean),
    });
  }

  const gridY = y + (widget ? widgetH + gap : 0);
  tiles.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const tx = x + c * (size + gap), ty = gridY + r * (size + gap + labelH);
    const st = r2(start + 0.2 + (c + r) * 0.07);          // the diagonal wave
    out.push({
      type: 'group', x: tx, y: r2(ty), w: size, h: size, layout: 'row', justify: 'center', items: 'center',
      ...frost({ radius: R.round, tint: 0.13, blur: 18 }),
      start: st, duration: r2(dur - (st - start)), anim: 'pop', enterDur: 0.4,
      out: 'defocus', exitDur: 0.35,
      children: [{ type: 'html', w: glyph, h: glyph, html: svgIcon(t.icon || 'cube', { size: glyph, color: INK, stroke: 1.6 }) }],
    });
    if (label && t.label) {
      // TYPE.base, not TYPE.fine: a TOP-LEVEL text layer is floored at 18px by the validator, and
      // these labels sit on the backdrop rather than inside a panel.
      out.push(text({ text: t.label, x: tx, y: r2(ty + size + 10), w: size, align: 'center',
        size: TYPE.base, weight: 600, color: INK,
        start: r2(st + 0.08), duration: r2(dur - (st - start) - 0.08), anim: 'fade', enterDur: 0.3,
        out: 'fade', exitDur: 0.3 }));
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 6. glassDock. A floating frosted strip with one item MAGNIFIED and its neighbours swelling toward
// it, which is the whole gesture: the strip is otherwise even, so the one big tile is the subject and
// everything else is context. A frosted label sits above the magnified item and a running dot below.
// The dock is a row of unequal boxes, so it is asymmetric by construction.
// BACKDROP: `gradientWash` or `metallicSheen`. The strip is short and wide; it wants lateral movement.
export function glassDock({ x, y, items = [], magnify = -1, size = 76, peak = 1.62, gap = SPACE.sm,
  start = 0, dur = 4.5 } = {}) {
  const pad = SPACE.sm;
  // dock magnification falloff: the hovered item at `peak`, its neighbours part of the way there.
  const scaleAt = (i) => (magnify < 0 ? 1 : 1 + (peak - 1) / (1 + Math.abs(i - magnify) * 1.9));
  const sizes = items.map((_, i) => Math.round(size * scaleAt(i)));
  const dockW = sizes.reduce((a, s) => a + s, 0) + gap * Math.max(0, items.length - 1) + 2 * pad;
  const dockH = Math.max(...sizes, size) + 2 * pad;
  const centreOf = (k) => x + pad + sizes.slice(0, k).reduce((a, s) => a + s + gap, 0) + sizes[k] / 2;

  const out = [{
    type: 'group', x, y, w: dockW, h: dockH, layout: 'row', items: 'flex-end', justify: 'center',
    gap, pad, ...frost({ radius: R.round, tint: 0.12, blur: 24 }),
    start, duration: dur, anim: 'rise', enterDur: 0.45, out: 'defocus', exitDur: 0.4,
    children: items.map((it, i) => box({
      // THE CORNER SCALES WITH THE TILE. Magnification is a scale of the whole icon, so a fixed
      // `R.soft` made the one tile this block exists to enlarge the least round of the row: 16px is
      // 21% of a 76px neighbour and 13% of the 123px peak, so the subject read squarer than its
      // context. 0.21 reproduces 16px at the default size and follows every other tile up.
      w: sizes[i], h: sizes[i], radius: Math.round(sizes[i] * 0.21),
      bg: i === magnify ? HILITE : 'rgba(255,255,255,0.16)',
      border: `1px solid ${i === magnify ? EDGE : EDGE_SOFT}`,
      layout: 'row', justify: 'center', items: 'center',
      ...stagger(i, { step: 0.05, delay: 0.12, anim: 'pop', enterDur: 0.3 }),
      children: [{ type: 'html', w: Math.round(sizes[i] * 0.46), h: Math.round(sizes[i] * 0.46),
        html: svgIcon(it.icon || 'cube', { size: Math.round(sizes[i] * 0.46), color: INK }) }],
    })),
  }];

  if (magnify >= 0 && magnify < items.length && items[magnify]) {
    const it = items[magnify];
    if (it.label) {
      out.push(text({ text: it.label, x: r2(centreOf(magnify) - 130), y: r2(y - 68), w: 260, align: 'center',
        size: TYPE.base, weight: 700, color: INK, pad: '9px 18px',
        ...frost({ radius: R.pill, tint: 0.16, blur: 16, elevation: E.card }),
        start: r2(start + 0.45), duration: r2(dur - 0.45), anim: 'pop', enterDur: 0.3,
        out: 'defocus', exitDur: 0.3 }));
    }
    out.push(rect({ x: r2(centreOf(magnify) - 4), y: r2(y + dockH + 10), w: 8, h: 8, radius: R.pill,
      bg: 'var(--accent)', start: r2(start + 0.55), duration: r2(dur - 0.55),
      anim: 'pop', enterDur: 0.25, out: 'fade', exitDur: 0.25 }));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this family. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not.
// There is no `bg` dial anywhere here either: the backdrop these surfaces blur is a SCENE decision,
// and each factory's comment names the living preset it wants.
export const GLASS_SCHEMAS = {
  glassWidgets: {
    w: { kind: 'int', min: 320, max: 1920, def: 1080 },
    h: { kind: 'int', min: 200, max: 1080, def: 560 },
    title: { kind: 'str', max: 60, def: 'Frosted surfaces' },
    desc: { kind: 'str', max: 200, def: 'Everything behind the panel keeps moving.' },
    // The hero panel's share of the width. The point of the block is that this is NOT 0.5.
    split: { kind: 'unit', def: 0.58 },
    stats: { kind: 'list', of: { kind: 'row', fields: {
      label: { kind: 'str', max: 24 }, value: { kind: 'str', max: 12 },
      unit: { kind: 'str', max: 6 }, delta: { kind: 'str', max: 12 } } }, def: [] },
    chips: { kind: 'list', of: { kind: 'str', max: 24 }, def: [] },
    gap: { kind: 'int', min: 0, max: 120, def: 24 },
  },

  glassNotification: {
    w: { kind: 'int', min: 240, max: 1200, def: 600 },
    items: { kind: 'list', of: { kind: 'row', fields: {
      icon: { kind: 'str', max: 24 }, title: { kind: 'str', max: 48 },
      body: { kind: 'str', max: 120 }, meta: { kind: 'str', max: 16 } } }, def: [] },
    // seconds between one card arriving and the next
    step: { kind: 'num', min: 0, max: 3, def: 0.5 },
    // how much narrower each card is than the one above it, the taper that reads as depth
    indent: { kind: 'int', min: 0, max: 120, def: 26 },
    rowGap: { kind: 'int', min: 0, max: 80, def: 12 },
    cardH: { kind: 'int', min: 64, max: 240, def: 108 },
  },

  glassMenu: {
    w: { kind: 'int', min: 220, max: 900, def: 440 },
    title: { kind: 'str', max: 40, def: '' },
    rows: { kind: 'list', of: { kind: 'row', fields: {
      icon: { kind: 'str', max: 24 }, label: { kind: 'str', max: 40 },
      hint: { kind: 'str', max: 16 }, sep: { kind: 'bool' } } }, def: [] },
    // index of the lit row, counting separators. -1 lights none.
    highlight: { kind: 'int', min: -1, max: 40, def: -1 },
    rowH: { kind: 'int', min: 32, max: 120, def: 54 },
  },

  glassControls: {
    w: { kind: 'int', min: 360, max: 1600, def: 760 },
    track: { kind: 'str', max: 48, def: 'Deterministic render' },
    elapsed: { kind: 'str', max: 10, def: '01:12' },
    total: { kind: 'str', max: 10, def: '03:40' },
    progress: { kind: 'unit', def: 0.34 },
    bars: { kind: 'int', min: 3, max: 32, def: 9 },
    gap: { kind: 'int', min: 0, max: 80, def: 16 },
  },

  glassHome: {
    tiles: { kind: 'list', of: { kind: 'row', fields: {
      icon: { kind: 'str', max: 24 }, label: { kind: 'str', max: 20 } } }, def: [] },
    cols: { kind: 'int', min: 1, max: 8, def: 4 },
    size: { kind: 'int', min: 48, max: 320, def: 132 },
    gap: { kind: 'int', min: 0, max: 120, def: 24 },
    label: { kind: 'bool', def: true },
    // the wide tile leading the grid: the scale contrast that stops this being a uniform grid
    widget: { kind: 'row', fields: {
      label: { kind: 'str', max: 24 }, value: { kind: 'str', max: 12 }, sub: { kind: 'str', max: 60 } }, def: null },
  },

  glassDock: {
    items: { kind: 'list', of: { kind: 'row', fields: {
      icon: { kind: 'str', max: 24 }, label: { kind: 'str', max: 28 } } }, def: [] },
    // which item is magnified. -1 leaves the strip even.
    magnify: { kind: 'int', min: -1, max: 20, def: -1 },
    size: { kind: 'int', min: 32, max: 200, def: 76 },
    // the magnified item's multiplier; its neighbours swell part of the way there
    peak: { kind: 'num', min: 1, max: 3, def: 1.62 },
    gap: { kind: 'int', min: 0, max: 60, def: 12 },
  },
};
