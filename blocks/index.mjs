// blocks/index.mjs — the TASTE LIBRARY. Vetted, reusable, deterministic scene-block factories.
//
// WHY THIS EXISTS: agent-authored beats regress to hollow (a word in a box, a static list, an
// unbacked claim). The fix another engine proved: compose from pre-vetted blocks instead of authoring
// structure from scratch every time. Each factory here is a PURE function of props → an array of
// scene-layer JSON (absolute-positioned, timed, animated) that is already tasteful. You call them in
// an authoring/transform script and spread the result into `scene.layers`.
//
// CONTRACT
//   - Every factory returns an ARRAY of layer objects (so a block can stagger its own sub-parts in time).
//   - Coordinates are absolute (1920×1080 stage). Pass {x,y} = top-left of the block.
//   - Timing: {start} seconds, {dur} seconds. Sub-parts stagger off `start`.
//   - Colours default to the Creed token set but every colour is overridable via opts.
//   - Deterministic: no Date/random. Same props → same layers.
//
// See docs/BLOCKS.md for the catalog + screenshots.

export const TOKENS = {
  ink: '#0A0A0A', sub: '#5C5C58', dim: '#9A9A94',
  paper: '#FCFCFC', card: '#FFFFFF', hair: '#D6D6D2', surface: '#F1F1EF',
  accent: '#C96442', accentSoft: 'rgba(201,100,66,0.13)', accentInk: '#A94A28',
  green: '#16A34A', greenBright: '#22C55E', greenSoft: 'rgba(34,197,94,0.14)',
  blurple: '#635BFF', stripeNavy: '#0A2540', stripeTeal: '#3ECF8E', stripeGrey: '#8898AA',
};
const T = TOKENS;
const HAIR = `1px solid ${T.hair}`;
const r2 = (n) => Math.round(n * 100) / 100;

// ---- small helpers ----
const text = (o) => ({ type: 'text', weight: 500, ...o });
const rect = (o) => ({ type: 'rect', radius: 0, ...o });      // TOP-LEVEL boxes only
const box = (o) => ({ type: 'group', radius: 0, ...o });       // a coloured box usable as a GROUP CHILD (rect isn't allowed there)
const pill = (t, fg = T.accentInk, bg = T.accentSoft) =>
  text({ text: t, size: 17, weight: 500, color: fg, bg, radius: 100, pad: '7px 16px' });

