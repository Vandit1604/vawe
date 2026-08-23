// blocks/dev.mjs — extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, SERIES, seriesAt, HAIR, r2, text, rect, box, pill, onColor,
  R, cardChrome, htmlCard, cardInsetY, barWidth, toneColor, avatarEl,
  sweep, stagger, growUp, fillRight, stackWindows,
} from './kit.mjs';
const T = TOKENS;

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
  // dark mode's plate is the fixed T.stripeNavy (not a theme var), so its ink must be computed off
  // that same fixed literal via onColor, not a separately-guessed literal that can drift from it.
  const bg = P ? P.bg : (dark ? T.stripeNavy : T.card), fg = P ? P.fg : (dark ? onColor(T.stripeNavy) : T.ink);
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
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 8, pad: 32,
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
    type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 8, pad: 24,
    ...cardChrome({ radius: R.tight, anim: 'fade' }), start, duration: dur, enterDur: 0.25,
    children: [
      { type: 'group', layout: 'row', gap: 8, items: 'center', children: [
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
    type: 'group', x, y: cy, w, layout: 'row', items: 'center', gap: 16, pad: 24,
    ...cardChrome({ border: `1px solid ${T.greenSoft}` }),
    start: r2(start + steps.length * STEP), duration: 6, enterDur: 0.45, anim: 'pop',
    children: [
      { type: 'group', bg: T.green, radius: 100, pad: '8px 12px', children: [text({ text: '✓', size: 22, weight: 700, color: onColor(T.green) })] },
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

// diff — a code diff card. `lines` = [{sign:'+'|'-'|' ', text}] with add/del colouring.
export function diff({ x, y, w = 620, lines = [], start = 0, dur = 4 } = {}) {
  const col = { '+': T.green, '-': T.down, ' ': T.sub };
  return [{ type: 'group', x, y, w, layout: 'column', items: 'flex-start', gap: 6, pad: 24,
    ...cardChrome(), start, duration: dur, enterDur: 0.5, exitDur: 0.35,
    children: lines.map((ln) => text({ text: `${ln.sign} ${ln.text}`, font: 'mono', size: 22, weight: 400, color: col[ln.sign] || T.ink })) }];
}

// fileTree — an indented file/folder list; `active` highlights the focused row.
export function fileTree({ x, y, w = 360, items = [], start = 0, dur = 4 } = {}) {
  // THE TREE EXPANDS: rows arrive top-down, each sliding in from its own indent. The highlight moved
  // off the row wrapper and onto the row's own text leaf, because the wrapper is a nested group and
  // the engine never registers one — the lit row would have been lit from the first frame while its
  // label was still arriving.
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 2, pad: 16,
    ...cardChrome({ anim: 'fade' }), start, duration: dur, enterDur: 0.25, exitDur: 0.35,
    children: items.map((it, i) => ({ type: 'group', layout: 'row', items: 'center', gap: 8,
      children: [
        box({ w: (it.depth || 0) * 22, h: 18 }),
        text({ text: (it.type === 'dir' ? '▾ ' : '· ') + it.name, font: 'mono', size: 19, pad: '6px 8px',
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
        { type: 'group', layout: 'row', items: 'center', gap: 12, pad: '16px 24px', children: [
          text({ text: c.hash, font: 'mono', size: 17, weight: 600, color: T.accent, ...beat }),
          { type: 'group', grow: 1, layout: 'column', items: 'flex-start', gap: 2, children: [
            text({ text: c.msg, size: 19, weight: 500, color: T.ink, ...beat }),
            text({ text: `${c.author} · ${c.time}`, font: 'mono', size: 15, color: T.dim, ...beat }),
          ] },
        ] },
      ].filter(Boolean);
    }) }];
}

// spinner — a looping Lottie animation (deterministic seek). Any bodymovin .json; defaults to the sample.
export function spinner({ x, y, size = 90, src = '/assets/lottie/spin.json', label = '', start = 0, dur = 4 } = {}) {
  const out = [{ type: 'lottie', src, x, y, w: size, h: size, loop: true, start, duration: dur }];
  if (label) out.push(text({ text: label, x, y: r2(y + size + 12), font: 'mono', size: 18, color: T.dim, start: r2(start + 0.2), duration: dur }));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
export const DEV_SCHEMAS = {
  codeBlock: {
    w: { kind: 'int', min: 200, max: 1920, def: 640 },
    // A line is a bare string, or a string plus the colour to set it in.
    lines: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'row', fields: { text: { kind: 'str', max: 200 }, color: { kind: 'color' } } },
    ] }, def: [] },
    label: { kind: 'str', max: 60 },
    dark: { kind: 'bool', def: false },
    // Mono code. Below about 10px the glyphs stop resolving at 1080p; the card grows to fit above.
    size: { kind: 'int', min: 10, max: 80, def: 24 },
    // Read off CODE_THEMES itself, so a new palette cannot exist without the dial knowing it.
    // The factory throws on an unknown name, which is exactly what this enum states.
    theme: { kind: 'enum', of: Object.keys(CODE_THEMES) },
    anim: { kind: 'str', max: 24, def: 'fade' },
    enterDur: { kind: 'num', min: 0, max: 4, def: 0.25 },
  },

  terminal: {
    w: { kind: 'int', min: 200, max: 1920, def: 720 },
    command: { kind: 'str', max: 200 },
    output: { kind: 'list', of: { kind: 'str', max: 200 }, def: [] },
    // Characters per second. The output's start is DERIVED from command.length / cps, so a cps at or
    // below zero would divide the whole block's timing by nothing.
    cps: { kind: 'num', min: 1, max: 120, def: 18 },
  },

  loadingBar: {
    w: { kind: 'int', min: 60, max: 1920, def: 420 },
    // The radius is h / 2, so the track is always a capsule whatever the height.
    h: { kind: 'int', min: 2, max: 60, def: 6 },
    fillDur: { kind: 'num', min: 0.1, max: 20, def: 1.5 },
    settle: { kind: 'color', def: 'var(--up)' },
    label: { kind: 'str', max: 60 },
    done: { kind: 'bool', def: true },
  },

  deploySuccess: {
    w: { kind: 'int', min: 200, max: 1920, def: 620 },
    url: { kind: 'str', max: 80, def: 'app.vawe.dev' },
    title: { kind: 'str', max: 80, def: 'Deployed to production' },
    // Null draws no timing line at all. A claim only appears when a caller can stand behind it.
    note: { kind: 'str', max: 60, def: null },
    steps: { kind: 'list', of: { kind: 'str', max: 24 }, def: ['Building', 'Deploying', 'Live'] },
    // The index of the step currently RUNNING. Null runs the cascade instead of freezing one moment.
    active: { kind: 'int', min: 0, max: 20, def: null },
    // The pitch between step rows. The success card is placed at steps.length * rowGap + 30.
    rowGap: { kind: 'int', min: 24, max: 200, def: 52 },
  },

  diff: {
    w: { kind: 'int', min: 200, max: 1920, def: 620 },
    lines: { kind: 'list', of: { kind: 'row', fields: {
      // The sign picks the colour: added, removed, or context.
      sign: { kind: 'enum', of: ['+', '-', ' '] },
      text: { kind: 'str', max: 200 },
    } }, def: [] },
  },

  fileTree: {
    w: { kind: 'int', min: 160, max: 1080, def: 360 },
    items: { kind: 'list', of: { kind: 'row', fields: {
      name: { kind: 'str', max: 60 },
      type: { kind: 'enum', of: ['dir', 'file'] },
      // One depth step indents 22px, so the tree runs out of card width around depth 12 at w 360.
      depth: { kind: 'int', min: 0, max: 12 },
      active: { kind: 'bool' },
    } }, def: [] },
  },

  logLines: {
    w: { kind: 'int', min: 200, max: 1920, def: 620 },
    lines: { kind: 'list', of: { kind: 'row', fields: {
      t: { kind: 'str', max: 12 },
      // Each level has a measured colour on BOTH surfaces. An unknown level falls back to the body ink.
      level: { kind: 'enum', of: ['info', 'ok', 'warn', 'error'] },
      text: { kind: 'str', max: 200 },
    } }, def: [] },
    dark: { kind: 'bool', def: true },
  },

  commitRow: {
    w: { kind: 'int', min: 200, max: 1920, def: 620 },
    commits: { kind: 'list', of: { kind: 'row', fields: {
      hash: { kind: 'str', max: 40 },
      msg: { kind: 'str', max: 120 },
      author: { kind: 'str', max: 40 },
      time: { kind: 'str', max: 20 },
    } }, def: [] },
  },

  spinner: {
    // The lottie is square: `size` is its width AND its height.
    size: { kind: 'int', min: 24, max: 600, def: 90 },
    src: { kind: 'str', max: 200, def: '/assets/lottie/spin.json' },
    label: { kind: 'str', max: 60, def: '' },
  },
};
