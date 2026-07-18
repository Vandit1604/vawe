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

// The shared vocabulary — tokens, layer primitives, card chrome, the radius scale, tone colours and
// the one avatar implementation — lives in blocks/kit.mjs. It is PURE (props → plain objects) and it
// exists because every one of those things had been copied per-block and had drifted per-copy.
import {
  TOKENS, SERIES, seriesAt, HAIR, r2, text, rect, box, pill, onColor,
  R, cardChrome, htmlCard, cardInsetY, barWidth, toneColor, avatarEl,
  sweep, stagger, growUp, fillRight,
} from './kit.mjs';

export { TOKENS, SERIES, onColor, R, cardChrome, toneColor, avatarEl };
const T = TOKENS;

// ─────────────────────────────────────────────────────────────────────────────
// card — elevated white card · tinted inner panel · pill tags · CTA footer arrow
// The canonical "rich card". Great for a feature grid / capability tile.
export function card({ x, y, w = 740, h = 336, tint = 'color-mix(in srgb, var(--accent) 10%, var(--card))', title, desc, pills = [],
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
// CODE_THEMES — curated editor palettes for codeBlock. Hex literals on purpose: like the stripeCard
// hexes, a code theme IS its exact colours (theme tokens would dissolve twelve looks into one).
// Every fg/label/syntax colour was checked against its bg with the WCAG formula — the minimum in the
// set is 4.68:1, so nothing here can murk out on render. Names are descriptive, not editor brands.
// `light: true` flips the card chrome (hairline + elevation instead of the dark inner border).
const CODE_THEMES = {
  midnight: { bg: '#0D1117', fg: '#E6EDF3', label: '#8B949E', syntax: ['#79C0FF', '#7EE787', '#FFA657', '#D2A8FF', '#FF7B72', '#A5D6FF'] },
  ink:      { bg: '#16161E', fg: '#C8D0F0', label: '#8A91B4', syntax: ['#7AA2F7', '#9ECE6A', '#E0AF68', '#BB9AF7', '#7DCFFF'] },
  ember:    { bg: '#1F1210', fg: '#F2E4DC', label: '#B39A8F', syntax: ['#FF9F6B', '#F0C674', '#E89AA6', '#8FD3B6', '#D7A8F0'] },
  forest:   { bg: '#0B1F16', fg: '#DCEDE2', label: '#8FB3A0', syntax: ['#7FD8A4', '#C7E08B', '#EFCB68', '#6FC9C4', '#B7A8F0', '#F0A48F'] },
  ocean:    { bg: '#071E2E', fg: '#D8EAF5', label: '#8AAEC2', syntax: ['#5FC6E8', '#7FD8A4', '#EFC060', '#A0B8F8', '#F09AA0'] },
  dusk:     { bg: '#1E1B2E', fg: '#E4DFF5', label: '#9C93C0', syntax: ['#B39DF0', '#8AB8F5', '#E8A0C8', '#8FD8B0', '#EFC060'] },
  slate:    { bg: '#20242C', fg: '#DDE3EA', label: '#98A3B0', syntax: ['#88BBEE', '#93CFA8', '#E5B567', '#C6A5E8', '#7ED2CE'] },
  neon:     { bg: '#0A0E14', fg: '#E8F0F8', label: '#8896A8', syntax: ['#4AE3B5', '#5AC8FA', '#F5D76E', '#F58AC0', '#B69CFF', '#9CE07A'] },
  aurora:   { bg: '#101820', fg: '#DEE8E8', label: '#8CA0A8', syntax: ['#5AD8C0', '#88C0F0', '#D0A8F8', '#F0B860', '#F08A98', '#A8D878'] },
  paper:    { bg: '#FAF8F2', fg: '#2A2C33', label: '#6D7075', light: true, syntax: ['#9A4A00', '#1E68C5', '#1F6B3A', '#8A3FA8', '#B02A37'] },
  linen:    { bg: '#F6EFE3', fg: '#3A3128', label: '#77685C', light: true, syntax: ['#8C4A10', '#20655E', '#8A3B60', '#4E5FB8', '#5A6E20'] },
  frost:    { bg: '#EFF4F8', fg: '#22303C', label: '#5D6E7E', light: true, syntax: ['#155FB0', '#0F6E62', '#7A3FA0', '#A03050', '#6B5A10'] },
};

// codeBlock — a code card. `lines` are strings OR {text,color} for syntax colour. Optional `theme`
// names a CODE_THEMES palette; it overrides dark/light, and lines that don't bring a colour get the
// palette's syntax colours cycled by line index (deterministic: same lines → same paint).
export function codeBlock({ x, y, w = 640, lines = [], label, dark = false, size = 24, theme,
  start = 0, dur = 4, anim = 'fade', enterDur = 0.25 } = {}) {
  const P = theme ? CODE_THEMES[theme] : null;
  if (theme && !P) throw new Error(`codeBlock: unknown theme "${theme}" — one of ${Object.keys(CODE_THEMES).join(', ')}`);
  const isDark = P ? !P.light : dark;
  const bg = P ? P.bg : (dark ? T.stripeNavy : T.card), fg = P ? P.fg : (dark ? '#E8ECF1' : T.ink);
  const kids = [];
  if (label) kids.push(text({ text: label, font: 'mono', size: 18, color: P ? P.label : (dark ? T.stripeGrey : T.dim) }));
  // THE CODE WRITES ITSELF IN, line after line, off the top of the block — the motion a code card is
  // FOR. The label (if any) is already there, so the reveal starts at the first line of code.
  // cycle index advances per line (not per uncoloured line) so each line's hue is stable under edits
  // to its neighbours' explicit colours
  lines.forEach((ln, i) => {
    const auto = P ? P.syntax[i % P.syntax.length] : fg;
    const s = typeof ln === 'string' ? { text: ln, color: auto } : { text: ln.text, color: ln.color || auto };
    kids.push(text({ ...s, font: 'mono', size, weight: 400, ...stagger(i, { step: 0.14, delay: 0.2, anim: 'slide-left', enterDur: 0.28 }) }));
  });
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 8, pad: 30,
    bg, radius: 14, border: isDark ? '1px solid rgba(255,255,255,0.08)' : HAIR, ...(isDark ? {} : { elevation: 1 }),
    start, duration: dur, anim, enterDur, exitDur: 0.35, children: kids,
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// terminal — a command prompt + output card. `command` types in; `output` reveals after.
// `cps` is the typing speed in characters per second; the output waits for the command to finish.
export function terminal({ x, y, w = 720, command, output = [], cps = 18, start = 0, dur = 4 } = {}) {
  // THE COMMAND TYPES IN, CHARACTER BY CHARACTER, AND THEN THE OUTPUT ANSWERS IT — the one motion a
  // terminal is for, and the reason the prompt has to land before anything below it does. `typing` is
  // the engine's own char reveal (chars/sec, pure in t), so the output's start is DERIVED from the
  // command's length rather than guessed.
  const typed = (String(command || '').length) / cps;
  const out = [];
  out.push({
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 10, pad: 26,
    ...cardChrome({ radius: R.tight, anim: 'fade' }), start, duration: dur, enterDur: 0.25,
    children: [
      { type: 'group', layout: 'row', gap: 10, items: 'center', children: [
        text({ text: '$', font: 'mono', size: 22, color: T.accent, weight: 600 }),
        text({ text: command, font: 'mono', size: 22, color: T.ink, typing: cps, delay: 0.25, anim: 'fade', enterDur: 0.1 }),
      ] },
      ...output.map((l, i) => text({ text: l, font: 'mono', size: 20, color: T.sub,
        ...stagger(i, { step: 0.28, delay: r2(0.45 + typed), anim: 'fade', enterDur: 0.2 }) })),
    ],
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// loadingBar — a track + a fill that wipes L→R (determinate) and lands GREEN.
// Returns [track, fill]; add `label`+`done` for a "✓ done" that pops on completion.
export function loadingBar({ x, y, w = 420, h = 6, start = 0, fillDur = 1.5, color = T.greenBright,
  settle = T.green, label, done = true } = {}) {
  // The fill is DRIVEN, not entered. It used to ride `anim:'wipe'` with `enterDur: fillDur`, which
  // put the whole fill inside the entrance envelope — so the bar spent the entire 1.5s fading up from
  // transparent while it wiped, and the determinate fill this block exists to show read as a haze.
  // `--p` is independent of the enter/exit fade: the bar arrives instantly, then FILLS.
  const life = fillDur + (done ? 1.2 : 0.4);
  const out = [
    rect({ x, y, w, h, radius: h / 2, bg: T.surface, start, duration: life }),
    rect({ x, y, w, h, radius: h / 2, bg: settle, start, duration: life,
      anim: 'fade', enterDur: 0.15, ...fillRight({ delay: 0, dur: fillDur }) }),
  ];
  if (label) out.push(text({ text: label, x, y: y + 18, font: 'mono', size: 18, color: T.sub, start, duration: fillDur + 1.2 }));
  // right-aligned by LAYOUT, not by guessing the string's width: `x + w - 70` was a guess at "✓ done"
  // in 18px mono, so any other label, size or font drifted off the bar's end.
  if (done) out.push({ type: 'group', x, y: y - 34, w, layout: 'row', justify: 'flex-end',
    start: r2(start + fillDur), duration: 1.0, anim: 'rise', enterDur: 0.3,
    children: [text({ text: '✓ done', font: 'mono', size: 18, weight: 600, color: T.green })] });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// deploySuccess — a CI pipeline that cascades queued→building→deploying→live, then a success card
// with a green check, live URL, and "Ready in Xs". The canonical "a click had a consequence" payoff.
// `title`/`note`/`steps` are PROPS. They used to be constants, which meant every caller shipped the
// words "Deployed to production" and — worse — "Ready in 1.2s", an invented statistic baked into the
// factory. This repo's own rule is that an unbacked number is worse than no number, so `note` now
// defaults to nothing: a timing claim only appears when a caller can stand behind it.
//
// `active` is the index of the step currently RUNNING; everything before it has finished and
// everything after it is still queued. It exists because the glyph condition was a tautology
// (`done || i === steps.length - 1`, where `done` was `i < steps.length - 1`), so every step rendered
// ✓ from the first frame and the pipeline cascade this block exists to show was unreachable. The
// default is "all done", which is exactly what the broken condition produced, so existing callers see
// no change and a caller that wants the cascade can finally ask for it.
export function deploySuccess({ x, y, w = 620, url = 'app.vawe.dev', title = 'Deployed to production',
  note = null, steps = ['Building', 'Deploying', 'Live'], active = null, start = 0, rowGap = 52 } = {}) {
  const out = [];
  const STEP = 0.55;                              // one step's turn at the front of the pipeline
  const end = r2(start + steps.length * STEP + 6);
  steps.forEach((label, i) => {
    const t = r2(start + i * STEP);               // when step i STARTS running
    const done = r2(t + STEP);                    // when it completes and the next one takes over
    if (active != null) {
      // A caller that names the running step is asking for a FROZEN pipeline (a still of one moment),
      // so the cascade does not run and every row is drawn in its state at that moment.
      const lead = Math.min(active, steps.length - 1);
      out.push(text({ text: i < active ? '✓' : i === active ? '•' : '·', x, y: y + i * rowGap, font: 'mono',
        size: 24, weight: 700, color: i <= active ? T.green : T.dim, start: t, duration: 6, anim: 'rise', enterDur: 0.3 }));
      out.push(text({ text: label, x: x + 44, y: y + i * rowGap, font: 'mono', size: 22,
        color: i === lead ? T.ink : T.sub, start: t, duration: 6 }));
      return;
    }
    // THE CASCADE RUNS. Each step is three short-lived layers — queued `·`, running `•`, finished `✓`
    // — whose windows tile the block's life, so the glyph a frame shows is a pure function of t and
    // the pipeline visibly advances instead of rendering pre-completed. A glyph is one layer per
    // STATE rather than one layer that changes, because a layer's text is fixed at build time and
    // the frame loop is not allowed to step from a previous frame.
    const glyph = (txt, color, from, life, anim) => life > 0.01 && text({ text: txt, x, y: y + i * rowGap,
      font: 'mono', size: 24, weight: 700, color, start: r2(from), duration: r2(life), anim, enterDur: 0.18, exitDur: 0.12 });
    out.push(...[
      glyph('·', T.dim, start, r2(t - start), 'fade'),
      glyph('•', T.green, t, STEP, 'pop'),
      glyph('✓', T.green, done, r2(end - done), 'pop'),
    ].filter(Boolean));
    // the label dims until its step is reached, then it is the row the eye is on
    out.push(text({ text: label, x: x + 44, y: y + i * rowGap, font: 'mono', size: 22, color: T.sub,
      start, duration: r2(t - start + 0.01), anim: 'fade', enterDur: 0.2, exitDur: 0 }));
    out.push(text({ text: label, x: x + 44, y: y + i * rowGap, font: 'mono', size: 22, color: T.ink,
      start: t, duration: r2(end - t), anim: 'fade', enterDur: 0.2 }));
  });
  // success card
  const cy = y + steps.length * rowGap + 30;
  out.push({
    type: 'group', x, y: cy, w, layout: 'row', items: 'center', gap: 16, pad: 22,
    ...cardChrome({ border: `1px solid ${T.greenSoft}` }),
    start: r2(start + steps.length * STEP), duration: 6, enterDur: 0.45, anim: 'pop',
    children: [
      { type: 'group', bg: T.green, radius: 100, pad: '8px 12px', children: [text({ text: '✓', size: 22, weight: 700, color: '#fff' })] },
      { type: 'group', layout: 'column', gap: 4, items: 'flex-start', children: [
        text({ text: title, size: 22, weight: 700, color: T.ink }),
        text({ text: url, font: 'mono', size: 18, color: T.green }),
      ] },
      ...(note ? [{ type: 'group', grow: 1, layout: 'row', justify: 'flex-end', children: [
        text({ text: note, font: 'mono', size: 18, color: T.dim }),
      ] }] : []),
    ],
  });
  return out;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// statBig — scale-contrast stat: a huge animated number + a tiny label. `to` counts up.
export function statBig({ x, y, to = 0, from = 0, unit = '', label, size = 150, color = T.ink,
  start = 0, dur = 4 } = {}) {
  // THE NUMBER COUNTS UP and the label is already there to receive it. The layer only fades in: a
  // stat that also slides has two motions competing for the one thing you are meant to read.
  return [
    { type: 'count', x, y, from, to, unit, font: 'sans', size, weight: 700, color, ls: '-0.03em',
      countStart: 0.15, countDur: 1.4, ease: 'easeOutExpo', start, duration: dur, anim: 'fade', enterDur: 0.25 },
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
// `amount` is a prop because it is the only figure on the card and it reaches every caller. It was
// baked, so every video that used this block published the same invented number (MISTAKES #67).
export function stripeCard({ x, y, w = 380, amount = '', start = 0, dur = 4 } = {}) {
  const bars = [38, 52, 44, 66, 58, 80, 72];
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 18, pad: 26,
    bg: T.card, radius: 12, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [
      text({ text: 'Net volume', size: 18, color: T.stripeGrey, font: 'mono' }),
      text({ text: (amount || ''), size: 44, weight: 700, color: T.stripeNavy, ls: '-0.02em' }),
      { type: 'group', layout: 'row', items: 'flex-end', gap: 8, h: 70, children:
        bars.map((b) => box({ w: 26, h: b, radius: 4, bg: T.blurple })) },
      { type: 'group', bg: T.blurple, radius: 6, pad: '14px 0', layout: 'row', justify: 'center',
        children: [text({ text: (amount ? `Pay ${amount}` : 'Pay'), size: 18, weight: 600, color: '#fff' })] },
    ],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// The chart card's furniture, named ONCE. Every plot area and bar width is derived from these, so a
// chart cannot disagree with its own padding the way `w - 48` on `padding:22` did.
const CHART_PAD = 22;     // the card's inset, all four sides
const CHART_GAP = 14;     // between bars
const CHART_GAP_Y = 8;    // between a bar and its captions
const CHART_ROW = 18;     // a caption row's font size, which is what it costs in height

// barChart — labeled bars with values. `data` = [{label, value}]. Scales to the max.
export function barChart({ x, y, w = 560, h = 260, data = [], color = SERIES[0], start = 0, dur = 4 } = {}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  // The plot height is what is LEFT after the card's own furniture: its pad, plus the value caption
  // above each bar and the label below it with their gaps. It used to be `h - 90`, a guess that went
  // NEGATIVE below h ≈ 90 and inverted every bar.
  const plot = Math.max(0, h - 2 * CHART_PAD - 2 * (CHART_ROW + CHART_GAP_Y));
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
  const html = htmlCard({ w, pad: CHART_PAD, body: () =>
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:${CHART_GAP}px;height:${rowH}px">`
    + data.map(col).join('') + '</div>' });
  return [{ type: 'html', x, y, w, html, start, duration: dur, ...sweep({ dur: 0.9 }) }];
}

// diff — a code diff card. `lines` = [{sign:'+'|'-'|' ', text}] with add/del colouring.
export function diff({ x, y, w = 620, lines = [], start = 0, dur = 4 } = {}) {
  const col = { '+': T.green, '-': T.down, ' ': T.sub };
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 6, pad: 26,
    ...cardChrome(), start, duration: dur, enterDur: 0.5, exitDur: 0.35,
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
export function notification({ x, y, w = 460, title, message = '', body, desc = '', icon = null, accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  title = title ?? message; body = body ?? desc;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-start', gap: 14, pad: 20,
    // a notification ARRIVES FROM THE EDGE and leaves the way it came — the short, correct entrance
    // for a chip. Nothing inside it should perform; it is one small statement.
    ...cardChrome({ elevation: 2, anim: 'slide-right' }), out: 'slide-right',
    start, duration: dur, enterDur: 0.4, exitDur: 0.3, children: [
      box({ w: 12, h: 12, radius: 100, bg: accent }),
      { type: 'group', layout: 'column', gap: 6, items: 'flex-start', grow: 1, children: [
        text({ text: title, size: 22, weight: 700, color: T.ink }),
        body && text({ text: body, size: 18, color: T.sub }),
      ].filter(Boolean) },
    ] }];
}

// kpiRow — a row of stat cells (value + label). Scale contrast without a card grid.
export function kpiRow({ x, y, items = [], gap = 80, start = 0, dur = 4 } = {}) {
  // THE FIGURES COUNT UP, cell by cell across the row. An item that gives a numeric `to` becomes a
  // `count` layer and runs; one that gives a formatted string `value` (`$2.4M`, `42ms` — shapes the
  // count layer cannot render) lands as text, so a caller opts into the counting by giving a number
  // rather than by rewriting the row.
  const figure = (it, beat) => (it.to != null
    ? { type: 'count', from: it.from ?? 0, to: it.to, unit: it.unit || '', font: 'sans', size: 64, weight: 700,
        color: T.ink, ls: '-0.02em', countStart: 0.15, countDur: 1.1, ease: 'easeOutExpo', ...beat }
    : text({ text: String(it.value), size: 64, weight: 700, color: T.ink, ls: '-0.02em', ...beat }));
  return [{ type: 'group', x, y, layout: 'row', items: 'flex-start', gap, start, duration: dur, anim: 'fade', enterDur: 0.25, children:
    items.map((it, i) => {
      const beat = stagger(i, { step: 0.14, delay: 0.15, enterDur: 0.35 });
      return { type: 'group', layout: 'column', items: 'flex-start', gap: 4, children: [
        figure(it, beat),
        text({ text: it.label, size: 18, color: T.dim, font: 'mono', ...beat }),
      ] };
    }) }];
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

// comparison — two columns (e.g. Before / After, Others / Vawe). Rows are simple strings.
export function comparison({ x, y, w = 900, leftTitle = 'Others', rightTitle = 'Vawe', left = [], right = [], start = 0, dur = 4 } = {}) {
  const colW = (w - 40) / 2;
  const col = (title, items, accent) => ({ type: 'group', w: colW, layout: 'column', items: 'flex-start', gap: 14, pad: 24,
    ...cardChrome(), children: [
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

// pricingCard — plan · price · feature ticks · CTA. highlight = the featured plan (accent border + CTA).
// `price` defaults to nothing. A DEFAULT price is a figure published by every caller who forgets to
// set one, which is the same defect as deploySuccess's baked "Ready in 1.2s".
export function pricingCard({ x, y, w = 360, plan = 'Pro', price = '', period = '/mo', features = [], cta = 'Start free', highlight = false, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 16, pad: 28,
    bg: T.card, radius: R.soft, border: highlight ? `1.5px solid ${T.accent}` : HAIR, elevation: highlight ? 2 : 1,
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

// profileCard — avatar (image or initials) · name · role. For testimonials / team / "who said it".
// One of the five identity blocks. They all speak the SAME surface now: {name, handle?, sub?, avatar,
// initials}, with each block's old prop name kept as an alias — a shared vocabulary is worth nothing
// if adopting it breaks the callers (MISTAKES #67). `role` is this block's word for `sub`.
export function profileCard({ x, y, w = 360, name = '', sub = '', role = '', avatar = '', initials = '', start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: 22,
    ...cardChrome(), start, duration: dur, enterDur: 0.45, exitDur: 0.3, children: [
      avatarEl({ avatar, initials, name, size: 56 }),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 4, children: [
        text({ text: name, size: 22, weight: 700, color: T.ink }), text({ text: sub || role, size: 18, color: T.sub })] },
    ] }];
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 2 families — dev blocks + device/UI chrome.

// fileTree — an indented file/folder list; `active` highlights the focused row.
export function fileTree({ x, y, w = 360, items = [], start = 0, dur = 4 } = {}) {
  // THE TREE EXPANDS: rows arrive top-down, each sliding in from its own indent. The highlight moved
  // off the row wrapper and onto the row's own text leaf, because the wrapper is a nested group and
  // the engine never registers one — the lit row would have been lit from the first frame while its
  // label was still arriving.
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 2, pad: 20,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: items.map((it, i) => ({ type: 'group', layout: 'row', items: 'center', gap: 8,
      children: [
        box({ w: (it.depth || 0) * 22, h: 18 }),
        text({ text: (it.type === 'dir' ? '▾ ' : '· ') + it.name, font: 'mono', size: 19, pad: '6px 10px',
          ...(it.active ? { bg: T.accentSoft, radius: 8 } : {}),
          weight: it.active ? 600 : 400, color: it.active ? T.accentInk : (it.type === 'dir' ? T.ink : T.sub),
          ...stagger(i, { step: 0.11, delay: 0.2, anim: 'slide-left', enterDur: 0.3 }) }),
      ] })) }];
}

// logLines — a log stream with optional timestamp + level colour. dark = terminal surface.
export function logLines({ x, y, w = 620, lines = [], dark = true, start = 0, dur = 4 } = {}) {
  const bg = dark ? T.stripeNavy : T.card;
  // Two palettes, because one set of level colours cannot clear 4.5:1 on both a near-black card and a
  // white one. Measured against their own surface: light info 5.46:1, light warn 5.93:1, dark stamp
  // 6.00:1. The file already proved it knows how to do this — CODE_THEMES records a measured 4.68:1
  // minimum — and nothing else got the same treatment (MISTAKES #71).
  const lc = dark
    ? { info: '#8898AA', ok: T.greenBright, warn: '#F6A417', error: '#FF6B6B' }
    : { info: '#5A6B7F', ok: '#1F6B3A', warn: '#8A5A00', error: '#B02A37' };
  const base = dark ? '#E8ECF1' : T.ink;
  // A LOG STREAMS: lines land one after another, fast and even, the way output actually arrives.
  const beat = (i) => stagger(i, { step: 0.13, delay: 0.15, anim: 'fade', enterDur: 0.18 });
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 6, pad: 24,
    bg, radius: R.tight, ...(dark ? {} : { border: HAIR, elevation: 1 }), start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.3,
    children: lines.map((ln, i) => ({ type: 'group', layout: 'row', items: 'baseline', gap: 12, children: [
      ln.t && text({ text: ln.t, font: 'mono', size: 16, color: dark ? '#8FA3BA' : T.dim, ...beat(i) }),
      text({ text: (ln.level ? `[${ln.level}] ` : '') + ln.text, font: 'mono', size: 19, color: lc[ln.level] || base, ...beat(i) }),
    ].filter(Boolean) })) }];
}

// commitRow — a git history list (hash · message · author · time), hairline-divided.
export function commitRow({ x, y, w = 620, commits = [], start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 0, pad: 0,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    // HISTORY LANDS COMMIT BY COMMIT. Each commit's three leaves share one delay so the row arrives
    // as a unit (the row wrapper itself is a nested group, which the engine never registers).
    children: commits.flatMap((c, i) => {
      const beat = stagger(i, { step: 0.18, delay: 0.2, anim: 'slide-left', enterDur: 0.32 });
      return [
        i > 0 && box({ h: 1, bg: T.hair }),
        { type: 'group', layout: 'row', items: 'center', gap: 14, pad: '16px 22px', children: [
          text({ text: c.hash, font: 'mono', size: 17, weight: 600, color: T.accent, ...beat }),
          { type: 'group', grow: 1, layout: 'column', items: 'flex-start', gap: 2, children: [
            text({ text: c.msg, size: 19, weight: 500, color: T.ink, ...beat }),
            text({ text: `${c.author} · ${c.time}`, font: 'mono', size: 15, color: T.dim, ...beat }),
          ] },
        ] },
      ].filter(Boolean);
    }) }];
}

// phoneFrame — a phone shell (dark bezel, dynamic-island notch, light screen). Draw content on top.
// `children` is the SCREEN. Without it the block was a bezel around an empty card, so any app content
// had to be absolutely placed over it from the scene using coordinates derived by hand from the pad —
// arithmetic that broke silently the moment w or h changed. `status` draws the clock/indicator row,
// without which the frame reads as a black rectangle rather than a phone in use.
export function phoneFrame({ x, y, w = 300, h = 620, children = [], status = true, time = '9:41',
  start = 0, dur = 4 } = {}) {
  // the notch is a PROPORTION of the device, not a fixed 116px — at the catalog's w:230 that constant
  // covered more than half the screen. 0.39 / 0.087 of w reproduce the shipped look at w:300.
  const screen = [box({ w: Math.round(w * 0.39), h: Math.round(w * 0.087), radius: 100, bg: '#0A0A0A' })];
  if (status) screen.push({ type: 'group', w: w - 44, layout: 'row', items: 'center', justify: 'space-between', pad: '6px 4px 0',
    children: [text({ text: time, size: 14, weight: 600, color: T.ink }),
               text({ text: '▮▮▮', size: 12, color: T.dim })] });
  if (children.length) screen.push({ type: 'group', grow: 1, w: w - 44, layout: 'column', items: 'stretch', gap: 10, pad: '10px 0 0', children });
  return [{ type: 'group', x, y, w, h, layout: 'column', items: 'stretch', gap: 0, pad: 10,
    bg: '#0A0A0A', radius: 44, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.35,
    children: [{ type: 'group', grow: 1, bg: T.card, radius: 34, layout: 'column', items: 'center', pad: 12,
      children: screen }] }];
}

// tabBar — a segmented control; `active` is the selected index (lifted, lit card).
export function tabBar({ x, y, w = 520, tabs = [], active = 0, start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'stretch', gap: 6, pad: 6,
    bg: T.surface, radius: R.tight, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    children: tabs.map((t, i) => ({ type: 'group', grow: 1, layout: 'row', justify: 'center', items: 'center', pad: '10px 0',
      ...(i === active ? { bg: T.card, radius: 8, elevation: 1 } : {}),
      children: [text({ text: t, size: 18, weight: i === active ? 600 : 500, color: i === active ? T.ink : T.sub })] })) }];
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 3 families — lists & structure.

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
export function stepFlow({ x, y, w = 720, steps = [], active = 0, start = 0, dur = 4 } = {}) {
  // THE TRACK LIGHTS UP LEFT TO RIGHT, one step at a time: the numeral lands in its ring, then the
  // step's name, then the next one — so the progress reads as travelled rather than declared. The
  // rings are scaffolding and stay; the numeral and the label are LEAVES, which is what the engine
  // registers with the clip driver (a nested group child is built and then never timed).
  const children = [];
  steps.forEach((s, i) => {
    const state = i < active ? 'done' : i === active ? 'now' : 'todo';
    const dotBg = state === 'todo' ? T.surface : T.accent;
    children.push({ type: 'group', layout: 'column', items: 'center', gap: 10, children: [
      box({ w: 44, h: 44, radius: 100, bg: dotBg, ...(state === 'now' ? { border: `3px solid ${T.accentSoft}` } : {}),
        layout: 'row', justify: 'center', items: 'center', children: [
          text({ text: state === 'done' ? '✓' : String(i + 1), size: 20, weight: 700, color: state === 'todo' ? T.dim : '#fff',
            ...stagger(i, { step: 0.32, delay: 0.2, anim: 'pop', enterDur: 0.26 }) })] }),
      text({ text: s, size: 18, weight: state === 'todo' ? 500 : 600, color: state === 'todo' ? T.sub : T.ink,
        ...stagger(i, { step: 0.32, delay: 0.3, enterDur: 0.3 }) }),
    ] });
    if (i < steps.length - 1) children.push({ type: 'group', grow: 1, layout: 'column', items: 'stretch', children: [box({ h: 21 }), box({ h: 2, radius: 1, bg: i < active ? T.accent : T.hair })] });
  });
  return [{ type: 'group', x, y, w, layout: 'row', items: 'flex-start', gap: 14, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35, children }];
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

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 4 families — social & messaging.

// chatBubble — a message thread; `me:true` bubbles right in accent, others left in a hairline card.
export function chatBubble({ x, y, w = 480, messages = [], start = 0, dur = 4 } = {}) {
  // BUBBLES ARRIVE IN SEQUENCE, each from its own side — a conversation happening, not a transcript
  // appearing. The bubble is a LEAF carrying its own chrome: the row wrapper that used to hold it is
  // a nested group, and a nested group is built but never registered with the clip driver, so the
  // per-message `start` this block used to set was accepted and silently ignored on all four bubbles.
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 10, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    children: messages.map((m, i) => ({ type: 'group', layout: 'row', justify: m.me ? 'flex-end' : 'flex-start', children: [
      text({ text: m.text, size: 20, weight: 500, color: m.me ? '#fff' : T.ink,
        bg: m.me ? T.accent : T.card, ...(m.me ? {} : { border: HAIR, elevation: 1 }), radius: R.soft, pad: '12px 18px',
        ...stagger(i, { step: 0.42, delay: 0.2, anim: m.me ? 'slide-right' : 'slide-left', enterDur: 0.35 }) })] })) }];
}

// tweetCard — a post card: avatar · name · @handle · body · repost/like counts.
export function tweetCard({ x, y, w = 480, name = '', handle = '', text: body = '', avatar = '', initials = '', likes = '', reposts = '', start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 14, pad: 22,
    ...cardChrome({ radius: R.soft }), start, duration: dur, enterDur: 0.5, exitDur: 0.35, children: [
      { type: 'group', layout: 'row', items: 'center', gap: 12, children: [avatarEl({ avatar, initials, name, size: 48 }),
        { type: 'group', layout: 'column', items: 'flex-start', gap: 1, children: [
          text({ text: name, size: 20, weight: 700, color: T.ink }), text({ text: '@' + handle, font: 'mono', size: 16, color: T.dim })] }] },
      text({ text: body, size: 21, weight: 400, color: T.ink }),
      { type: 'group', layout: 'row', gap: 28, items: 'center', children: [
        text({ text: '↻ ' + reposts, font: 'mono', size: 16, color: T.dim }),
        text({ text: '♥ ' + likes, font: 'mono', size: 16, color: T.dim })] },
    ] }];
}

// avatarStack — overlapping avatar circles (initials or images) + an optional "+N" overflow.
export function avatarStack({ x, y, avatars = [], extra = 0, size = 48, start = 0, dur = 4 } = {}) {
  // THE AVATARS LAND ONE AFTER ANOTHER, each dropping onto the edge of the last — a team assembling.
  // These are TOP-LEVEL layers, so the stagger is a real `start` (0.07s apart was fast enough to read
  // as one block arriving; 0.14 with a `pop` reads as individual people).
  const step = size * 0.65; const out = [];
  avatars.forEach((a, i) => {
    const common = { x: r2(x + i * step), y, w: size, h: size, radius: 100, border: `2px solid ${T.card}`, start: r2(start + i * 0.14), duration: r2(dur - i * 0.14), anim: 'pop', enterDur: 0.3 };
    const av = typeof a === 'string' ? { avatar: a } : { avatar: a.avatar, initials: a.initials, name: a.name, bg: a.color || T.accentSoft };
    out.push({ ...avatarEl({ size, ...av }), ...common });
  });
  if (extra > 0) out.push({ type: 'group', x: r2(x + avatars.length * step), y, w: size, h: size, radius: 100, bg: T.surface, border: `2px solid ${T.card}`,
    layout: 'row', justify: 'center', items: 'center', start: r2(start + avatars.length * 0.14), duration: r2(dur - avatars.length * 0.14), anim: 'pop', enterDur: 0.3, children: [text({ text: '+' + extra, size: Math.round(size * 0.3), weight: 600, color: T.sub })] });
  return out;
}

// toast — a dark snackbar: status dot · message · action link. (notification is the light card variant.)
// The alert family (notification · toast · callout · banner) now shares ONE vocabulary: `title` and
// `body`. Each block had invented its own words for the same two slots, so an author relearned the
// block every time. Old names stay as aliases — a shared vocabulary is worth nothing if adopting it
// breaks every caller (MISTAKES #67).
export function toast({ x, y, w = 420, title, message = '', body = '', action = '', icon = '✓', accent = TOKENS.green, start = 0, dur = 4 } = {}) {
  message = title ?? message;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 14, pad: '16px 20px',
    bg: '#0A0A0A', radius: R.tight, elevation: 2, start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3, children: [
      box({ w: 22, h: 22, radius: 100, bg: accent, layout: 'row', justify: 'center', items: 'center', children: [text({ text: icon, size: 14, weight: 700, color: '#fff' })] }),
      text({ text: message, size: 19, weight: 500, color: '#F5F5F3', grow: 1 }),
      action && text({ text: action, size: 18, weight: 600, color: T.accentInk }),
    ].filter(Boolean) }];
}

// reactionBar — a row of reaction count-pills; `mine:true` highlights the one you picked.
export function reactionBar({ x, y, reactions = [], start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, layout: 'row', gap: 10, items: 'center', start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    children: reactions.map((r) => ({ type: 'group', layout: 'row', items: 'center', gap: 7, pad: '7px 14px', radius: 100,
      bg: r.mine ? T.accentSoft : T.surface, ...(r.mine ? { border: `1px solid ${T.accent}` } : {}),
      children: [text({ text: r.emoji, size: 19 }), text({ text: String(r.count), size: 17, weight: 600, color: r.mine ? T.accentInk : T.sub, font: 'mono' })] })) }];
}


// ── social SHAPES — player card, creator lower third, follow card. Shapes only, on purpose: no
//    platform logos, wordmarks, or lockups (licence rule). The silhouette carries the recognition.

// nowPlaying — a music-player card: square artwork (accent gradient + initials if no art), title over
// artist, a progress bar, transport glyphs. `progress` is 0..1 of the track.
export function nowPlaying({ x, y, w = 380, name = '', track = '', sub = '', artist = '', avatar = '', art = '',
  initials = '', progress = 0.4, start = 0, dur = 4 } = {}) {
  const p = Math.max(0, Math.min(1, progress));
  const PAD = 22, innerW = w - 2 * PAD;
  const title = name || track, by = sub || artist;
  // The artwork square is the same identity element as the other blocks' avatars, only square.
  const artEl = avatarEl({ avatar: avatar || art, initials, name: title, size: 72, radius: 12,
    // SOLID on purpose. A gradient is a background-IMAGE: the computed background-color under the
    // initials stays transparent, so any contrast probe (ours included) falls through to the white
    // card behind and reads white-on-white — unmeasurable even when it looks fine. A var() colour
    // appended to the shorthand does not survive to a computed background-color either (tried).
    bg: 'color-mix(in srgb, var(--accent) 88%, var(--text))', color: '#fff' });
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 16, pad: PAD,
    ...cardChrome({ radius: R.soft, elevation: 2 }), start, duration: dur, enterDur: 0.5, exitDur: 0.35,
    children: [
      { type: 'group', layout: 'row', items: 'center', gap: 16, children: [
        artEl,
        { type: 'group', layout: 'column', items: 'flex-start', gap: 3, grow: 1, children: [
          text({ text: title, size: 22, weight: 700, color: T.ink }),
          text({ text: by, size: 17, color: T.sub }),
        ] },
      ] },
      // the fill is a box INSIDE the track box (rect isn't allowed as a group child); its width IS the progress
      { type: 'group', layout: 'column', items: 'flex-start', gap: 0, start: r2(start + 0.15), duration: dur, anim: 'wipe', enterDur: 0.4,
        children: [box({ w: innerW, h: 5, radius: 100, bg: T.surface, layout: 'row', justify: 'flex-start', items: 'stretch',
          children: [box({ w: r2(innerW * p), h: 5, radius: 100, bg: T.accent })] })] },
      { type: 'group', layout: 'row', justify: 'center', items: 'center', gap: 34,
        start: r2(start + 0.25), duration: dur, anim: 'rise', enterDur: 0.35, children: [
          text({ text: '◁', size: 22, weight: 600, color: T.sub }),
          box({ w: 48, h: 48, radius: 100, bg: T.ink, layout: 'row', justify: 'center', items: 'center',
            children: [text({ text: '▷', size: 20, weight: 700, color: T.paper })] }),
          text({ text: '▷|', size: 22, weight: 600, color: T.sub }),
        ] },
    ],
  }];
}

// videoLowerThird — creator identifier: avatar circle · channel over subscriber count · a CTA chip.
// The chip sits in var(--down): the theme's danger/red token keeps it in the subscribe-red family on
// every brand without hard-coding a platform hex (shape, not lockup — the licence rule again).
export function videoLowerThird({ x, y, w = 520, name = '', channel = '', sub = '', subscribers = '',
  avatar = '', initials = '', cta = 'Subscribe', start = 0, dur = 4 } = {}) {
  const who = name || channel, count = sub || subscribers;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: '16px 20px',
    ...cardChrome({ elevation: 2 }), start, duration: dur, anim: 'wipe', enterDur: 0.45, exitDur: 0.3,
    children: [
      avatarEl({ avatar, initials, name: who, size: 56 }),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 3, grow: 1, children: [
        text({ text: who, size: 22, weight: 700, color: T.ink }),
        count && text({ text: count, font: 'mono', size: 16, color: T.dim }),
      ].filter(Boolean) },
      { type: 'group', bg: T.down, radius: 100, pad: '10px 22px', start: r2(start + 0.2), duration: dur, anim: 'rise', enterDur: 0.35,
        children: [text({ text: cta, size: 18, weight: 700, color: '#fff' })] },
    ] }];
}

// followCard — name over @handle, a pill CTA on the right. The pill is ink-on-paper inverted (not
// accent) so it reads as THE button of the card, not another tinted chip.
// It speaks the shared identity surface, so it can now carry an avatar. It only draws one when the
// caller supplies `avatar` or `initials`: a card designed without a portrait must not sprout an
// invented circle just because it learned the vocabulary.
export function followCard({ x, y, w = 360, handle = '', name = '', avatar = '', initials = '', cta = 'Follow', start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 14, pad: '18px 22px',
    ...cardChrome({ radius: R.soft }), start, duration: dur, enterDur: 0.45, exitDur: 0.3,
    children: [
      ...(avatar || initials ? [avatarEl({ avatar, initials, name, size: 44 })] : []),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 2, grow: 1, children: [
        text({ text: name, size: 21, weight: 700, color: T.ink }),
        text({ text: '@' + handle, font: 'mono', size: 16, color: T.dim }),
      ] },
      { type: 'group', bg: T.ink, radius: 100, pad: '9px 20px', start: r2(start + 0.18), duration: dur, anim: 'rise', enterDur: 0.3,
        children: [text({ text: cta, size: 17, weight: 700, color: T.paper })] },
    ] }];
}

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 5 families — brand & motion. Arcs/rings use html+SVG; spinner wraps the lottie runtime.

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