// ─────────────────────────────────────────────────────────────────────────────
// card — elevated white card · tinted inner panel · pill tags · CTA footer arrow
// The canonical "rich card". Great for a feature grid / capability tile.
export function card({ x, y, w = 740, h = 336, tint = '#F6E6DE', title, desc, pills = [],
  cta = 'Explore', start = 0, dur = 4, anim = 'rise', enterDur = 0.5 } = {}) {
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 8, pad: 14,
    bg: T.card, radius: 18, elevation: 2, start, duration: dur, anim, enterDur, exitDur: 0.35,
    children: [
      { type: 'group', grow: 1, bg: tint, radius: 12, pad: 26, layout: 'column', items: 'flex-start', gap: 13, children: [
        text({ text: title, size: 38, weight: 700, color: T.ink, ls: '-0.02em' }),
        desc && text({ text: desc, size: 20, color: T.sub }),
        pills.length && { type: 'group', layout: 'row', wrap: true, gap: 10, items: 'center', children: pills.map((p) => pill(p)) },
      ].filter(Boolean) },
      cta && { type: 'group', layout: 'row', justify: 'space-between', items: 'center', pad: '4px 12px', children: [
        text({ text: cta, size: 22, weight: 600, color: T.ink }),
        { type: 'group', bg: T.surface, radius: 12, pad: '12px 16px', children: [text({ text: '→', size: 22, weight: 600, color: T.accent })] },
      ] },
    ].filter(Boolean),
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// codeBlock — a code card. `lines` are strings OR {text,color} for syntax colour.
export function codeBlock({ x, y, w = 640, lines = [], label, dark = false, size = 24,
  start = 0, dur = 4, anim = 'rise', enterDur = 0.5 } = {}) {
  const bg = dark ? T.stripeNavy : T.card, fg = dark ? '#E8ECF1' : T.ink;
  const kids = [];
  if (label) kids.push(text({ text: label, font: 'mono', size: 18, color: dark ? T.stripeGrey : T.dim }));
  for (const ln of lines) {
    const s = typeof ln === 'string' ? { text: ln, color: fg } : { text: ln.text, color: ln.color || fg };
    kids.push(text({ ...s, font: 'mono', size, weight: 400 }));
  }
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 8, pad: 30,
    bg, radius: 14, border: dark ? '1px solid rgba(255,255,255,0.08)' : HAIR, ...(dark ? {} : { elevation: 1 }),
    start, duration: dur, anim, enterDur, exitDur: 0.35, children: kids,
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// terminal — a command prompt + output card. `command` types in; `output` reveals after.
export function terminal({ x, y, w = 720, command, output = [], start = 0, dur = 4 } = {}) {
  const out = [];
  out.push({
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 10, pad: 26,
    bg: T.card, radius: 12, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.4,
    children: [
      { type: 'group', layout: 'row', gap: 10, items: 'center', children: [
        text({ text: '$', font: 'mono', size: 22, color: T.accent, weight: 600 }),
        text({ text: command, font: 'mono', size: 22, color: T.ink, split: 'char', preset: 'decode', each: 0.5, stagger: 0.015 }),
      ] },
      ...output.map((l, i) => text({ text: l, font: 'mono', size: 20, color: T.sub })),
    ],
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// loadingBar — a track + a fill that wipes L→R (determinate) and lands GREEN.
// Returns [track, fill]; add `label`+`done` for a "✓ done" that pops on completion.
export function loadingBar({ x, y, w = 420, h = 6, start = 0, fillDur = 1.5, color = T.greenBright,
  settle = T.green, label, done = true } = {}) {
  const out = [
    rect({ x, y, w, h, radius: h / 2, bg: T.surface, start, duration: fillDur + (done ? 1.2 : 0.4) }),
    rect({ x, y, w, h, radius: h / 2, bg: settle, start, duration: fillDur + (done ? 1.2 : 0.4),
      anim: 'wipe', enterDur: fillDur }),
  ];
  if (label) out.push(text({ text: label, x, y: y + 18, font: 'mono', size: 18, color: T.sub, start, duration: fillDur + 1.2 }));
  if (done) out.push(text({ text: '✓ done', x: x + w - 70, y: y - 34, font: 'mono', size: 18, weight: 600,
    color: T.green, start: r2(start + fillDur), duration: 1.0, anim: 'rise', enterDur: 0.3 }));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// deploySuccess — a CI pipeline that cascades queued→building→deploying→live, then a success card
// with a green check, live URL, and "Ready in Xs". The canonical "a click had a consequence" payoff.
export function deploySuccess({ x, y, w = 620, url = 'app.shortwave.dev', start = 0, rowGap = 52 } = {}) {
  const steps = ['Building', 'Deploying', 'Live'];
  const out = [];
  steps.forEach((label, i) => {
    const t = r2(start + i * 0.55);
    const done = i < steps.length - 1;
    out.push(text({ text: (done || i === steps.length - 1) ? '✓' : '•', x, y: y + i * rowGap, font: 'mono',
      size: 24, weight: 700, color: i === steps.length - 1 ? T.green : T.green, start: t, duration: 6, anim: 'rise', enterDur: 0.3 }));
    out.push(text({ text: label, x: x + 44, y: y + i * rowGap, font: 'mono', size: 22,
      color: i === steps.length - 1 ? T.ink : T.sub, start: t, duration: 6 }));
  });
  // success card
  const cy = y + steps.length * rowGap + 30;
  out.push({
    type: 'group', x, y: cy, w, layout: 'row', items: 'center', gap: 16, pad: 22,
    bg: T.card, radius: 14, border: `1px solid ${T.greenSoft}`, elevation: 1,
    start: r2(start + steps.length * 0.55), duration: 6, anim: 'rise', enterDur: 0.45,
    children: [
      { type: 'group', bg: T.green, radius: 100, pad: '8px 12px', children: [text({ text: '✓', size: 22, weight: 700, color: '#fff' })] },
      { type: 'group', layout: 'column', gap: 4, items: 'flex-start', children: [
        text({ text: 'Deployed to production', size: 22, weight: 700, color: T.ink }),
        text({ text: url, font: 'mono', size: 18, color: T.green }),
      ] },
      { type: 'group', grow: 1, layout: 'row', justify: 'flex-end', children: [
        text({ text: 'Ready in 1.2s', font: 'mono', size: 18, color: T.dim }),
      ] },
    ],
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// browserFrame — window chrome (traffic dots + URL bar). Draw content on top via other layers.
export function browserFrame({ x, y, w = 900, h = 560, url = 'stripe.com', start = 0, dur = 4 } = {}) {
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 0,
    bg: T.card, radius: 14, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [
      { type: 'group', layout: 'row', items: 'center', gap: 8, pad: '14px 18px', children: [
        ...['#FF5F57', '#FEBC2E', '#28C840'].map((c) => box({ w: 12, h: 12, radius: 100, bg: c })),
        { type: 'group', grow: 1, layout: 'row', justify: 'center', children: [
          { type: 'group', bg: T.surface, radius: 100, pad: '6px 20px', children: [text({ text: url, font: 'mono', size: 18, color: T.sub })] },
        ] },
      ] },
    ],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// pillRow — a horizontal row of chip tags.
export function pillRow({ x, y, items = [], fg = T.accentInk, bg = T.accentSoft, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, layout: 'row', wrap: true, gap: 10, items: 'center',
    start, duration: dur, anim: 'rise', enterDur: 0.4, children: items.map((p) => pill(p, fg, bg)) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// statBig — scale-contrast stat: a huge animated number + a tiny label. `to` counts up.
export function statBig({ x, y, to = 0, from = 0, unit = '', label, size = 150, color = T.ink,
  start = 0, dur = 4 } = {}) {
  return [
    { type: 'count', x, y, from, to, unit, font: 'sans', size, weight: 700, color, ls: '-0.03em',
      countStart: 0.2, countDur: 1.4, ease: 'easeOutExpo', start, duration: dur, anim: 'rise', enterDur: 0.4 },
    label && text({ text: label, x, y: y + size * 0.9, font: 'mono', size: 20, color: T.dim, start: r2(start + 0.3), duration: dur - 0.3 }),
  ].filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// colorCycle — one word rendered in a SEQUENCE of hues so it visibly cycles colour (proof of "any
// colour" WITHOUT reintroducing colour everywhere). Deterministic: fixed palette, fixed timing.
export function colorCycle({ x, y, word = 'colour', size = 78, weight = 700,
  colors = ['#4338E8', '#12B26A', '#F6A417', '#E23B94', '#1E5BF0', '#C96442'],
  start = 0, dur = 4, each = 0.5 } = {}) {
  const out = [];
  let t = start;
  for (let i = 0; t < start + dur; i++, t = r2(t + each)) {
    out.push(text({ text: word, x, y, size, weight, color: colors[i % colors.length], ls: '-0.02em',
      start: r2(t), duration: r2(Math.min(each + 0.08, start + dur - t)) }));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// stripeCard — a recognizably-"Stripe" payments card: amount + mini bar chart + blurple Pay button.
// Uses Stripe's real product hexes. The "reads a site → rebuilds its look" payoff.
export function stripeCard({ x, y, w = 380, start = 0, dur = 4 } = {}) {
  const bars = [38, 52, 44, 66, 58, 80, 72];
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 18, pad: 26,
    bg: T.card, radius: 12, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [
      text({ text: 'Net volume', size: 18, color: T.stripeGrey, font: 'mono' }),
      text({ text: '$3,528.19', size: 44, weight: 700, color: T.stripeNavy, ls: '-0.02em' }),
      { type: 'group', layout: 'row', items: 'flex-end', gap: 8, h: 70, children:
        bars.map((b) => box({ w: 26, h: b, radius: 4, bg: T.blurple })) },
      { type: 'group', bg: T.blurple, radius: 6, pad: '14px 0', layout: 'row', justify: 'center',
        children: [text({ text: 'Pay $3,528.19', size: 18, weight: 600, color: '#fff' })] },
    ],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// barChart — labeled bars with values. `data` = [{label, value}]. Scales to the max.
export function barChart({ x, y, w = 560, h = 260, data = [], color = TOKENS.blurple, start = 0, dur = 4 } = {}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-end', justify: 'space-between', gap: 14, pad: 22,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: data.map((dp) => ({ type: 'group', layout: 'column', items: 'center', gap: 8, children: [
      text({ text: String(dp.value), size: 18, weight: 600, color: T.ink }),
      box({ w: Math.max(22, (w - 44 - 14 * (data.length - 1)) / data.length - 8), h: Math.round((h - 90) * dp.value / max) + 6, radius: 6, bg: color }),
      text({ text: dp.label, size: 18, color: T.dim, font: 'mono' }),
    ] })) }];
}

// diff — a code diff card. `lines` = [{sign:'+'|'-'|' ', text}] with add/del colouring.
export function diff({ x, y, w = 620, lines = [], start = 0, dur = 4 } = {}) {
  const col = { '+': TOKENS.green, '-': '#C0362C', ' ': T.sub };
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 6, pad: 26,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: lines.map((ln) => text({ text: `${ln.sign} ${ln.text}`, font: 'mono', size: 22, weight: 400, color: col[ln.sign] || T.ink })) }];
}

// quote — a pull quote with attribution. The one place big italic-ish restraint reads as premium.
export function quote({ x, y, w = 900, text: q, author, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 20, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35, children: [
    text({ text: `“${q}”`, size: 44, weight: 600, color: T.ink, ls: '-0.02em' }),
    author && text({ text: `· ${author}`, size: 22, color: T.sub }),
  ].filter(Boolean) }];
}

// notification — a toast card (icon + title + body). Good for "it just happened" beats.
export function notification({ x, y, w = 460, title, body, accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-start', gap: 14, pad: 20,
    bg: T.card, radius: 14, border: HAIR, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.45, exitDur: 0.3, children: [
      box({ w: 12, h: 12, radius: 100, bg: accent }),
      { type: 'group', layout: 'column', gap: 6, items: 'flex-start', grow: 1, children: [
        text({ text: title, size: 22, weight: 700, color: T.ink }),
        body && text({ text: body, size: 18, color: T.sub }),
      ].filter(Boolean) },
    ] }];
}

// kpiRow — a row of stat cells (value + label). Scale contrast without a card grid.
export function kpiRow({ x, y, items = [], gap = 80, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, layout: 'row', items: 'flex-start', gap, start, duration: dur, anim: 'rise', enterDur: 0.45, children:
    items.map((it) => ({ type: 'group', layout: 'column', items: 'flex-start', gap: 4, children: [
      text({ text: String(it.value), size: 64, weight: 700, color: T.ink, ls: '-0.02em' }),
      text({ text: it.label, size: 18, color: T.dim, font: 'mono' }),
    ] })) }];
}

// callout — an info/success/warn strip with a leading bar (full-height, per shape lock).
export function callout({ x, y, w = 720, text: msg, tone = 'info', start = 0, dur = 4 } = {}) {
  const ac = { info: TOKENS.blurple, success: TOKENS.green, warn: TOKENS.accent }[tone] || TOKENS.blurple;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: '18px 22px',
    bg: T.surface, radius: 12, start, duration: dur, anim: 'rise', enterDur: 0.4, children: [
      box({ w: 4, h: 30, radius: 2, bg: ac }),
      text({ text: msg, size: 22, weight: 500, color: T.ink }),
    ] }];
}

// comparison — two columns (e.g. Before / After, Others / Shortwave). Rows are simple strings.
export function comparison({ x, y, w = 900, leftTitle = 'Others', rightTitle = 'Shortwave', left = [], right = [], start = 0, dur = 4 } = {}) {
  const colW = (w - 40) / 2;
  const col = (title, items, accent) => ({ type: 'group', w: colW, layout: 'column', items: 'flex-start', gap: 14, pad: 24,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, children: [
      text({ text: title, size: 26, weight: 700, color: accent }),
      ...items.map((it) => text({ text: it, size: 20, color: T.sub })),
    ] });
  return [{ type: 'group', x, y, w, layout: 'row', gap: 40, items: 'stretch', start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [col(leftTitle, left, T.dim), col(rightTitle, right, TOKENS.accent)] }];
}

// ─────────────────────────────────────────────────────────────────────────────
// captions — timed subtitle chips at the bottom (accessibility + muted-autoplay reach). Each line
// is {t, text, dur?}; `t` is relative to `start`. Deterministic. Pair with a future VO track.
export function captions({ lines = [], x = 460, y = 980, size = 30, start = 0 } = {}) {
  return lines.map((ln) => ({ type: 'text', text: ln.text, x, y, size, weight: 600, color: '#fff',
    bg: 'rgba(10,10,10,0.82)', radius: 10, pad: '8px 20px',
    start: r2(start + ln.t), duration: ln.dur ?? 2.2, anim: 'fade', enterDur: 0.2, exitDur: 0.2 }));
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 1 families — charts + card variants. Charts that need curves/arcs use ONE `html`+SVG layer
// (crisp, deterministic, animates as a unit); bar-family stays native boxes for per-bar life.

// lineChart — a trend line (optional area fill) in a hairline card. data = [{label,value}].
export function lineChart({ x, y, w = 560, h = 240, data = [], color = TOKENS.blurple, area = false, label = '', start = 0, dur = 4 } = {}) {
  const cw = w - 44, ch = h - (label ? 74 : 44), pad = 8;
  const vals = data.map((d) => d.value); const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const n = Math.max(1, data.length - 1);
  const PX = (i) => (pad + (i / n) * (cw - 2 * pad)).toFixed(1);
  const PY = (v) => ((ch - pad) - ((v - min) / ((max - min) || 1)) * (ch - 2 * pad)).toFixed(1);
  const pts = data.map((d, i) => `${PX(i)},${PY(d.value)}`).join(' ');
  const dots = data.map((d, i) => `<circle cx="${PX(i)}" cy="${PY(d.value)}" r="2.6" fill="${color}"/>`).join('');
  const svg = `<svg viewBox="0 0 ${cw} ${ch}" width="100%" height="${ch}" style="display:block;overflow:visible">`
    + (area ? `<polygon points="${pad},${ch - pad} ${pts} ${cw - pad},${ch - pad}" fill="${color}" opacity="0.12"/>` : '')
    + `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
  const html = `<div style="background:${T.card};border:${HAIR};border-radius:14px;padding:22px;box-sizing:border-box;width:${w}px">`
    + (label ? `<div style="font:600 18px var(--font-mono);color:${T.dim};margin-bottom:14px">${label}</div>` : '') + svg + `</div>`;
  return [{ type: 'html', x, y, w, html, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35 }];
}

// donutChart — a ring split into segments + a legend. segments = [{value,color,label}].
export function donutChart({ x, y, w = 320, segments = [], label = '', start = 0, dur = 4 } = {}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const R = 40, C = 2 * Math.PI * R, sw = 15; let off = 0;
  const arcs = segments.map((s) => { const len = (s.value / total) * C;
    const el = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 50 50)"/>`;
    off += len; return el; }).join('');
  const ring = `<svg viewBox="0 0 100 100" width="${w - 44}" height="${w - 44}" style="display:block;margin:0 auto 14px">${arcs}</svg>`;
  const legend = segments.map((s) => `<div style="display:flex;align-items:center;gap:9px"><span style="width:11px;height:11px;border-radius:100px;background:${s.color};flex:0 0 auto"></span><span style="font:500 18px var(--font-sans);color:${T.sub}">${s.label} · ${Math.round(s.value / total * 100)}%</span></div>`).join('');
  const html = `<div style="background:${T.card};border:${HAIR};border-radius:14px;padding:24px;box-sizing:border-box;width:${w}px">`
    + (label ? `<div style="font:600 18px var(--font-mono);color:${T.dim};margin-bottom:14px">${label}</div>` : '')
    + ring + `<div style="display:flex;flex-direction:column;gap:9px">${legend}</div></div>`;
  return [{ type: 'html', x, y, w, html, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35 }];
}

// stackedBar — multi-series bars. data = [{label,values:[..]}], series = [{name,color}].
export function stackedBar({ x, y, w = 520, h = 280, data = [], series = [], start = 0, dur = 4 } = {}) {
  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0)); const max = Math.max(...totals, 1);
  const bw = Math.max(24, (w - 44 - 14 * (data.length - 1)) / data.length - 8);
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-end', justify: 'space-between', gap: 14, pad: 22,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: data.map((d) => ({ type: 'group', layout: 'column', items: 'center', gap: 8, children: [
      { type: 'group', layout: 'column', items: 'stretch', w: bw, gap: 2, children:
        d.values.map((v, i) => box({ w: bw, h: Math.round((h - 90) * v / max) + 2, radius: i === 0 ? 4 : 0, bg: (series[i] || {}).color || T.blurple })) },
      text({ text: d.label, size: 18, color: T.dim, font: 'mono' }),
    ] })) }];
}

