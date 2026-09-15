// core/layers/util.js: shared helpers for the layer primitives (core/layers/*). `createKit(ctx)` binds
// them to the scene's services (theme, inkAt, cam, splitText, …) so every primitive builder is a small
// pure-ish file that takes the kit. Ported verbatim from scene.html's inline helpers (byte-identical).

import { applyLayerFilter } from '../looks/filters.js';
import { droppedProps } from '../type/sanitize-html.js';
import { isLook, applyComposite } from '../looks/index.js';
// isLightBg is core/motion.js's single definition of light-versus-dark, in linear light. Every part of
// this engine that has to tell a light ground from a dark one asks THAT function; a second hand-kept
// copy of the question is docs/MISTAKES.md #159.
import { isLightBg, parseColor } from '../color/engine.js';
// The frame authority. One builder, so a kit that has to derive a frame derives the SAME one boot did.
import { frameOf } from '../layout/safe.js';

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
  glass: {}, crt: {}, progressiveBlur: {}, borderTrail: {}, mask: {}, filter: {}, lookOpts: { when: 'filter' },
  fade: {}, reflect: {}, logotype: {}, opacity: {}, css: {},
  // layoutGroup
  layout: {}, gridCols: { when: 'layout' }, colw: { when: 'layout' }, colGap: {}, gap: {}, rowGap: {},
  items: {}, align2: {}, direction: {}, wrap: {}, justify: {}, h: {},
  // a group child's own box and timing (addGroupChild / sizeChild)
  grow: {}, basis: {}, delay: {}, contentStart: {}, critical: {}, x: {}, y: {}, split: {}, origin: {},
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

