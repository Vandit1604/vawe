// blocks/terminal-layers.mjs: a terminal window built entirely from scene-layer primitives (no
// `type: 'html'` anywhere). Every row below is its OWN TOP-LEVEL layer with its own start/duration/
// anim, deliberately flat rather than one big nested container. A group child's timing derives from
// its TOP ancestor's start, not its immediate parent's (`core/layers/util.js` addGroupChild always
// threads the original `rootL` through recursion), so a deeply nested row cannot carry an offset of
// its own without fighting that rule. Top-level siblings sidestep it entirely and are exactly the
// shape this medium is being asked to show off: many discrete, independently timed, individually
// measurable objects, each one a real box `make check GATE=audit` can see and grade on its own.
import { TOKENS, HAIR, r2, text, rect, R, toneColor, fillRight } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Code';

const T = TOKENS;

const DOT_TONES = ['danger', 'warn', 'ok'];   // chrome, not content, theme tones, not literal RGB

// terminalPro: window chrome (dots + session title) · a command that TYPES itself in with a native
// blinking/holding caret · a status line that EXITS the instant its own success line ENTERS · a live
// `count` layer counting a build percentage in lockstep with its own fill bar · a diff block where
// every +/- row is its own staggered, individually-coloured chip · a draw-on spinner that resolves
// into a settled, breathing checkmark. `dur` auto-extends to fit the sequence unless overridden.
// Every downstream beat is derived off the one before it, so the sequence never drifts out of order
// regardless of how long the command takes to type or how many diff rows there are.
function terminalProTiming({ command, cps, diff, dur }) {
  // everything below the prompt derives from the typed length; settleTail is how long the resolved
  // tick stays readable once the sequence lands.
  const t0 = r2(0.35 + command.length / cps), installDur = 1.0, status2Start = r2(t0 + installDur),
    barStart = r2(status2Start + 0.4), barDur = 1.1, diffStart = r2(barStart + barDur + 0.35),
    diffRowStep = 0.22, diffEnd = r2(diffStart + diff.length * diffRowStep + 0.3),
    spinStart = r2(diffEnd + 0.25), spinDur = 0.8, tickStart = r2(spinStart + spinDur), settleTail = 1.6,
    D = dur ?? r2(tickStart + settleTail);
  return { t0, installDur, status2Start, barStart, barDur, diffStart, diffRowStep, spinStart, spinDur, tickStart, D,
    runsTo: (from) => Math.max(0.2, D - from) };  // a row lives from its own start to the block's end
}

function terminalProLayout({ x, y, w, diff, barH, pad }) {
  const rowH = { prompt: 30, status: 26, bar: 34, diffRow: 26, tick: 26 }, gap = 18,
    contentX = x + pad, contentW = w - pad * 2;
  const promptY = y + barH + pad;
  const statusY = promptY + rowH.prompt + gap;
  const barY = statusY + rowH.status + gap;
  const diffY0 = barY + rowH.bar + gap;
  const tickY = diffY0 + diff.length * (rowH.diffRow + 8) - 8 + gap;
  return { h: tickY + rowH.tick - y + pad, contentX, contentW, promptY, statusY, barY, diffY0, tickY };
}

// the card, its title-bar divider, three traffic-light dots (theme tones, not literal RGB), a session
// title. Four independently measurable boxes instead of one opaque `html` panel.
function terminalProChrome({ x, y, w, h, barH, title, start, D }) {
  return [
    rect({ x, y, w, h, bg: T.card, border: HAIR, radius: R.tight, shadow: true, start, duration: D, anim: 'fade', enterDur: 0.3 }),
    rect({ x, y: y + barH, w, h: 1, bg: T.hair, start, duration: D, anim: 'fade', enterDur: 0.2 }),
    ...DOT_TONES.map((tone, i) =>
      rect({ x: x + 18 + i * 20, y: y + 16, w: 12, h: 12, radius: 100, bg: toneColor(tone), start, duration: D, anim: 'fade', enterDur: 0.2 })),
    text({ text: title, x: x + 90, y: y + 12, w: w - 180, align: 'center', font: 'mono', size: 18, color: T.dim, start, duration: D, anim: 'fade', enterDur: 0.2 }),
  ];
}