// pricingCard — plan · price · feature ticks · CTA. highlight = the featured plan (accent border + CTA).
export function pricingCard({ x, y, w = 360, plan = 'Pro', price = '$29', period = '/mo', features = [], cta = 'Start free', highlight = false, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 16, pad: 28,
    bg: T.card, radius: 16, border: highlight ? `1.5px solid ${T.accent}` : HAIR, elevation: highlight ? 2 : 1,
    start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35, children: [
      text({ text: plan, size: 20, weight: 600, color: highlight ? T.accentInk : T.sub, font: 'mono' }),
      { type: 'group', layout: 'row', items: 'flex-end', gap: 4, children: [
        text({ text: price, size: 56, weight: 700, color: T.ink, ls: '-0.03em' }),
        text({ text: period, size: 20, color: T.dim, font: 'mono' })] },
      { type: 'group', layout: 'column', items: 'flex-start', gap: 10, children:
        features.map((f) => ({ type: 'group', layout: 'row', items: 'center', gap: 10, children: [
          text({ text: '✓', size: 18, weight: 700, color: T.green }), text({ text: f, size: 19, color: T.sub })] })) },
      { type: 'group', bg: highlight ? T.accent : T.surface, radius: 10, pad: '14px 0', layout: 'row', justify: 'center',
        children: [text({ text: cta, size: 19, weight: 600, color: highlight ? '#fff' : T.ink })] },
    ] }];
}

