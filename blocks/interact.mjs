// blocks/interact.mjs. The INTERACTION vocabulary: the four things a product demo does to a screen.
//
// WHY: the registry could depict interfaces but not USING them. The `cursor` layer type has existed
// since the demo work (core/layers/cursor.js. A path of {t,x,y} keyframes plus click times), and
// exactly ONE block emitted it: `searchEngine.results`, with a two-point path hardcoded inside the
// family. So any other click in any other scene had to be hand-authored as a raw layer, timed against
// a magic offset the author had to rediscover. A touch tap had no shape at all, a phone keyboard did
// not exist (so a mobile typing beat was unbuildable), and no button in the library could be PRESSED,
// which meant a CTA beat had a gesture and no payoff.
//
// Same contract as blocks/index.mjs and blocks/app.mjs: a factory is a PURE function props → an ARRAY
// of scene layers, {x,y} is the block's top-left on the stage, {start,dur} are seconds, and colour
// comes from the theme tokens so every one of these reskins per brand. No Date, no random, no DOM.
//
// THE PRESS AND THE RIPPLE ARE ONE MECHANISM, not two. Both are a state that goes somewhere over a
// window, which is exactly what the engine's animated custom properties are for (scene.html: `vars`
// interpolates `--p` per frame and the block writes `var(--p)` into its own CSS, see `gauge` and
// `lineChart` for the reference use). Pure in n: the value is a function of t and nothing else.
//
// A press is the one shape that has to come BACK, and `vars` sweeps one direction only. The triangle
// `min(p, 1 - p)` is 0 at both ends and peaks at the middle, so a linear sweep of `--p` reads as
// down-then-up with no second layer and no second timeline to keep in sync.

import { TOKENS as T, r2, R, onColor } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Interaction';

// HTML-FIRST FAMILY, with one deliberate exception: `pointer` stays a `cursor` layer, the engine's own
// path-and-click type, not markup pretending to be one. Design Read: instrument chrome (a tray, a
// ring, a face), flat, one accent hue for the interaction's own colour, sans for keys and labels, no
// gradient or card-in-card. VARIANCE low (this vocabulary supports a beat, it is not the beat);
// MOTION is each block's own `vars`/`--p` sweep or its envelope `anim`, never `parts`: nothing here
// has independently-arriving children. docs/CRAFT/HTML-FRAGMENTS.md.

// press depth: 0 → 1 → 0 across the sweep. Linear `--p` in, a symmetric dip out.
const DIP = 'min(var(--p,0), 1 - var(--p,0))';

// ─────────────────────────────────────────────────────────────────────────────
// pointer. The mouse. Travels from {x,y} to `to` and clicks there.
//
// The default `path` is DERIVED from `clickAt` rather than authored: the pointer must ARRIVE before
// it clicks, so the travel leg lands `SETTLE` seconds early and the click fires on a pointer that is
// already still. That relationship is the thing every hand-authored cursor got wrong.
// `path` (a full [{t,x,y}] keyframe list) passes straight through for a multi-stop move; `clicks`
// likewise, so a two-click beat does not need two blocks.
//
// `to` is an absolute stage point `{x,y}` OR a relative move `{dx,dy}` from where the pointer starts.
// Relative is not a convenience: a pointer is the one block whose geometry is TWO points, so a caller
// that repositions the block (or a sheet that lays it out in a cell) silently keeps the old target and
// the pointer walks off the thing it was meant to click. `{dx,dy}` travels WITH the block.
const SETTLE = 0.15;
const target = (to, x, y) => (to == null ? { x, y }
  : { x: to.x != null ? to.x : x + (to.dx || 0), y: to.y != null ? to.y : y + (to.dy || 0) });