// native `typing` + `caret` + `caretHold`. The engine reveals the command char by char and keeps the
// caret blinking after it lands. An `html` block has to reconstruct that from a CSS steps() animation
// plus a manually-timed `calc(width)`; here it is two layer props.
function terminalProPrompt({ contentX, promptY, command, cps, start, D }) {
  return [{ type: 'group', x: contentX, y: promptY, layout: 'row', gap: 8, items: 'center',
    start, duration: D, anim: 'fade', enterDur: 0.15, children: [
      text({ text: '$', font: 'mono', size: 22, weight: 700, color: toneColor('ok') }),
      text({ text: command, font: 'mono', size: 22, color: T.ink, typing: cps, caret: true, caretHold: true }),
    ] }];
}

// "Installing…" occupies this line, then EXITS on its own clock while its replacement ENTERS in the
// same slot. Two independently scheduled layers, not one element with rewritten text.
function terminalProStatusSwap({ contentX, statusY, t0, installDur, status2Start, runsTo }) {
  return [
    text({ text: 'Installing dependencies…', x: contentX, y: statusY, font: 'mono', size: 19, color: T.sub,
      start: t0, duration: installDur, anim: 'fade', out: 'fade', exitDur: 0.2 }),
    text({ text: '✓ Dependencies installed', x: contentX, y: statusY, font: 'mono', size: 19, color: toneColor('ok'),
      start: status2Start, duration: runsTo(status2Start), anim: 'rise', enterDur: 0.22 }),
  ];
}

// a `count` layer ticking a real percentage in lockstep with its own fill bar: the counter and the
// fill share one window, so they read as ONE measurement rather than two coincidentally-timed FX.
function terminalProBuildBar({ contentX, contentW, barY, barStart, barDur, runsTo }) {
  return [
    text({ text: 'Building bundle', x: contentX, y: barY, font: 'mono', size: 18, color: T.dim,
      start: barStart, duration: runsTo(barStart), anim: 'fade', enterDur: 0.15 }),
    { type: 'count', x: contentX + contentW - 60, y: barY, w: 60, align: 'right', font: 'mono', size: 18, weight: 700,
      color: T.ink, from: 0, to: 100, unit: '%', countStart: 0, countDur: barDur,
      start: barStart, duration: runsTo(barStart), anim: 'fade', enterDur: 0.15 },
    rect({ x: contentX, y: barY + 24, w: contentW, h: 6, radius: 4, bg: T.surface,
      start: barStart, duration: runsTo(barStart), anim: 'fade', enterDur: 0.1 }),
    rect({ x: contentX, y: barY + 24, w: contentW, h: 6, radius: 4, bg: toneColor('ok'),
      start: barStart, duration: runsTo(barStart), anim: 'fade', enterDur: 0.1, ...fillRight({ delay: 0.05, dur: barDur }) }),
  ];
}

// every file is its OWN top-level row, staggered in on its own start, each +/- a real coloured chip
// (a box, not a coloured span). A line `make check GATE=audit` can measure on its own, which one opaque `html`
// panel covering the whole diff cannot be.
function terminalProDiffRows(diff, { contentX, diffY0, diffStart, diffRowStep, diffRowH, runsTo }) {
  return diff.map((f, i) => {
    const rs = r2(diffStart + i * diffRowStep);
    const ry = diffY0 + i * (diffRowH + 8);
    return { type: 'group', x: contentX, y: ry, layout: 'row', gap: 8, items: 'center',
      start: rs, duration: runsTo(rs), anim: 'slide-left', enterDur: 0.22, children: [
        text({ text: '+' + f.add, font: 'mono', size: 18, weight: 700, color: toneColor('ok'),
          bg: 'color-mix(in srgb, var(--up) 16%, transparent)', pad: '2px 8px', radius: 4 }),
        ...(f.del ? [text({ text: '-' + f.del, font: 'mono', size: 18, weight: 700, color: toneColor('danger'),
          bg: 'color-mix(in srgb, var(--down) 16%, transparent)', pad: '2px 8px', radius: 4 })] : []),
        text({ text: f.path, font: 'mono', size: 18, color: T.sub }),
      ] };
  });
}