// statCard — a boxed KPI: label · animated count · optional delta chip.
export function statCard({ x, y, w = 340, to = 0, from = 0, unit = '', label = '', delta = '', deltaUp = true, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 8, pad: 26,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.45, exitDur: 0.3, children: [
      text({ text: label, size: 18, color: T.dim, font: 'mono' }),
      { type: 'count', from, to, unit, font: 'sans', size: 56, weight: 700, color: T.ink, ls: '-0.02em', countStart: 0.2, countDur: 1.2, ease: 'easeOutExpo' },
      delta && { type: 'group', layout: 'row', items: 'center', gap: 6, children: [
        text({ text: deltaUp ? '▲' : '▼', size: 15, color: deltaUp ? T.green : '#C0362C' }),
        text({ text: delta, size: 17, weight: 600, color: deltaUp ? T.green : '#C0362C', font: 'mono' })] },
    ].filter(Boolean) }];
}

// profileCard — avatar (image or initials) · name · role. For testimonials / team / "who said it".
export function profileCard({ x, y, w = 360, name = '', role = '', avatar = '', initials = '', start = 0, dur = 4 } = {}) {
  const av = avatar
    ? { type: 'image', src: avatar, w: 56, h: 56, radius: 100 }
    : box({ w: 56, h: 56, radius: 100, bg: T.accentSoft, layout: 'row', justify: 'center', items: 'center',
        children: [text({ text: initials || '•', size: 22, weight: 700, color: T.accentInk })] });
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: 22,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.45, exitDur: 0.3, children: [
      av, { type: 'group', layout: 'column', items: 'flex-start', gap: 4, children: [
        text({ text: name, size: 22, weight: 700, color: T.ink }), text({ text: role, size: 18, color: T.sub })] },
    ] }];
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 2 families — dev blocks + device/UI chrome.

