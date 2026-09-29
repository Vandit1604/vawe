// core/layers/cursor.js: a pointer that follows a `path` ([{t,x,y}] keyframes) and clicks at
// `clicks:[t…]`. The core of a product demo. Its shape is one of four `style`s (arrow/hand/ibeam/
// block), it can switch shape mid-move (`styleAt`), carry a name tag (`label`), ease magnetically onto
// another layer's live box (`snapTo`) and drag a layer along with it (`carry`, bound in
// core/engine/produce.js onto the dragged layer's own `follow`).
import { mergeProps, propsOf } from '../registry/props.js';
import { defineRegistry } from '../registry/registry.js';
import { motionAt } from '../timeline/sequence.js';
import { ensureContrast } from '../color/engine.js';

// A real pointer is a light shape with a DARK outline: the fill separates it from a light ground, the
// outline separates it from a dark one. Always white here was backwards (core/color/engine.js owns
// the one WCAG contrast check every consumer shares; this does not add a second). `'#141414'`, not
// pure black, is the engine's own near-black ink literal (used as the default ink everywhere else in
// this file) rather than a second grey invented for this one spot.
const outlineFor = (color) => ensureContrast('#ffffff', color, { min: 3, dark: '#141414' });

// The two shapes a real OS pointer look applies to: an arrow and a pointing hand, both drawn with a
// fill AND an outline. `ibeam` (a caret, stroke only) and `block` (a terminal cell, one flat fill) are
// not pointer glyphs and keep tracking the theme's own ink by default, see glyphColor below.
const POINTER_STYLES = new Set(['arrow', 'hand']);

// STYLE DRAWING, one function per name: (color, sz) -> the glyph markup, in a `sz`x`sz` box, origin
// top-left. `arrow`'s PATH is the ORIGINAL pixels, byte-identical, because scenes already shipped
// depending on exactly it. Its default COLOUR changed (see glyphColor/POINTER_STYLES below): every
// scanned scene left `color` unset, so this is a deliberate visible change to all of them, not a
// silent one.
const drawArrow = (color, sz) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))"><path d="M5 2.5 L5 19.5 L9.4 15.4 L12.3 21.3 L14.9 20.1 L12 14.3 L18.2 13.8 Z" fill="${color}" stroke="${outlineFor(color)}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

const drawHand = (color, sz) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))"><path d="M9 3.2a1.1 1.1 0 0 1 2.2 0v6.9l.9-.2a1.4 1.4 0 0 1 1.7.9l.2.6.7-.1a1.4 1.4 0 0 1 1.7 1l.7 2.7c.5 2-.5 4-2.4 4.8l-1.2.5a4.6 4.6 0 0 1-5.4-1.5l-2.2-3a1.6 1.6 0 0 1 2.4-2.1l.2.2V3.2Z" fill="${color}" stroke="${outlineFor(color)}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const drawIbeam = (color, sz) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))"><path d="M8 3.2h8M12 3.2v17.6M8 20.8h8" stroke="${color}" stroke-width="2.1" stroke-linecap="round" fill="none"/></svg>`;

// A filled terminal cell. Blink is NOT drawn here: it is opacity, driven every frame off `t` (see
// frame() below), so the glyph itself is always fully opaque.
const drawBlock = (color, sz) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0"><rect x="3" y="2" width="13" height="20" fill="${color}"/></svg>`;

export const CURSOR_STYLES = defineRegistry('cursor style', {
  arrow: drawArrow, hand: drawHand, ibeam: drawIbeam, block: drawBlock,
}, {
  slot: 'style',
  // The words an author actually types for each shape: the blurbs describe the glyph, these name it.
  aka: {
    arrow: ['mouse pointer', 'arrow cursor', 'default cursor'],
    hand: ['pointer hand', 'hand cursor', 'link cursor', 'clickable cursor'],
    ibeam: ['i-beam', 'text cursor', 'text selection cursor'],
    block: ['terminal cursor', 'block caret', 'block cursor'],
  },
  blurbs: {
    arrow: 'the default macOS pointer arrow, unchanged pixels from before this registry existed',
    hand: 'a pointing hand, for hovering a clickable button or link in a product demo',
    ibeam: 'a text-selection I-beam: an 8px serif cap at top and bottom joined by a 17.6px vertical stroke, 2.1px wide, for hovering editable or selectable text',
    block: 'a filled terminal cell that blinks on a fixed cadence, a block text cursor',
  },
  catalog: {
    title: 'Cursor styles',
    tag: 'per-layer',
    intro: 'What shape a `cursor` layer draws (`"style": "hand"`), and how it can change mid-move '
      + '(`styleAt`). Arrow is the pointer default; hand/ibeam/block read as hovering a control, '
      + 'hovering text, or a terminal caret.',
    usage: (name) => ({ type: 'cursor', style: name }),
    // Same reasoning as the layer-type registry's own noPreview (core/layers/index.js): a cursor
    // style is the shape of a thing this page already shows moving in every cursor demo, never a
    // subject a neutral still could show on its own.
    noPreview: 'a cursor style is a shape, not a motion: every pointer demo on this page already '
      + 'shows one moving. A still swatch of a hand or an I-beam sitting on a blank frame says nothing '
      + 'a name does not already say.',
  },
});