// a draw-on arc strokes itself in over its own short life, then EXITS the instant a settled checkmark
// ENTERS in its place. A resolve, not a repaint. An idle keeps the final success line alive through
// its held middle instead of sitting dead once the motion stops. `drift`, not `breathe`: a scaling
// idle on TEXT re-rasterises every glyph each frame, so the edges crawl and it reads as a shimmer
// rather than as life, which core/validate.mjs now refuses (engine-doctrine/MISTAKES.md #432); a
// drift translates the whole run instead, the same intent without the artefact.
function terminalProSpinnerTick({ contentX, tickY, spinStart, spinDur, tickStart, success, runsTo }) {
  return [
    { type: 'svg', x: contentX, y: tickY, d: 'M 50 5 A 45 45 0 1 1 5 50', viewBox: '0 0 100 100', w: 20, h: 20,
      stroke: toneColor('ok'), strokeWidth: 10, fill: 'none',
      start: spinStart, duration: spinDur, draw: { dur: spinDur }, anim: 'fade', enterDur: 0.1 },
    { type: 'group', x: contentX, y: tickY, layout: 'row', gap: 8, items: 'center',
      start: tickStart, duration: runsTo(tickStart), anim: 'rise', enterDur: 0.25, idle: 'drift', children: [
        text({ text: '✓', font: 'mono', size: 20, weight: 800, color: toneColor('ok') }),
        text({ text: success, font: 'mono', size: 19, weight: 600, color: T.ink }),
      ] },
  ];
}

export function terminalPro({ x, y, w = 820, title = 'zsh · deploy', command = 'npm run deploy',
  diff = [{ path: 'src/api/routes.ts', add: 12, del: 3 }, { path: 'src/api/handler.ts', add: 4, del: 0 }],
  success = 'Deployed to production', start = 0, dur } = {}) {
  const cps = 18, barH = 44;
  const timing = terminalProTiming({ command, cps, diff, dur });
  const { D, t0, installDur, status2Start, barStart, barDur, diffStart, diffRowStep, spinStart, spinDur, tickStart, runsTo } = timing;
  const layout = terminalProLayout({ x, y, w, diff, barH, pad: 22 });
  const { h, contentX, contentW, promptY, statusY, barY, diffY0, tickY } = layout;

  return [
    ...terminalProChrome({ x, y, w, h, barH, title, start, D }),
    ...terminalProPrompt({ contentX, promptY, command, cps, start, D }),
    ...terminalProStatusSwap({ contentX, statusY, t0, installDur, status2Start, runsTo }),
    ...terminalProBuildBar({ contentX, contentW, barY, barStart, barDur, runsTo }),
    ...terminalProDiffRows(diff, { contentX, diffY0, diffStart, diffRowStep, diffRowH: 26, runsTo }),
    ...terminalProSpinnerTick({ contentX, tickY, spinStart, spinDur, tickStart, success, runsTo }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL_SCHEMAS. The option contract for this file's one factory, in the shape blocks/schema.mjs
// expects (imported and spread into SCHEMA there, same as every other family table).
export const TERMINAL_SCHEMAS = {
  terminalPro: {
    w: { kind: 'int', min: 400, max: 1920, def: 820 },
    title: { kind: 'str', max: 60, def: 'zsh · deploy' },
    command: { kind: 'str', max: 80, def: 'npm run deploy' },
    diff: { kind: 'list', of: { kind: 'row', fields: {
      path: { kind: 'str', max: 80 }, add: { kind: 'int', min: 0, max: 999 }, del: { kind: 'int', min: 0, max: 999 },
    } }, def: [{ path: 'src/api/routes.ts', add: 12, del: 3 }, { path: 'src/api/handler.ts', add: 4, del: 0 }] },
    success: { kind: 'str', max: 80, def: 'Deployed to production' },
    // Null lets the block derive it from the command length + diff count so the sequence never
    // gets cut short; a caller only sets this to force a specific runtime.
    dur: { kind: 'num', min: 2, max: 60 },
  },
};
