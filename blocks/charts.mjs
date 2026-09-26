// blocks/charts.mjs: extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, SERIES, seriesAt, r2, text,
  R, TYPE, SPACE, cardChrome, htmlCard, cardInsetY, barWidth,
  sweep,
  tint, TINT, DATA_CAP, STROKE, capCss, labelCss, numCss, deltaChip, needData } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Data';

const T = TOKENS;

// ─────────────────────────────────────────────────────────────────────────────
// statBig, scale-contrast stat: a huge animated number + a tiny label. `to` counts up.
export function statBig({ x, y, to = 0, from = 0, unit = '', prefix = '', label, size = 150, color = T.ink,
  start = 0, dur = 4 } = {}) {
  // THE NUMBER COUNTS UP and the label is already there to receive it. The layer only fades in: a
  // stat that also slides has two motions competing for the one thing you are meant to read.
  return [
    // `num` is the theme's TABULAR face. It was `sans`, so a figure that counts up changed WIDTH as
    // it climbed and the whole stat jittered under its own animation.
    { type: 'count', x, y, from, to, unit, prefix, font: 'num', size, weight: 700, color, ls: '-0.03em',
      countStart: 0.15, countDur: 1.4, ease: 'easeOutExpo', start, duration: dur, anim: 'fade', enterDur: 0.25 },
    // 1.02, not 0.9. The label is placed below the figure's LINE BOX, not below its digits: at 0.9 it
    // sat exactly where a `$` or a `(` descends, so `statBig.currency` rendered "market" through the
    // bottom of "$880B" while plain `statBig` looked fine. A number with no descender is not proof.
    label && text({ text: label, x, y: y + size * 1.02, font: 'mono', size: TYPE.base, weight: 600, ls: '0.02em',
      color: T.sub, start: r2(start + 0.3), duration: dur - 0.3 }),
  ].filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// The chart card's furniture, named ONCE. Every plot area and bar width is derived from these, so a
// chart cannot disagree with its own padding the way `w - 48` on `padding:22` did.
const CHART_PAD = 22;     // the card's inset, all four sides
const CHART_GAP = 14;     // between bars
const CHART_GAP_Y = 8;    // between a bar and its captions
const CHART_ROW = TYPE.body;   // a caption row's font size, which is what it costs in height. On the
                               // scale now (was a bare 18); TYPE.body is the smallest step `make check GATE=audit`
                               // will pass, since TYPE.fine (14) sits under its 14.04px floor.

// barChart: labeled bars with values. `data` = [{label, value}]. Scales to the max.
// `label` is the card's own caption. lineChart and donutChart have always taken one and barChart did
// not, which left every bar chart's value captions bare: "620" with no way to say 620 of what. An author
// can only reach for a chart if the chart can state its own units.
export function barChart({ x, y, w = 560, h = 260, data = [], color = SERIES[0], label = '', start = 0, dur = 4 } = {}) {
  needData('data', data, 'barChart');
  const max = Math.max(...data.map((d) => d.value), 1);
  // The plot height is what is LEFT after the card's own furniture: its pad, plus the value caption
  // above each bar and the label below it with their gaps. It used to be `h - 90`, a guess that went
  // NEGATIVE below h ≈ 90 and inverted every bar.
  // `cardInsetY` already knows what a label costs, so adding one shrinks the plot instead of pushing the
  // bars out of the card. With no label it is exactly `2 * CHART_PAD`, i.e. byte-identical to before.
  const plot = Math.max(0, h - cardInsetY({ pad: CHART_PAD, label }) - 2 * (CHART_ROW + CHART_GAP_Y));
  const bw = barWidth({ w, n: data.length, pad: CHART_PAD, gap: CHART_GAP, min: 22 });
  // THE BARS GROW FROM THE BASELINE: the motion a bar chart is FOR. The value captions sit on ONE
  // fixed row above the track rather than riding each bar's own top: with a full-height track behind
  // every bar, a caption floating at a different height per column reads as six loose numbers instead
  // of a row you can compare across. `html` rather than native boxes because a bar's height has to be a
  // calc() off the driven `--p`, and a group child's height is written as inline px by the engine
  // (and a nested group is not handed to the clip driver at all, so it cannot animate).
  // The row is a FIXED height so the card does not resize while the bars grow.
  const rowH = plot + 2 * (CHART_ROW + CHART_GAP_Y);
  // EVERY BAR SITS IN A TRACK. The bar alone on empty card is default chart-library output and gives
  // the eye nothing to read a short bar against; the soft tint column is the ground, and it is the
  // same hue at TINT.track so the card still carries one colour. The bar is positioned inside the
  // track rather than stacked beside it, so the track's full height IS the scale's 100%.
  const col = (dp) => `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:${CHART_GAP_Y}px;height:100%">`
    + `<div style="${numCss({ size: CHART_ROW })}">${dp.value}</div>`
    + `<div style="position:relative;width:${r2(bw)}px;height:${plot}px;border-radius:${DATA_CAP}px;background:${tint(color, TINT.track)}">`
    + `<div style="position:absolute;left:0;right:0;bottom:0;height:calc(${Math.round(plot * dp.value / max)}px * var(--p, 1));`
    + `border-radius:${DATA_CAP}px;background:${color}"></div></div>`
    + `<div style="${labelCss({ size: CHART_ROW })}">${dp.label}</div></div>`;
  const html = htmlCard({ w, pad: CHART_PAD, label, body: () =>
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${CHART_GAP}px;height:${rowH}px">`
    + data.map(col).join('') + '</div>' });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 0.9 }) }];
}