const EDGES = ['center', 'above', 'below', 'left', 'right'];

// resolveStyleAt(styleAt, lt, def): the style in force at `lt`, the LAST keyed entry whose `t` has
// passed, order-independent (an author's array need not be sorted). Falls back to the layer's own
// `style` (or "arrow") before the first keyed change.
function resolveStyleAt(styleAt, lt, def) {
  if (!styleAt || !styleAt.length) return def;
  let cur = def, curT = -Infinity;
  for (const e of styleAt) {
    if (!e || typeof e.t !== 'number' || typeof e.style !== 'string')
      throw new Error(`cursor styleAt entries need {t:<number>, style:"<name>"}, got ${JSON.stringify(e)}.`);
    if (e.t <= lt && e.t > curT) { cur = e.style; curT = e.t; }
  }
  return cur;
}

// landingPoint(b, edge): the point on a LIVE box (scene.boxOf's shape) that `snapTo` eases onto.
// Mirrors the edge vocabulary core/tracks/follow.js already uses, so "below"/"above"/"left"/"right"
// mean the same thing everywhere a box is targeted.
function landingPoint(b, edge) {
  const hw = (b.w * b.scale) / 2, hh = (b.h * b.scale) / 2;
  if (edge === 'above') return { x: b.cx, y: b.cy - hh };
  if (edge === 'below') return { x: b.cx, y: b.cy + hh };
  if (edge === 'left') return { x: b.cx - hw, y: b.cy };
  if (edge === 'right') return { x: b.cx + hw, y: b.cy };
  return { x: b.cx, y: b.cy };
}

// resolveSnap(snapTo, lt): which entry governs `lt`, and how far into its ease (0 = still on the
// path, 1 = fully stuck to the live box). Entries are windows [t-dur, t]; once one has started it
// HOLDS at w=1 (still tracking the live, moving box) until a later entry's window begins, so a magnet
// that has already landed keeps riding the target instead of snapping back to the path.
function resolveSnap(snapTo, lt) {
  if (!snapTo || !snapTo.length) return null;
  const sorted = [...snapTo].sort((a, b) => (a && a.t) - (b && b.t));
  let gov = null;
  for (const e of sorted) {
    if (!e || typeof e.id !== 'string' || typeof e.t !== 'number')
      throw new Error(`cursor snapTo entries need {t:<number>, id:"<layer>"}, got ${JSON.stringify(e)}.`);
    const dur = Math.max(0.001, e.dur ?? 0.6);
    if (lt >= e.t - dur) gov = e;
  }
  if (!gov) return null;
  const edge = gov.edge || 'center';
  if (!EDGES.includes(edge)) throw new Error(`cursor snapTo edge "${edge}", known: ${EDGES.join(', ')}.`);
  const dur = Math.max(0.001, gov.dur ?? 0.6);
  const p = Math.min(1, Math.max(0, (lt - (gov.t - dur)) / dur));
  return { id: gov.id, edge, w: p * p * (3 - 2 * p) }; // smoothstep
}

// pathOffsetAt(L, t): the pointer's on-screen offset from ITS OWN `path` alone, at the ABSOLUTE film
// time `t`. Exported as `expose()` (core/layers/index.js) so films/scene/scene.js can ask a cursor's
// LIVE point through `boxOf`, exactly as it asks every other layer's box, instead of a second private
// copy of this arithmetic. `frame()` below reads the SAME `path` the same way, through `kit.motionAt`
// (the identical function, re-exported into the kit rather than a second import) so the two can never
// disagree about where the pointer sits from `path` alone.
//
// KNOWN GAP, named rather than silently wrong: `expose()` never receives `scene` (core/layers/index.js
// hands every type's expose() a null one, on purpose, so no type can build a dependency cycle on
// another layer's box). So the offset a `snapTo` magnet contributes is invisible here: a layer
// `follow`ing this cursor (including a `carry` binding) tracks its `path` motion faithfully but reads
// a stale point while the magnet is easing in or holding. `carry`'s own documentation says why that is
// an acceptable gap for the shape the feature targets: the grab happens through `snapTo`, the DRAG
// that follows is authored as `path`, and it is the drag that needs a live target.
export function expose(L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return null;
  if (!L.path || !L.path.length) return null;
  const { dx, dy } = motionAt(L.path, t - start);
  return Object.freeze({ dx, dy });
}