// fileTree — an indented file/folder list; `active` highlights the focused row.
export function fileTree({ x, y, w = 360, items = [], start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 2, pad: 20,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: items.map((it) => ({ type: 'group', layout: 'row', items: 'center', gap: 8, pad: '6px 10px',
      ...(it.active ? { bg: T.accentSoft, radius: 8 } : {}),
      children: [
        box({ w: (it.depth || 0) * 22, h: 18 }),
        text({ text: (it.type === 'dir' ? '▾ ' : '· ') + it.name, font: 'mono', size: 19,
          weight: it.active ? 600 : 400, color: it.active ? T.accentInk : (it.type === 'dir' ? T.ink : T.sub) }),
      ] })) }];
}

// logLines — a log stream with optional timestamp + level colour. dark = terminal surface.
export function logLines({ x, y, w = 620, lines = [], dark = true, start = 0, dur = 4 } = {}) {
  const bg = dark ? T.stripeNavy : T.card;
  const lc = { info: '#8898AA', ok: T.greenBright, warn: '#F6A417', error: '#FF6B6B' };
  const base = dark ? '#E8ECF1' : T.ink;
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 6, pad: 24,
    bg, radius: 12, ...(dark ? {} : { border: HAIR, elevation: 1 }), start, duration: dur, anim: 'rise', enterDur: 0.45, exitDur: 0.3,
    children: lines.map((ln) => ({ type: 'group', layout: 'row', items: 'baseline', gap: 12, children: [
      ln.t && text({ text: ln.t, font: 'mono', size: 16, color: dark ? '#5C6B7F' : T.dim }),
      text({ text: (ln.level ? `[${ln.level}] ` : '') + ln.text, font: 'mono', size: 19, color: lc[ln.level] || base }),
    ].filter(Boolean) })) }];
}