// ONE DOT, ON THE LAST READING. A dot on every vertex is chart-library furniture: it fights the line
// it is meant to sit on and says nothing, because every vertex is already a bend. The last point is
// the CURRENT value, which is the one a product surface marks. A filled dot in a card-coloured ring
// so it stays legible where the line doubles back under it. The area is a VERTICAL FADE, not a flat
// wash: strongest under the line and gone at the baseline. The gradient id is derived from the colour,
// deterministic: no counter, no random, just the string. `len` is the exact polyline length, so the
// draw-on dash is right for any data rather than a fudge factor.
function lineChartSvg({ cw, ch, pad, pts, data, color, area, PX, PY }) {
  const lastI = data.length - 1;
  const dots = lastI < 0 ? '' : `<circle cx="${PX(lastI)}" cy="${PY(data[lastI].value)}" r="4.5" fill="${color}"`
    + ` stroke="${T.card}" stroke-width="3" style="opacity:var(--p, 1)"/>`;
  const len = data.reduce((acc, d, i) => i === 0 ? 0
    : acc + Math.hypot(+PX(i) - +PX(i - 1), +PY(d.value) - +PY(data[i - 1].value)), 0) || 1;
  const gid = `va${[...color].reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 5381).toString(36)}`;
  return `<svg viewBox="0 0 ${cw} ${ch}" width="100%" height="${ch}" style="display:block;overflow:visible">`
    + (area ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">`
      + `<stop offset="0" stop-color="${color}" stop-opacity="0.28"/>`
      + `<stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`
      + `<polygon points="${pad},${ch - pad} ${pts} ${cw - pad},${ch - pad}" fill="url(#${gid})"/>` : '')
    + `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${STROKE.line}" stroke-linejoin="round" stroke-linecap="round"`
    + ` stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="calc(${len.toFixed(1)} * (1 - var(--p, 1)))"/>${dots}</svg>`;
}

// The (x,y) projectors and the joined point string, all derived from one value range so a caller
// never risks a PX/PY pair built off mismatched min/max.
function lineChartPoints({ data, cw, ch, pad }) {
  const vals = data.map((d) => d.value); const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const n = Math.max(1, data.length - 1);
  const PX = (i) => (pad + (i / n) * (cw - 2 * pad)).toFixed(1);
  const PY = (v) => ((ch - pad) - ((v - min) / ((max - min) || 1)) * (ch - 2 * pad)).toFixed(1);
  const pts = data.map((d, i) => `${PX(i)},${PY(d.value)}`).join(' ');
  return { PX, PY, pts };
}

