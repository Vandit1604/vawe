// blocks/terminal-html.mjs: a terminal window as ONE hand-authored `html` layer.
//
// WHY HTML AND NOT LAYER PRIMITIVES: everything here is a CONTINUOUS surface, not a stack of boxes.
// The window body is a real CSS gradient (box background, not the text-only `gradient` prop a layer
// has), lit with an inset `box-shadow` a layer cannot declare at all. The command line is ONE string
// clipped by `clip-path` so its per-token syntax colour stays intact while it types in, a layer would
// need one child per token AND a way to grow each child's width off the clock, and a group child's
// size is written as inline px by the engine (`blocks/charts.mjs:44`), so it cannot be a `calc()`.
// The caret is a `mod()`/`round()` blink against the engine's own `--t` clock: genuinely periodic
// motion, which the engine's one-shot `vars` ramp cannot express (it eases from a to b once, never
// loops), so this is a place html can do something a layer's timeline literally cannot.
//
// MOTION: every number that moves is either the engine's `vars` track (named channels: `--type` for
// the char count, `--done` as a typing→idle step, `--o<i>`/`--bar<i>` per output row, all driven the
// same way `sweep()` drives `--p` in blocks/charts.mjs) or the always-on `--t` scene clock the engine
// writes on every `html` layer (core/layers/html.js), used only for the caret's and the scanlines'
// genuinely periodic drift. Nothing here is wall-clock or random: same props, same frame, same pixels.
import { TOKENS, HAIR, r2, toneColor, R } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Code';

const T = TOKENS;

const PAD = 26, TITLE_H = 40, FONT = 21, LINE_H = 27, GAP_PO = 20, ROW_GAP = 13, BAR_H = 52;
const P_EASE = 'easeOutCubic';

// A command token is a bare string (painted T.ink) or {text,color} for syntax colour, same oneOf
// shape codeBlock's `lines` already uses, so an author who knows one knows the other.
const normTokens = (command) => (Array.isArray(command) ? command : [command || ''])
  .map((t) => (typeof t === 'string' ? { text: t, color: T.ink } : { text: t.text || '', color: t.color || T.ink }));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rowHeight = (row) => row.bar ? BAR_H : row.diff ? row.diff.length * LINE_H : LINE_H;

