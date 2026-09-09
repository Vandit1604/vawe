// blocks/vfx.mjs. The VFX family: five treatments that are ABOUT the motion rather than about the
// data. Everything else in blocks/ draws a surface and lets a container entrance carry it; these five
// each own a specific gesture. A caret that bleeds light, a card that eats the frame, a word that
// melts into the next one, a post being read, a stack of rows folding up out of depth.
//
// Same contract as every sibling module: PURE factories (props → array of scene-layer JSON), no DOM,
// no Date, no Math.random. Same props → same layers → same pixels.
//
// MOTION COMES FROM THE ENGINE. `transition` and `animation` are disabled engine-wide and refused at
// boot (core/sanitize-html.js), so every moving thing here is driven by an engine-interpolated custom
// property: `vars: { '--p': [0, 1] }` for a directed progress, and the raw clock `var(--t)` only where
// the motion is genuinely a loop with no beginning (the caret blink). A calc() reading one of those is
// re-evaluated on every seeked frame, which is what makes frame 412 independent of frame 411.
import {
  TOKENS, HAIR, r2, text, box, seriesAt,
  R, TYPE, SPACE, E, cardChrome, tint, TINT, SHADOW_CARD,
  capCss, labelCss, numCss, needData, onInk,
} from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a name-to-category table in sync by hand.
export const CATEGORY = 'Effects';