// lineChart: a trend line (optional area fill) in a hairline card. data = [{label,value}].
export function lineChart({ x, y, w = 560, h = 240, data = [], color = SERIES[0], area = false, label = '', start = 0, dur = 4 } = {}) {
  needData('data', data, 'lineChart');
  const cw = Math.max(0, w - 2 * CHART_PAD), ch = Math.max(0, h - cardInsetY({ pad: CHART_PAD, label })), pad = 8;
  const { PX, PY, pts } = lineChartPoints({ data, cw, ch, pad });
  const svg = lineChartSvg({ cw, ch, pad, pts, data, color, area, PX, PY });
  const html = htmlCard({ w, pad: CHART_PAD, label, body: () => svg });
  // the line DRAWS ON rather than the card sliding in. The motion a line chart is for. `len` is the
  // polyline's own length, so the dash sweep is exact rather than a guess that breaks with the data.
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 1.2 }) }];
}

// donutChart: a ring split into segments + a legend. segments = [{value,color,label}].
// The legend splits by role: the NAME is a word (sans, muted) and the SHARE is a figure (mono,
// tabular, ink) pushed to the right edge, so the percentages line up as a column you can read down
// instead of trailing each name at whatever x its length happens to end on.
function donutLegend(segments, total) {
  return segments.map((s, i) => `<div style="display:flex;align-items:center;gap:${SPACE.xs}px">`
    + `<span style="width:9px;height:9px;border-radius:${R.micro}px;background:${s.color || seriesAt(i)};flex:0 0 auto"></span>`
    + `<span style="${labelCss()};flex:1 1 auto">${s.label}</span>`
    + `<span style="${numCss({ size: TYPE.body })}">${Math.round(s.value / total * 100)}%</span></div>`).join('');
}

// A THINNER RING ON A TRACK. At stroke-width 15 the ring was a toy donut with a hole; at STROKE.arc
// it is an instrument, and it sits on the same tint track the bars and meters use so an empty or
// rounding-short arc still has a ground to be read against.
// The ring SWEEPS round once, revealing each segment in turn, instead of the card sliding in.
// The trick that makes one driven variable do it: every segment is drawn as a FULL arc from 12
// o'clock out to its own cumulative end, clipped to how far `--p` has travelled, then painted
// BACK TO FRONT, so the shorter arcs land on top and each colour owns exactly its own wedge at
// every value of --p. One variable, no per-segment timeline, pure in t.
function donutRing(segments, total) {
  const rad = 40, C = 2 * Math.PI * rad, sw = STROKE.arc;
  let cum = 0;
  const ends = segments.map((s) => (cum += (s.value / total) * C));
  const arcs = segments.map((s, i) =>
    `<circle cx="50" cy="50" r="${rad}" fill="none" stroke="${s.color || seriesAt(i)}" stroke-width="${sw}"`
    + ` style="stroke-dasharray:min(${ends[i].toFixed(2)}px, calc(${C.toFixed(2)}px * var(--p, 1))) ${C.toFixed(2)}px"`
    + ` transform="rotate(-90 50 50)"/>`).reverse().join('');
  const track = `<circle cx="50" cy="50" r="${rad}" fill="none" stroke="${tint(SERIES[0], TINT.track)}" stroke-width="${sw}"/>`;
  return (inner) => `<svg viewBox="0 0 100 100" width="${inner}" height="${inner}" style="display:block;margin:0 auto 14px">${track}${arcs}</svg>`;
}

export function donutChart({ x, y, w = 320, segments = [], label = '', start = 0, dur = 4 } = {}) {
  needData('segments', segments, 'donutChart');
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const ring = donutRing(segments, total);
  const legend = donutLegend(segments, total);
  const html = htmlCard({ w, pad: CHART_PAD, label,
    body: (inner) => ring(inner) + `<div style="display:flex;flex-direction:column;gap:${SPACE.snug}px">${legend}</div>` });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 1.3 }) }];
}

