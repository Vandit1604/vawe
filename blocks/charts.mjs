// blocks/charts.mjs — extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, SERIES, seriesAt, HAIR, r2, text, rect, box, pill, onColor,
  R, cardChrome, htmlCard, cardInsetY, barWidth, toneColor, avatarEl,
  sweep, stagger, growUp, fillRight, stackWindows,
} from './kit.mjs';
const T = TOKENS;

// ─────────────────────────────────────────────────────────────────────────────
// statBig — scale-contrast stat: a huge animated number + a tiny label. `to` counts up.
export function statBig({ x, y, to = 0, from = 0, unit = '', prefix = '', label, size = 150, color = T.ink,
  start = 0, dur = 4 } = {}) {
  // THE NUMBER COUNTS UP and the label is already there to receive it. The layer only fades in: a
  // stat that also slides has two motions competing for the one thing you are meant to read.
  return [
    { type: 'count', x, y, from, to, unit, prefix, font: 'sans', size, weight: 700, color, ls: '-0.03em',
      countStart: 0.15, countDur: 1.4, ease: 'easeOutExpo', start, duration: dur, anim: 'fade', enterDur: 0.25 },
    label && text({ text: label, x, y: y + size * 0.9, font: 'mono', size: 20, color: T.dim, start: r2(start + 0.3), duration: dur - 0.3 }),
  ].filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// The chart card's furniture, named ONCE. Every plot area and bar width is derived from these, so a
// chart cannot disagree with its own padding the way `w - 48` on `padding:22` did.
const CHART_PAD = 22;     // the card's inset, all four sides
const CHART_GAP = 14;     // between bars
const CHART_GAP_Y = 8;    // between a bar and its captions
const CHART_ROW = 18;     // a caption row's font size, which is what it costs in height

// barChart — labeled bars with values. `data` = [{label, value}]. Scales to the max.
// `label` is the card's own caption. lineChart and donutChart have always taken one and barChart did
// not, which left every bar chart's value captions bare: "620" with no way to say 620 of what. An author
// can only reach for a chart if the chart can state its own units.
export function barChart({ x, y, w = 560, h = 260, data = [], color = SERIES[0], label = '', start = 0, dur = 4 } = {}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  // The plot height is what is LEFT after the card's own furniture: its pad, plus the value caption
  // above each bar and the label below it with their gaps. It used to be `h - 90`, a guess that went
  // NEGATIVE below h ≈ 90 and inverted every bar.
  // `cardInsetY` already knows what a label costs, so adding one shrinks the plot instead of pushing the
  // bars out of the card. With no label it is exactly `2 * CHART_PAD`, i.e. byte-identical to before.
  const plot = Math.max(0, h - cardInsetY({ pad: CHART_PAD, label }) - 2 * (CHART_ROW + CHART_GAP_Y));
  const bw = barWidth({ w, n: data.length, pad: CHART_PAD, gap: CHART_GAP, min: 22 });
  // THE BARS GROW FROM THE BASELINE — the motion a bar chart is FOR — and the value caption rides up
  // on top of its own bar. `html` rather than native boxes because a bar's height has to be a
  // calc() off the driven `--p`, and a group child's height is written as inline px by the engine
  // (and a nested group is not handed to the clip driver at all, so it cannot animate).
  // The row is a FIXED height so the card does not resize while the bars grow.
  const rowH = plot + 2 * (CHART_ROW + CHART_GAP_Y);
  const col = (dp) => `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:${CHART_GAP_Y}px;height:100%">`
    + `<div style="font:600 ${CHART_ROW}px var(--font-sans);color:${T.ink}">${dp.value}</div>`
    + `<div style="width:${r2(bw)}px;height:calc(${Math.round(plot * dp.value / max) + 6}px * var(--p, 1));border-radius:6px;background:${color}"></div>`
    + `<div style="font:400 ${CHART_ROW}px var(--font-mono);color:${T.dim}">${dp.label}</div></div>`;
  const html = htmlCard({ w, pad: CHART_PAD, label, body: () =>
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${CHART_GAP}px;height:${rowH}px">`
    + data.map(col).join('') + '</div>' });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 0.9 }) }];
}