const T = TOKENS;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A stable id for a fragment-local SVG filter. Two morphText layers in one scene would otherwise both
// define `#goo` and every reference would resolve to whichever the DOM saw first, a silent wrong
// filter, not an error. Derived from the content so it is a pure function of the props.
const idOf = (parts) => {
  let h = 2166136261;
  for (const ch of parts.join(' ')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return 'v' + (h >>> 0).toString(36);
};

// The `--p` channel every directed block here shares. One definition so a scene that stages two of
// them gets the same ramp shape from both.
const progress = ({ delay = 0.25, dur = 1.4, ease = 'easeInOutCubic', to = 1 } = {}) => ({
  vars: { '--p': [0, to] }, varsDelay: delay, varsDur: dur, varsEase: ease,
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1 · textCursor. A CARET THAT BLEEDS LIGHT. A line of type with a live caret; the glyphs carry a
// chromatic fringe that CONVERGES as the line settles, and the caret throws an accent glow onto the
// words beside it.
//
// THE RED/CYAN LITERALS ARE LEGITIMATE and kit.mjs names the test they pass: a colour that IS the
// identity of something outside this theme. A chromatic aberration is red and cyan or it is not a
// chromatic aberration, pushing it through the accent would make it a coloured blur instead. The
// GLOW is the theme's accent, because that is decoration and decoration reskins.
//
// MOTION: `--p` 0→1 pulls the fringe in from `spread` to nothing and lifts the glow to full. The
// caret's blink is the one thing off the raw clock (`var(--t)`), because a blink has no beginning: a
// stepped round() gives a hard on/off square wave rather than a fade, which is what a caret does.
export function textCursor({ x, y, w = 900, body = '', size = TYPE.hero, spread = 18, glow = 1,
  cursor = 'block', blink = 0.9, start = 0, dur = 4 } = {}) {
  needData('body', body, 'textCursor');
  const CURSORS = ['block', 'bar', 'underline'];
  if (!CURSORS.includes(cursor)) {
    throw new Error(`block "textCursor": unknown cursor "${cursor}", one of: ${CURSORS.join(', ')}. `
      + `block is a filled cell, bar is a thin vertical rule, underline sits under the last glyph.`);
  }
  // The fringe distance, in px, as a function of the settle. Written once: two declarations read it.
  const d = `calc((1 - var(--p,0)) * ${r2(spread)}px)`;
  const nd = `calc((1 - var(--p,0)) * ${r2(-spread)}px)`;
  // A square wave off the raw clock: mod() folds time into one blink period, round(down) snaps it to
  // 0 or 1. No easing, because a caret does not fade.
  const beat = `round(down, mod(var(--t,0), ${r2(blink)}) * ${r2(2 / blink)}, 1)`;
  const caretW = cursor === 'bar' ? Math.max(3, r2(size * 0.07)) : r2(size * 0.52);
  const caretH = cursor === 'underline' ? Math.max(3, r2(size * 0.07)) : r2(size * 1.02);
  const caret = `<span style="display:inline-block;width:${caretW}px;height:${caretH}px;`
    + `vertical-align:${cursor === 'underline' ? 'baseline' : 'text-bottom'};margin-left:${r2(size * 0.12)}px;`
    + `background:${T.accent};border-radius:${R.micro}px;`
    // The glow is the caret's own light thrown outward. Two shadows, tight and wide, so it reads as a
    // source rather than as a blurred rectangle.
    + `box-shadow:0 0 ${r2(size * 0.22)}px ${T.accent}, 0 0 ${r2(size * 0.7)}px var(--accent-glow, ${T.accent});`
    + `opacity:calc(${beat} * (0.35 + var(--p,0) * 0.65))"></span>`;

  const line = `<span style="font:800 ${size}px var(--font-sans);color:var(--text);letter-spacing:-0.03em;`
    + `text-shadow:${nd} 0 0 rgba(255,0,64,0.72), ${d} 0 0 rgba(0,220,255,0.72), `
    + `0 0 calc(var(--p,0) * ${r2(size * 0.5 * glow)}px) var(--accent-glow, ${T.accent})">${esc(body)}</span>`;

  return [{ type: 'html', x, y, w, html: `<div style="width:${w}px;white-space:nowrap">${line}${caret}</div>`,
    start, duration: dur, anim: 'fade', enterDur: 0.3, exitDur: 0.35,
    ...progress({ delay: 0.25, dur: 1.8, ease: 'easeOutCubic' }) }];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2 · parallaxZoom. ONE CARD EATS THE FRAME. A 3x3 board of product cards; the centre one scales
// until it fills the whole board while its eight neighbours travel OUTWARD, each along its own vector
// away from centre, and dim on the way. One 0→1 progress drives all nine, so the push and the parallax
// cannot drift apart the way nine hand-keyed motion tracks would.
//
// This is the `diveIn` gesture done INSIDE a block rather than with the camera. The camera version
// moves the whole frame; this one moves one card against its own siblings, which is what makes the
// siblings read as a layer of depth the hero is coming through.
const PZ_RING = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function parallaxBoard({ x, y, w = 1200, h = 760, title = '', caption = '', tiles = [],
  gap = SPACE.md, travel = 0.55, reverse = false, start = 0, dur = 5 } = {}) {
  needData('title', title, reverse ? 'parallaxUnzoom' : 'parallaxZoom');
  const cw = r2((w - 2 * gap) / 3), ch = r2((h - 2 * gap) / 3);
  // The hero's terminal scale is DERIVED, never dialled: it is exactly what makes the centre cell the
  // size of the board. A prop here would let the card stop short of the frame or overshoot it, and
  // neither is the gesture.
  const k = r2(w / cw - 1);

  const cell = (gx, gy) => ({ left: r2(gx * (cw + gap)), top: r2(gy * (ch + gap)) });

  const ring = PZ_RING.map(([dx, dy], i) => {
    const p = cell(dx + 1, dy + 1);
    const t = tiles[i] || {};
    // The travel vector is the cell's OWN offset from centre, so a card leaves along the line it
    // already sits on and the ring reads as one plane opening rather than eight cards scattering.
    const ox = r2(dx * cw * travel), oy = r2(dy * ch * travel);
    return `<div style="position:absolute;left:${p.left}px;top:${p.top}px;width:${cw}px;height:${ch}px;`
      + `box-sizing:border-box;background:var(--card);border:${HAIR};border-radius:${R.card}px;`
      + `box-shadow:${SHADOW_CARD};padding:${SPACE.md}px;display:flex;flex-direction:column;`
      + `justify-content:space-between;overflow:hidden;`
      + `transform:translate(calc(var(--p,0) * ${ox}px), calc(var(--p,0) * ${oy}px));`
      + `opacity:calc(1 - var(--p,0) * 0.88)">`
      + `<div style="${capCss()}">${esc(t.label || '')}</div>`
      + `<div style="height:${SPACE.snug}px;border-radius:${R.pill}px;background:${seriesAt(i)};`
      + `width:${r2(38 + (i * 7) % 52)}%"></div></div>`;
  }).join('');

  const c = cell(1, 1);
  const hero = `<div style="position:absolute;left:${c.left}px;top:${c.top}px;width:${cw}px;height:${ch}px;`
    + `box-sizing:border-box;background:var(--surface-2);border:1px solid var(--line-strong);`
    + `border-radius:${R.card}px;box-shadow:${SHADOW_CARD};padding:${SPACE.md}px;`
    + `display:flex;flex-direction:column;justify-content:center;gap:${SPACE.xs}px;overflow:hidden;`
    // transform-origin is the board's centre by construction (the cell IS centred), so a plain scale
    // grows it symmetrically into the frame with no compensating translate.
    //
    // `will-change:transform` IS THE PURITY FIX, not a performance hint. This card is the one element
    // in the board that carries TEXT through a growing scale (2.6x at the settled end), and Chrome has
    // two ways to draw that: raster the glyphs at the composited scale, or stretch a texture rastered
    // at the pre-scale size. Which one it picks is decided by the compositor, not by the frame number,
    // so the same n came back two different pictures. Measured mid-ramp (frame 45, --p 0.79) over 16
    // separate browser launches: 4 of 15 differed from the first by a MAX CHANNEL DELTA OF 83, all of
    // it on the two lines of hero type, and the noise floor this repo compares against is 1
    // (harness/lib/png-diff.mjs). With the hint, 0 of 15 differ. It pins the majority rendering, not
    // the odd one out: the fixed output is byte-identical to the variant 12 of the 16 launches drew.
    // ONE element, deliberately. Spraying this over the eight ring cards is the mistake
    // core/lightfield/index.js:393 records, where 400 promotion hints Chrome could not honour made a
    // field that never settled. The ring only translates, and translation does not re-raster: measured
    // clean over the same 16 launches.
    + `transform:scale(calc(1 + var(--p,0) * ${k}));z-index:2;will-change:transform">`
    + `<div style="font:700 ${TYPE.lead}px var(--font-sans);color:var(--text);letter-spacing:-0.02em">${esc(title)}</div>`
    + (caption ? `<div style="${labelCss({ size: TYPE.body })}">${esc(caption)}</div>` : '')
    + `</div>`;

  return [{ type: 'html', x, y, w, h,
    html: `<div style="position:relative;width:${w}px;height:${h}px">${ring}${hero}</div>`,
    start, duration: dur, anim: 'fade', enterDur: 0.3, exitDur: 0.35,
    // REVERSE IS THE SAME BLOCK RUN BACKWARDS, not a second layout. `--p` simply ramps 1 to 0, so the
    // hero starts filling the frame and retreats into its cell as the neighbours arrive.
    vars: { '--p': reverse ? [1, 0] : [0, 1] },
    varsDelay: 0.3, varsDur: 1.6, varsEase: 'easeInOutCubic' }];
}

// BOTH SIGNATURES ARE SPELLED OUT, and the duplication is the point.
//
// These were `(o = {}) => parallaxBoard({ ...o, reverse })`, which works and hides the contract: a
// factory's SIGNATURE is what `paramsOf` reads (core/camera-moves.js:216) and what
// quality/gates/block-schema.mjs checks a declared option table against. Forwarding an opaque bag left
// the gate unable to see fourteen real props and it called every one of them dead, correctly, because
// from the outside they were unverifiable. A contract nothing can read is not a contract.
// EXPORTED so quality/gates/block-schema.mjs can evaluate the defaults that reference it: its SCOPE
// spreads the registry's own exports, and a module-private constant is unreadable from there.
// Same reason blocks/diagram.mjs exports FLOW_DEFAULT.
export const BOARD = { w: 1200, h: 760, gap: SPACE.md, travel: 0.55, dur: 5 };
export function parallaxZoom({ x, y, w = BOARD.w, h = BOARD.h, title = '', caption = '', tiles = [],
  gap = BOARD.gap, travel = BOARD.travel, start = 0, dur = BOARD.dur } = {}) {
  return parallaxBoard({ x, y, w, h, title, caption, tiles, gap, travel, start, dur, reverse: false });
}
export function parallaxUnzoom({ x, y, w = BOARD.w, h = BOARD.h, title = '', caption = '', tiles = [],
  gap = BOARD.gap, travel = BOARD.travel, start = 0, dur = BOARD.dur } = {}) {
  return parallaxBoard({ x, y, w, h, title, caption, tiles, gap, travel, start, dur, reverse: true });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 3 · morphText. A WORD MELTS INTO THE NEXT. A list of words in one place, cycled, with the outgoing
// and incoming word BLURRED and then re-thresholded so their edges fuse before they separate.
//
// WHY NOT core/morph.js. That is a different device and both should exist. `morph` on a text layer
// migrates individual GLYPHS from word A to word B, shared characters glide to their new slot, which
// reads as the same word being rearranged. It takes exactly ONE pair (`morph.to`) and it is per-letter
// and crisp. This is the liquid register: whole words, an arbitrary-length cycle, and no letter
// correspondence at all. Reach for `morph` when the two words share letters and you want the reader to
// see which; reach for this when the point is the substance, not the spelling.
//
// THE GOO. A gaussian blur followed by a steep alpha contrast (feColorMatrix on the alpha channel) is
// the standard metaball filter: soft edges that overlap get pushed back above the alpha threshold
// TOGETHER and read as one body. Applied to the container, with each word carrying its own blur that
// peaks as it hands over, that is the whole effect.
//
// MOTION: one `--i` channel ramping LINEARLY from 0 to words.length - 1. Every word derives its own
// opacity and blur from its distance to `--i`, so nothing is scheduled per word and adding a tenth
// word changes no other word's arithmetic. `max(a, -a)` is the absolute value, CSS `abs()` is too new
// to rely on and this is exactly equivalent inside a math function.
export function morphText({ x, y, w = 900, words = [], size = TYPE.display, hold = 0.9,
  goo = 1, color = 'var(--text)', start = 0, dur } = {}) {
  needData('words', words, 'morphText');
  const span = Math.max(0, words.length - 1);
  const travel = r2(span * hold);
  const D = dur ?? r2(travel + 1.4);
  const fid = idOf(['goo', String(goo), ...words]);
  // The blur that fuses. Scaled off the type size so the effect is the same at 32px and at 92px, and
  // the alpha slope is tuned to that blur: too shallow and the words stay soft, too steep and they
  // never touch.
  const blur = r2(size * 0.055 * goo);
  const filt = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="${fid}">`
    + `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="b"/>`
    + `<feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${r2(15 * goo)} -${r2(7 * goo)}"/>`
    + `</filter></svg>`;

  const stack = words.map((word, i) => {
    // |--i - i|, clamped: 0 while this word owns the stage, 1 once the next has taken it.
    const away = `clamp(0, max(var(--i,0) - ${i}, ${i} - var(--i,0)), 1)`;
    return `<div style="position:absolute;left:0;right:0;top:0;text-align:center;white-space:nowrap;`
      + `font:800 ${size}px var(--font-sans);color:${color};letter-spacing:-0.03em;`
      + `opacity:calc(1 - ${away});filter:blur(calc(${away} * ${r2(size * 0.045)}px))">${esc(word)}</div>`;
  }).join('');

  return [{ type: 'html', x, y, w,
    html: `${filt}<div style="position:relative;width:${w}px;height:${r2(size * 1.25)}px;`
      + `filter:url(#${fid})">${stack}</div>`,
    start, duration: D, anim: 'fade', enterDur: 0.3, exitDur: 0.35,
    vars: { '--i': [0, span] }, varsDelay: 0.4, varsDur: Math.max(0.01, travel), varsEase: 'linear' }];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 4 · redditPost. A link-aggregator post: the vote column, the subreddit line, the title, the body,
// and the comment count. Native layers, not html, because every part of it is a row of type in a card
// and that is what `group` is for.
//
// THE VOTE COLUMN IS THE WHOLE POINT of the shape and it is why this is not a tweet card with
// different words: the score sits to the LEFT of the title, vertically between its two arrows, and
// that column is what makes a reader recognise the surface before reading a single word. The score is
// `num`'s job (mono, tabular) because it is a figure; everything else is sans.
// HTML-FIRST. Design Read: the same shape `tweetCard` (blocks/social.mjs) had before its own
// conversion, mirrored here: one `html` card, `cardChrome` as layer props, the vote rail + title/body/
// meta column as one markup string. The measured-contrast colour logic (`onInk`, the lit/quiet arrow
// distinction) is untouched, only moved from JSON layers into inline styles.
export function redditPost({ x, y, w = 620, sub = '', author = '', age = '', title = '', body = '',
  votes = 0, comments = 0, voted = 'up', start = 0, dur = 4 } = {}) {
  needData('title', title, 'redditPost');
  const VOTES = { up: 1, down: -1, none: 0 };
  if (!(voted in VOTES)) {
    throw new Error(`block "redditPost": unknown voted "${voted}". One of: ${Object.keys(VOTES).join(', ')}. `
      + `It lights one arrow to show the reader's own vote; "none" leaves both quiet.`);
  }
  const lit = VOTES[voted];
  // THE LIT ARROW IS THE TONE PUSHED TOWARD `--text`, never the raw token. A bare `--accent` on the
  // rail's own accent tint measured 2.7:1 on `linear` and `make audit` failed it HARD. `onInk` is the
  // one owner of that mix; see kit.mjs for why it is not `onColor`.
  // THE QUIET ARROW IS `--text-2`, NOT `--dim`, for the same reason: it does not clear 4.5:1 on a
  // tinted ground (measured 4.4:1 on this very rail), where `--dim` fails HARD.
  const quietInk = onInk(T.sub);
  // The arrow is the SAME size as the score beside it: `make audit` fails text under 14.04px, so a
  // glyph shrunk to look secondary is the part nobody can read.
  const arrow = (glyph, on, tone) => `<span style="font:700 ${TYPE.base}px var(--font-sans);color:${on ? onInk(tone) : quietInk}">${glyph}</span>`;
  const meta = (t) => `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">${t}</span>`;
  const RAIL = 64;
  const bodyW = w - RAIL - 3 * SPACE.md;

  // the vote rail: arrow, score, arrow, on its own tinted ground so it reads as a control and not as
  // three loose glyphs beside the headline.
  const rail = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;`
    + `gap:${SPACE.tight}px;width:${RAIL}px;border-radius:${R.chip}px;background:${tint(T.accent, TINT.track)};`
    + `padding:${SPACE.xs}px 0">` + arrow('▲', lit === 1, T.accent)
    + `<span style="font:700 ${TYPE.body}px var(--font-num);color:${T.ink}">${votes}</span>`
    + arrow('▼', lit === -1, T.down) + '</div>';
  const metaRow = [sub && meta('r/' + sub), author && meta('·'), author && meta('u/' + author),
    age && meta('·'), age && meta(age)].filter(Boolean).join('');
  const col = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:${SPACE.xs}px">`
    + (metaRow ? `<div style="display:flex;align-items:center;gap:${SPACE.snug}px">${metaRow}</div>` : '')
    + `<span style="font:700 ${TYPE.lead}px var(--font-sans);color:${T.ink};letter-spacing:-0.01em;width:${bodyW}px">${title}</span>`
    + (body ? `<span style="font:400 ${TYPE.body}px var(--font-sans);color:${T.sub};width:${bodyW}px">${body}</span>` : '')
    + `<div style="display:flex;align-items:center;gap:${SPACE.sm}px">`
    + `<span style="font:600 ${TYPE.body}px var(--font-mono);color:${T.sub}">${comments} comments</span>`
    + `<span style="font:600 ${TYPE.body}px var(--font-mono);color:${T.sub}">share</span></div></div>`;
  const html = `<div style="display:flex;align-items:stretch;gap:${SPACE.md}px;padding:${SPACE.md}px;`
    + `box-sizing:border-box;width:${w}px">` + rail + col + '</div>';

  return [{ type: 'html', x, y, w, html, ...cardChrome({ radius: R.soft, elevation: E.card }),
    start, duration: dur, enterDur: 0.45, exitDur: 0.35 }];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 5 · uiReveal3d, UI ROWS FOLDING UP OUT OF DEPTH. A stack of product rows lying flat and away from
// the camera, each hinging up to face the viewer in turn. The perspective is on each row's OWN
// transform rather than on the parent, so nothing depends on a stacking context surviving the engine's
// own transforms; the hinge is at the row's TOP edge, which is what makes it read as unfolding rather
// than as tumbling.
//
// MOTION: one `--p` channel and per-row arithmetic. Row i's own progress is the shared `--p` shifted by
// i * step and re-normalised, clamped to 0..1. The same trick the code family uses for a typing
// frontier. So the stagger costs nothing per row, and `--p` reaching 1 always means the LAST row has
// landed, whatever `items` is.
export function uiReveal3d({ x, y, w = 680, items = [], rowH = 76, gap = SPACE.xs, tilt = 72,
  depth = 260, stagger = 0.55, start = 0, dur = 4.5 } = {}) {
  needData('items', items, 'uiReveal3d');
  const n = items.length;
  // The window each row occupies inside 0..1. At `stagger` 0 every row lands together; at 1 they are
  // strictly sequential with no overlap.
  const step = n > 1 ? r2(stagger / (n - 1 + stagger)) : 0;
  const width = n > 1 ? r2(1 - step * (n - 1)) : 1;

  const rows = items.map((it, i) => {
    const u = `clamp(0, (var(--p,0) - ${r2(i * step)}) * ${r2(1 / Math.max(1e-3, width))}, 1)`;
    return `<div style="height:${rowH}px;box-sizing:border-box;background:var(--card);border:${HAIR};`
      + `border-radius:${R.card}px;box-shadow:${SHADOW_CARD};padding:0 ${SPACE.md}px;`
      + `display:flex;align-items:center;justify-content:space-between;gap:${SPACE.md}px;`
      + `transform-origin:50% 0%;opacity:calc(${u});`
      + `transform:perspective(${r2(depth * 4)}px) `
      + `translateZ(calc((1 - ${u}) * ${r2(-depth)}px)) `
      + `rotateX(calc((1 - ${u}) * ${r2(tilt)}deg))">`
      + `<div style="${labelCss({ size: TYPE.body, color: 'var(--text)', weight: 600 })}">${esc(it.label || '')}</div>`
      + (it.value != null ? `<div style="${numCss({ size: TYPE.body })}">${esc(it.value)}</div>` : '')
      + `</div>`;
  }).join('');

  const h = r2(n * rowH + Math.max(0, n - 1) * gap);
  return [{ type: 'html', x, y, w, h,
    html: `<div style="display:flex;flex-direction:column;gap:${gap}px;width:${w}px">${rows}</div>`,
    start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    ...progress({ delay: 0.25, dur: 1.6, ease: 'easeOutCubic' }) }];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
const PARALLAX_SCHEMA = {
  w: { kind: 'int', min: 360, max: 1920, def: 1200 },
  h: { kind: 'int', min: 240, max: 1080, def: 760 },
  title: { kind: 'str', max: 60, def: '' },
  caption: { kind: 'str', max: 90, def: '' },
  // up to 8; the ring is a 3x3 board with the hero in the middle, so a ninth is never placed
  tiles: { kind: 'list', of: { kind: 'row', fields: { label: { kind: 'str', max: 24 } } }, def: [] },
  gap: { kind: 'int', min: 0, max: 80, def: 16 },
  // how far a neighbour travels outward, as a fraction of its own cell
  travel: { kind: 'unit', def: 0.55 },
};

export const VFX_SCHEMAS = {
  textCursor: {
    w: { kind: 'int', min: 120, max: 1920, def: 900 },
    body: { kind: 'str', max: 80, def: '' },
    size: { kind: 'int', min: 18, max: 240, def: 64 },
    // how far apart the red and cyan copies start, in px. 0 removes the aberration entirely.
    spread: { kind: 'int', min: 0, max: 80, def: 18 },
    glow: { kind: 'num', min: 0, max: 2, def: 1 },
    cursor: { kind: 'enum', of: ['block', 'bar', 'underline'], def: 'block' },
    // one full on/off cycle, in seconds
    blink: { kind: 'num', min: 0.15, max: 4, def: 0.9 },
  },

  // The two directions of the same board, so their dials cannot drift apart.
  parallaxZoom: PARALLAX_SCHEMA,
  parallaxUnzoom: PARALLAX_SCHEMA,

  morphText: {
    w: { kind: 'int', min: 120, max: 1920, def: 900 },
    words: { kind: 'list', of: { kind: 'str', max: 24 }, def: [] },
    size: { kind: 'int', min: 18, max: 240, def: 48 },
    // seconds one word holds the stage before the next takes it
    hold: { kind: 'num', min: 0.2, max: 4, def: 0.9 },
    // the metaball strength: 0 is a plain crossfade, 1 is the fusing edge, above that it smears
    goo: { kind: 'num', min: 0, max: 2, def: 1 },
    color: { kind: 'color', def: 'var(--text)' },
  },

  redditPost: {
    w: { kind: 'int', min: 320, max: 1200, def: 620 },
    sub: { kind: 'str', max: 24, def: '' },
    author: { kind: 'str', max: 24, def: '' },
    age: { kind: 'str', max: 16, def: '' },
    title: { kind: 'str', max: 140, def: '' },
    body: { kind: 'str', max: 240, def: '' },
    votes: { kind: 'num', min: -1e9, max: 1e9, def: 0 },
    comments: { kind: 'num', min: 0, max: 1e9, def: 0 },
    // which arrow is lit: the reader's own vote
    voted: { kind: 'enum', of: ['up', 'down', 'none'], def: 'up' },
  },

  uiReveal3d: {
    w: { kind: 'int', min: 240, max: 1600, def: 680 },
    items: { kind: 'list', of: { kind: 'row', fields: {
      label: { kind: 'str', max: 48 }, value: { kind: 'str', max: 16 } } }, def: [] },
    rowH: { kind: 'int', min: 40, max: 200, def: 76 },
    gap: { kind: 'int', min: 0, max: 60, def: 8 },
    // the angle a row starts hinged back at, degrees from flat-on
    tilt: { kind: 'int', min: 0, max: 89, def: 72 },
    // how far back in z a row starts, px
    depth: { kind: 'int', min: 0, max: 1200, def: 260 },
    // 0 = every row lands together, 1 = strictly one after another
    stagger: { kind: 'unit', def: 0.55 },
  },
};