// stackedBar: multi-series bars. data = [{label,values:[..]}], series = [{name,color}].
export function stackedBar({ x, y, w = 520, h = 280, data = [], series = [], start = 0, dur = 4 } = {}) {
  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0)); const max = Math.max(...totals, 1);
  // one caption row here, not two: a stack carries no value label above it (see barChart).
  const plot = Math.max(0, h - 2 * CHART_PAD - (CHART_ROW + CHART_GAP_Y));
  const bw = barWidth({ w, n: data.length, pad: CHART_PAD, gap: CHART_GAP, min: 24 });
  // EACH STACK GROWS FROM THE BASELINE as one column: the wrapper's height IS the driven `--p` and
  // the bands share it by flex ratio, so the series boundaries hold their proportions the whole way
  // up instead of each band sliding over its neighbour. Same `html` reason as barChart.
  const rowH = plot + CHART_ROW + CHART_GAP_Y;
  // Same track as barChart, and the same reason. The stack is CLIPPED by a rounded wrapper rather
  // than each band carrying its own corner: only the top band was rounded before, so a stack whose
  // first series was zero came out square, and the cap belonged to the series rather than to the bar.
  const stack = (d) => {
    const total = d.values.reduce((s, v) => s + v, 0);
    const bands = d.values.map((v, i) => `<div style="flex:${r2(v)};min-height:0;background:${(series[i] || {}).color || seriesAt(i)}"></div>`).join('');
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:${CHART_GAP_Y}px;height:100%">`
      + `<div style="position:relative;width:${r2(bw)}px;height:${plot}px;border-radius:${DATA_CAP}px;background:${tint(SERIES[0], TINT.track)}">`
      + `<div style="position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:2px;overflow:hidden;`
      + `border-radius:${DATA_CAP}px;height:calc(${Math.round(plot * total / max)}px * var(--p, 1))">${bands}</div></div>`
      + `<div style="${labelCss({ size: CHART_ROW })}">${d.label}</div></div>`;
  };
  const html = htmlCard({ w, pad: CHART_PAD, body: () =>
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${CHART_GAP}px;height:${rowH}px">`
    + data.map(stack).join('') + '</div>' });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 0.9 }) }];
}

// statCard. A boxed KPI: label · animated count · optional delta chip.
export function statCard({ x, y, w = 340, to = 0, from = 0, unit = '', label = '', delta = '', deltaUp = true, start = 0, dur = 4 } = {}) {
  // THE NUMBER COUNTS UP inside a card that is already there, and the delta chip lands after it has
  // settled. The reading first, then the verdict on it.
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: SPACE.xs, pad: SPACE.lg,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.3, children: [
      text({ text: label, size: TYPE.body, weight: 600, ls: '0.02em', color: T.sub, font: 'mono' }),
      // `num` is the theme's TABULAR face. It was `sans`, so the figure changed width digit by digit
      // as it counted and the reading wobbled sideways under its own count-up.
      { type: 'count', from, to, unit, font: 'num', size: 56, weight: 700, color: T.ink, ls: '-0.02em', countStart: 0.2, countDur: 1.2, ease: 'easeOutExpo' },
      // The verdict is a CHIP, not two loose glyphs: a tinted pill in the tone's own colour, one type
      // step under the reading it judges. `deltaChip` owns that pairing for every family (kit.mjs).
      delta && deltaChip({ delta, up: deltaUp, delay: 1.25, anim: 'pop', enterDur: 0.3 }),
    ].filter(Boolean) }];
}