// commitRow — a git history list (hash · message · author · time), hairline-divided.
export function commitRow({ x, y, w = 620, commits = [], start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 0, pad: 0,
    bg: T.card, radius: 14, border: HAIR, elevation: 1, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: commits.flatMap((c, i) => [
      i > 0 && box({ h: 1, bg: T.hair }),
      { type: 'group', layout: 'row', items: 'center', gap: 14, pad: '16px 22px', children: [
        text({ text: c.hash, font: 'mono', size: 17, weight: 600, color: T.accent }),
        { type: 'group', grow: 1, layout: 'column', items: 'flex-start', gap: 2, children: [
          text({ text: c.msg, size: 19, weight: 500, color: T.ink }),
          text({ text: `${c.author} · ${c.time}`, font: 'mono', size: 15, color: T.dim }),
        ] },
      ] },
    ].filter(Boolean)) }];
}

// phoneFrame — a phone shell (dark bezel, dynamic-island notch, light screen). Draw content on top.
export function phoneFrame({ x, y, w = 300, h = 620, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 10,
    bg: '#0A0A0A', radius: 44, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [{ type: 'group', grow: 1, bg: T.card, radius: 34, layout: 'column', items: 'center', pad: 12,
      children: [box({ w: 116, h: 26, radius: 100, bg: '#0A0A0A' })] }] }];
}

