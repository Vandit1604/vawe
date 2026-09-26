// blocks/codeanim.mjs: SIX WAYS TO MAKE CODE MOVE.
//
// The library already had excellent code CHROME (blocks/dev.mjs: codeBlock's 16 palettes, diff,
// logLines, fileTree, terminal). What it did not have was code that MOVES: codeBlock sits still and
// `diff` arrives whole. Nothing here adds a card style, a font or a seventeenth theme, every block
// borrows dev.mjs's own palette (see `palette()` below) so a codeTyping card and a codeBlock card are
// visibly the same family, and spends its whole surface area on motion.
//
// WHY HTML AND NOT LAYER PRIMITIVES: every effect here needs a number to move CONTINUOUSLY inside a
// text run. A character frontier, a scroll offset, a line's collapsing height, a token's column. A
// group child's geometry is written as inline px by the engine (blocks/charts.mjs:44), so it cannot be
// a calc(), and a text layer's glyphs are not addressable. This is the same argument
// blocks/terminal-html.mjs makes for the same medium, and it is the reason that file is the model here.
//
// MOTION LAW: CSS transition/animation are dead in this engine (core/sanitize-html.js refuses both at
// boot). Everything that moves below is one of exactly three engine-driven things:
//   * `vars`: named channels the engine ramps and seeks, per channel timing (core/tracks/vars.js).
//     Five of the six blocks use this, because a frontier / an offset / a morph parameter IS a number.
//   * `parts`: a CSS selector into this file's own markup; every matched element gets a seeked,
//     staggered entrance and (with `out: true`) its paired exit (core/parts.js). codeFlight is built
//     on it: N discrete cards arriving in order is exactly what it is for.
//   * `var(--t)`: the raw scene clock, used only for the caret blink, which is genuinely periodic and
//     therefore something a one-shot vars ramp cannot express.
// Nothing here reads Date or Math.random. Same props → same layers → same pixels.
import { TOKENS, HAIR, r2, R, E } from './kit.mjs';
import { CODE_THEMES } from './dev.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Code';

const T = TOKENS;

// ── THE SHARED SURFACE ───────────────────────────────────────────────────────────────────────────
const PAD = 26, TITLE_H = 50, FONT = 20, LINE_H = 30;
const P_EASE = 'easeOutCubic';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// palette(theme): dev.mjs's CODE_THEMES, read directly.
//
// This used to call codeBlock and harvest colours back off the native `children` it returned (the
// only way to reach a module-private palette without duplicating twelve theme tables here). codeBlock
// is now an `html` fragment with no `children` to harvest, so the honest fix named in that old comment
// (export CODE_THEMES from dev.mjs) is the one taken: one table, read by both files, chrome derived
// with the same isDark rule codeBlock itself applies.
export function palette(theme = 'midnight') {
  if (!(theme in CODE_THEMES)) throw new Error(`blocks/codeanim.mjs palette: unknown theme "${theme}". `
    + `Known: ${Object.keys(CODE_THEMES).join(', ')}`);
  const P = CODE_THEMES[theme];
  const isDark = !P.light;
  return {
    bg: P.bg, border: isDark ? '1px solid rgba(255,255,255,0.08)' : HAIR, elevation: isDark ? 0 : E.flat,
    label: P.label, syntax: P.syntax,
  };
}
// One line's colour: the palette's syntax ring, cycled by line index, the identical rule codeBlock
// uses, so the same lines pick up the same hues in a still card and a moving one.
const tok = (P, i) => P.syntax[i % P.syntax.length];
// LIFT A STATUS COLOUR ONTO A CODE THEME'S OWN PLATE. `--down` and `--up` are graded against the app
// theme's background, not against a code card's, so a red `-` line on #0B1F16 measures 2.2:1 and the
// audit is right to refuse it. The plate's polarity is already known: codeBlock gives light palettes an
// `elevation` and dark ones none, so the same harvested layer says which way to mix.
const isLight = (P) => !!P.elevation;
const ink = (P, c, amt = 62) => `color-mix(in srgb, ${c} ${amt}%, ${isLight(P) ? '#000' : '#fff'})`;
const lineText = (ln) => (typeof ln === 'string' ? ln : String(ln.text ?? ''));
const lineColor = (ln, P, i) => (typeof ln === 'string' ? tok(P, i) : (ln.color || tok(P, i)));