// terminalHtml: a terminal window that types a command, then answers with staggered output.
// `output` rows: {text} plain, {text,tone} a coloured status line, {bar:{label,pct}} a fill that is a
// genuine fraction of the clock, {diff:[{sign,text}]} +/- lines. `command` is a string or a token list.
export function terminalHtml({ x, y, w = 760, title = 'zsh · deploy', command = '', cps = 22,
  output = [], start = 0, dur = 6.5 } = {}) {
  const tokens = normTokens(command);
  const full = tokens.map((t) => t.text).join('');
  const len = full.length || 1;
  const typeDur = r2(len / cps);
  const settle = 0.4;

  // Layout is computed once, in JS, from the real row heights, the same discipline
  // `cardInsetY`/`barWidth` enforce for the native charts: geometry never disagrees with its own
  // content because nothing restates it by hand.
  // Measured from the BODY wrapper's own top (which sits at TITLE_H+1 in the card), not the card's.
  const bodyTop = PAD;
  const outputTop = bodyTop + LINE_H + GAP_PO;
  let cursorY = outputTop, rowY = [];
  output.forEach((row) => { rowY.push(cursorY); cursorY += rowHeight(row) + ROW_GAP; });
  const bodyH = Math.round(cursorY - (output.length ? ROW_GAP : 0) + PAD);
  const h = bodyH + TITLE_H + 1;

  // Per-row entrance timing: each row's own start, in a group child's `stagger()` idiom, but computed
  // as a `vars` channel (a full HTML card is one layer, so there is no group child to hang `delay` on).
  const rowStart = (i) => r2(typeDur + settle + i * 0.32);

  const vars = { '--type': [0, len], '--done': [0, 1] };
  const varsDelay = { '--type': 0, '--done': typeDur + 0.02 };
  const varsDur = { '--type': typeDur, '--done': 0.04 };
  const varsEase = { '--type': 'linear', '--done': 'linear' };
  output.forEach((row, i) => {
    vars[`--o${i}`] = [0, 1]; varsDelay[`--o${i}`] = rowStart(i); varsDur[`--o${i}`] = 0.5; varsEase[`--o${i}`] = P_EASE;
    if (row.bar) {
      const to = (row.bar.pct ?? 100) / 100;
      vars[`--bar${i}`] = [0, to]; varsDelay[`--bar${i}`] = rowStart(i) + 0.1; varsDur[`--bar${i}`] = 1.1; varsEase[`--bar${i}`] = P_EASE;
    }
  });

  // ---- the command line: one clip-path reveal over real per-token colour, so typing never disturbs
  // syntax highlighting the way a per-character DOM rebuild would. `round(down, var(--type), 1)`
  // snaps to whole characters. No fractional glyph half-drawn mid-frame.
  const spans = tokens.map((t) => `<span style="color:${t.color}">${esc(t.text)}</span>`).join('');
  const promptLine = `<div style="position:relative;height:${LINE_H}px;display:flex;align-items:center;font:600 ${FONT}px var(--font-mono);white-space:pre">`
    + `<span style="color:${T.accent};margin-right:10px">$</span>`
    + `<span style="position:relative;display:inline-block">`
    + `<span style="clip-path:inset(0 calc(100% - round(down, var(--type,0), 1) * 1ch) 0 0)">${spans}</span>`
    // the caret: solid while typing, then genuinely BLINKS off the raw --t clock once idle, the one
    // periodic motion a one-shot `vars` ramp cannot give, and the reason this reaches for --t at all.
    + `<span style="position:absolute;top:2px;left:calc(round(down, var(--type,0), 1) * 1ch);width:0.55ch;height:${FONT + 2}px;`
    + `background:${T.accent};opacity:calc((1 - var(--done,0)) + var(--done,0) * (round(down, mod(var(--t,0), 0.9), 0.45) * 2))"></span>`
    + `</span></div>`;

  // ---- output rows
  const outputHtml = output.map((row, i) => {
    const o = `var(--o${i},0)`;
    const wrap = (inner, extraH) => `<div style="position:absolute;left:${PAD}px;top:${rowY[i]}px;width:${w - 2 * PAD}px;height:${extraH}px;`
      + `opacity:${o};transform:translateY(calc((1 - ${o}) * 7px))">${inner}</div>`;
    if (row.bar) {
      const p = `var(--bar${i},0)`;
      return wrap(
        `<div style="font:500 15px var(--font-mono);color:${T.dim};margin-bottom:8px">${esc(row.bar.label || '')}</div>`
        + `<div style="height:8px;border-radius:100px;background:color-mix(in srgb, var(--text) 12%, transparent);overflow:hidden">`
        + `<div style="height:100%;width:calc(${p} * 100%);border-radius:100px;`
        + `background:linear-gradient(90deg, ${T.accent}, color-mix(in srgb, ${T.accent} 55%, var(--up)))"></div></div>`,
        BAR_H);
    }
    if (row.diff) {
      const lines = row.diff.map((d) => {
        const c = d.sign === '+' ? T.green : d.sign === '-' ? T.down : T.dim;
        return `<div style="height:${LINE_H}px;display:flex;align-items:center;font:500 17px var(--font-mono);color:${c}">`
          + `<span style="width:1.4ch;display:inline-block">${d.sign}</span>${esc(d.text)}</div>`;
      }).join('');
      return wrap(lines, row.diff.length * LINE_H);
    }
    const color = row.tone ? toneColor(row.tone) : T.sub;
    return wrap(`<div style="height:${LINE_H}px;display:flex;align-items:center;font:500 17px var(--font-mono);color:${color}">${esc(row.text || '')}</div>`, LINE_H);
  }).join('');

  const dot = (tone) => `<div style="width:11px;height:11px;border-radius:100px;background:${toneColor(tone)}"></div>`;

  // ---- chrome: a real gradient body (lit from the top), an inset+outset box-shadow for depth, and a
  // slow-drifting scanline field over `--t`. Three things a layer's flat fill/border/elevation cannot
  // reach at once, which is the whole argument for spending this beat in html.
  const html = `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${R.tight}px;`
    + `border:${HAIR};overflow:hidden;`
    + `background:linear-gradient(180deg, color-mix(in srgb, var(--text) 5%, var(--card)) 0%, var(--card) 46%);`
    + `box-shadow:0 26px 60px -24px color-mix(in srgb, var(--text) 40%, transparent), `
    + `inset 0 1px 0 color-mix(in srgb, var(--text) 14%, transparent);`
    + `font-variant-ligatures:none">`
    + `<div style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:0.5;`
    + `background-image:repeating-linear-gradient(180deg, color-mix(in srgb, var(--text) 7%, transparent) 0 1px, transparent 1px 3px);`
    + `transform:translateY(calc(mod(var(--t,0), 2) * -30px))"></div>`
    + `<div style="position:relative;height:${TITLE_H}px;display:flex;align-items:center;gap:8px;padding:0 16px;`
    + `border-bottom:${HAIR};background:color-mix(in srgb, var(--text) 3%, transparent)">`
    + dot('danger') + dot('warn') + dot('ok')
    + `<div style="flex:1;text-align:center;font:600 15px var(--font-mono);letter-spacing:0.04em;color:${T.sub};margin-right:39px">${esc(title)}</div>`
    + `</div>`
    // absolute + explicit height (rather than `mask` on an auto-height wrapper): a masked box with
    // no height of its own masks its overflowing absolutely-positioned children to NOTHING, since the
    // mask region is the (degenerate) border box, not whatever paints outside it.
    + `<div style="position:absolute;left:0;top:${TITLE_H + 1}px;right:0;height:${bodyH}px;`
    + `mask-image:linear-gradient(180deg, transparent 0, black 14px)">`
    + `<div style="position:absolute;left:${PAD}px;top:${bodyTop}px">${promptLine}</div>`
    + outputHtml
    + `</div></div>`;

  return [{ type: 'html', x, y, w, h, html, start, duration: dur, anim: 'fade', enterDur: 0.3, exitDur: 0.35,
    vars, varsDelay, varsDur, varsEase }];
}