// lineChart — a trend line (optional area fill) in a hairline card. data = [{label,value}].
export function lineChart({ x, y, w = 560, h = 240, data = [], color = SERIES[0], area = false, label = '', start = 0, dur = 4 } = {}) {
  const cw = Math.max(0, w - 2 * CHART_PAD), ch = Math.max(0, h - cardInsetY({ pad: CHART_PAD, label })), pad = 8;
  const vals = data.map((d) => d.value); const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const n = Math.max(1, data.length - 1);
  const PX = (i) => (pad + (i / n) * (cw - 2 * pad)).toFixed(1);
  const PY = (v) => ((ch - pad) - ((v - min) / ((max - min) || 1)) * (ch - 2 * pad)).toFixed(1);
  const pts = data.map((d, i) => `${PX(i)},${PY(d.value)}`).join(' ');
  const dots = data.map((d, i) => `<circle cx="${PX(i)}" cy="${PY(d.value)}" r="2.6" fill="${color}"/>`).join('');
  // exact polyline length, so the draw-on dash is right for any data rather than a fudge factor
  const len = data.reduce((acc, d, i) => i === 0 ? 0
    : acc + Math.hypot(+PX(i) - +PX(i - 1), +PY(d.value) - +PY(data[i - 1].value)), 0) || 1;
  const svg = `<svg viewBox="0 0 ${cw} ${ch}" width="100%" height="${ch}" style="display:block;overflow:visible">`
    + (area ? `<polygon points="${pad},${ch - pad} ${pts} ${cw - pad},${ch - pad}" fill="${color}" opacity="0.12"/>` : '')
    + `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`
    + ` stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="calc(${len.toFixed(1)} * (1 - var(--p, 1)))"/>${dots}</svg>`;
  const html = htmlCard({ w, pad: CHART_PAD, label, body: () => svg });
  // the line DRAWS ON rather than the card sliding in — the motion a line chart is for. `len` is the
  // polyline's own length, so the dash sweep is exact rather than a guess that breaks with the data.
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 1.2 }) }];
}

// donutChart — a ring split into segments + a legend. segments = [{value,color,label}].
export function donutChart({ x, y, w = 320, segments = [], label = '', start = 0, dur = 4 } = {}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const rad = 40, C = 2 * Math.PI * rad, sw = 15;
  // The ring SWEEPS round once, revealing each segment in turn, instead of the card sliding in.
  // The trick that makes one driven variable do it: every segment is drawn as a FULL arc from 12
  // o'clock out to its own cumulative end, clipped to how far `--p` has travelled — then painted
  // BACK TO FRONT, so the shorter arcs land on top and each colour owns exactly its own wedge at
  // every value of --p. One variable, no per-segment timeline, pure in t.
  let cum = 0;
  const ends = segments.map((s) => (cum += (s.value / total) * C));
  const arcs = segments.map((s, i) =>
    `<circle cx="50" cy="50" r="${rad}" fill="none" stroke="${s.color || seriesAt(i)}" stroke-width="${sw}"`
    + ` style="stroke-dasharray:min(${ends[i].toFixed(2)}px, calc(${C.toFixed(2)}px * var(--p, 1))) ${C.toFixed(2)}px"`
    + ` transform="rotate(-90 50 50)"/>`).reverse().join('');
  const ring = (inner) => `<svg viewBox="0 0 100 100" width="${inner}" height="${inner}" style="display:block;margin:0 auto 14px">${arcs}</svg>`;
  const legend = segments.map((s, i) => `<div style="display:flex;align-items:center;gap:9px"><span style="width:11px;height:11px;border-radius:100px;background:${s.color || seriesAt(i)};flex:0 0 auto"></span><span style="font:500 18px var(--font-sans);color:${T.sub}">${s.label} · ${Math.round(s.value / total * 100)}%</span></div>`).join('');
  const html = htmlCard({ w, pad: CHART_PAD, label,
    body: (inner) => ring(inner) + `<div style="display:flex;flex-direction:column;gap:9px">${legend}</div>` });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 1.3 }) }];
}

// stackedBar — multi-series bars. data = [{label,values:[..]}], series = [{name,color}].
export function stackedBar({ x, y, w = 520, h = 280, data = [], series = [], start = 0, dur = 4 } = {}) {
  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0)); const max = Math.max(...totals, 1);
  // one caption row here, not two: a stack carries no value label above it (see barChart).
  const plot = Math.max(0, h - 2 * CHART_PAD - (CHART_ROW + CHART_GAP_Y));
  const bw = barWidth({ w, n: data.length, pad: CHART_PAD, gap: CHART_GAP, min: 24 });
  // EACH STACK GROWS FROM THE BASELINE as one column: the wrapper's height IS the driven `--p` and
  // the bands share it by flex ratio, so the series boundaries hold their proportions the whole way
  // up instead of each band sliding over its neighbour. Same `html` reason as barChart.
  const rowH = plot + CHART_ROW + CHART_GAP_Y;
  const stack = (d) => {
    const total = d.values.reduce((s, v) => s + v, 0);
    const bands = d.values.map((v, i) => `<div style="flex:${r2(v)};min-height:0;border-radius:${i === 0 ? '4px 4px 0 0' : '0'};background:${(series[i] || {}).color || seriesAt(i)}"></div>`).join('');
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:${CHART_GAP_Y}px;height:100%">`
      + `<div style="display:flex;flex-direction:column;gap:2px;width:${r2(bw)}px;height:calc(${Math.round(plot * total / max) + 2}px * var(--p, 1))">${bands}</div>`
      + `<div style="font:400 ${CHART_ROW}px var(--font-mono);color:${T.dim}">${d.label}</div></div>`;
  };
  const html = htmlCard({ w, pad: CHART_PAD, body: () =>
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${CHART_GAP}px;height:${rowH}px">`
    + data.map(stack).join('') + '</div>' });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 0.9 }) }];
}