// The props are read off these signatures (propsOf, core/props.js). No second list to drift from them.
// `carry` is the one exception: it is read only at BOOT (core/engine/produce.js bakeCursorCarry), never
// inside this file, so it is declared by hand below, the same shape a guarded prop keeps.
export function build(kit, el, L, { size, x, y, color, rippleColor, style, styleAt, label, path, snapTo } = L) {
  const sz = size ?? 34;
  // A cursor with none of `path`, `snapTo`, `x` or `y` has no way to ever move: the (0,0) default two
  // lines below is the base every one of those would sit ON TOP of, and with all four absent nothing
  // moves it off that base for the layer's whole life. No error, no warning: the JSON looks like a
  // normal cursor and the render is a pointer nailed to the top-left corner, the same accepted-then-
  // ignored class core/layers/vocabulary.js checkLayer refuses for a dead prop. A cursor parked there
  // ON PURPOSE still has a way to say so: write the position explicitly, `"x": 0, "y": 0`.
  if (!path && !snapTo && x == null && y == null)
    throw new Error(`layer${L.id ? ` "${L.id}"` : ''} (cursor): no \`path\`, \`snapTo\`, \`x\` or \`y\`, `
      + `so this pointer would sit at (0,0) for its whole life with nothing on screen to say why. Give `
      + `it motion: a \`path\` [{t,x,y}], a \`snapTo\` onto another layer's box, or a starting \`x\`/\`y\`. `
      + `A cursor parked there on purpose still needs an explicit position: write \`"x": 0, "y": 0\`.`);
  // `path` coords are ABSOLUTE screen px by default: with no authored x/y, anchor the base at (0,0)
  // so a keyframe {x,y} lands the pointer there (scene.html otherwise defaults every layer to 60,240,
  // which silently offset the click target). An explicit x/y still sets the base (path = relative to it).
  if (x == null && y == null) { el.style.left = '0px'; el.style.top = '0px'; }
  el.style.width = sz + 'px'; el.style.height = sz + 'px'; el.style.pointerEvents = 'none';
  // Every style this cursor could ever show is checked NOW, not the first time the clock walks over
  // it: a typo three seconds into `styleAt` would otherwise render fine for three seconds and throw on
  // whichever frame happens to reach it, which could be the first frame a seek or a probe samples.
  CURSOR_STYLES.pick(style || 'arrow');
  for (const e of (styleAt || [])) CURSOR_STYLES.pick(e && e.style);
  el.innerHTML = `<div class="hs-cur-ripple" style="position:absolute;left:6px;top:5px;width:64px;height:64px;margin:-32px;border-radius:50%;border:3px solid ${rippleColor || 'rgba(37,99,235,0.7)'};transform:scale(0);opacity:0"></div>`
    + `<div class="hs-cur-glyph" style="position:absolute;left:0;top:0;width:${sz}px;height:${sz}px"></div>`;
  // The name tag, lower-right of the point and in the CURSOR's own colour, the Figma multiplayer-
  // cursor convention: a tag that always matches its pointer reads as one person even in a crowd of
  // them. Built as a real DOM node with `textContent`, never string-concatenated into `innerHTML`,
  // so an author's label text can never be read back as markup.
  if (label && label.text) {
    const tag = document.createElement('div');
    tag.className = 'hs-cur-label';
    const bg = label.color || color || '#141414';
    const fontPx = Math.max(24, Math.round(sz * 0.7)); // readable at video size: >=24px at 1920 wide
    tag.style.cssText = `position:absolute;left:${Math.round(sz * 0.55)}px;top:${Math.round(sz * 0.6)}px;`
      + `background:${bg};color:#ffffff;font:700 ${fontPx}px var(--font-sans, sans-serif);`
      + `padding:4px 10px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.35)`;
    tag.textContent = label.text;
    el.appendChild(tag);
  }
}
// The glyph swap: memoised on the element (the ripple pattern below states why), so a cursor that
// never changes style pays one DOM write for the life of the layer, not one a frame.
function applyCursorGlyph(kit, el, curStyle, lt, { size, color }) {
  if (el.__glyphEl === undefined) el.__glyphEl = el.querySelector('.hs-cur-glyph');
  const glyphEl = el.__glyphEl;
  if (glyphEl && el.__curStyle !== curStyle) {
    el.__curStyle = curStyle;
    const draw = CURSOR_STYLES.pick(curStyle);
    // A POINTER shape (arrow/hand) defaults to a plain white system cursor (ibeam/block keep matching
    // the theme's own ink, per this feature's original brief).
    const glyphColor = color || (POINTER_STYLES.has(curStyle) ? '#ffffff' : (kit.theme?.palette?.ink || '#141414'));
    glyphEl.innerHTML = draw(glyphColor, size ?? 34);
  }
  // `block`'s blink: opacity on a FIXED CADENCE DERIVED FROM t, never a timer, so seeking to any frame
  // reproduces the identical on/off state.
  if (glyphEl) glyphEl.style.opacity = curStyle === 'block' ? (Math.floor(lt / 0.5) % 2 === 0 ? '1' : '0') : '';
  return glyphEl;
}