// The card shell. Light palettes carry dev.mjs's hairline + a soft drop; dark ones carry its inner
// border and nothing else, which is what makes the two families read as one.
function surface({ w, h, P, label = '', inner = '' }) {
  const lift = P.elevation ? 'box-shadow:0 22px 52px -22px color-mix(in srgb, var(--text) 34%, transparent);' : '';
  return `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${R.card}px;`
    + `background:${P.bg};border:${P.border || HAIR};overflow:hidden;${lift}font-variant-ligatures:none">`
    + (label ? `<div style="position:absolute;left:${PAD}px;top:${PAD - 6}px;font:600 16px var(--font-mono);`
      + `letter-spacing:0.05em;color:${P.label}">${esc(label)}</div>` : '')
    + inner + '</div>';
}
const topOf = (label) => (label ? TITLE_H : PAD);
const cardH = (n, label, extra = 0) => Math.round(topOf(label) + n * LINE_H + PAD + extra);

// A monospace row at a known line index. `left` is the content inset; nothing here is measured at
// render, so the geometry in the JSON is the geometry on the frame.
const rowStyle = (i, { top, color, extra = '' }) =>
  `position:absolute;left:${PAD}px;top:${top + i * LINE_H}px;height:${LINE_H}px;display:flex;align-items:center;`
  + `font:500 ${FONT}px var(--font-mono);white-space:pre;color:${color};${extra}`;

const htmlLayer = (o) => ({ type: 'html', anim: 'fade', enterDur: 0.3, exitDur: 0.35, ...o });

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1. codeTyping, LIVE CODING. One character frontier crosses the whole snippet and the caret rides
// it, wrapping from the end of one line to the start of the next.
//
// MOTION: one `vars` channel, `--type`, ramped linearly from 0 to the total character count. Each
// line clips itself to `clamp(0, --type - itsOffset, itsLength)` characters, so the reveal is a pure
// function of one number and every line's share of it is arithmetic, not a second tween. `round(down,
// …, 1)` snaps to whole characters so no glyph is ever caught half-drawn.
//
// WHY NOT `parts`: parts staggers a named entrance across ELEMENTS. A typing frontier is sub-element:
// it lives inside a text run, at character granularity, and the caret has to sit exactly on it. No
// selector can address the boundary between two characters.
// A CODE BLOCK WITH NO CODE IS NOT A BLOCK, IT IS AN EMPTY PLATE.
//
// Every factory here defaults its content to `[]`, and an empty list rendered a dark rounded bar with
// no text, no caret and no error. Found by cropping a frame, not by any gate. The catalog's demo
// content does NOT rescue it: `blocks/index.mjs` merges a catalog row's `props` only for a NAMESPACED
// name, so `{"type":"block","block":"codeTyping"}` reaches the raw factory with nothing in it while
// `make site X=catalog` and the site render the same name WITH the props and look perfect.
//
// So the refusal goes here, at the factory, where the emptiness is knowable. Silence is never the third
// option (CLAUDE.md); an author who forgot the content gets told which prop, not a black bar.
const needContent = (what, v, name) => {
  if (Array.isArray(v) ? v.length : v != null) return;
  throw new Error(`block "${name}": \`${what}\` is empty, so there is nothing to animate. `
    + `This block renders code IN MOTION; with no content it paints a bare plate and says nothing. `
    + `Pass \`${what}\`, or copy the demo content from this block's row in blocks/catalog.mjs.`);
};

