// core/layers/util.js: shared helpers for the layer primitives (core/layers/*). `createKit(ctx)` binds
// them to the scene's services (theme, inkAt, cam, splitText, …) so every primitive builder is a small
// pure-ish file that takes the kit. Ported verbatim from scene.html's inline helpers (byte-identical).

import { applyLayerFilter } from '../looks/filters.js';
import { droppedProps } from '../type/sanitize-html.js';
import { isLook, applyComposite } from '../looks/index.js';
// isLightBg is core/motion.js's single definition of light-versus-dark, in linear light. Every part of
// this engine that has to tell a light ground from a dark one asks THAT function; a second hand-kept
// copy of the question is engine-doctrine/MISTAKES.md #159.
import { isLightBg, parseColor } from '../color/engine.js';
// The frame authority. One builder, so a kit that has to derive a frame derives the SAME one boot did.
import { frameOf } from '../layout/safe.js';
import { resolveGroupClock } from '../timeline/group-clock.js';

// REFUSE A VALUE THE BROWSER WOULD DROP, at every named style write, not only the `css` catch-all
// (applyCss below already does this for `L.css`; this is the same check, same mechanism, extended to
// the direct `a named write of the shape el.style.<css> = L.<prop>` writes that named props use instead of the passthrough). Assigning an
// invalid value to `el.style` is a silent no-op: the property keeps its unset value, nothing throws,
// and the layer renders as if the author never asked (`"color": "accent"` instead of
// `"color": "var(--accent)"` is the reported case: valid JSON, invalid CSS, and the browser's own
// parser is the only thing that ever sees the failure). `droppedProps` is core/type/sanitize-html.js's
// scratch-element round-trip, already imported above: it asks the browser rather than re-implementing
// a second CSS grammar that drifts from the real one.
export function checkDropped(L, obj) {
  const bad = droppedProps(obj);
  if (!bad.length) return;
  // A bare identifier ("accent") is never a CSS value on its own; it is almost always a theme token
  // typed without its var() wrapper, so name the fix rather than just the failure.
  const hinted = bad.map((b) => {
    const val = b.slice(b.indexOf(': ') + 2);
    return /^[a-zA-Z][\w-]*$/.test(val) ? `${b} (did you mean \`var(--${val})\`?)` : b;
  });
  throw new Error(`layer${L.id ? ` "${L.id}"` : ''} (type "${L.type || 'text'}"): the browser drops `
    + `${bad.length === 1 ? 'this css declaration' : 'these css declarations'}, ${hinted.join(' · ')}. `
    + `It would keep the rest and render on, so nothing would fail and the layer would simply never do it.`);
}