// statCard — a boxed KPI: label · animated count · optional delta chip.
export function statCard({ x, y, w = 340, to = 0, from = 0, unit = '', label = '', delta = '', deltaUp = true, start = 0, dur = 4 } = {}) {
  // THE NUMBER COUNTS UP inside a card that is already there, and the delta chip lands after it has
  // settled — the reading first, then the verdict on it.
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 8, pad: 26,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.3, children: [
      text({ text: label, size: 18, color: T.dim, font: 'mono' }),
      { type: 'count', from, to, unit, font: 'sans', size: 56, weight: 700, color: T.ink, ls: '-0.02em', countStart: 0.2, countDur: 1.2, ease: 'easeOutExpo' },
      delta && { type: 'group', layout: 'row', items: 'center', gap: 6, children: [
        text({ text: deltaUp ? '▲' : '▼', size: 15, color: deltaUp ? T.green : '#C0362C', delay: 1.25, anim: 'pop', enterDur: 0.3 }),
        text({ text: delta, size: 17, weight: 600, color: deltaUp ? T.green : '#C0362C', font: 'mono', delay: 1.25, anim: 'pop', enterDur: 0.3 })] },
    ].filter(Boolean) }];
}

// gauge — a semicircular meter (value / max) in a card.
export function gauge({ x, y, w = 300, value = 0, max = 100, label = '', color = TOKENS.accent, start = 0, dur = 4 } = {}) {
  const pct = Math.max(0, Math.min(1, value / max)); const semi = Math.PI * 42;
  const arc = 'M8 52 A42 42 0 0 1 92 52';
  // The arc SWEEPS to its reading instead of the whole card sliding in. `--p` is driven by the engine
  // over the layer's window (0 → pct), and the dash length is computed from it in CSS — so the motion
  // is the thing the block is FOR, which is what makes the registry browsable: you see what a gauge
  // does, not that a card can rise. Deterministic: --p is a pure function of t.
  const svg = (inner) => `<svg viewBox="0 0 100 60" width="${inner}" style="display:block;margin:0 auto 4px">`
    + `<path d="${arc}" fill="none" stroke="${T.hair}" stroke-width="10" stroke-linecap="round"/>`
    + `<path d="${arc}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"`
    + ` stroke-dasharray="calc(${semi.toFixed(2)} * var(--p, ${pct.toFixed(4)})) ${semi.toFixed(2)}"/></svg>`;
  // the reading and its caption sit BELOW the arc, so they are body, not htmlCard's heading row.
  const html = htmlCard({ w, pad: CHART_PAD, align: 'center', body: (inner) => svg(inner)
    + `<div style="font:700 34px var(--font-sans);color:${T.ink};letter-spacing:-0.02em;margin-top:-4px">${value}${max === 100 ? '%' : ''}</div>`
    + (label ? `<div style="font:600 16px var(--font-mono);color:${T.dim};margin-top:4px">${label}</div>` : '') });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ to: pct, dur: 1.1 }) }];
}

// progressRing — a circular progress ring with a % centre label (bare, for overlaying).
export function progressRing({ x, y, size = 160, value = 0, max = 100, label = '', color = TOKENS.accent, start = 0, dur = 4 } = {}) {
  const pct = Math.max(0, Math.min(1, value / max)); const C = 2 * Math.PI * 42;
  // The ring FILLS to its reading (the same `--p` mechanism as gauge), rather than the whole card
  // sliding in. The dash length is computed in CSS from the driven variable, so the motion is what
  // the block is for. The `%` stays put: it is the destination the ring is travelling to.
  const svg = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block">`
    + `<circle cx="50" cy="50" r="42" fill="none" stroke="${T.hair}" stroke-width="9"/>`
    + `<circle cx="50" cy="50" r="42" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"`
    + ` stroke-dasharray="calc(${C.toFixed(2)} * var(--p, ${pct.toFixed(4)})) ${C.toFixed(2)}" transform="rotate(-90 50 50)"/>`
    + `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="var(--font-sans)" font-weight="700" font-size="22" fill="${T.ink}">${Math.round(pct * 100)}%</text></svg>`;
  const html = `<div style="width:${size}px">${svg}${label ? `<div style="text-align:center;font:600 16px var(--font-mono);color:${T.dim};margin-top:8px">${label}</div>` : ''}</div>`;
  return [{ type: 'html', x, y, w: size, html, start, duration: dur, ...sweep({ to: pct, dur: 1.1 }) }];
}