// Each line's start offset in the stream; +1 per newline, so the caret pauses one beat at a line end.
function codeLineOffsets(lines) {
  const offs = []; let acc = 0;
  lines.forEach((ln) => { offs.push(acc); acc += lineText(ln).length + 1; });
  return { offs, total: Math.max(1, acc - 1) };
}

function codeTypingBody(lines, { P, top, offs }) {
  return lines.map((ln, i) => {
    const s = lineText(ln), len = s.length, off = offs[i];
    // visible characters on THIS line, as a number the whole row derives from
    const vis = `clamp(0, round(down, var(--type,0), 1) - ${off}, ${len})`;
    // the caret is on this line only while the frontier is inside it (two clamped steps, multiplied)
    const on = `clamp(0, (var(--type,0) - ${off} + 1) * 40, 1) * clamp(0, (${off + len} - var(--type,0) + 1) * 40, 1)`;
    // solid while typing, blinking off the raw clock once the whole snippet has landed
    const blink = `((1 - var(--done,0)) + var(--done,0) * (round(down, mod(var(--t,0), 0.9), 0.45) * 2))`;
    return `<div style="${rowStyle(i, { top, color: lineColor(ln, P, i) })}">`
      + `<span style="position:relative;display:inline-block">`
      + `<span style="display:inline-block;clip-path:inset(0 calc(100% - ${vis} * 1ch) 0 0)">${esc(s)}</span>`
      + `<span style="position:absolute;top:3px;left:calc(${vis} * 1ch);width:0.55ch;height:${FONT + 2}px;`
      + `background:${T.accent};opacity:calc((${on}) * ${blink})"></span>`
      + `</span></div>`;
  }).join('');
}