// gauge: a semicircular meter (value / max) in a card.
export function gauge({ x, y, w = 300, value = 0, max = 100, label = '', color = TOKENS.accent, start = 0, dur = 4 } = {}) {
  const pct = Math.max(0, Math.min(1, value / max)); const semi = Math.PI * 42;
  const arc = 'M8 52 A42 42 0 0 1 92 52';
  // The arc SWEEPS to its reading instead of the whole card sliding in. `--p` is driven by the engine
  // over the layer's window (0 → pct), and the dash length is computed from it in CSS, so the motion
  // is the thing the block is FOR, which is what makes the registry browsable: you see what a gauge
  // does, not that a card can rise. Deterministic: --p is a pure function of t.
  // THE TRACK IS A TINT OF THE READING, not `--line`. It used to be painted with the theme's BORDER
  // colour, so the unfilled half of a meter was the same ink as a divider and read as chrome rather
  // than as the rest of the scale, and on a dark theme it vanished into the card entirely.
  const svg = (inner) => `<svg viewBox="0 0 100 60" width="${inner}" style="display:block;margin:0 auto 4px">`
    + `<path d="${arc}" fill="none" stroke="${tint(color, TINT.track)}" stroke-width="${STROKE.arc}" stroke-linecap="round"/>`
    + `<path d="${arc}" fill="none" stroke="${color}" stroke-width="${STROKE.arc}" stroke-linecap="round"`
    + ` stroke-dasharray="calc(${semi.toFixed(2)} * var(--p, ${pct.toFixed(4)})) ${semi.toFixed(2)}"/></svg>`;
  // the reading and its caption sit BELOW the arc, so they are body, not htmlCard's heading row.
  const html = htmlCard({ w, pad: CHART_PAD, align: 'center', body: (inner) => svg(inner)
    + `<div style="${numCss({ size: TYPE.head })};margin-top:-2px">${value}${max === 100 ? '%' : ''}</div>`
    + (label ? `<div style="${capCss()};margin-top:${SPACE.snug}px">${label}</div>` : '') });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ to: pct, dur: 1.1 }) }];
}