export function pointer({ x = 0, y = 0, to = null, clickAt = 0.9, clicks = null, path = null,
  size = 36, color = null, rippleColor = null, start = 0, dur = 3 } = {}) {
  const at = Math.max(0, clickAt);
  // no `to` and no `path` → the pointer simply sits at {x,y} and clicks, which is the correct
  // degenerate case (a click on something the shot is already looking at), not an error.
  const end = target(to, x, y);
  const track = path && path.length ? path
    : [{ t: 0, x, y }, { t: r2(Math.max(0.05, at - SETTLE)), x: end.x, y: end.y }];
  const fires = clicks && clicks.length ? clicks : (clickAt == null ? [] : [r2(at)]);
  return [{
    type: 'cursor', size, start, duration: dur, path: track, clicks: fires,
    ...(color ? { color } : {}), ...(rippleColor ? { rippleColor } : {}),
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// tapRipple. The finger. A phone demo has no arrow to follow, so the ONLY evidence a touch happened
// is the mark it leaves: a dot at the contact point and a ring expanding out of it.
//
// {x,y} IS THE POINT TOUCHED, not a top-left corner. The one deliberate exception to the library's
// box-anchored rule, and it applies to `pointer` too (a cursor's {x,y} is its tip). An interaction
// happens AT a place; a box around it is an implementation detail the author should never have to
// subtract half of. Stated here because it is a deviation, and a silent deviation is a defect.
export function tapRipple({ x = 0, y = 0, at = 0.4, size = 120, color = T.accent, start = 0, dur = 2 } = {}) {
  const s = Math.max(40, Math.round(size)), half = r2(s / 2), dot = Math.round(s * 0.18);
  // width/height driven off `--p` rather than a transform: a scaled border grows its stroke with it,
  // and a ripple whose outline thickens as it expands reads as a balloon instead of a wave.
  const ring = `<div style="position:absolute;left:50%;top:50%;`
    + `width:calc(var(--p,0) * ${s}px);height:calc(var(--p,0) * ${s}px);`
    + `margin-left:calc(var(--p,0) * -${half}px);margin-top:calc(var(--p,0) * -${half}px);`
    + `border:3px solid ${color};border-radius:100%;opacity:calc(1 - var(--p,0))"></div>`;
  const contact = `<div style="position:absolute;left:50%;top:50%;width:${dot}px;height:${dot}px;`
    + `margin:-${r2(dot / 2)}px 0 0 -${r2(dot / 2)}px;border-radius:100%;background:${color};`
    + `opacity:calc(0.8 - var(--p,0) * 0.8)"></div>`;
  const html = `<div style="position:relative;width:${s}px;height:${s}px;pointer-events:none">${ring}${contact}</div>`;
  return [{
    type: 'html', x: r2(x - half), y: r2(y - half), w: s, html,
    start, duration: dur, anim: 'none',
    // nothing is drawn until `--p` leaves 0, so the delay IS the moment of contact.
    vars: { '--p': [0, 1] }, varsDur: 0.55, varsDelay: Math.max(0, at), varsEase: 'easeOutCubic',
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// keyboard. The phone keyboard, so a mobile typing beat has somewhere for the typing to come from.
//
// Native boxes rather than one html blob: the keys are the theme's surfaces, and a tray built from
// tokens reskins with the brand the way every other block in the library does.
//
// RISE IS CORRECT HERE, and it is the one place in the library that is true. `anim:'rise'` is the
// house default that means nothing (see the note in scene.html), but a phone keyboard genuinely
// enters by sliding up from the bottom edge of the screen, so `slide-up` is depicting the real
// behaviour rather than decorating an entrance.
const LAYOUTS = {
  qwerty: [['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
           ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
           ['Z', 'X', 'C', 'V', 'B', 'N', 'M']],
  numeric: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '<']],
};
export function keyboard({ x, y, w = 420, layout = 'qwerty', start = 0, dur = 4 } = {}) {
  const rows = LAYOUTS[layout] || LAYOUTS.qwerty;
  const PAD = 10, GAP = 8, H = layout === 'numeric' ? 56 : 46;
  // one key width for the WHOLE keyboard, derived from the widest row: keys that resize per row are
  // the tell of a drawn keyboard rather than a real one.
  const widest = rows.reduce((n, r) => Math.max(n, r.length), 1);
  const kw = r2(Math.max(24, (w - 2 * PAD - GAP * (widest - 1)) / widest));
  const key = (ch) => `<div style="width:${kw}px;height:${H}px;border-radius:${R.tight}px;background:${T.card};`
    + `display:flex;align-items:center;justify-content:center;font:500 ${layout === 'numeric' ? 26 : 22}px var(--font-sans);`
    + `color:${T.ink}">${ch}</div>`;
  const row = (r) => `<div style="display:flex;align-items:center;justify-content:center;gap:${GAP}px">`
    + r.map(key).join('') + '</div>';
  const html = `<div style="display:flex;flex-direction:column;gap:${GAP}px;box-sizing:border-box;width:${w}px;`
    + `padding:${PAD}px;background:${T.surface};border-radius:${R.soft}px">` + rows.map(row).join('') + '</div>';
  // RISE IS CORRECT HERE, and it is the one place in the library that is true: a phone keyboard
  // genuinely enters by sliding up from the bottom edge of the screen, so `slide-up` depicts the real
  // behaviour rather than decorating an entrance.
  return [{
    type: 'html', x, y, w, html,
    start, duration: dur, anim: 'slide-up', out: 'slide-down', enterDur: 0.45, exitDur: 0.3,
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// pressButton. A CTA that is actually PRESSED. `card`'s CTA has no press state, so a scene could
// point a cursor at a button and the button never acknowledged it: the gesture had no payoff and the
// cut had to carry the whole beat. Here the surface travels down into its own shadow and comes back.
//
// `pressAt` is the moment of CONTACT, and the dip is centred on it, so a `pointer` clicking at the
// same second lands on a button that moves under it, with no offset to work out at the call site.
export function pressButton({ x, y, w = 260, label = '', pressAt = 0.8, color = T.accent,
  radius = R.tight, start = 0, dur = 3 } = {}) {
  const SWEEP = 0.44;
  const fg = onColor(color);
  const face = `<div style="box-sizing:border-box;width:${w}px;padding:16px 22px;border-radius:${radius}px;`
    + `background:${color};text-align:center;`
    + `font:700 20px var(--font-sans);color:${fg};letter-spacing:-0.01em;`
    // the shadow shortens and tightens as the face descends, which is what selling the travel
    // actually depends on: a button that moves with a fixed shadow reads as sliding, not pressing.
    + `box-shadow:0 calc(8px - ${DIP} * 12px) calc(20px - ${DIP} * 22px) color-mix(in srgb, var(--text) 24%, transparent);`
    + `transform:translateY(calc(${DIP} * 10px)) scale(calc(1 - ${DIP} * 0.06))">${label}</div>`;
  return [{
    type: 'html', x, y, w, html: `<div style="width:${w}px">${face}</div>`,
    start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    // linear, so the triangle is symmetric in TIME as well as in value: an eased sweep would make
    // the release slower than the press, which is the opposite of how a finger leaves a button.
    vars: { '--p': [0, 1] }, varsDur: SWEEP, varsDelay: r2(Math.max(0, pressAt - SWEEP / 2)),
    varsEase: 'linear',
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table, with ONE thing worth saying here: for `pointer`
// and `tapRipple`, x and y are the POINT touched rather than a top-left corner. That is still
// placement, so it is still the scene's, but it is not the same placement the other blocks take.
//
// The moment dials (`clickAt`, `at`, `pressAt`) are the block's own choreography, not scene timing,
// so they ARE dials: they are seconds measured from the block's start.
export const INTERACT_SCHEMAS = {
  pointer: {
    // An absolute stage point {x,y}, OR a relative move {dx,dy} that travels WITH the block. Null
    // leaves the pointer where it starts and clicks there, which is the correct degenerate case.
    to: { kind: 'oneOf', of: [
      { kind: 'row', fields: { x: { kind: 'num', min: -1e4, max: 1e4 }, y: { kind: 'num', min: -1e4, max: 1e4 } } },
      { kind: 'row', fields: { dx: { kind: 'num', min: -1e4, max: 1e4 }, dy: { kind: 'num', min: -1e4, max: 1e4 } } },
    ], def: null },
    // The travel lands 0.15s before this, so the click fires on a pointer that is already still.
    clickAt: { kind: 'num', min: 0, max: 60, def: 0.9 },
    // Given, these replace the derived single click and the derived two-point path.
    clicks: { kind: 'list', of: { kind: 'num', min: 0, max: 60 }, def: null },
    path: { kind: 'list', of: { kind: 'row', fields: {
      t: { kind: 'num', min: 0, max: 60 },
      x: { kind: 'num', min: -1e4, max: 1e4 },
      y: { kind: 'num', min: -1e4, max: 1e4 },
    } }, def: null },
    size: { kind: 'int', min: 12, max: 200, def: 36 },
    color: { kind: 'color', def: null },
    rippleColor: { kind: 'color', def: null },
  },

  tapRipple: {
    // The moment of contact: nothing is drawn until the sweep leaves zero.
    at: { kind: 'num', min: 0, max: 60, def: 0.4 },
    // The ring's final diameter, floored at 40 inside the factory (below that the contact dot and
    // the 3px ring stroke are the whole graphic and there is no wave to read).
    size: { kind: 'int', min: 40, max: 800, def: 120 },
    color: { kind: 'color', def: 'var(--accent)' },
  },

  keyboard: {
    w: { kind: 'int', min: 160, max: 1080, def: 420 },
    // Read off LAYOUTS itself, so a new tray cannot exist without the dial knowing it.
    layout: { kind: 'enum', of: Object.keys(LAYOUTS), def: 'qwerty' },
  },

  pressButton: {
    w: { kind: 'int', min: 80, max: 1080, def: 260 },
    label: { kind: 'str', max: 40, def: '' },
    // The moment of CONTACT. The dip is centred on it, so a `pointer` clicking at the same second
    // lands on a button that moves under it.
    pressAt: { kind: 'num', min: 0, max: 60, def: 0.8 },
    color: { kind: 'color', def: 'var(--accent)' },
    radius: { kind: 'int', min: 0, max: 100, def: 12 },
  },
};