export function codeTyping({ x, y, w = 720, lines = [], label = '', theme = 'midnight', cps = 26,
  start = 0, dur } = {}) {
  needContent('lines', lines, 'codeTyping');
  const P = palette(theme);
  const top = topOf(label);
  const { offs, total } = codeLineOffsets(lines);
  const typeDur = r2(total / Math.max(1, cps));
  const D = dur ?? r2(typeDur + 1.8);
  const body = codeTypingBody(lines, { P, top, offs });
  const h = cardH(lines.length, label);
  return [htmlLayer({ x, y, w, h, start, duration: D,
    html: surface({ w, h, P, label, inner: body }),
    vars: { '--type': [0, total], '--done': [0, 1] },
    varsDelay: { '--type': 0.25, '--done': r2(0.25 + typeDur + 0.02) },
    varsDur: { '--type': typeDur, '--done': 0.04 },
    varsEase: { '--type': 'linear', '--done': 'linear' } })];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2. codeHighlight, SPOTLIGHT ONE LINE. A band sweeps down from the top of the snippet and parks on
// the target line while everything around it dims out of the way.
//
// MOTION: two `vars` channels. `--band` travels the band's `top` from row 0 to the target row (eased,
// so it decelerates into place); `--dim` fades every other row towards `dim`. Two channels rather than
// one because the dim should still be settling after the band has arrived, per-channel `varsDelay`
// and `varsDur` are exactly what core/tracks/vars.js is for.
export function codeHighlight({ x, y, w = 720, lines = [], line = 0, label = '', theme = 'midnight',
  dim = 0.28, start = 0, dur = 4 } = {}) {
  needContent('lines', lines, 'codeHighlight');
  const P = palette(theme);
  const top = topOf(label);
  const target = Math.max(0, Math.min(lines.length - 1, line));
  const travel = target * LINE_H;

  const band = `<div style="position:absolute;left:${PAD - 12}px;width:${w - 2 * PAD + 24}px;height:${LINE_H}px;`
    + `top:calc(${top}px + var(--band,0) * ${travel}px);border-radius:${R.chip}px;`
    + `background:color-mix(in srgb, ${T.accent} 18%, transparent);`
    + `box-shadow:inset 3px 0 0 ${T.accent};opacity:calc(0.35 + var(--band,0) * 0.65)"></div>`;

  const body = lines.map((ln, i) => {
    const fade = i === target ? '1' : `calc(1 - var(--dim,0) * ${r2(1 - dim)})`;
    const weight = i === target ? 700 : 500;
    return `<div style="${rowStyle(i, { top, color: lineColor(ln, P, i), extra: `opacity:${fade};font-weight:${weight}` })}">${esc(lineText(ln))}</div>`;
  }).join('');

  const h = cardH(lines.length, label);
  return [htmlLayer({ x, y, w, h, start, duration: dur,
    html: surface({ w, h, P, label, inner: band + body }),
    vars: { '--band': [0, 1], '--dim': [0, 1] },
    varsDelay: { '--band': 0.3, '--dim': 0.55 },
    varsDur: { '--band': 0.9, '--dim': 0.7 },
    varsEase: { '--band': 'easeInOutCubic', '--dim': P_EASE } })];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 3. codeScroll, WALK THROUGH A REAL MODULE. The card is a viewport onto a file longer than it, and
// the file travels until the target line sits on the viewport's centre row; then the spotlight lands.
//
// MOTION: two `vars` channels in sequence. `--scroll` drives the content's `top` by a computed pixel
// offset (a translate would be the same motion; `top` keeps it in the same idiom as the band above and
// out of gsap's way, which owns `transform` on any element `parts` touches). `--spot` then dims the
// context and lights the target's band, delayed until the travel is done.
// A ROW OUTSIDE THE VIEWPORT IS INVISIBLE, AND THE MARKUP HAS TO SAY SO. Clipping it with the
// container's `overflow` hides it from the eye and from nothing else: every gate that samples a
// colour against the backdrop still reads it as painted, and reads it against the PAGE, because the
// audit resolves no ancestor clip. So each row carries its own distance-to-the-viewport fade, two
// clamped ramps on the same `--scroll` that moves it, which is both honest and a softer edge than
// a hard cut. The numbers are unitless on purpose: px cannot be divided in CSS calc().
function codeScrollBody(lines, { P, target, dim, view, offset }) {
  const at = (i) => `(${i * LINE_H} - var(--scroll,0) * ${offset})`;
  const inView = (i) => `clamp(0, ${at(i)} * 0.07 + 1, 1) * clamp(0, (${view - LINE_H} - ${at(i)}) * 0.07 + 1, 1)`;
  return lines.map((ln, i) => {
    const fade = i === target ? '1' : `calc(1 - var(--spot,0) * ${r2(1 - dim)})`;
    return `<div style="position:absolute;left:0;top:${i * LINE_H}px;height:${LINE_H}px;display:flex;align-items:center;`
      + `font:500 ${FONT}px var(--font-mono);white-space:pre;color:${lineColor(ln, P, i)};`
      + `opacity:calc(${fade} * (${inView(i)}))">${esc(lineText(ln))}</div>`;
  }).join('');
}

// The viewport: fixed height, its own overflow, and a soft edge top and bottom so the file reads as
// continuing past the card rather than being cut by it. The offset is a TRANSFORM, not a `top`: it is
// the compositor-friendly property the rest of this engine moves things with, and animating `top`
// relayouts the whole row stack every frame.
function codeScrollInner({ lines, P, top, w, view, offset, target, dim }) {
  const bandInner = `<div style="position:absolute;left:0;right:0;top:${target * LINE_H}px;height:${LINE_H}px;`
    + `border-radius:${R.chip}px;background:color-mix(in srgb, ${T.accent} 16%, transparent);`
    + `box-shadow:inset 3px 0 0 ${T.accent};opacity:var(--spot,0)"></div>`;
  const body = codeScrollBody(lines, { P, target, dim, view, offset });
  return `<div style="position:absolute;left:${PAD}px;top:${top}px;width:${w - 2 * PAD}px;height:${view}px;overflow:hidden">`
    + `<div style="position:absolute;left:0;right:0;top:0;transform:translateY(calc(var(--scroll,0) * ${-offset}px))">`
    + bandInner + body
    + `</div></div>`;
}

export function codeScroll({ x, y, w = 720, lines = [], line = 0, rows = 9, label = '',
  theme = 'midnight', dim = 0.3, start = 0, dur = 5 } = {}) {
  needContent('lines', lines, 'codeScroll');
  const P = palette(theme);
  const top = topOf(label);
  const view = rows * LINE_H;
  const target = Math.max(0, Math.min(lines.length - 1, line));
  const centre = Math.floor((rows - 1) / 2);
  // clamped so the file never scrolls past either of its own ends
  const offset = Math.max(0, Math.min(target - centre, Math.max(0, lines.length - rows))) * LINE_H;
  const inner = codeScrollInner({ lines, P, top, w, view, offset, target, dim });
  const h = Math.round(top + view + PAD);
  return [htmlLayer({ x, y, w, h, start, duration: dur,
    html: surface({ w, h, P, label, inner }),
    vars: { '--scroll': [0, 1], '--spot': [0, 1] },
    varsDelay: { '--scroll': 0.35, '--spot': r2(0.35 + 1.25) },
    varsDur: { '--scroll': 1.3, '--spot': 0.6 },
    varsEase: { '--scroll': 'easeInOutCubic', '--spot': P_EASE } })];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 4. codeDiff. AN EDIT SHOWN AS MOTION. dev.mjs's `diff` paints the finished patch; this one performs
// it. Removed lines go red and COLLAPSE to nothing, added lines EXPAND from nothing and go green, one
// after another in the order they appear, and the untouched lines reflow around them because the rows
// are in normal flow rather than absolutely placed.
//
// MOTION: one `vars` channel PER CHANGED LINE (`--c0`, `--c1`, …), each with its own `varsDelay`, so
// the order is real time order and not a stagger applied to the whole set. Row height is
// `calc(var(--cN) * LINE_H)` for an addition and `calc((1 - var(--cN)) * LINE_H)` for a removal, the
// same channel read in two directions, which is what makes a collapse and an expansion one gesture.
function codeDiffUnchangedLine(r, P) {
  return `<div style="height:${LINE_H}px;display:flex;align-items:center;font:500 ${FONT}px var(--font-mono);`
    + `white-space:pre;color:${P.label}"><span style="width:2ch;display:inline-block">${' '}</span>${esc(r.text)}</div>`;
}

function codeDiffChangedLine(r, ci, P) {
  const add = r.sign === '+';
  const p = `var(--c${ci},0)`;
  const hgt = add ? `calc(${p} * ${LINE_H}px)` : `calc((1 - ${p}) * ${LINE_H}px)`;
  const opa = add ? p : `calc(1 - ${p})`;
  const col = add ? T.green : T.down;
  return `<div style="height:${hgt};overflow:hidden;opacity:${opa};`
    + `background:color-mix(in srgb, ${col} 16%, transparent);border-radius:${R.micro}px;`
    + `box-shadow:inset 3px 0 0 ${col}">`
    + `<div style="height:${LINE_H}px;display:flex;align-items:center;font:600 ${FONT}px var(--font-mono);`
    + `white-space:pre;color:${ink(P, col)}"><span style="width:2ch;display:inline-block;padding-left:8px">${r.sign}</span>${esc(r.text)}</div>`
    + `</div>`;
}

// Each changed row claims the next `--c<i>` channel, in order, so `body` and `codeDiffVars` agree on
// naming without either passing the other a shared mutable counter.
function codeDiffBody(rows, P) {
  let ci = 0;
  const body = rows.map((r) => {
    if (r.sign === ' ') return codeDiffUnchangedLine(r, P);
    const line = codeDiffChangedLine(r, ci, P);
    ci += 1;
    return line;
  }).join('');
  return { body, changedCount: ci };
}

function codeDiffVars(changedCount, step) {
  const vars = {}, varsDelay = {}, varsDur = {}, varsEase = {};
  for (let ci = 0; ci < changedCount; ci += 1) {
    const name = `--c${ci}`;
    vars[name] = [0, 1]; varsDelay[name] = r2(0.4 + ci * step); varsDur[name] = 0.5; varsEase[name] = P_EASE;
  }
  return { vars, varsDelay, varsDur, varsEase };
}

export function codeDiff({ x, y, w = 720, lines = [], label = '', theme = 'midnight',
  step = 0.34, start = 0, dur } = {}) {
  needContent('lines', lines, 'codeDiff');
  const P = palette(theme);
  const top = topOf(label);
  const rows = lines.map((ln) => (typeof ln === 'string' ? { sign: ' ', text: ln } : { sign: ln.sign || ' ', text: String(ln.text ?? '') }));
  const { body, changedCount } = codeDiffBody(rows, P);
  const { vars, varsDelay, varsDur, varsEase } = codeDiffVars(changedCount, step);
  const D = dur ?? r2(0.4 + Math.max(1, changedCount) * step + 2.0);
  // The card is sized for every row at full height: rows collapse INTO this box, they never resize it.
  const h = cardH(rows.length, label);
  const inner = `<div style="position:absolute;left:${PAD}px;top:${top}px;width:${w - 2 * PAD}px">${body}</div>`;
  return [htmlLayer({ x, y, w, h, start, duration: D,
    html: surface({ w, h, P, label, inner }), vars, varsDelay, varsDur, varsEase })];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 5. codeMorph. A REFACTOR AS A TRANSFORMATION, NOT A CUT. Every token that survives the edit is
// rendered ONCE and GLIDES from where it was to where it ends up; tokens only the old snippet has fade
// out in place, tokens only the new one has fade in where they land.
//
// MOTION: one `vars` channel, `--m`, 0→1. A shared token's position is
// `calc(fromCol ch + --m * deltaCol ch)` horizontally and the same shape in px vertically, `ch` is
// what makes this expressible at build time, since a monospace column IS a unit and needs no
// measurement. The two fades are the same `--m` read through clamps at opposite ends of the ramp, so
// the old text is gone before the new text arrives and the shared tokens carry the eye across.
//
// Pairing is first-occurrence and deterministic: identical props always pair the same tokens.
const codeMorphTokenize = (ls) => ls.flatMap((ln, li) =>
  [...String(lineText(ln)).matchAll(/\S+/g)].map((m) => ({ text: m[0], col: m.index, line: li })));

// Pairing is first-occurrence and deterministic: identical props always pair the same tokens. A
// token in `to` that matches an unclaimed token in `from` is shared (glides); the rest of `from` is
// `gone`, the rest of `to` is `born`.
function pairTokens(A, B) {
  const used = new Set(), pairs = [], born = [];
  B.forEach((b) => {
    const ai = A.findIndex((a, i) => !used.has(i) && a.text === b.text);
    if (ai >= 0) { used.add(ai); pairs.push([A[ai], b]); } else born.push(b);
  });
  return { pairs, born, gone: A.filter((_, i) => !used.has(i)) };
}

function codeMorphSpans({ pairs, gone, born, P }) {
  const at = (t, extra, color) =>
    `position:absolute;left:${t.left};top:${t.top};font:500 ${FONT}px var(--font-mono);white-space:pre;`
    + `color:${color};${extra}`;
  return [
    ...pairs.map(([a, b]) => {
      const dc = b.col - a.col, dy = (b.line - a.line) * LINE_H;
      const t = { left: `calc(${a.col}ch + var(--m,0) * ${dc}ch)`, top: `calc(${a.line * LINE_H}px + var(--m,0) * ${dy}px)` };
      return `<span style="${at(t, '', tok(P, a.line))}">${esc(a.text)}</span>`;
    }),
    ...gone.map((a) => {
      const t = { left: `${a.col}ch`, top: `${a.line * LINE_H}px` };
      return `<span style="${at(t, `opacity:calc(1 - clamp(0, var(--m,0) * 2.4, 1))`, ink(P, T.down))}">${esc(a.text)}</span>`;
    }),
    ...born.map((b) => {
      const t = { left: `${b.col}ch`, top: `${b.line * LINE_H}px` };
      return `<span style="${at(t, `opacity:clamp(0, (var(--m,0) - 0.55) * 2.4, 1)`, ink(P, T.green))}">${esc(b.text)}</span>`;
    }),
  ].join('');
}

export function codeMorph({ x, y, w = 720, from = [], to = [], label = '', theme = 'midnight',
  start = 0, dur = 4.5 } = {}) {
  needContent('from', from, 'codeMorph');
  needContent('to', to, 'codeMorph');
  const P = palette(theme);
  const top = topOf(label);
  const { pairs, gone, born } = pairTokens(codeMorphTokenize(from), codeMorphTokenize(to));
  const spans = codeMorphSpans({ pairs, gone, born, P });
  const nRows = Math.max(from.length, to.length);
  const h = cardH(nRows, label);
  const inner = `<div style="position:absolute;left:${PAD}px;top:${top + 5}px;width:${w - 2 * PAD}px;height:${nRows * LINE_H}px">${spans}</div>`;
  return [htmlLayer({ x, y, w, h, start, duration: dur,
    html: surface({ w, h, P, label, inner }),
    vars: { '--m': [0, 1] }, varsDelay: 0.5, varsDur: 1.5, varsEase: 'easeInOutCubic' })];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 6. codeFlight, DISCRETE SNIPPETS ASSEMBLE INTO ONE PROGRAM. Each fragment arrives from alternating
// sides and settles into the stack, in order, until the whole module is on screen.
//
// MOTION: `parts`, and this is the block it was written for. Two specs, one selecting the snippets
// that come from the left, one those from the right. Each a seeked, staggered entrance with `out:
// true` for its paired exit, so the assembly comes apart the way it went together instead of the card
// fading out whole (core/parts.js, and engine-doctrine/MISTAKES.md #429 for why that exit slot exists).
// Nothing in this block declares `transform` on a snippet: gsap owns that property on any element
// `parts` touches, and a hand-written transform there would be silently overwritten.
export function codeFlight({ x, y, w = 720, snippets = [], label = '', theme = 'midnight',
  each = 0.5, stagger = 0.22, start = 0, dur } = {}) {
  needContent('snippets', snippets, 'codeFlight');
  const P = palette(theme);
  const top = topOf(label);
  const gap = 14;

  let cy = top, li = 0;
  const cards = snippets.map((s, i) => {
    const lines = (s.lines || []).map((ln) => lineText(ln));
    const ch = lines.length * LINE_H + 22;
    const y0 = cy; cy += ch + gap;
    const rows = lines.map((ln) => {
      const c = tok(P, li); li += 1;
      return `<div style="height:${LINE_H}px;display:flex;align-items:center;font:500 ${FONT}px var(--font-mono);`
        + `white-space:pre;color:${c}">${esc(ln)}</div>`;
    }).join('');
    const side = i % 2 ? 'r' : 'l';
    return `<div data-fly="${side}" style="position:absolute;left:${PAD}px;top:${y0}px;width:${w - 2 * PAD}px;`
      + `height:${ch}px;padding:11px 14px;box-sizing:border-box;border-radius:${R.chip}px;`
      + `background:color-mix(in srgb, var(--text) 6%, transparent);`
      + `box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent)">`
      + (s.label ? `<div style="font:600 15px var(--font-mono);letter-spacing:0.06em;color:${P.label};`
        + `position:absolute;right:14px;top:11px">${esc(s.label)}</div>` : '')
      + rows + `</div>`;
  }).join('');

  const h = Math.round(cy - gap + PAD);
  const D = dur ?? r2(0.3 + snippets.length * stagger + each + 1.6);
  return [htmlLayer({ x, y, w, h, start, duration: D,
    html: surface({ w, h, P, label, inner: cards }),
    parts: [
      { select: '[data-fly="l"]', anim: 'slide-left', each, stagger: stagger * 2, delay: 0.3, out: true },
      { select: '[data-fly="r"]', anim: 'slide-right', each, stagger: stagger * 2, delay: r2(0.3 + stagger), out: true },
    ] })];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT. Same vocabulary as DEV_SCHEMAS in blocks/dev.mjs; x · y · start · dur are the
// scene's to supply, never an author's dial, so they are excluded from every table.
const THEMES = ['midnight', 'ink', 'ember', 'forest', 'ocean', 'dusk', 'slate', 'neon', 'aurora', 'paper', 'linen', 'frost'];
const LINE = { kind: 'oneOf', of: [
  { kind: 'str', max: 200 },
  { kind: 'row', fields: { text: { kind: 'str', max: 200 }, color: { kind: 'color' } } },
] };

export const CODEANIM_SCHEMAS = {
  codeTyping: {
    w: { kind: 'int', min: 240, max: 1920, def: 720 },
    lines: { kind: 'list', of: LINE, def: [] },
    label: { kind: 'str', max: 60, def: '' },
    theme: { kind: 'enum', of: THEMES, def: 'midnight' },
    // Characters per second for the frontier. The whole block's length derives from it.
    cps: { kind: 'num', min: 1, max: 200, def: 26 },
  },
  codeHighlight: {
    w: { kind: 'int', min: 240, max: 1920, def: 720 },
    lines: { kind: 'list', of: LINE, def: [] },
    // The row the band parks on, clamped into the snippet.
    line: { kind: 'int', min: 0, max: 200, def: 0 },
    label: { kind: 'str', max: 60, def: '' },
    theme: { kind: 'enum', of: THEMES, def: 'midnight' },
    // What the surrounding context fades TO. 0 would erase it; the point is that it stays legible.
    dim: { kind: 'num', min: 0.05, max: 1, def: 0.28 },
  },
  codeScroll: {
    w: { kind: 'int', min: 240, max: 1920, def: 720 },
    lines: { kind: 'list', of: LINE, def: [] },
    line: { kind: 'int', min: 0, max: 400, def: 0 },
    // How many rows the viewport shows. The file scrolls until the target sits on the centre row.
    rows: { kind: 'int', min: 3, max: 40, def: 9 },
    label: { kind: 'str', max: 60, def: '' },
    theme: { kind: 'enum', of: THEMES, def: 'midnight' },
    dim: { kind: 'num', min: 0.05, max: 1, def: 0.3 },
  },
  codeDiff: {
    w: { kind: 'int', min: 240, max: 1920, def: 720 },
    lines: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'row', fields: { sign: { kind: 'enum', of: ['+', '-', ' '] }, text: { kind: 'str', max: 200 } } },
    ] }, def: [] },
    label: { kind: 'str', max: 60, def: '' },
    theme: { kind: 'enum', of: THEMES, def: 'midnight' },
    // Seconds between one changed line and the next. Context lines take no turn.
    step: { kind: 'num', min: 0.05, max: 3, def: 0.34 },
  },
  codeMorph: {
    w: { kind: 'int', min: 240, max: 1920, def: 720 },
    from: { kind: 'list', of: LINE, def: [] },
    to: { kind: 'list', of: LINE, def: [] },
    label: { kind: 'str', max: 60, def: '' },
    theme: { kind: 'enum', of: THEMES, def: 'midnight' },
  },
  codeFlight: {
    w: { kind: 'int', min: 240, max: 1920, def: 720 },
    snippets: { kind: 'list', of: { kind: 'row', fields: {
      label: { kind: 'str', max: 40 },
      lines: { kind: 'list', of: LINE },
    } }, def: [] },
    label: { kind: 'str', max: 60, def: '' },
    theme: { kind: 'enum', of: THEMES, def: 'midnight' },
    // One snippet's own entrance duration, and the pitch between them.
    each: { kind: 'num', min: 0.1, max: 3, def: 0.5 },
    stagger: { kind: 'num', min: 0.02, max: 2, def: 0.22 },
  },
};