// ─────────────────────────────────────────────────────────────────────────────
// lowerThird — the name/role identifier broadcast has used for sixty years: who is speaking, while
// they speak. ONE component, twelve chromes, because what differs between a BILD front page and a
// Vercel keynote caption is not the layout (name over role, lower left) but the material around it.
// `variant` picks the material; everything else is shared.
//
// The spine every variant honours:
//   name — the identifier (a person, a product, a place). Always the dominant element.
//   role — the qualifier underneath. Always subordinate: smaller, dimmer, or set in mono. Optional.
//   x, y — TOP-LEVEL of the block, as everywhere in this file. y ~820 sits it in the lower third of a
//          1080 stage; the caller places it, because "lower third" is a convention, not a rule.
//
// Motion: `wipe` for anything with a plate (a plate arrives edge-first, which is what reads as
// broadcast rather than as a fading label), `rise` for bare text. Every variant is pure in n: entrances
// are driven by driveClips off data-start, and the two kinetic presets used here (`underline`,
// `riseClip`) are pure functions of unit progress. Nothing steps from a previous frame.
const LT_FONT = { name: { size: 46, weight: 700, tracking: '-0.02em' }, role: { size: 21, weight: 500 } };

export function lowerThird({ x = 120, y = 820, name = '', role = '', variant = 'cleanBar',
  accent = TOKENS.accent, start = 0, dur = 4 } = {}) {
  const N = LT_FONT.name, R = LT_FONT.role;
  const s2 = r2(start + 0.12);                      // the role trails the name by ~2 frames: reading order
  const wipeIn = { start, duration: dur, anim: 'wipe', enterDur: 0.42, exitDur: 0.28 };
  const riseIn = { start, duration: dur, anim: 'rise', enterDur: 0.45, exitDur: 0.3 };
  // Two group defaults actively fight a lower third, so every variant states its intent:
  //   radius ?? 16    — a "hard block" silently arrives with soft corners (util.js chipBox).
  //   items ?? center — a column CENTRES its children, so the role floats under the name instead of
  //                     sharing its left edge. A lower third is a left-aligned form; the edge IS the design.
  const HARD = { radius: 0 };
  const stackL = { layout: 'column', items: 'flex-start' };

  switch (variant) {
    // A plate the colour of the page, hairline-bordered. The quiet one: use it when the frame is busy
    // and the identifier must not compete with it.
    case 'cleanBar':
      return [{ type: 'group', x, y, ...stackL, gap: 3, pad: '16px 24px', bg: T.card,
        radius: 6, border: HAIR, ...wipeIn, children: [
          text({ text: name, ...N, color: T.ink }),
          role && text({ text: role, ...R, color: T.dim }),
        ].filter(Boolean) }];

    // Name reversed out of a solid accent block, role in an ink block beneath. The default broadcast
    // read: two hard rectangles, no radius, no apology.
    case 'boldBlock':
      return [
        { type: 'group', x, y, pad: '12px 20px', bg: accent, ...HARD, ...wipeIn,
          children: [text({ text: name, ...N, color: '#fff' })] },
        role ? { type: 'group', x, y: r2(y + N.size + 24), pad: '9px 20px', bg: T.ink, ...HARD,
          ...wipeIn, start: s2, children: [text({ text: role, ...R, color: '#fff' })] } : null,
      ].filter(Boolean);

    // BILD: the German tabloid front page. Caps, reversed out of accent, tracked TIGHT and set huge.
    // The loudest variant in the set, and it is supposed to be.
    case 'bild':
      return [
        { type: 'group', x, y, pad: '10px 18px', bg: accent, ...HARD, ...wipeIn, enterDur: 0.3, children: [
          text({ text: String(name).toUpperCase(), size: 62, weight: 800, tracking: '-0.03em', color: '#fff' }),
        ] },
        role ? { type: 'group', x: r2(x + 14), y: r2(y + 84), pad: '8px 16px', bg: T.ink, ...HARD, ...wipeIn,
          start: s2, enterDur: 0.3, children: [
            text({ text: String(role).toUpperCase(), size: 22, weight: 700, tracking: '0.04em', color: '#fff' }),
          ] } : null,
      ].filter(Boolean);

    // A dark elevated card. The only variant that works over bright photography without a scrim.
    case 'darkCard':
      return [{ type: 'group', x, y, ...stackL, gap: 4, pad: '18px 26px', bg: 'rgba(16,18,24,0.92)',
        radius: 12, ...riseIn, children: [
          text({ text: name, ...N, color: '#fff' }),
          role && text({ text: role, ...R, color: 'rgba(255,255,255,0.72)' }),
        ].filter(Boolean) }];

    // A thick accent rule, then the text. No plate at all: the rule alone carries the identity, so it
    // needs a calm backdrop to land on. (A rule beside text is broadcast grammar, not a card stripe.)
    case 'sideRule':
      return [{ type: 'group', x, y, layout: 'row', items: 'center', gap: 18, ...riseIn, children: [
        box({ w: 6, h: r2(N.size + (role ? R.size + 14 : 0)), bg: accent }),
        { type: 'group', ...stackL, gap: 3, children: [
          text({ text: name, ...N, color: T.ink }),
          role && text({ text: role, ...R, color: T.dim }),
        ].filter(Boolean) },
      ] }];

    // Kicker above, name below: the role becomes a small mono label that INTRODUCES the name rather
    // than trailing it. Reverses the usual hierarchy without weakening it.
    case 'kickerName':
      return [{ type: 'group', x, y, ...stackL, gap: 7, ...riseIn, children: [
        // 18 matches the schema's floor for a top-level text layer. As a group child it would be
        // allowed to go smaller, and a kicker is exactly the element that wants to: don't. Carry the
        // emphasis with tracking and colour, which cost no legibility.
        role && text({ text: String(role).toUpperCase(), font: 'mono', size: 18, weight: 600,
          tracking: '0.12em', color: accent }),
        text({ text: name, size: 54, weight: 700, tracking: '-0.025em', color: T.ink }),
      ].filter(Boolean) }];

    // The underline DRAWS under the name (kinetic `underline`, pure in unit progress). Bare text, so
    // it inherits whatever the frame is doing behind it.
    case 'accentUnderline':
      return [
        text({ text: name, x, y, ...N, color: T.ink, split: 'word', preset: 'underline',
          presetOpts: { color: accent }, each: 0.5, stagger: 0.06, start, duration: dur, exitDur: 0.3 }),
        role && text({ text: role, x, y: r2(y + N.size + 16), ...R, color: T.dim,
          start: r2(start + 0.35), duration: r2(dur - 0.35), anim: 'fade', enterDur: 0.4, exitDur: 0.3 }),
      ].filter(Boolean);

    // The name rises out of a clipped baseline, one word at a time (kinetic `riseClip`) — type moving
    // the way it reads. The most "designed" entrance in the set; give it a slow beat.
    case 'maskReveal':
      return [
        text({ text: name, x, y, ...N, color: T.ink, split: 'word', preset: 'riseClip',
          each: 0.55, stagger: 0.08, start, duration: dur, exitDur: 0.3 }),
        role && text({ text: role, x, y: r2(y + N.size + 16), ...R, color: T.dim,
          start: r2(start + 0.4), duration: r2(dur - 0.4), anim: 'fade', enterDur: 0.4, exitDur: 0.3 }),
      ].filter(Boolean);

    // Soft accent pill, fully rounded. The friendly one: product tours, not news.
    case 'softPill':
      return [{ type: 'group', x, y, layout: 'row', items: 'center', gap: 12, pad: '12px 26px',
        bg: T.accentSoft, radius: 100, ...riseIn, children: [
          text({ text: name, size: 34, weight: 700, tracking: '-0.02em', color: T.accentInk }),
          role && text({ text: role, size: 19, weight: 500, color: T.accentInk }),
        ].filter(Boolean) }];

    // Two blocks, offset and staggered in time so the eye reads name → role as one gesture, not two
    // labels. The offset is what stops it being `boldBlock` with extra steps.
    case 'colourBlock':
      return [
        { type: 'group', x, y, pad: '13px 22px', bg: T.ink, ...HARD, ...wipeIn,
          children: [text({ text: name, ...N, color: '#fff' })] },
        role ? { type: 'group', x: r2(x + 40), y: r2(y + N.size + 26), pad: '8px 18px', bg: accent, ...HARD,
          ...wipeIn, start: s2, children: [text({ text: role, ...R, weight: 600, color: '#fff' })] } : null,
      ].filter(Boolean);

    // A plate over a deliberately shorter accent bar. Reads as a mark rather than a plate.
    case 'stackBars':
      return [
        { type: 'group', x, y, pad: '12px 24px', bg: T.card, border: HAIR, ...HARD, ...wipeIn,
          children: [text({ text: name, ...N, color: T.ink })] },
        role ? { type: 'group', x, y: r2(y + N.size + 26), pad: '7px 24px', bg: accent, ...HARD, ...wipeIn,
          start: s2, enterDur: 0.32, children: [text({ text: role, ...R, weight: 600, color: '#fff' })] } : null,
      ].filter(Boolean);

    // A ticker bar: accent chip, then the line. `role` is the chip (LIVE / BREAKING / 09:41), which is
    // why this variant reads the props in the opposite order to every other one.
    case 'newsTicker':
      return [{ type: 'group', x, y, layout: 'row', items: 'stretch', gap: 0, bg: T.ink, radius: 4,
        ...wipeIn, children: [
          { type: 'group', bg: accent, pad: '12px 18px', items: 'center',
            children: [text({ text: String(role || 'LIVE').toUpperCase(), font: 'mono', size: 18,
              weight: 700, tracking: '0.08em', color: '#fff' })] },
          { type: 'group', pad: '12px 22px', items: 'center',
            children: [text({ text: name, size: 30, weight: 600, color: '#fff' })] },
        ] }];

    default:
      throw new Error(`lowerThird: unknown variant "${variant}" — see blocks/catalog.mjs for the twelve`);
  }
}