export const TERMINAL_HTML_SCHEMAS = {
  terminalHtml: {
    w: { kind: 'int', min: 400, max: 1920, def: 760 },
    title: { kind: 'str', max: 60, def: 'zsh · deploy' },
    // A STRING OR A LIST OF TOKENS, because normTokens() accepts both and the factory really defaults
    // to ''. The rule declared `list` with `def: []` and block-schema caught the mismatch: a dial that
    // hides one of the two shapes the engine answers to is a second, quieter contract.
    command: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'list', of: { kind: 'oneOf', of: [
        { kind: 'str', max: 200 },
        { kind: 'row', fields: { text: { kind: 'str', max: 200 }, color: { kind: 'color' } } },
      ] } },
    ], def: '' },
    cps: { kind: 'num', min: 1, max: 120, def: 22 },
    output: { kind: 'list', of: { kind: 'row', fields: {
      text: { kind: 'str', max: 200 },
      tone: { kind: 'enum', of: ['ok', 'danger', 'accent', 'dim'] },
      bar: { kind: 'group', fields: { label: { kind: 'str', max: 60 }, pct: { kind: 'int', min: 0, max: 100, def: 100 } } },
      diff: { kind: 'list', of: { kind: 'row', fields: {
        sign: { kind: 'enum', of: ['+', '-'] }, text: { kind: 'str', max: 200 },
      } } },
    } }, def: [] },
  },
};