function cursorClickState(clicks, lt, kit) {
  let s = 1, rip = -1;
  for (const c of (clicks || [])) {
    const d = lt - c;
    if (d >= 0 && d < 0.45) { s = Math.min(s, 1 - 0.22 * Math.sin(kit.clamp01(d / 0.11) * 3.14159)); rip = d / 0.45; }
  }
  return { s, rip };
}

// snapTo: blend the path position toward the target's LIVE box centre (or edge), weight 0..1 across
// the ease window, so a magnet pulls the pointer onto a card even while the card keeps moving.
function applyCursorSnap(scene, el, snapTo, lt, pm) {
  let dx = pm.dx, dy = pm.dy;
  const snap = resolveSnap(snapTo, lt);
  if (!snap) return { dx, dy };
  const b = scene.boxOf(snap.id);
  if (!b) throw new Error(`cursor snapTo names layer "${snap.id}", which this scene does not have. `
    + `Known ids: ${scene.ids.join(', ') || '(this scene has none)'}.`);
  const land = landingPoint(b, snap.edge);
  const baseX = parseFloat(el.style.left) || 0, baseY = parseFloat(el.style.top) || 0;
  dx += (land.x - baseX - dx) * snap.w;
  dy += (land.y - baseY - dy) * snap.w;
  return { dx, dy };
}

// The ripple ring is built once and never replaced; memoised on the element so a demo's pointer does
// not walk its own subtree on every frame.
function applyCursorRipple(el, rip) {
  if (el.__ripple === undefined) el.__ripple = el.querySelector('.hs-cur-ripple');
  const rp = el.__ripple;
  if (!rp) return;
  const on = rip >= 0 && rip < 1;
  rp.style.opacity = on ? (0.8 * (1 - rip)).toFixed(2) : '0';
  rp.style.transform = `scale(${on ? (0.2 + rip * 1.7).toFixed(2) : 0})`;
}

// The pattern sits AFTER every argument the dispatcher passes, and that position is load-bearing.
// core/layers/index.js calls frame(kit, el, L, t, scene) with five arguments, so a pattern in the
// fifth slot destructures `scene` and every prop reads undefined. lib-test asserts the arity.
export function frame(kit, el, L, t, scene, { path, clicks, style, styleAt, snapTo, size, color } = L) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const lt = t - start;

  const curStyle = resolveStyleAt(styleAt, lt, style || 'arrow');
  applyCursorGlyph(kit, el, curStyle, lt, { size, color });

  const pm = (path && path.length) ? kit.motionAt(path, lt) : { dx: 0, dy: 0 };
  const { s, rip } = cursorClickState(clicks, lt, kit);
  const { dx, dy } = applyCursorSnap(scene, el, snapTo, lt, pm);

  el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})`;
  applyCursorRipple(el, rip);
}

// Both signatures declare, because a prop read only on the frame path is just as real as one read at
// build time. mergeProps unions them (core/props.js). `carry` is read only at boot, see above.
export const PROPS = mergeProps(propsOf(build), propsOf(frame), { carry: {} });

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make regen`). core/layers/index.js refuses one without it.
export const blurb = "a pointer that follows [{t,x,y}] keyframes (`path`) or eases magnetically onto "
  + "another layer's live box (`snapTo`), fires a ripple at `clicks`, can change shape mid-move "
  + "(`style`/`styleAt`: arrow/hand/ibeam/block), carry a name tag (`label`), and drag another layer "
  + "along with it (`carry`)";