// hexA('#5e6ad2', .25) → rgba string (glow/beam colours come as brand hex)
export function hexA(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// GLYPH_PAINTERS: the effects that repaint every CHARACTER against a ground of their own, so the
// layer's resolved ink is not the ink any glyph is actually drawn in.
//   • `ransom` (core/ransom.js) cuts each letter as a tile: a dark ink on a light paper swatch, chosen
//     per glyph from a fixed table. A ransom headline whose LAYER colour is a light one is therefore
//     dark-on-light everywhere the eye can see, and the layer reads light-on-dark.
// Polarity questions asked of such a layer get `false`, which is today's rendered behaviour and the
// conservative direction: the polarity term only ever ADDS an optical lift, so declining to answer
// leaves the type exactly as it renders with no lift at all. Answering per glyph would be the complete
// fix, and it cannot be done from here: the tiles are painted after build, by an effect that owns them.
//
// Adding an effect that paints its own per-character ground? Add its layer prop to this list.
export const GLYPH_PAINTERS = ['ransom'];
export const paintsOwnGlyphs = (L) => !!L && GLYPH_PAINTERS.some((k) => L[k]);

// childExitDur(C, rootL) -> the exitDur a group child's DOM element should carry, or undefined (the
// caller's own BASE_EXIT default then applies). A child that states its own `exitDur` always wins; one
// that states none HOLDS ITS PARENT'S, because a group's `exitDur:0` ("held to the beat's own end", see
// the beat blueprints) said nothing about its children, who fell straight through to driveClips' 0.26s
// default. That default was invisible behind a hard cut (the last quarter-second is erased anyway) and
// a blank field behind a dissolve, which crosses exactly the window the fade had already emptied. Pure,
// so the inheritance rule is testable without a DOM (addGroupChild needs one for everything else it does).
export const childExitDur = (C, rootL) => C.exitDur ?? rootL.exitDur;

// childContentStart(C, rootL, delayOffset) -> the group-relative offset (seconds into rootL's own
// window, same base `delay` counts from) a child's CONTENT clock reads from: which moment of a video,
// a typed line, a count or a `parts` figure is showing. Kept separate from the VISIBILITY window
// above on purpose: a video can start its source clip, hidden, before the child appears, so it reads
// mid-clip the instant it is on screen, without moving when it appears. Absent -> the child's own
// `delay`, so an unauthored field renders byte-identical to today. Validated and clamped here, the
// one place both the offset and the group's own span are already in scope.
export function childContentStart(C, rootL, delayOffset) {
  if (C.contentStart == null) return (rootL.start ?? 0) + delayOffset;
  const cs = +C.contentStart;
  if (!Number.isFinite(cs) || cs < 0)
    throw new Error(`layer${C.id ? ` "${C.id}"` : ''} (type "${C.type || 'text'}"): \`contentStart\` `
      + `must be a non-negative number of seconds into the group's window, got ${JSON.stringify(C.contentStart)}.`);
  const span = rootL.duration ?? 0;
  if (cs > span) {
    console.log(`adapted content-start: child ${C.id || C.type} contentStart ${cs} -> ${span} `
      + `(would start its content past the group's own end)`);
    return (rootL.start ?? 0) + span;
  }
  return (rootL.start ?? 0) + cs;
}

// The props the SHARED KIT reads, for every layer type that calls it, the type styling, the chip box,
// the decoration pass, the group layout, and a group child's own timing. A prop honoured here is honoured
// everywhere, which is why it is one flat set and not a per-type one.
//
// A group CHILD is the same object under the name `C`, and the reads are the same reads: the child path
// delegates to the primitive builder rather than re-implementing it. So there is nothing extra to declare
// for a child except what the group's own layout gives it (`grow`, `basis`, `delay`).
export const PROPS = {
  // styleText
  font: {}, italic: {}, weight: {}, tracking: {}, ls: {}, size: {}, w: {}, align: {}, color: {},
  emColor: {}, text: {}, prefix: {}, from: {}, decimals: {}, suffix: {},
  // chipBox
  bg: {}, border: {}, shadow: {}, elevation: {}, glow: {}, pad: {}, radius: {}, on: { when: 'elevation' },
  intensity: { when: 'glow' },
  // decoration: glass / crt / progressive blur / border trail / mask / look / reflect / logotype / base opacity
  glass: {}, crt: {}, progressiveBlur: {}, borderTrail: {}, mask: {}, falloff: {}, filter: {}, lookOpts: { when: 'filter' },
  fade: {}, reflect: {}, logotype: {}, opacity: {}, css: {},
  // layoutGroup
  layout: {}, gridCols: { when: 'layout' }, colw: { when: 'layout' }, colGap: {}, gap: {}, rowGap: {},
  items: {}, align2: {}, direction: {}, wrap: {}, justify: {}, h: {},
  // a group child's own box and timing (addGroupChild / sizeChild)
  grow: {}, basis: {}, delay: {}, contentStart: {}, critical: {}, x: {}, y: {}, split: {}, origin: {},
  // a GROUP's own local clock (resolveGroupWindow / core/timeline/group-clock.js): its children's
  // tracks run on this cycle instead of the group's outer start/duration.
  clock: {},
};

// crtSpec(o) -> { filter, background }. Pure, and exported so the arithmetic is testable without a
// DOM, the same reason core/layers/glow.js exports presetSpec.
export function crtSpec(o = {}) {
  const bloom = o.bloom ?? 1.6;
  const gap = Math.max(2, o.gap ?? 3);
  const scan = Math.max(0, Math.min(gap, o.scan ?? 1));
  const lines = o.lines ?? 0.34;
  const vig = o.vignette ?? 0.5;
  // The lift is TIED to the blur rather than being its own dial. Blurring alone DIMS a bright glyph,
  // because it spreads the same light over more area, so the two have to move together or turning up
  // the softness quietly turns down the picture.
  const filter = bloom > 0
    ? `blur(${bloom}px) brightness(${(1 + bloom * 0.14).toFixed(3)}) saturate(${(1 + bloom * 0.08).toFixed(3)})`
    : '';
  const layers = [];
  if (o.tint) layers.push(`linear-gradient(${o.tint}, ${o.tint})`);
  if (vig > 0) layers.push(`radial-gradient(120% 120% at 50% 50%, transparent 38%, rgba(0,0,0,${vig.toFixed(3)}) 100%)`);
  if (lines > 0 && scan > 0) {
    layers.push(`repeating-linear-gradient(to bottom, rgba(0,0,0,${lines.toFixed(3)}) 0 ${scan}px, transparent ${scan}px ${gap}px)`);
  }
  return { filter, background: layers.join(',') };
}

// falloffMask(o) -> a CSS mask-image radial-gradient string. Pure, exported for the same reason
// crtSpec/presetSpec are: testable with plain node, no DOM.
//
// THE AE GRADIENT-RAMP ROLE, generalised to any layer instead of owned by one effect. Volumetric
// light in After Effects is never one filter: a coloured solid (the layer's own paint), a feathered
// mask (WHERE the light is) and a gradient ramp (the falloff, 1 at the source, 0 with distance),
// composited with a blend. This function is only the third piece, because the first two already exist
// on every layer (its own colour/texture) and `mask-image` already reads alpha, not a second channel
// this engine would have to invent. `fade:"edges"` (below, applyFalloff) proved the wiring: a fixed
// radial alpha mask on any layer's own element. `falloff` is the parametric, invertible version of
// the same primitive, not a second mechanism next to it.
//
// o: { cx, cy: 0..1 within the layer's own box (default 0.5, matches glow's cx/cy convention) ·
//      radius: 0..~1.5, fraction of the box where alpha reaches its far end (default 0.6) ·
//      feather: 0..1, fraction of radius that stays at the near value before the ramp starts (default 0.35) ·
//      amount: 0..1, the far end's alpha (default 1: fully opaque/transparent). A vignette wants a
//        DIM, not a cut: `amount:0.6` stops the ramp at 60% alpha instead of a hard edge ·
//      invert: swap the ramp, 0 at the source growing to `amount` with distance, the vignette shape }
//
// mask-image reads the ALPHA channel here (opaque vs transparent), the same convention `fade` and
// `mask` already use in this file: the colour named in the gradient is never shown, only its alpha.
//
// falloffCurve(o) is the ONE definition: it decides inner/outer radius and the near/far VALUES (unit-
// less, 0..1) that every emitter ramps between. falloffMask (CSS), falloffCanvasGradient (canvas2d)
// and FALLOFF_GLSL (a shader snippet) are three renderings of this same curve, never three curves: all
// three interpolate LINEARLY between the same (inner, near) and (r, far) points, because that is what
// a CSS/canvas gradient stop already does, and a GLSL emitter that used `smoothstep` instead would be
// a second, silently different curve behind the same name. A call site whose own shape is not this
// flat-then-linear-ramp (a smoothstep ease, a multi-stop colour blend, a Gaussian) does not fit and is
// left as its own hand-rolled code, not bent to match.
export function falloffCurve(o = {}) {
  const r = Math.max(0.01, o.radius ?? 0.6);
  const feather = Math.max(0, Math.min(1, o.feather ?? 0.35));
  const inner = Math.max(0, r * (1 - feather));
  const amount = Math.max(0, Math.min(1, o.amount ?? 1));
  const near = o.invert ? 0 : 1;
  const far = o.invert ? amount : 1 - amount;
  return { cx: o.cx ?? 0.5, cy: o.cy ?? 0.5, r, inner, near, far };
}

// falloffAt(distFrac, curve): the curve's value (0..1, scaled by near/far) at a given distance from
// (cx,cy), in the same fraction-of-box units as `curve.r`. The pure sample point every emitter's own
// maths must agree with; `falloff.test.mjs`'s numeric-parity check drives this same function.
export function falloffAt(distFrac, curve) {
  const { inner, r, near, far } = curve;
  if (r <= inner) return distFrac <= inner ? near : far;
  const t = Math.max(0, Math.min(1, (distFrac - inner) / (r - inner)));
  return near + (far - near) * t;
}

export function falloffMask(o = {}) {
  const c = falloffCurve(o);
  const cx = (c.cx * 100).toFixed(1), cy = (c.cy * 100).toFixed(1);
  const r = c.r * 100, inner = c.inner * 100;
  const near = `rgba(0,0,0,${c.near})`, far = `rgba(0,0,0,${c.far})`;
  const stops = `${near} 0%, ${near} ${inner.toFixed(1)}%, ${far} ${r.toFixed(1)}%`;
  return `radial-gradient(${r.toFixed(1)}% ${r.toFixed(1)}% at ${cx}% ${cy}%, ${stops})`;
}

// falloffCanvasGradient(ctx, cx, cy, radiusPx, o, colorAt): the canvas2d emitter. `colorAt(v)` turns
// the curve's unitless near/far value into this call site's own colour string (the shared curve owns
// no colour, same as falloffMask). Only fits a site whose gradient is genuinely this shape: one colour,
// alpha ramping flat-then-linear from near to far. A gradient with its own colour stops (a base fill, a
// hue sweep) or more than two ramp segments is not this curve and stays hand-rolled.
export function falloffCanvasGradient(ctx, cx, cy, radiusPx, o, colorAt) {
  const c = falloffCurve(o);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
  const innerFrac = c.r > 0 ? Math.min(1, c.inner / c.r) : 0;
  g.addColorStop(0, colorAt(c.near));
  if (innerFrac > 0) g.addColorStop(innerFrac, colorAt(c.near));
  g.addColorStop(1, colorAt(c.far));
  return g;
}

// FALLOFF_GLSL: the shader emitter, a plain function any fragment shader string can splice in. `mix`
// is GLSL's linear interpolation, the exact operation a CSS/canvas gradient stop performs, so this is
// the same curve, not `smoothstep`'s cubic ease. Params are `curve.r`/`curve.inner`/`curve.near`/
// `curve.far`, already in the shader's own UV-fraction units (falloffCurve does no *100 scaling).
export const FALLOFF_GLSL = `float falloffAt(vec2 uv, vec2 c, float r, float inner, float near, float far) {
  float d = length(uv - c);
  float t = clamp((d - inner) / max(r - inner, 1e-5), 0.0, 1.0);
  return mix(near, far, t);
}`;

// PADDING IS NOT PAINT, so it is written BEFORE the box-paint guard: padding on an unpainted box is
// meaningful (it moves the content) and used to be silently discarded there (65 layers across 19
// scenes, surfaced as a clipped glyph).
function applyChipPadding(el, L) {
  if (L.pad == null) return;
  const pad = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
  checkDropped(L, { padding: pad });
  el.style.padding = pad;
}

function applyChipPaint(el, L) {
  if (L.bg) { checkDropped(L, { background: L.bg }); el.style.background = L.bg; } else if (L.elevation) el.style.background = 'var(--surface)';
  // The RESTING radius, written once at build. A keyed `radius` (core/timeline/sequence.js POSE)
  // overwrites this per frame from films/scene/scene.js resolveBoxes.
  const radius = typeof L.radius === 'number' || L.radius == null ? (L.radius ?? 16) + 'px' : L.radius;
  checkDropped(L, { borderRadius: radius });
  el.style.borderRadius = radius;
  if (L.border && !L.elevation) {
    const b = L.border === true ? '1px solid var(--line)' : L.border;
    if (L.border !== true) checkDropped(L, { border: b });
    el.style.border = b;
  }
}

// The glow colour and its two radii (a tight core, a wide bloom), shared by the box path below and by
// the pure-light path (applyGlyphGlow here, svg.js's own drop-shadow). One formula, so a text layer's
// glow and a shape layer's glow read as the same light at the same `intensity`.
export function glowRadii(L) {
  const spread = L.intensity != null ? Math.max(0.05, Math.min(1, L.intensity)) : 0.25;
  const color = L.glow === true ? 'var(--accent-glow)' : hexA(L.glow, spread);
  return { near: Math.round(spread * 48 + 8), far: 64, color };
}

// `glow` composes with elevation/shadow: elevation (or `shadow`) writes the depth stack, glow
// appends the bloom, rather than only being reachable from inside the elevation branch.
function chipShadowStack(L) {
  const stack = [];
  if (L.elevation) {
    const light = L.on === 'light';
    stack.push(
      light ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      light ? 'inset 0 1px 0 rgba(255,255,255,0.7)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
      '0 1px 1px rgba(0,0,0,0.07)', '0 2px 2px rgba(0,0,0,0.05)',
    );
    const e = Math.min(4, Math.max(1, L.elevation | 0));
    if (e >= 2) stack.push('0 4px 8px rgba(0,0,0,0.2)');
    if (e >= 3) stack.push('0 12px 24px rgba(0,0,0,0.28)');
    if (e >= 4) stack.push('0 0 64px rgba(0,0,0,0.4)');
  } else if (L.shadow) stack.push('0 24px 70px rgba(20,20,25,0.12)');
  if (L.glow) {
    const { far, color } = glowRadii(L);
    stack.push(`0 0 ${far}px ${color}`);
  }
  return stack;
}

// A glow with nothing ELSE painting a box is a LIGHT, not a chip: on a text layer it must hug the
// glyphs (text-shadow follows the glyph alpha) rather than the tight rectangle box-shadow draws
// around the whole line, which is the "dark pill behind the words" bug (a headline reading
// "Introducing" glowed as a box, not as light). text-shadow is a property nothing else on this layer
// writes, so it is set in full here and never read back, same reasoning as core/fx/shadow.js's
// box-shadow.
function applyGlyphGlow(el, L) {
  const { near, far, color } = glowRadii(L);
  el.style.textShadow = `0 0 ${near}px ${color}, 0 0 ${far}px ${color}`;
}

// text (and count, which shares this build) is the only family with glyphs to hug; every other type
// chipBox reaches is already a box (rect/html/video/group), so a glow with no chip stays a box-shadow
// there, which is the shape its content already has.
const isGlyphLayer = (L) => L.type == null || L.type === '' || L.type === 'text' || L.type === 'count';

// shared box treatment: bg/pad/radius/border/shadow/elevation on ANY layer. `css` can paint a
// background of its own, and a painted box is a box, so the paint guard also fires on an explicit
// radius with `css` set (a `radius` alone next to a raw paint is not otherwise rounded).
function chipBox(el, L) {
  applyChipPadding(el, L);
  if (L.bg == null && !L.border && !L.shadow && !L.elevation && !L.glow && !(L.css && L.radius != null)) return;
  const hasChip = L.bg != null || !!L.border || !!L.shadow || !!L.elevation;
  if (L.glow && !hasChip && isGlyphLayer(L)) { applyGlyphGlow(el, L); return; }
  applyChipPaint(el, L);
  const stack = chipShadowStack(L);
  if (stack.length) el.style.boxShadow = stack.join(', ');
  if (el.classList.contains('hs-text')) el.style.display = 'inline-block';
}

function applyFade(el, L) { // static edge mask; MUTUALLY EXCLUSIVE with `cut`
  // filter routing rides here because scene.html calls applyFade for EVERY layer right after it
  // writes the raw L.filter string, resolving named grade presets (core/filters.js) at this hook
  // needs no consumption-point edit. Raw CSS filter strings resolve to themselves (no-op).
  if (L.filter) { if (isLook(L.filter)) applyComposite(el, L.filter, L.lookOpts); else applyLayerFilter(el, L.filter); }
  if (!L.fade) return;
  if (L.cut) throw new Error(`layer "${L.text || L.type}": fade and cut are mutually exclusive, put the fade on an inner layer`);
  const g = { right: 'linear-gradient(90deg, #000 55%, transparent 98%)',
              left: 'linear-gradient(270deg, #000 55%, transparent 98%)',
              bottom: 'linear-gradient(180deg, #000 55%, transparent 98%)',
              top: 'linear-gradient(0deg, #000 55%, transparent 98%)',
              edges: 'radial-gradient(120% 120% at 50% 50%, #000 60%, transparent 100%)' }[L.fade];
  if (g) { el.style.maskImage = g; el.style.webkitMaskImage = g; }
}

// The per-layer decoration that scene.html applied to top-level layers and to nothing else, so
// `filter`, `mask`, `fade`, `lookOpts`, `reflect` and `logotype` were all silently dropped the moment
// a layer moved inside a group. Extracted so there is ONE definition and both paths call it, the
// same reason the safe box and the canvas size each had to be collapsed to one (MISTAKES #70).
// GLASS. `backdrop-filter` reads the pixels BEHIND an element, which is the one thing the shader
// path cannot do, core/stings.js and core/shaders-ambient.js are generative overlays with no
// sampler2D, so frosted glass and everything in that family was blocked on a structural
// layer-as-texture change. CSS has had the capability all along and the repo had zero occurrences
// of it. This is the cheap half: blur/saturate what is behind. It does NOT give radial/zoom/spin
// blur, which still need real sampling (engine-doctrine/ROADMAP.md).
//   glass: true            → a sensible frosted default
//   glass: 18              → blur radius in px
//   glass: 'blur(18px) saturate(1.4)'  → the raw filter, for full control
//   glass: 'refract' | 'refractThin'   → REAL GLASS: the backdrop is BENT, not blurred (below)
function applyGlass(el, L) {
  if (L.glass == null || L.glass === false) return;
  const f = L.glass === true ? 'blur(14px) saturate(1.35)'
    : typeof L.glass === 'number' ? `blur(${L.glass}px) saturate(1.3)`
    : REFRACT[L.glass] ? `url(#${ensureRefractDef(L.glass)})` : String(L.glass);
  checkDropped(L, { backdropFilter: f });
  el.style.backdropFilter = f;
  el.style.webkitBackdropFilter = f;
  // A GLASS LAYER IS A SHAPE, and `backdrop-filter` is clipped by the element's own border-radius.
  // chipBox writes `radius` only for a layer that also PAINTS (a bg, a border, a shadow), which a
  // pane of glass by definition does not, so `{"glass": true, "radius": 24}` used to round nothing
  // and there was no way to make a glass layer that was not a rectangle. Same class as `pad` above:
  // a documented prop accepted and then dropped in silence.
  if (L.radius != null) {
    const radius = typeof L.radius === 'number' ? L.radius + 'px' : L.radius;
    checkDropped(L, { borderRadius: radius });
    el.style.borderRadius = radius;
  }
}

// progressiveBlur: a DIRECTIONAL blur fog on the backdrop that ramps toward an edge (motion-primitives
// ProgressiveBlur). Fades a dense grid / list / feed into an edge far more cleanly than one flat blur
// or a vignette. Built on the SAME structure as glass (backdrop-filter on the layer itself, which the
// compositor honours; nested transparent child divs get skipped) plus a directional MASK: where the
// mask alpha is partial the blurred backdrop blends with the sharp one, so a single blur reads as a
// smooth ramp from sharp → blurred. Static → pure in n. `progressiveBlur: true | { dir, max, start }`.
//   dir   = the edge the blur intensifies toward (top|bottom|left|right)
//   max   = blur px at the strong edge
//   start = 0..1 fraction of the span that stays sharp before the ramp begins
function applyProgressiveBlur(el, L) {
  const pb = L.progressiveBlur;
  if (pb == null || pb === false) return;
  const o = typeof pb === 'object' ? pb : {};
  const dir = o.dir || 'bottom';
  const maxBlur = o.max ?? 16;
  const start = Math.max(0, Math.min(0.95, o.start ?? 0));
  const f = `blur(${maxBlur}px)`;
  el.style.backdropFilter = f; el.style.webkitBackdropFilter = f;
  // a background is required for the compositor to run the backdrop-filter (glass rects always have one)
  if (!el.style.background && !el.style.backgroundColor) el.style.background = 'rgba(0,0,0,0.001)';
  const g = `linear-gradient(to ${dir}, transparent ${(start * 100).toFixed(0)}%, black 100%)`;
  el.style.maskImage = g; el.style.webkitMaskImage = g;
  el.style.pointerEvents = 'none';
}

// borderTrail: a glowing arc orbits the layer's border (motion-primitives BorderTrail): a ring mask
// (padding + mask-composite:exclude) over a spinning conic wedge. The spin is a WAAPI animation, which
// seekAll(t) pauses and seeks every frame → deterministic. Great emphasis for a CTA / end card.
//   borderTrail: true | { color, width (px), period (s/orbit), arc (deg) }
function applyBorderTrail(el, L) {
  const bt = L.borderTrail;
  if (bt == null || bt === false) return;
  const o = typeof bt === 'object' ? bt : {};
  const color = o.color || 'var(--accent)';
  const width = o.width ?? 3;
  const period = (o.period ?? 4) * 1000;
  const arc = o.arc ?? 40;
  const radius = el.style.borderRadius || '0px';
  const ring = document.createElement('div');
  Object.assign(ring.style, { position: 'absolute', inset: '0', borderRadius: radius, padding: width + 'px',
    pointerEvents: 'none', overflow: 'hidden' });
  // ring mask: full box MINUS the content box = a border-width band (rounded with the layer)
  const m = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';
  ring.style.mask = m; ring.style.webkitMask = m;
  ring.style.maskComposite = 'exclude'; ring.style.webkitMaskComposite = 'xor';
  const spin = document.createElement('div');
  Object.assign(spin.style, { position: 'absolute', inset: '-60%',
    background: `conic-gradient(from 0deg, ${color} 0deg, transparent ${arc}deg, transparent 360deg)` });
  // The spin is driven by an INLINE transform per frame (scene.html reads data-trail), NOT a WAAPI
  // animation: an animation's computed state does not serialise into the frame signature, so the dedup
  // pass saw two visually-different frames as identical and failed. An inline transform is in the DOM.
  spin.dataset.trail = '1';
  spin.dataset.trailPeriod = String(period / 1000);
  ring.appendChild(spin); el.appendChild(ring);
}

// CRT. A cathode ray tube does three things to a picture and only one of them is an overlay.
//
// The engine already HAD a `crt` shader effect, and looking at it over real type is what showed the
// problem: it draws phosphor stripes, scanlines and a roll bar on top and leaves the content exactly
// as it found it. On a reference photograph of a real tube the dominant feature is the opposite,
// that the picture itself is soft and glowing. A generative overlay has no sampler and cannot reach
// what is under it, so that half was unreachable from there.
//
// `backdrop-filter` can, which is the same capability `glass` above is built on. Blurring and
// brightening the backdrop IS the phosphor: type on a tube is not sharp with a halo around it, it is
// genuinely soft-edged and blooming, so replacing the region with a blurred brighter copy is closer
// to the real thing than drawing a glow beside a crisp glyph would be.
//
// Then the overlay half is painted on top as this element's own background: scanlines as a repeating
// gradient, and a corner falloff.
//
//   crt: true                       a sensible tube
//   crt: { bloom, lines, gap, scan, vignette, tint }
//     bloom     px of defocus; the brightness lift scales with it
//     lines     opacity of the dark scanline, 0 turns them off
//     gap       px from one scanline to the next
//     scan      px of the dark part of each line
//     vignette  0..1 corner darkening
//     tint      a CSS colour laid over the whole thing, the phosphor's own colour
function applyCrt(el, L) {
  if (L.crt == null || L.crt === false) return;
  const { filter, background } = crtSpec(typeof L.crt === 'object' ? L.crt : {});
  if (filter) { el.style.backdropFilter = filter; el.style.webkitBackdropFilter = filter; }
  // A backdrop-filter needs the element to paint something, exactly as progressiveBlur notes above.
  if (background) checkDropped(L, { backgroundImage: background });
  el.style.backgroundImage = background || 'none';
  if (!background && !el.style.background && !el.style.backgroundColor) el.style.background = 'rgba(0,0,0,0.001)';
  el.style.pointerEvents = 'none';
}

// ORIGIN-AWARE MOTION: which point a scale or a rotation grows OUT OF.
//
// The outside standards call this the strongest single technique they have (engine-doctrine/CRAFT/MOTION-STANDARDS.md):
// a popover that scales from the button that opened it EXPLAINS where it came from, and one that
// scales from its own centre explains nothing. The engine writes `transformOrigin` in six files for
// its own purposes and no layer prop reached any of them, so every scale in every film in this
// library grows from its own centre. Measured before this existed: 1 of 4,530 layers declared
// `origin`, and that one was a globe's route start, an unrelated prop that shares the word.
//
// Takes what CSS takes, because CSS already has the vocabulary and inventing a second one would be
// the fork this repo logs most: a keyword pair (`"top left"`, `"bottom center"`), a length pair
// (`"40px 12px"`), or a percentage pair (`"0% 50%"`). Refused rather than guessed if it is not a
// string: a silently ignored origin looks exactly like a centre origin, which is the one outcome
// indistinguishable from not having asked.
//
// Written as a STYLE and not a dataset, because nothing animates it. It is where the motion starts
// from, not part of the motion, so the tracks never touch it and it survives every frame untouched.
// ONE WORD, TWO MEANINGS, AND THE OLDER ONE WINS. A `three` globe has had `origin` as the [lon, lat]
// of its route's start since long before this, and the schema entry said so. I read that entry, wrote
// the collision into the same prop anyway, and `showcase-flight-globe` failed at boot with my own
// error message quoting an array back at me. That is the "two ways to say one thing" fork this repo
// logs more than any other class, committed by the person who had just finished counting them.
//
// Dispatched on the VALUE and not on the layer type, because the two forms cannot be confused: a CSS
// transform-origin is never an array, and a lon/lat pair is never a string. An array is the globe's,
// read by core/surfaces/globe.js, and is left alone here.
function applyOrigin(el, L) {
  if (L.origin == null || Array.isArray(L.origin)) return;
  if (typeof L.origin !== 'string')
    throw new Error(`\`origin\` is a CSS transform-origin: a keyword pair ("top left"), a length pair `
      + `("40px 12px") or percentages ("0% 50%"). Got ${JSON.stringify(L.origin)}. It decides which point `
      + `a scale or rotation grows out of; written wrong it would silently stay at the centre. `
      + `(On a \`three\` globe, \`origin\` is a different prop entirely: the [lon, lat] of a route's start.)`);
  checkDropped(L, { transformOrigin: L.origin });
  el.style.transformOrigin = L.origin;
}

function decorate(el, L) {
  applyOrigin(el, L);
  applyGlass(el, L);
  applyCrt(el, L);
  applyProgressiveBlur(el, L);
  applyBorderTrail(el, L);
  if (L.mask) { checkDropped(L, { maskImage: L.mask }); el.style.webkitMaskImage = L.mask; el.style.maskImage = L.mask; }
  // `falloff`: the parametric, invertible radial ramp. Mutually exclusive with raw `mask`, the same
  // shape as the `fade`/`cut` refusal above: two ways to spell one layer's mask is the fork this
  // engine's own doctrine names as its most common source of drift, not a feature.
  if (L.falloff) {
    if (L.mask) throw new Error(`layer "${L.id || L.type}": \`mask\` and \`falloff\` both set. `
      + `\`falloff\` is the parametric radial ramp (cx/cy/radius/feather/invert); \`mask\` is raw CSS `
      + `for the same slot. Drop one.`);
    const g = falloffMask(L.falloff);
    checkDropped(L, { maskImage: g });
    el.style.webkitMaskImage = g; el.style.maskImage = g;
  }
  applyFade(el, L);   // resolves L.filter / named looks / L.lookOpts too
  if (L.reflect) el.style.webkitBoxReflect = `below 0 linear-gradient(transparent 62%, rgba(0,0,0,${L.reflect === true ? 0.12 : L.reflect}))`;
  if (L.logotype) el.setAttribute('data-logotype', '1');
  // An authored base opacity. It CANNOT be written to el.style here: driveClips overwrites
  // style.opacity every frame from the enter/exit envelope, so a build-time style would be erased
  // on frame 0 and the prop would do nothing. Two shipped scenes set `opacity` on a paint layer
  // expecting it to dim and got no effect at all, silently. Hand it to the envelope instead.
  if (L.opacity != null) el.dataset.opacity = String(L.opacity);
  applyCss(el, L);
}

// CSS PASSTHROUGH. A layer is a wrapper over one DOM element, so any CSS property the layer
// vocabulary does not name (a box gradient, `mask-image`, `clip-path`, an inset `box-shadow`,
// `backdrop-filter`, pseudo-element decoration) is still reachable through `css`, without losing
// what a hand-written `html` layer gives up: this stays a real DOM node the audit walks, theme
// tokens still resolve (a `var(--line)` value is plain CSS text, so the cascade resolves it exactly
// as it would any other declaration), and per-child engine timing survives.
//
// Written ONCE here, at build time, same as every other decorate() call, never per frame. That is
// why `core/validate/validate.mjs`'s `cssErrors` REFUSES any key the engine itself rewrites every frame
// (opacity, transform, left/top/width/height, zIndex, pointerEvents) or that core/tokens.css kills
// globally (animation, transition): a build-time write to one of those is silently erased the moment
// the render advances past frame 0, which is the exact "accepted input the engine then ignores" bug
// this feature exists not to be (engine-doctrine/MISTAKES.md #213, #369, #373, #375).
//
// camelCase in (`boxShadow`), CSS out: `el.style` is a CSSStyleDeclaration, so assigning its camelCase
// property IS how a browser accepts a JS write for a hyphenated CSS property, no hand conversion.
function applyCss(el, L) {
  if (!L.css || typeof L.css !== 'object' || Array.isArray(L.css)) return;
  // REFUSE A VALUE THE BROWSER WOULD DROP, here, where it is written. Assigning an invalid value to
  // `el.style` is a silent no-op: the property keeps its old value and the author is told nothing.
  // That is this engine's cardinal sin, and `css` is the one door through which arbitrary author CSS
  // reaches the DOM, so it is the door that checks. Build-time only, this runs once per layer, not
  // per frame, because `css` is a settled style and never a motion channel.
  const bad = droppedProps(L.css);
  if (bad.length)
    throw new Error(`layer${L.id ? ` "${L.id}"` : ''} (type "${L.type || 'text'}"): the browser drops `
      + `${bad.length === 1 ? 'this css declaration' : 'these css declarations'}, ${bad.join(' · ')}. `
      + `It would keep the rest and render on, so nothing would fail and the layer would simply never `
      + `do it. A leading minus outside calc() is the usual cause: write \`calc(-1 * …)\`, not \`-calc(…)\`.`);
  Object.assign(el.style, L.css);
}

function layoutGroupFree(el) {
  el.style.display = 'block';
  el.dataset.free = '1'; // read by addGroupChild: children must place themselves
}

function layoutGroupGrid(el, L) {
  el.style.display = 'grid';
  el.style.gridTemplateColumns = `repeat(${L.gridCols ?? 2}, ${L.colw ? L.colw + 'px' : '1fr'})`;
  el.style.columnGap = (L.colGap ?? L.gap ?? 24) + 'px';
  el.style.rowGap = (L.rowGap ?? L.gap ?? 24) + 'px';
  const gridItems = L.items || L.align2 || 'stretch';
  checkDropped(L, { justifyItems: gridItems });
  el.style.justifyItems = gridItems;
}

function layoutGroupFlex(el, L) {
  el.style.display = 'flex';
  el.style.flexDirection = (L.layout || L.direction) === 'column' ? 'column' : 'row';
  el.style.gap = (L.gap ?? 24) + 'px';
  el.style.flexWrap = L.wrap ? 'wrap' : 'nowrap';
  const items = L.items || L.align2 || 'center';
  const justify = L.justify || 'flex-start';
  checkDropped(L, { alignItems: items, justifyContent: justify });
  el.style.alignItems = items;
  el.style.justifyContent = justify;
}

// layout-by-containment: a flex OR grid box, or FREE placement. `free`: children carry their own
// x/y inside the group instead of flowing, so a computed composition (a bubble map, a scatter)
// costs one layer total instead of one per element, under the 120-layer cap.
function layoutGroup(el, L) {
  if (L.layout === 'free') layoutGroupFree(el);
  else if (L.layout === 'grid') layoutGroupGrid(el, L);
  else layoutGroupFlex(el, L);
  if (L.pad != null) {
    const pad = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
    checkDropped(L, { padding: pad });
    el.style.padding = pad;
  }
  if (L.h != null) el.style.height = L.h + 'px';
}

function sizeChild(c, C, isImg) {
  if (C.grow != null) c.style.flexGrow = String(C.grow);
  if (C.basis != null) c.style.flexBasis = typeof C.basis === 'number' ? C.basis + 'px' : C.basis;
  if (!isImg) { if (C.w != null) c.style.width = C.w + 'px'; if (C.h != null) c.style.height = C.h + 'px'; }
}

// inkIsLight: resolves a colour that may be a theme token (`var(--ink)`) back through the palette
// first, then asks core/motion.js, because a token NAME is not a lightness. Unresolvable → false,
// the safe direction when the colour cannot be read (never isLightBg's own "unreadable → light").
function paletteOf(theme, v) {
  const m = /^var\(--([a-z-]+)\)$/i.exec(String(v ?? ''));
  return m ? (theme?.palette || {})[m[1]] : v;
}
function inkIsLight(theme, c) { const r = paletteOf(theme, c); return parseColor(r) != null && isLightBg(r); }

// onDark(L, midT): TRUE when this layer's type is light ink on a dark ground at second `midT`, asked
// of the LAYER's own settled ink. GLYPH_PAINTERS is where that answer is "this layer cannot say".
function onDarkOf(theme, inkAt, L, midT) {
  return paintsOwnGlyphs(L) ? false : inkIsLight(theme, L.color || inkAt(midT) || 'var(--text)');
}

// trackingCss(L, midT): THE ONE RESOLUTION of a layer's settled letter-spacing, the only thing
// styleText writes into el.style.letterSpacing (two writers ate the author's own `tracking` twice:
// MISTAKES #28, #79, #388). `trackingFor` is a RAMP, not a decision; the decision is here.
function trackingCssOf({ theme, trackingFor, onDark }, L, midT) {
  // An explicit `tracking`/`ls` always wins: everything below is a DEFAULT, never an override.
  if (L.tracking != null) return L.tracking;
  if (L.ls != null) return L.ls;
  const size = L.size ?? 96;
  // The micro-typography path: every text/count layer except mono and `raw:true`. It does not
  // consult `theme.type.optical` or the serif case, and that is the rule as SHIPPED, preserved
  // deliberately.
  if (L.font !== 'mono' && !L.raw) return trackingFor(size, onDark(L, midT));
  if (L.font === 'serif') return '0';
  return theme?.type?.optical ? trackingFor(size, onDark(L, midT)) : '-0.03em';
}

// <b> emphasis colour: explicit emColor wins; else the brand accent for the POP, EXCEPT over an
// accent-coloured field, where accent-on-accent vanishes, so emphasis falls back to the layer's own
// colour.
function emphasisColorOf(bgWinAt, ACCENT_BGS, midT, layerColor) {
  const w = bgWinAt(midT);
  return w && ACCENT_BGS.includes(w.preset) ? layerColor : 'var(--accent)';
}

// `num` is the theme's TABULAR face (theme.type.num, --font-num), reachable only through the .num
// CSS class before this; a face a theme declares must be nameable.
function applyTextFace(el, L, serif, mono, num) {
  el.style.fontFamily = `var(--font-${serif ? 'serif' : mono ? 'mono' : num ? 'num' : 'sans'})`;
  el.style.fontStyle = (L.italic != null ? L.italic : serif) ? 'italic' : 'normal';
  el.style.fontWeight = String(L.weight ?? (serif ? 400 : 800));
}

function applyTextContent(el, L) {
  el.innerHTML = L.type === 'count' ? '' : (L.text || '');
  if (L.type !== 'count') return;
  el.style.fontVariantNumeric = 'tabular-nums';
  el.textContent = (L.prefix || '') + (L.from ?? 0).toFixed(L.decimals ?? 0) + (L.suffix || '');
}

function styleTextOf({ inkAt, bgWinAt, ACCENT_BGS, trackingCss }, el, L, midT) {
  const serif = L.font === 'serif', mono = L.font === 'mono', num = L.font === 'num';
  applyTextFace(el, L, serif, mono, num);
  // The ink is resolved BEFORE the tracking because the tracking's optical correction depends on its
  // polarity. Where there is no bg window to ask, `inkAt` returns null and the layer falls back to
  // the theme's own text colour.
  const auto = inkAt(midT);
  const layerColor = L.color || auto || 'var(--text)';
  el.style.letterSpacing = trackingCss(L, midT);
  el.style.fontSize = (L.size ?? 96) + 'px';
  if (L.w != null) el.style.width = L.w + 'px';
  if (L.align) { checkDropped(L, { textAlign: L.align }); el.style.textAlign = L.align; }
  if (L.color) { checkDropped(L, { color: L.color }); el.style.color = L.color; } else if (auto) el.style.color = auto;
  el.style.setProperty('--em', L.emColor || emphasisColorOf(bgWinAt, ACCENT_BGS, midT, layerColor));
  // --layer-ink: the colour this layer ACTUALLY settled on, published for the kinetic presets (a
  // preset writes `color` on every unit span every frame, so it needs the resting colour this layer
  // would have had, not a token name: MISTAKES #373-adjacent).
  el.style.setProperty('--layer-ink', layerColor);
  applyTextContent(el, L);
}

// resolveGroupWindow(groupL, outerStart, outerDuration, outerExitDur, inheritedClock): the window this
// GROUP's own children compute their `delay`/`contentStart` offsets against, and the clock descriptor
// (if any) baked onto every one of them for `runTracks` (core/tracks/index.js) to read at frame time.
//
// No `clock`: children read this group's OUTER window exactly as before this feature existed, byte
// for byte (`groupClock` forwarded from `inheritedClock` so a DESCENDANT of an already-clocked
// ancestor still gets remapped, even through a plain group with no clock of its own).
//
// A `clock`: children are offset against the LOCAL CYCLE (`start: 0, duration: gc.duration`) instead
// of the outer window, and carry a fresh `groupClock` naming where that cycle sits in film time. This
// REPLACES rather than composes with `inheritedClock`: the nearest enclosing clock owns a subtree, the
// same "one owner" rule `timeWarp`/`timeRemap` already enforce for a single layer's clock (two active
// clocks over one subtree is the state that mechanism refuses, not a case this file re-opens).
export function resolveGroupWindow(groupL, outerStart, outerDuration, outerExitDur, inheritedClock) {
  if (groupL.clock == null)
    return { start: outerStart, duration: outerDuration, exitDur: outerExitDur, groupClock: inheritedClock || null };
  const gc = resolveGroupClock(groupL.clock, groupL.id || groupL.type || 'group');
  return { start: 0, duration: gc.duration, exitDur: outerExitDur,
    groupClock: { outerStart, outerEnd: outerStart + outerDuration, gc } };
}

// A free group's children place themselves with position:absolute, which resolves against the
// nearest POSITIONED ancestor. Set here rather than in layoutGroup because a top-level free group
// is already absolute with left/top from scene.html, and relative would break it.
function buildGroupBranch(env, c, C, parentEl, timing) {
  c.className = 'hs-group';
  layoutGroup(c, C); chipBox(c, C); sizeChild(c, C, false);
  if (c.dataset.free && !c.style.position) c.style.position = 'relative';
  // A nested group's `modifiers` never reached buildFx, because that only runs inside buildLeaf and
  // a group is not a leaf (MISTAKES: half a modifier applied and nothing said so).
  if (C.modifiers != null) {
    if (!env.api.buildFx)
      throw new Error(`layer "${C.id || 'group'}": \`modifiers\` on a nested group needs the fx `
        + `builder, which core/layers/index.js injects into the kit. This build path did not get `
        + `one, so the modifiers would apply their frame half only.`);
    env.api.buildFx(c, C);
  }
  parentEl.appendChild(c);
  // RECURSE WITH THIS GROUP'S OWN WINDOW, not the outermost layer's, so a grandchild's `delay` is
  // an offset from its own container, not the whole layer's top-left (MISTAKES #69-adjacent).
  const root = resolveGroupWindow(C, timing.cStart, timing.cDur, timing.exitDur, timing.groupClock);
  for (const gc of C.children || []) addGroupChild(env, c, gc, root);
}

// DELEGATE to the primitive. This file used to re-implement a SUBSET of each type's build inline,
// which is why a child silently lost image `canvasFx`, `ken`'s clip box, `edgeFade`, and text's
// `fit`/`fitH`/`maxLines`/`raw`. Re-implementing a builder is how the subset drifts from the
// original; calling it cannot.
function buildLeafBranch(env, c, C, rootL) {
  c.className = C.type === 'image' ? 'hs-img-wrap' : 'hs-text';
  if (env.api.buildLeaf) env.api.buildLeaf(c, C);
  else if (C.type === 'image') { c.innerHTML = env.icon(C.src, ''); }
  else { env.styleText(c, C, (rootL.start ?? 0) + (rootL.duration ?? 2) / 2); chipBox(c, C); }
  sizeChild(c, C, C.type === 'image');
}

// `delay` staggers a child WITHIN its group's window; driveClips owns every timed element and finds
// them by `[data-start]` (core/clips.js), so a group child needs the same dataset a top-level layer
// gets (MISTAKES #69: without it, `delay` was accepted and silently inert).
function writeChildTiming(env, c, C, timing) {
  const { cStart, cDur, exitDur, contentStart, groupClock } = timing;
  // VISIBILITY (driveClips: enter/exit/z-order) spans the whole group, not one cycle: `cStart`/`cDur`
  // are cycle-relative under a running clock, so a looping child would otherwise fade out the instant
  // its first cycle ended. `groupClock.outerStart/outerEnd` is the group's own authored window, the
  // one the child stays on screen for regardless of how many times its clock loops inside it.
  const visStart = groupClock ? groupClock.outerStart : cStart;
  const visDur = groupClock ? (groupClock.outerEnd - groupClock.outerStart) : cDur;
  c.dataset.start = String(visStart);
  c.dataset.duration = String(visDur);
  if (C.id) c.dataset.id = String(C.id);
  c.dataset.anim = C.anim || 'none';
  if (C.out) c.dataset.out = C.out;
  if (C.enterDur != null) c.dataset.enter = String(C.enterDur);
  if (exitDur != null) c.dataset.exitDur = String(exitDur);
  env.extra.push({ L: { ...C, start: cStart, duration: cDur,
    ...(C.contentStart != null ? { contentStart } : {}),
    ...(groupClock ? { groupClock } : {}) }, el: c, units: C.split ? env.splitText(c, C.split) : null });
}

function addGroupChild(env, parentEl, C, rootL) { // recursive: nested group OR a text/image/count leaf
  const c = document.createElement('div');
  const isGroup = C.type === 'group';
  // A CHILD'S CLOCK IS ITS PARENT'S, OFFSET BY `delay`: containment scopes time here exactly as it
  // scopes geometry. Computed before the branch, because a group must know its own window before
  // handing it to its children. Under a running group `clock`, `rootL` is the LOCAL CYCLE window
  // (resolveGroupWindow above), so `cStart`/`cDur` land inside one cycle rather than the outer span.
  const d = Math.max(0, +C.delay || 0);
  const cStart = (rootL.start ?? 0) + d, cDur = Math.max(0, (rootL.duration ?? 0) - d);
  const timing = { cStart, cDur, exitDur: childExitDur(C, rootL), contentStart: childContentStart(C, rootL, d),
    groupClock: rootL.groupClock || null };

  if (isGroup) buildGroupBranch(env, c, C, parentEl, timing);
  else buildLeafBranch(env, c, C, rootL);

  decorate(c, C);   // both paths: mask / filter / look / fade / reflect / logotype
  if (C.critical) c.setAttribute('data-layer', 'critical');
  // the group-child twin of the opt-out in films/scene/scene.js: `critical:false` must mean the same
  // thing at both depths.
  if (C.critical === false) c.setAttribute('data-audit', 'off');
  if (parentEl.dataset.free) { c.style.position = 'absolute'; c.style.left = (C.x || 0) + 'px'; c.style.top = (C.y || 0) + 'px'; }
  if (!isGroup) parentEl.appendChild(c);   // a group appended itself above, before recursing
  writeChildTiming(env, c, C, timing);
}

export function createKit(ctx) {
  const { theme, inkAt, bgWinAt, ACCENT_BGS, trackingFor, splitText, icon } = ctx;
  const extra = ctx.extra;
  // THE FRAME, in scope for every primitive. Built once at boot (core/boot.js frameOf) and RECEIVED
  // here; the fallback covers a kit built outside boot (a test, a standalone view).
  const frame = ctx.frame
    || (ctx.W && ctx.H ? frameOf({ W: ctx.W, H: ctx.H, destination: ctx.destination }) : null);

  const onDark = (L, midT) => onDarkOf(theme, inkAt, L, midT);
  const trackingCss = (L, midT) => trackingCssOf({ theme, trackingFor, onDark }, L, midT);
  const styleText = (el, L, midT) => styleTextOf({ inkAt, bgWinAt, ACCENT_BGS, trackingCss }, el, L, midT);

  // `trackingCss` is exposed so anything that needs to KNOW the settled letter-spacing can ask the
  // one resolver instead of re-deriving it. `frame` after the spread, so a kit that derived one still
  // exposes it: `kit.frame.W`, `kit.frame.safe`, never an imported number or a hardcoded 1920.
  const api = { ...ctx, frame, hexA, onDark, trackingCss, styleText, chipBox, applyFade, decorate, layoutGroup, sizeChild };
  const env = { api, extra, icon, splitText, styleText };
  api.addGroupChild = (parentEl, C, rootL) => addGroupChild(env, parentEl, C, rootL);
  api.resolveGroupWindow = resolveGroupWindow;
  return api;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// REAL GLASS: `glass: "refract"`.
//
// `glass: true` frosts the backdrop. Frosting is not glass, and everyone who has tried to fake glass
// with it knows the tell: a blur softens, and glass BENDS. Bending needs the backdrop resampled along
// a gradient, which is `feDisplacementMap`, and `backdrop-filter` accepts `url(#id)` in this Chrome,
// not only the filter FUNCTIONS. That one fact is what makes this reachable at all.
//
// THE RECIPE, in the After Effects vocabulary it is borrowed from, because a look with a name has a
// sequence and one step in it is always the one you would not guess:
//
//   1. HEIGHT MAP.  feDisplacementMap reads a MAP, never a shape: dx = (R - 0.5) * scale, dy from G.
//      So the map is a red ramp across x plus a green ramp down y, summed with `screen` (their
//      channels are disjoint, so screen is a plain add). It is stretched over the element's own box.
//      THE STOPS ARE THE WHOLE LOOK: they sit near 128 through the middle and run away hard in the
//      outer third, because a thick lens shows a near-true image at its centre and squeezes the world
//      at its rim. A straight 0..255 ramp reads as a flat magnifier, which is a different object.
//   2. REFRACTION, at a NEGATIVE scale. Negative pulls the surroundings inward at the rim; positive
//      stretches them outward and reads as a smear. This is the step nobody guesses.
//   3. DISPERSION. Glass bends red less than blue, so ONE displacement cannot make it. Run the map
//      three times at rising scales, keep R from the shallowest, G from the middle, B from the
//      steepest, and screen them back together. This is what separates real glass from a chromatic
//      aberration filter bolted on afterwards.
//   4. A hairline blur closes the seams the three passes leave between them.
//
// WHAT THIS DOES NOT DO, and it is CSS's limit, not this code's: `mask` and `clip-path` do NOT clip a
// `backdrop-filter`. The filter runs over the whole border box and the mask removes only the element's
// OWN paint, so a masked annulus refracts its hole as well and loses its rim doing it (verified by
// rendering a masked circle beside a plain one: identical refraction). Any glass shape here has to be
// a shape `border-radius` can make.
//
// The rest of the AE chain, Fresnel rim, specular, bevel, contact shadow, is PAINT ON the shape rather
// than distortion of what is behind it, so it is box-shadows and gradients, and it belongs in the
// caller's own CSS. Worked example: films/scene/_glass-shapes.sphere.html.
const REFRACT = {
  // ior ≈ thick optical glass: the image inside is strongly compressed, the fringes stay a hairline
  refract:     { scales: [-64, -78, -92], blur: 1.1 },
  // a thinner shell: less compression, a wider spread between the three passes, so the colour splits
  // loudly. The one to reach for when DISPERSION is the point of the shot.
  refractThin: { scales: [-26, -40, -54], blur: 0.8 },
};

// the two ramps, as one data: URI. Static, so it is built once and every def shares the string.
const LENS_RAMP = (() => {
  const stops = [[0, 0], ['.30', 86], ['.42', 120], ['.50', 128], ['.58', 136], ['.70', 170], [1, 255]];
  const grad = (id, vertical, ch) => `<linearGradient id='${id}' x1='0' y1='0' x2='${vertical ? 0 : 1}' y2='${vertical ? 1 : 0}'>`
    + stops.map(([o, v]) => `<stop offset='${o}' stop-color='rgb(${ch === 0 ? v : 0},${ch === 1 ? v : 0},0)'/>`).join('')
    + '</linearGradient>';
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><defs>"
    + grad('rx', false, 0) + grad('gy', true, 1) + "</defs>"
    + "<rect width='256' height='256' fill='url(%23rx)'/>"
    + "<rect width='256' height='256' fill='url(%23gy)' style='mix-blend-mode:screen'/></svg>";
})();

const REFRACT_NS = 'http://www.w3.org/2000/svg';

// One <filter> per named preset, injected once into a shared host svg. Static in every parameter, so
// renderFrame(n) stays a pure function of n: the def is identical whichever frame builds it first.
function ensureRefractDef(name) {
  const spec = REFRACT[name];
  const id = `f-glass-${name}`;
  if (typeof document === 'undefined') return id;
  if (document.getElementById(id)) return id;

  let host = document.getElementById('hs-glass-defs');
  if (!host) {
    host = document.createElementNS(REFRACT_NS, 'svg');
    host.id = 'hs-glass-defs';
    host.setAttribute('width', '0'); host.setAttribute('height', '0');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0';
    host.appendChild(document.createElementNS(REFRACT_NS, 'defs'));
    document.body.appendChild(host);
  }
  const el = (tag, attrs) => {
    const n = document.createElementNS(REFRACT_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const f = el('filter', {
    id, x: '0%', y: '0%', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB',
  });
  // step 1: the height map, stretched over whatever box the caller gave the element.
  // `xlink:href` and not `href`: core/sanitize-html.js strips any `href=` whose value opens on a
  // protocol, and `data:` is one, so a fragment copying this pattern by hand must use the same
  // spelling. Chrome honours the SVG 1.1 name here.
  const img = el('feImage', { preserveAspectRatio: 'none', result: 'n' });
  img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', LENS_RAMP);
  f.appendChild(img);
  // steps 2 + 3: one displacement per channel, three indices of refraction
  const chans = ['r', 'g', 'b'];
  spec.scales.forEach((scale, i) => {
    f.appendChild(el('feDisplacementMap', {
      in: 'SourceGraphic', in2: 'n', scale,
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + chans[i],
    }));
    // keep ONE channel from this pass and zero the others, so the three sum cleanly under `screen`
    const rows = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (r === i && c === i ? 1 : 0)).join(' ') + ' 0 0');
    f.appendChild(el('feColorMatrix', {
      in: 'd' + chans[i], result: 'c' + chans[i],
      values: rows.join('  ') + '  0 0 0 1 0',
    }));
  });
  f.appendChild(el('feBlend', { in: 'cr', in2: 'cg', mode: 'screen', result: 'rg' }));
  f.appendChild(el('feBlend', { in: 'rg', in2: 'cb', mode: 'screen', result: 'rgb' }));
  // step 4: close the seams between the three passes
  f.appendChild(el('feGaussianBlur', { in: 'rgb', stdDeviation: spec.blur }));
  host.firstChild.appendChild(f);
  return id;
}