// tabBar — a segmented control; `active` is the selected index (lifted, lit card).
export function tabBar({ x, y, w = 520, tabs = [], active = 0, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'stretch', gap: 6, pad: 6,
    bg: T.surface, radius: 12, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    children: tabs.map((t, i) => ({ type: 'group', grow: 1, layout: 'row', justify: 'center', items: 'center', pad: '10px 0',
      ...(i === active ? { bg: T.card, radius: 8, elevation: 1 } : {}),
      children: [text({ text: t, size: 18, weight: i === active ? 600 : 500, color: i === active ? T.ink : T.sub })] })) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// The REGISTRY. Bare family factories + namespaced `family.variant` entries from the manifest.
// A namespaced entry resolves to its family with the manifest's preset props merged UNDER call-time
// opts, so a scene can still override anything. Adding a variant = a row in blocks/catalog.mjs (+ a
// `variant` branch in the family). See docs/BLOCKS.md (auto-generated) and docs/TASTE.md.
import { CATALOG } from './catalog.mjs';

const FACTORIES = { card, codeBlock, terminal, loadingBar, deploySuccess, browserFrame, pillRow, statBig,
  colorCycle, stripeCard, barChart, diff, quote, notification, kpiRow, callout, comparison, captions,
  lineChart, donutChart, stackedBar, pricingCard, statCard, profileCard,
  fileTree, logLines, commitRow, phoneFrame, tabBar };

export const BLOCKS = { ...FACTORIES };
for (const e of CATALOG) {
  if (!e.name.includes('.')) continue; // bare names use the raw factory (identical behaviour)
  const fam = FACTORIES[e.family];
  if (fam) BLOCKS[e.name] = (opts = {}) => fam({ ...(e.props || {}), ...opts });
}