export function createKit(ctx) {
  const { theme, inkAt, bgWinAt, ACCENT_BGS, trackingFor, splitText, icon } = ctx;
  const extra = ctx.extra;
  // THE FRAME, in scope for every primitive. Until now this kit carried theme and ink and no canvas at
  // all, so a layer primitive could not ask how big the frame was: block factories hardcoded 1920 and
  // the diveIn headroom guard could only fire when a caller remembered to pass the size. It rides in
  // the ctx object that already exists, so no call site changes signature.
  //
  // Built once at boot (core/boot.js frameOf) and RECEIVED here. The fallback covers a kit built
  // outside boot (a test, a standalone view) and is the only place in the engine allowed to derive
  // one, because there is no boot to receive it from. It still calls the one builder.
  const frame = ctx.frame
    || (ctx.W && ctx.H ? frameOf({ W: ctx.W, H: ctx.H, destination: ctx.destination }) : null);

  // inkIsLight(c): is the colour this layer settled on a LIGHT one? Asked of a real colour, never of a
  // token name: `inkAt` hands back theme tokens (`var(--ink)` over a light window, the theme's own light
  // ground over a dark one), and a token name is not a lightness. `themes/vawe.json` sets `text` and
  // `ink` to the same dark hex, so reading the name would call that theme's light-on-dark type dark-on-
  // light. The same trap formats/scene/scene.js documents at its ON_DARK. So resolve the token back
  // through the palette first, then ask core/motion.js.
  //
  // Unresolvable → false, NOT isLightBg's own "unreadable → light" default. This answer only ever adds
  // an optical correction, so the safe direction when the colour cannot be read is to leave the type
  // exactly as it renders today.
  const paletteOf = (v) => {
    const m = /^var\(--([a-z-]+)\)$/i.exec(String(v ?? ''));
    return m ? (theme?.palette || {})[m[1]] : v;
  };
  const inkIsLight = (c) => { const r = paletteOf(c); return parseColor(r) != null && isLightBg(r); };
  // onDark(L, midT): TRUE when this layer's type is light ink on a dark ground at second `midT`. It is
  // the layer's settled colour asked of the palette, and it is one named function rather than an inline
  // expression because more than one place has to ask the same question and get the same answer.
  //
  // It answers about the LAYER's ink, and that is only the ink the glyphs are drawn in while nothing
  // repaints them. GLYPH_PAINTERS below names the effects for which it is not, and there the honest
  // answer is "this layer cannot say".
  const onDark = (L, midT) => (paintsOwnGlyphs(L) ? false : inkIsLight(L.color || inkAt(midT) || 'var(--text)'));

  // trackingCss(L, midT): THE ONE RESOLUTION of a layer's settled letter-spacing, and the only thing
  // `styleText` writes into `el.style.letterSpacing`. Everything with an opinion is folded in here:
  // the author's prop, the size ramp, the light-on-dark lift, mono, `raw`, and the theme's optical flag.
  //
  // WHY IT IS ONE FUNCTION. This value used to be written twice: here, and again one statement later by
  // microType in core/layers/text.js. The second write ate the author's own `tracking` in 12 shipped
  // scenes (MISTAKES #28) and then ate the light-on-dark polarity (#388). Both were repaired by
  // threading one more argument into the second writer, which left the trap set for a third. It is one
  // write now. A new opinion goes in this function, not in a new statement somewhere else.
  //
  // `trackingFor` is a RAMP, not a decision. It turns (size, polarity) into ems. The decision is here.
  function trackingCss(L, midT) {
    // An explicit `tracking`/`ls` always wins: everything below is a DEFAULT, never an override.
    // They are two declared names for one CSS property. The old guard in microType named only `ls`,
    // so a `tracking` the author set was applied and then discarded (MISTAKES #28, #79).
    if (L.tracking != null) return L.tracking;
    if (L.ls != null) return L.ls;
    const size = L.size ?? 96;
    // The micro-typography path: every text/count layer except mono (tracking is wrong for code) and
    // `raw:true` (the author asked for no refinements). It takes the optical ramp unconditionally.
    // It does not consult `theme.type.optical` or the serif case, and that is the rule as SHIPPED,
    // preserved deliberately. Changing it is a taste decision, not part of making the write single.
    if (L.font !== 'mono' && !L.raw) return trackingFor(size, onDark(L, midT));
    // Everything else (mono · raw · a group child built without the text primitive) keeps the older
    // kit rule: serif sets its own fit, and the ramp applies only where the theme opted in.
    if (L.font === 'serif') return '0';
    return theme?.type?.optical ? trackingFor(size, onDark(L, midT)) : '-0.03em';
  }

  function styleText(el, L, midT) {
    const serif = L.font === 'serif', mono = L.font === 'mono', num = L.font === 'num';
    // `num` is the theme's TABULAR face (theme.type.num, --font-num). It was declared by every theme and
    // reachable only through the .num CSS class, so an author asking for it on a text/count layer got
    // sans instead. A face a theme declares must be nameable.
    el.style.fontFamily = `var(--font-${serif ? 'serif' : mono ? 'mono' : num ? 'num' : 'sans'})`;
    // serif defaults to italic (elegant display default); `italic:false` opts a serif upright (or
    // `italic:true` slants any face). Non-breaking: omitted → current behaviour.
    el.style.fontStyle = (L.italic != null ? L.italic : serif) ? 'italic' : 'normal';
    el.style.fontWeight = String(L.weight ?? (serif ? 400 : 800));
    // The ink is resolved BEFORE the tracking because the tracking depends on it. `inkAt(midT)` is
    // the engine's own answer to "what colour must type be at this second", and it is chosen for
    // contrast against the ground, so a light answer means a dark ground underneath it, and that is
    // the polarity the optical correction needs. Where there is no bg window to ask (a theme-gradient
    // stage, or a hand-authored backdrop that declared no tone) `inkAt` returns null and the layer
    // falls back to the theme's own text colour, which is the right ground to judge against there.
    const auto = inkAt(midT);
    const layerColor = L.color || auto || 'var(--text)';
    // THE ONE WRITE. Everything that has an opinion about letter-spacing is folded in trackingCss
    // below; nothing else in the engine may assign it. `make lib-test` scans core/ and fails on a
    // second writer, because two writers is not a hypothetical here: it happened twice.
    el.style.letterSpacing = trackingCss(L, midT);
    el.style.fontSize = (L.size ?? 96) + 'px';
    if (L.w != null) el.style.width = L.w + 'px';
    if (L.align) { checkDropped(L, { textAlign: L.align }); el.style.textAlign = L.align; }
    if (L.color) { checkDropped(L, { color: L.color }); el.style.color = L.color; } else if (auto) el.style.color = auto;
    // <b> emphasis colour: explicit emColor wins; else the brand accent for the POP, EXCEPT over an
    // accent-coloured field, where accent-on-accent vanishes, so emphasis falls back to the layer's OWN
    // colour (bold, always visible). Guard against blue-on-blue. (Must be a real colour, not `inherit`.)
    const w = bgWinAt(midT);
    const emDefault = w && ACCENT_BGS.includes(w.preset) ? layerColor : 'var(--accent)';
    el.style.setProperty('--em', L.emColor || emDefault);
    // --layer-ink: the colour this layer ACTUALLY settled on, published for the kinetic presets.
    // `colorWave` sweeps the accent through a phrase and settles each word to a "resting colour" that
    // defaulted to `var(--ink)`. A preset writes `color` on every unit span every frame, so it wins over
    // whatever `auto` put on the layer, which means a colour-wave headline over a DARK bg window
    // settled to the dark ink and was not there, while the identical headline without the preset was
    // fine. Same shape as #373: a token name standing in for a decision that depends on the window.
    // The resting colour is not the preset's to choose; it is the colour this layer would have had.
    el.style.setProperty('--layer-ink', layerColor);
    el.innerHTML = L.type === 'count' ? '' : (L.text || '');
    if (L.type === 'count') { el.style.fontVariantNumeric = 'tabular-nums'; el.textContent = (L.prefix || '') + (L.from ?? 0).toFixed(L.decimals ?? 0) + (L.suffix || ''); }
  }

  function chipBox(el, L) { // shared box treatment: bg/pad/radius/border/shadow/elevation on ANY layer
    // `css` can paint a background of its own (a gradient, an image, a conic sweep) and a painted
    // box is a box, so `radius` has to reach it. Before `css` existed no layer could paint without one
    // of the props below, so `radius` alone was nothing to round and its absence here was invisible.
    // The feature made the combination legal and turned the omission into a silent drop: the corners
    // came out square and nothing said why. Guarded on an EXPLICIT radius so the `?? 16` default below
    // stays the engine's own box recipe and is never substituted into hand-written paint.
    // PADDING IS NOT PAINT, so it is written BEFORE the box guard below.
    //
    // It used to sit after, and the guard returns on any layer with no background, border, shadow,
    // elevation or glow - so `pad` on an unpainted layer was accepted by the schema and silently
    // discarded. Measured when it was found: 65 layers across 19 scenes were asking for padding and
    // getting none. It surfaced as a CLIPPED GLYPH - the badge block's label ran under its value chip
    // because `pad: '4px 12px'` never reached the DOM - and took a 3x crop to see at all.
    //
    // Silence, not a wrong value: the class CLAUDE.md says must fail loudly. Here it can simply WORK,
    // because padding on an unpainted box is meaningful (it moves the content) and costs nothing.
    if (L.pad != null) {
      const pad = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
      checkDropped(L, { padding: pad });
      el.style.padding = pad;
    }
    if (L.bg == null && !L.border && !L.shadow && !L.elevation && !L.glow && !(L.css && L.radius != null)) return;
    if (L.bg) { checkDropped(L, { background: L.bg }); el.style.background = L.bg; } else if (L.elevation) el.style.background = 'var(--surface)';
    // The RESTING radius, written once at build. A keyed `radius` (core/timeline/sequence.js POSE)
    // overwrites this per frame from formats/scene/scene.js resolveBoxes, the same split box.js already
    // makes for w/h beside their own build-time write: this stays the one place the default lives.
    {
      const radius = typeof L.radius === 'number' || L.radius == null ? (L.radius ?? 16) + 'px' : L.radius;
      checkDropped(L, { borderRadius: radius });
      el.style.borderRadius = radius;
    }
    if (L.border && !L.elevation) {
      const b = L.border === true ? '1px solid var(--line)' : L.border;
      if (L.border !== true) checkDropped(L, { border: b });
      el.style.border = b;
    }
    // `glow` used to be reachable ONLY from inside the elevation branch, so a layer that asked for a
    // glow and no elevation got silently nothing, schema.json advertises it as a standalone prop.
    // It composes now: elevation (or `shadow`) writes the depth stack, glow appends the bloom.
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
      const spread = L.intensity != null ? Math.max(0.05, Math.min(1, L.intensity)) : 0.25;
      stack.push(`0 0 64px ${L.glow === true ? 'var(--accent-glow)' : hexA(L.glow, spread)}`);
    }
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
  // blur, which still need real sampling (docs/ROADMAP.md).
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
  // The outside standards call this the strongest single technique they have (docs/CRAFT/MOTION-STANDARDS.md):
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
  // this feature exists not to be (docs/MISTAKES.md #213, #369, #373, #375).
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

  function layoutGroup(el, L) { // layout-by-containment: a flex OR grid box, or FREE placement
    // `free`: children carry their own x/y inside the group instead of flowing. Without it, any
    // composition whose positions are computed (a bubble map, a ring, a scatter) costs ONE TOP-LEVEL
    // LAYER PER ELEMENT (46 for tpot's map) and slams into the 120-layer cap for a reason that has
    // nothing to do with complexity. Flow layouts cannot express "at this coordinate", so authors had
    // no way down. With `free` + per-child `delay` the same composition is a single layer.
    if (L.layout === 'free') {
      el.style.display = 'block';
      el.dataset.free = '1'; // read by addGroupChild: children must place themselves
    } else if (L.layout === 'grid') {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(${L.gridCols ?? 2}, ${L.colw ? L.colw + 'px' : '1fr'})`;
      el.style.columnGap = (L.colGap ?? L.gap ?? 24) + 'px';
      el.style.rowGap = (L.rowGap ?? L.gap ?? 24) + 'px';
      const gridItems = L.items || L.align2 || 'stretch';
      checkDropped(L, { justifyItems: gridItems });
      el.style.justifyItems = gridItems;
    } else {
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

  function addGroupChild(parentEl, C, rootL) { // recursive: nested group OR a text/image/count leaf
    const c = document.createElement('div');
    // A nested GROUP used to return here: before decorate(), before the timing dataset, before the
    // extra[] push. So `delay`, `anim`, `out`, `enterDur`, `mask`, `filter` and `vars` were accepted on
    // a nested group and silently ignored, while the identical props worked one node down on a leaf.
    // MISTAKES #69 fixed exactly this and fixed it for LEAVES ONLY; the early return was two lines
    // above the code being written and got missed. A group is a timed element like any other.
    const isGroup = C.type === 'group';
    // COMPUTED BEFORE the branch, because a group has to know its own window before it can hand it to
    // its children. It used to be computed at the bottom, after the recursion had already run with the
    // wrong one.
    // A CHILD'S CLOCK IS ITS PARENT'S, OFFSET BY `delay`, AND THAT IS THE WHOLE VOCABULARY.
    // Containment scopes time here exactly as it scopes geometry, which is the point of a group: a
    // child's x/y are relative to the group's box and its window is relative to the group's window. It
    // works and it is used, by 279 children in this library.
    //
    // A child writing its own `start` or `duration` is READ OFF `rootL` two lines down and its own
    // values never looked at, so 30 starts and 14 durations across 9 films are accepted, discarded, and
    // rendered as the parent's window. That is said out loud in core/validate.mjs (inertPropWarns)
    // rather than fixed here, for the reason the `border`/`elevation` pair beside it gives: honouring
    // an absolute start would let a child outlive the group containing it, which ends containment in
    // the one dimension it still held, and `delay` already says the thing, so honouring `start` would
    // be a second spelling of one idea.
    const d = Math.max(0, +C.delay || 0);
    const cStart = (rootL.start ?? 0) + d, cDur = Math.max(0, (rootL.duration ?? 0) - d);
    const exitDur = childExitDur(C, rootL); // see childExitDur above
    const contentStart = childContentStart(C, rootL, d); // see childContentStart above
    if (isGroup) {
      c.className = 'hs-group';
      layoutGroup(c, C); chipBox(c, C); sizeChild(c, C, false);
      // A free group's children place themselves with position:absolute, which resolves against the
      // nearest POSITIONED ancestor. A top-level layer is absolute, so free layout works there; a
      // NESTED group is static, so its children escaped past it to the layer root and the group's own
      // position stopped meaning anything. Set here rather than in layoutGroup because a top-level
      // free group is already absolute with left/top from scene.html, and relative would break it.
      // If parentEl is itself free, the line further down overwrites this with absolute, which is
      // equally a containing block.
      if (c.dataset.free && !c.style.position) c.style.position = 'relative';
      // A nested group's `modifiers` never reached buildFx, because that only runs inside buildLeaf and
      // a group is not a leaf. The per-frame half ran regardless (scene.js drives every entry in
      // `extra`), so half of each modifier applied and nothing said so. Loud if the injection is
      // missing rather than skipped, for the same reason.
      if (C.modifiers != null) {
        if (!api.buildFx)
          throw new Error(`layer "${C.id || 'group'}": \`modifiers\` on a nested group needs the fx `
            + `builder, which core/layers/index.js injects into the kit. This build path did not get `
            + `one, so the modifiers would apply their frame half only.`);
        api.buildFx(c, C);
      }
      parentEl.appendChild(c);
      // RECURSE WITH THIS GROUP'S OWN WINDOW, not the outermost layer's. `rootL` was threaded
      // unchanged through every level, so a grandchild's `delay` was an offset from the TOP-LEFT of
      // the whole layer rather than from its own container. Measured before the fix: a layer starting
      // at 2s, holding a group with `delay: 1` (correctly resolved to 3s), holding a child with no
      // delay, scheduled that child at 2s. It appeared a full second BEFORE the group it lives in.
      // That is not a stagger model, it is an absent one, and the comment below has described the
      // intended behaviour ("within its group's window") the whole time.
      for (const gc of C.children || []) addGroupChild(c, gc, { start: cStart, duration: cDur, exitDur });
    }
    if (!isGroup) c.className = C.type === 'image' ? 'hs-img-wrap' : 'hs-text';
    // DELEGATE to the primitive. This file used to re-implement a SUBSET of each type's build inline,
    // which is why a child silently lost image `canvasFx` (baked at boot, then thrown away), `ken`'s
    // clip box, `edgeFade`, and text's `fit`/`fitH`/`maxLines`/`raw` and the whole microType pass.
    // Re-implementing a builder is how the subset drifts from the original; calling it cannot.
    if (!isGroup) {
      if (api.buildLeaf) api.buildLeaf(c, C);
      else if (C.type === 'image') { c.innerHTML = icon(C.src, ''); }
      else { styleText(c, C, (rootL.start ?? 0) + (rootL.duration ?? 2) / 2); chipBox(c, C); }
      sizeChild(c, C, C.type === 'image');
    }
    decorate(c, C);   // both paths: mask / filter / look / fade / reflect / logotype
    if (C.critical) c.setAttribute('data-layer', 'critical');
    // the group-child twin of the opt-out in formats/scene/scene.js: `critical:false` must mean the same
    // thing at both depths, or a card that bleeds by design can be excused only when it is top-level.
    if (C.critical === false) c.setAttribute('data-audit', 'off');
    if (parentEl.dataset.free) { c.style.position = 'absolute'; c.style.left = (C.x || 0) + 'px'; c.style.top = (C.y || 0) + 'px'; }
    if (!isGroup) parentEl.appendChild(c);   // a group appended itself above, before recursing
    // `delay` staggers a child WITHIN its group's window (it still ends with the group, so the exit
    // stays in formation). Group children previously all shared the root's exact window, which is why
    // a wall could only ever arrive as one block. Defaults to 0 → existing groups are unchanged.
    // driveClips owns every timed element and it finds them by `[data-start]` (core/clips.js). A group
    // child never had those attributes, so its ENTRANCE came from the group's window no matter what the
    // child declared: `delay` shifted a start that only the cut/motion/units paths read, and the child
    // still faded in with its siblings. 69 authored uses, every one inert, including the one this prop
    // was added for, which was signed off from a settled frame where the stagger was already over
    // (MISTAKES #69). Writing the dataset hands the child to the same driver as a top-level layer, so
    // delay/anim/out/enterDur/exitDur mean here exactly what they mean out there.
    c.dataset.start = String(cStart);
    c.dataset.duration = String(cDur);
    // Always written, like the top-level layer (formats/scene/scene.js setLayerTiming): leaving the
    // attribute unset here meant `clipStyleAt`'s literal `dataset.anim === 'none'` check never fired for
    // an un-authored child, so it kept fading in via the opacity envelope even after `resolveAnim(null)`
    // stopped writing a transform for it.
    c.dataset.anim = C.anim || 'none';
    if (C.out) c.dataset.out = C.out;
    if (C.enterDur != null) c.dataset.enter = String(C.enterDur);
    if (exitDur != null) c.dataset.exitDur = String(exitDur);
    extra.push({ L: { ...C, start: cStart, duration: cDur,
      ...(C.contentStart != null ? { contentStart } : {}) }, el: c, units: C.split ? splitText(c, C.split) : null });
  }

  // `trackingCss` is exported so anything that needs to KNOW the settled letter-spacing can ask the
  // one resolver instead of re-deriving it. Reading it is free; writing it is styleText's alone.
  // `frame` after the spread, so a kit that derived one still exposes it. Every primitive reads the
  // canvas from here: `kit.frame.W`, `kit.frame.safe`, never an imported number or a hardcoded 1920.
  const api = { ...ctx, frame, hexA, onDark, trackingCss, styleText, chipBox, applyFade, decorate, layoutGroup, sizeChild, addGroupChild };
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
// caller's own CSS. Worked example: formats/scene/_glass-shapes.sphere.html.
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