// spinner — a looping Lottie animation (deterministic seek). Any bodymovin .json; defaults to the sample.
export function spinner({ x, y, size = 90, src = '/assets/lottie/spin.json', label = '', start = 0, dur = 4 } = {}) {
  const out = [{ type: 'lottie', src, x, y, w: size, h: size, loop: true, start, duration: dur }];
  if (label) out.push(text({ text: label, x, y: r2(y + size + 12), font: 'mono', size: 18, color: T.dim, start: r2(start + 0.2), duration: dur }));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// The REGISTRY. Bare family factories + namespaced `family.variant` entries from the manifest.
// ─────────────────────────────────────────────────────────────────────────────
// searchEngine — a search page in the two states that actually tell a story:
//   variant 'home'    → the wordmark over an empty pill, the query TYPING into it
//   variant 'results' → a compact bar carrying the query, ranked results, a cursor clicking one
//
// The wordmark is a PROP, never baked in. A block that hardcodes one company's mark is a picture of
// that company, not a reusable piece: pass `brand` for a plain wordmark, or `word` for a per-letter
// coloured one. Every layer is top-level and absolutely placed rather than flowed inside a group,
// because the query is a `typing` layer and its per-character key clicks are derived by the engine
// from (start, cps, text) — keeping it top-level keeps that timing readable at the call site.
const SEARCH_LINK = 'color-mix(in srgb, var(--accent) 82%, var(--text))';

export function searchEngine({ x = 0, y = 0, w = 900, variant = 'home',
  brand = 'Search', word = null, logo = null, logoW = 272, logoH = 92,
  query = '', results = [], markAlign = 'center',
  cps = 11, keyCue, keyGain, clickIndex = 0, cursorStart, start = 0, dur = 5 } = {}) {
  const out = [];
  const BAR_H = 60, PAD = 22, ICON = 24;

  // THE MARK. `logo` (a real SVG) is the preferred form and wins: a wordmark re-typed in whatever face
  // the theme happens to ship is a lookalike, not the brand — the authoring rules call this out
  // directly ("recreating a brand asset from memory is off-brand by definition"). `word` (per-letter
  // colours) and `brand` (plain text) remain for marks you do not have a file for.
  // `logotype` applies the WCAG 1.4.3 contrast exemption; centring is the engine's job, never arithmetic.
  const mark = (cy, h) => {
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
  };

  // THE BAR. One pill, a magnifier inset at the leading edge, a mic at the trailing edge — the real
  // furniture of a search field. The icons are Lucide (ISC) with the stroke baked, because an SVG
  // loaded as an <img> has no currentColor to inherit and would render invisible.
  const bar = (bx, by, bw, st, d, textSize) => {
    const r = [];
    r.push(rect({ x: bx, y: by, w: bw, h: BAR_H, radius: BAR_H / 2, bg: T.card, border: HAIR, elevation: 1,
      start: st, duration: d, anim: 'rise', enterDur: 0.45, exitDur: 0.3 }));
    r.push({ type: 'image', src: '/assets/icons/ui/search.svg', w: ICON, h: ICON,
      x: bx + PAD, y: by + (BAR_H - ICON) / 2,
      start: r2(st + 0.06), duration: r2(d - 0.06), anim: 'fade', enterDur: 0.4, exitDur: 0.25 });
    r.push({ type: 'image', src: '/assets/icons/ui/mic.svg', w: ICON - 2, h: ICON - 2,
      x: bx + bw - PAD - (ICON - 2), y: by + (BAR_H - ICON + 2) / 2,
      start: r2(st + 0.1), duration: r2(d - 0.1), anim: 'fade', enterDur: 0.4, exitDur: 0.25 });
    return r;
  };
  const TEXT_X = (bx) => bx + PAD + ICON + 16;   // clears the magnifier
  const TEXT_W = (bw) => bw - (PAD + ICON + 16) - (PAD + ICON + 12);

  if (variant === 'home') {
    const barY = y + 180;
    out.push(mark(y, 92));
    out.push(...bar(x, barY, w, r2(start + 0.35), r2(dur - 0.35), 26));
    // the query types INTO the bar, clear of the magnifier. `typing` is chars/sec and the engine
    // derives one key click per revealed character from (start, cps, text).
    // keyCue/keyGain are the SOUND of this block, so they must reach the typing layer the engine
    // derives key clicks from. They were accepted at the call site and dropped here, which is the
    // silent-substitution class again: the JSON said 0.055 and the render stayed at the default.
    out.push(text({ text: query, x: TEXT_X(x), y: barY + 16, w: TEXT_W(w), size: 26, color: T.ink,
      typing: cps, ...(keyCue ? { keyCue } : {}), ...(keyGain != null ? { keyGain } : {}),
      start: r2(start + 0.75), duration: r2(dur - 0.75), anim: 'fade', enterDur: 0.12, exitDur: 0.25 }));
    return out;
  }

  // ---- results: the mark shrinks to the top-left and the bar sits beside it, as it really does ----
  const MARK_H = 34, GAP = 40;
  const markW = Math.round(MARK_H * (logoW / logoH));
  const barX = x + (logo || word ? markW + GAP : 150);
  const barW = Math.min(w - (barX - x), 720);
  out.push({ ...mark(y + 12, MARK_H), x, logotype: true });
  out.push(...bar(barX, y, barW, start, dur, 22));
  out.push(text({ text: query, x: TEXT_X(barX), y: y + 15, w: TEXT_W(barW), size: 22, color: T.ink,
    start: r2(start + 0.08), duration: r2(dur - 0.08), anim: 'fade', enterDur: 0.3, exitDur: 0.25 }));

  const ROW = 128, top = y + 124, RX = barX;
  results.forEach((res, i) => {
    const ry = top + i * ROW;
    const st = r2(start + 0.3 + i * 0.1);       // staggered: motion order is reading order
    const d = r2(start + dur - st);
    out.push(text({ text: res.url, x: RX, y: ry, w: w - (RX - x), size: 19, font: 'mono', color: T.dim,
      start: st, duration: d, anim: 'slide-left', out: 'slide-right', enterDur: 0.4, exitDur: 0.25 }));
    out.push(text({ text: res.title, x: RX, y: ry + 26, w: w - (RX - x), size: 32, weight: 500, color: SEARCH_LINK,
      start: r2(st + 0.04), duration: r2(d - 0.04), anim: 'slide-left', out: 'slide-right', enterDur: 0.4, exitDur: 0.25 }));
    if (res.snippet) out.push(text({ text: res.snippet, x: RX, y: ry + 72, w: w - (RX - x), size: 19, color: T.sub,
      start: r2(st + 0.08), duration: r2(d - 0.08), anim: 'fade', enterDur: 0.45, exitDur: 0.25 }));
  });

  // the pointer travels to the chosen result and clicks it. A click needs a consequence, so callers
  // cut on `cursorStart + 0.9` — the block places the click, the scene pays it off.
  if (results.length && clickIndex != null) {
    const cs = cursorStart != null ? cursorStart : r2(start + dur - 1.5);
    out.push({ type: 'cursor', size: 36, start: cs, duration: r2(start + dur - cs),
      path: [{ t: 0, x: x + w - 120, y: top + results.length * ROW },
             { t: 0.75, x: RX + 60, y: top + clickIndex * ROW + 40 }],
      clicks: [0.9] });
  }
  return out;
}

// A namespaced entry resolves to its family with the manifest's preset props merged UNDER call-time
// opts, so a scene can still override anything. Adding a variant = a row in blocks/catalog.mjs (+ a
// `variant` branch in the family). See docs/BLOCKS.md (auto-generated) and docs/TASTE.md.
import { CATALOG } from './catalog.mjs';

// The app-surface family lives in blocks/app.mjs (same kit, same contract); the registry is here, so
// it is imported and merged rather than duplicated.
import * as APP from './app.mjs';
export * from './app.mjs';

const FACTORIES = { ...APP, card, codeBlock, terminal, loadingBar, deploySuccess, browserFrame, pillRow, statBig,
  colorCycle, stripeCard, barChart, diff, quote, notification, kpiRow, callout, comparison, captions,
  lineChart, donutChart, stackedBar, pricingCard, statCard, profileCard,
  fileTree, logLines, commitRow, phoneFrame, tabBar,
  checklist, table, timeline, stepFlow, kanban,
  chatBubble, tweetCard, avatarStack, toast, reactionBar, nowPlaying, videoLowerThird, followCard,
  logoWall, badge, gauge, progressRing, banner, spinner, lowerThird, searchEngine };

export const BLOCKS = { ...FACTORIES };
import * as INTERACT from './interact.mjs'; export * from './interact.mjs'; Object.assign(FACTORIES, INTERACT); Object.assign(BLOCKS, INTERACT); // interaction family: pointer · tap · keyboard · press (blocks/interact.mjs)
for (const e of CATALOG) {
  if (!e.name.includes('.')) continue; // bare names use the raw factory (identical behaviour)
  const fam = FACTORIES[e.family];
  if (fam) BLOCKS[e.name] = (opts = {}) => fam({ ...(e.props || {}), ...opts });
}

// APP SURFACES — the app-content families (feed/list/settings/profile/onboarding/empty) live in
// blocks/app.mjs and are re-exported here so `blocks/index.mjs` stays the single import point.
export * from './app.mjs';