// progressRing: a circular progress ring with a % centre label (bare, for overlaying).
export function progressRing({ x, y, size = 160, value = 0, max = 100, label = '', color = TOKENS.accent, start = 0, dur = 4 } = {}) {
  const pct = Math.max(0, Math.min(1, value / max)); const C = 2 * Math.PI * 42;
  // The ring FILLS to its reading (the same `--p` mechanism as gauge), rather than the whole card
  // sliding in. The dash length is computed in CSS from the driven variable, so the motion is what
  // the block is for. The `%` stays put: it is the destination the ring is travelling to.
  // Same track correction as gauge: a tint of the reading, never `--line`.
  const svg = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block">`
    + `<circle cx="50" cy="50" r="42" fill="none" stroke="${tint(color, TINT.track)}" stroke-width="${STROKE.arc}"/>`
    + `<circle cx="50" cy="50" r="42" fill="none" stroke="${color}" stroke-width="${STROKE.arc}" stroke-linecap="round"`
    + ` stroke-dasharray="calc(${C.toFixed(2)} * var(--p, ${pct.toFixed(4)})) ${C.toFixed(2)}" transform="rotate(-90 50 50)"/>`
    + `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="var(--font-num)" font-weight="700" font-size="22"`
    + ` letter-spacing="-0.5" fill="${T.ink}">${Math.round(pct * 100)}%</text></svg>`;
  const html = `<div style="width:${size}px">${svg}${label ? `<div style="text-align:center;${capCss()};margin-top:${SPACE.xs}px">${label}</div>` : ''}</div>`;
  return [{ type: 'html', x, y, w: size, html, start, duration: dur, ...sweep({ to: pct, dur: 1.1 }) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. See blocks/schema.mjs for the kind vocabulary and
// the checker; the doctrine is core/lightfield/options.js, which this mirrors key for key.
//
// x · y · start · dur are absent from every table on purpose. They are placement and timing the SCENE
// supplies (a container injects them, `make expand` writes them), never content an author dials.
//
// A `w` floor is the block's own furniture: `htmlCard` pads CHART_PAD on both sides, so below
// 2 * CHART_PAD plus one minimum bar there is no plot left to draw into. A `w` ceiling is the stage.
export const CHART_SCHEMAS = {
  statBig: {
    to: { kind: 'num', min: -1e12, max: 1e12, def: 0 },
    from: { kind: 'num', min: -1e12, max: 1e12, def: 0 },
    // `unit` suffixes the figure ("ms"), `prefix` leads it ("$"). The count layer compacts >= 1e6.
    unit: { kind: 'str', max: 8, def: '' },
    prefix: { kind: 'str', max: 8, def: '' },
    label: { kind: 'str', max: 60 },
    // The label is placed at y + size * 0.9, so `size` is the block's whole vertical rhythm.
    size: { kind: 'int', min: 18, max: 400, def: 150 },
    color: { kind: 'color', def: 'var(--text)' },
  },

  barChart: {
    w: { kind: 'int', min: 120, max: 1920, def: 560 },
    // The plot is what is LEFT after the card's pad and the two caption rows: h - 94 bare, h - 125
    // with a label. Below that it clamps to zero and every bar disappears.
    h: { kind: 'int', min: 130, max: 1080, def: 260 },
    data: { kind: 'list', of: { kind: 'row', fields: {
      label: { kind: 'str', max: 24 },
      value: { kind: 'num', min: -1e12, max: 1e12 },
    } }, def: [] },
    color: { kind: 'color', def: 'var(--accent)' },
    label: { kind: 'str', max: 60, def: '' },
  },

  lineChart: {
    w: { kind: 'int', min: 120, max: 1920, def: 560 },
    // ch = h - cardInsetY, and the polyline insets 8px top and bottom inside that.
    h: { kind: 'int', min: 80, max: 1080, def: 240 },
    data: { kind: 'list', of: { kind: 'row', fields: {
      label: { kind: 'str', max: 24 },
      value: { kind: 'num', min: -1e12, max: 1e12 },
    } }, def: [] },
    color: { kind: 'color', def: 'var(--accent)' },
    area: { kind: 'bool', def: false },
    label: { kind: 'str', max: 60, def: '' },
  },

  donutChart: {
    // The ring is drawn at the card's inner width, so w below 2 * CHART_PAD leaves no ring.
    w: { kind: 'int', min: 120, max: 1080, def: 320 },
    segments: { kind: 'list', of: { kind: 'row', fields: {
      value: { kind: 'num', min: 0, max: 1e12 },
      // Omitted, a segment takes its colour from SERIES by index.
      color: { kind: 'color' },
      label: { kind: 'str', max: 24 },
    } }, def: [] },
    label: { kind: 'str', max: 60, def: '' },
  },

  stackedBar: {
    w: { kind: 'int', min: 120, max: 1920, def: 520 },
    // One caption row here, not two, so the plot is h - 69.
    h: { kind: 'int', min: 80, max: 1080, def: 280 },
    data: { kind: 'list', of: { kind: 'row', fields: {
      label: { kind: 'str', max: 24 },
      values: { kind: 'list', of: { kind: 'num', min: 0, max: 1e12 } },
    } }, def: [] },
    series: { kind: 'list', of: { kind: 'row', fields: {
      color: { kind: 'color' },
    } }, def: [] },
  },

  statCard: {
    w: { kind: 'int', min: 160, max: 1080, def: 340 },
    to: { kind: 'num', min: -1e12, max: 1e12, def: 0 },
    from: { kind: 'num', min: -1e12, max: 1e12, def: 0 },
    unit: { kind: 'str', max: 8, def: '' },
    label: { kind: 'str', max: 60, def: '' },
    // Empty draws no chip at all. The block never invents a delta.
    delta: { kind: 'str', max: 12, def: '' },
    deltaUp: { kind: 'bool', def: true },
  },

  gauge: {
    w: { kind: 'int', min: 120, max: 1080, def: 300 },
    value: { kind: 'num', min: -1e9, max: 1e9, def: 0 },
    // `max` is the divisor. Zero would make the reading Infinity, which clamps to a full arc and
    // says nothing, so the floor is above zero.
    max: { kind: 'num', min: 0.001, max: 1e9, def: 100 },
    label: { kind: 'str', max: 60, def: '' },
    color: { kind: 'color', def: 'var(--accent)' },
  },

  progressRing: {
    // The ring is the whole block: `size` is its width AND its height.
    size: { kind: 'int', min: 40, max: 1080, def: 160 },
    value: { kind: 'num', min: -1e9, max: 1e9, def: 0 },
    max: { kind: 'num', min: 0.001, max: 1e9, def: 100 },
    label: { kind: 'str', max: 60, def: '' },
    color: { kind: 'color', def: 'var(--accent)' },
  },
};
