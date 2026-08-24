// core/layers/util.js — shared helpers for the layer primitives (core/layers/*). `createKit(ctx)` binds
// them to the scene's services (theme, inkAt, cam, splitText, …) so every primitive builder is a small
// pure-ish file that takes the kit. Ported verbatim from scene.html's inline helpers (byte-identical).

import { applyLayerFilter } from '../filters.js';
import { droppedProps } from '../sanitize-html.js';
import { isLook, applyComposite } from '../looks.js';
// isLightBg is core/motion.js's single definition of light-versus-dark, in linear light. Every part of
// this engine that has to tell a light ground from a dark one asks THAT function; a second hand-kept
// copy of the question is docs/MISTAKES.md #159.
import { isLightBg, parseColor } from '../motion.js';

// hexA('#5e6ad2', .25) → rgba string (glow/beam colours come as brand hex)
export function hexA(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// GLYPH_PAINTERS — the effects that repaint every CHARACTER against a ground of their own, so the
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

// The props the SHARED KIT reads, for every layer type that calls it — the type styling, the chip box,
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
  grow: {}, basis: {}, delay: {}, critical: {}, x: {}, y: {}, split: {},
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

  // inkIsLight(c) — is the colour this layer settled on a LIGHT one? Asked of a real colour, never of a
  // token name: `inkAt` hands back theme tokens (`var(--ink)` over a light window, the theme's own light
  // ground over a dark one), and a token name is not a lightness. `themes/vawe.json` sets `text` and
  // `ink` to the same dark hex, so reading the name would call that theme's light-on-dark type dark-on-
  // light — the same trap formats/scene/scene.js documents at its ON_DARK. So resolve the token back
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
  // onDark(L, midT) — TRUE when this layer's type is light ink on a dark ground at second `midT`. It is
  // the layer's settled colour asked of the palette, and it is one named function rather than an inline
  // expression because more than one place has to ask the same question and get the same answer.
  //
  // It answers about the LAYER's ink, and that is only the ink the glyphs are drawn in while nothing
  // repaints them. GLYPH_PAINTERS below names the effects for which it is not, and there the honest
  // answer is "this layer cannot say".
  const onDark = (L, midT) => (paintsOwnGlyphs(L) ? false : inkIsLight(L.color || inkAt(midT) || 'var(--text)'));

  // trackingCss(L, midT) — THE ONE RESOLUTION of a layer's settled letter-spacing, and the only thing
  // `styleText` writes into `el.style.letterSpacing`. Everything with an opinion is folded in here:
  // the author's prop, the size ramp, the light-on-dark lift, mono, `raw`, and the theme's optical flag.
  //
  // WHY IT IS ONE FUNCTION. This value used to be written twice: here, and again one statement later by
  // microType in core/layers/text.js. The second write ate the author's own `tracking` in 12 shipped
  // scenes (MISTAKES #28) and then ate the light-on-dark polarity (#388). Both were repaired by
  // threading one more argument into the second writer, which left the trap set for a third. It is one
  // write now. A new opinion goes in this function, not in a new statement somewhere else.
  //
  // `trackingFor` is a RAMP, not a decision — it turns (size, polarity) into ems. The decision is here.
  function trackingCss(L, midT) {
    // An explicit `tracking`/`ls` always wins: everything below is a DEFAULT, never an override.
    // They are two declared names for one CSS property. The old guard in microType named only `ls`,
    // so a `tracking` the author set was applied and then discarded (MISTAKES #28, #79).
    if (L.tracking != null) return L.tracking;
    if (L.ls != null) return L.ls;
    const size = L.size ?? 96;
    // The micro-typography path: every text/count layer except mono (tracking is wrong for code) and
    // `raw:true` (the author asked for no refinements). It takes the optical ramp unconditionally —
    // it does not consult `theme.type.optical` or the serif case, and that is the rule as SHIPPED,
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
    // contrast against the ground — so a light answer means a dark ground underneath it, and that is
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
    if (L.align) el.style.textAlign = L.align;
    if (L.color) el.style.color = L.color; else if (auto) el.style.color = auto;
    // <b> emphasis colour: explicit emColor wins; else the brand accent for the POP — EXCEPT over an
    // accent-coloured field, where accent-on-accent vanishes, so emphasis falls back to the layer's OWN
    // colour (bold, always visible). Guard against blue-on-blue. (Must be a real colour, not `inherit`.)
    const w = bgWinAt(midT);
    const emDefault = w && ACCENT_BGS.includes(w.preset) ? layerColor : 'var(--accent)';
    el.style.setProperty('--em', L.emColor || emDefault);
    // --layer-ink: the colour this layer ACTUALLY settled on, published for the kinetic presets.
    // `colorWave` sweeps the accent through a phrase and settles each word to a "resting colour" that
    // defaulted to `var(--ink)`. A preset writes `color` on every unit span every frame, so it wins over
    // whatever `auto` put on the layer — which means a colour-wave headline over a DARK bg window
    // settled to the dark ink and was not there, while the identical headline without the preset was
    // fine. Same shape as #373: a token name standing in for a decision that depends on the window.
    // The resting colour is not the preset's to choose; it is the colour this layer would have had.
    el.style.setProperty('--layer-ink', layerColor);
    el.innerHTML = L.type === 'count' ? '' : (L.text || '');
    if (L.type === 'count') { el.style.fontVariantNumeric = 'tabular-nums'; el.textContent = (L.prefix || '') + (L.from ?? 0).toFixed(L.decimals ?? 0) + (L.suffix || ''); }
  }

  function chipBox(el, L) { // shared box treatment: bg/pad/radius/border/shadow/elevation on ANY layer
    // `css` can paint a background of its own — a gradient, an image, a conic sweep — and a painted
    // box is a box, so `radius` has to reach it. Before `css` existed no layer could paint without one
    // of the props below, so `radius` alone was nothing to round and its absence here was invisible.
    // The feature made the combination legal and turned the omission into a silent drop: the corners
    // came out square and nothing said why. Guarded on an EXPLICIT radius so the `?? 16` default below
    // stays the engine's own box recipe and is never substituted into hand-written paint.
    if (L.bg == null && !L.border && !L.shadow && !L.elevation && !L.glow && !(L.css && L.radius != null)) return;
    if (L.bg) el.style.background = L.bg; else if (L.elevation) el.style.background = 'var(--surface)';
    if (L.pad != null) el.style.padding = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
    el.style.borderRadius = (L.radius ?? 16) + 'px';
    if (L.border && !L.elevation) el.style.border = L.border === true ? '1px solid var(--line)' : L.border;
    // `glow` used to be reachable ONLY from inside the elevation branch, so a layer that asked for a
    // glow and no elevation got silently nothing — schema.json advertises it as a standalone prop.
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
    // writes the raw L.filter string — resolving named grade presets (core/filters.js) at this hook
    // needs no consumption-point edit. Raw CSS filter strings resolve to themselves (no-op).
    if (L.filter) { if (isLook(L.filter)) applyComposite(el, L.filter, L.lookOpts); else applyLayerFilter(el, L.filter); }
    if (!L.fade) return;
    if (L.cut) throw new Error(`layer "${L.text || L.type}": fade and cut are mutually exclusive — put the fade on an inner layer`);
    const g = { right: 'linear-gradient(90deg, #000 55%, transparent 98%)',
                left: 'linear-gradient(270deg, #000 55%, transparent 98%)',
                bottom: 'linear-gradient(180deg, #000 55%, transparent 98%)',
                top: 'linear-gradient(0deg, #000 55%, transparent 98%)',
                edges: 'radial-gradient(120% 120% at 50% 50%, #000 60%, transparent 100%)' }[L.fade];
    if (g) { el.style.maskImage = g; el.style.webkitMaskImage = g; }
  }

  // The per-layer decoration that scene.html applied to top-level layers and to nothing else, so
  // `filter`, `mask`, `fade`, `lookOpts`, `reflect` and `logotype` were all silently dropped the moment
  // a layer moved inside a group. Extracted so there is ONE definition and both paths call it — the
  // same reason the safe box and the canvas size each had to be collapsed to one (MISTAKES #70).
  // GLASS. `backdrop-filter` reads the pixels BEHIND an element, which is the one thing the shader
  // path cannot do — core/stings.js and core/shaders-ambient.js are generative overlays with no
  // sampler2D, so frosted glass and everything in that family was blocked on a structural
  // layer-as-texture change. CSS has had the capability all along and the repo had zero occurrences
  // of it. This is the cheap half: blur/saturate what is behind. It does NOT give radial/zoom/spin
  // blur, which still need real sampling (docs/ROADMAP.md).
  //   glass: true            → a sensible frosted default
  //   glass: 18              → blur radius in px
  //   glass: 'blur(18px) saturate(1.4)'  → the raw filter, for full control
  function applyGlass(el, L) {
    if (L.glass == null || L.glass === false) return;
    const f = L.glass === true ? 'blur(14px) saturate(1.35)'
      : typeof L.glass === 'number' ? `blur(${L.glass}px) saturate(1.3)` : String(L.glass);
    el.style.backdropFilter = f;
    el.style.webkitBackdropFilter = f;
  }

  // progressiveBlur — a DIRECTIONAL blur fog on the backdrop that ramps toward an edge (motion-primitives
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

  // borderTrail — a glowing arc orbits the layer's border (motion-primitives BorderTrail): a ring mask
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
    el.style.backgroundImage = background || 'none';
    if (!background && !el.style.background && !el.style.backgroundColor) el.style.background = 'rgba(0,0,0,0.001)';
    el.style.pointerEvents = 'none';
  }

  function decorate(el, L) {
    applyGlass(el, L);
    applyCrt(el, L);
    applyProgressiveBlur(el, L);
    applyBorderTrail(el, L);
    if (L.mask) { el.style.webkitMaskImage = L.mask; el.style.maskImage = L.mask; }
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
  // Written ONCE here, at build time, same as every other decorate() call — never per frame. That is
  // why `core/validate.mjs`'s `cssErrors` REFUSES any key the engine itself rewrites every frame
  // (opacity, transform, left/top/width/height, zIndex, pointerEvents) or that core/tokens.css kills
  // globally (animation, transition): a build-time write to one of those is silently erased the moment
  // the render advances past frame 0, which is the exact "accepted input the engine then ignores" bug
  // this feature exists not to be (docs/MISTAKES.md #213, #369, #373, #375).
  //
  // camelCase in (`boxShadow`), CSS out: `el.style` is a CSSStyleDeclaration, so assigning its camelCase
  // property IS how a browser accepts a JS write for a hyphenated CSS property — no hand conversion.
  function applyCss(el, L) {
    if (!L.css || typeof L.css !== 'object' || Array.isArray(L.css)) return;
    // REFUSE A VALUE THE BROWSER WOULD DROP, here, where it is written. Assigning an invalid value to
    // `el.style` is a silent no-op: the property keeps its old value and the author is told nothing.
    // That is this engine's cardinal sin, and `css` is the one door through which arbitrary author CSS
    // reaches the DOM, so it is the door that checks. Build-time only — this runs once per layer, not
    // per frame, because `css` is a settled style and never a motion channel.
    const bad = droppedProps(L.css);
    if (bad.length)
      throw new Error(`layer${L.id ? ` "${L.id}"` : ''} (type "${L.type || 'text'}"): the browser drops `
        + `${bad.length === 1 ? 'this css declaration' : 'these css declarations'} — ${bad.join(' · ')}. `
        + `It would keep the rest and render on, so nothing would fail and the layer would simply never `
        + `do it. A leading minus outside calc() is the usual cause: write \`calc(-1 * …)\`, not \`-calc(…)\`.`);
    Object.assign(el.style, L.css);
  }

  function layoutGroup(el, L) { // layout-by-containment: a flex OR grid box, or FREE placement
    // `free`: children carry their own x/y inside the group instead of flowing. Without it, any
    // composition whose positions are computed (a bubble map, a ring, a scatter) costs ONE TOP-LEVEL
    // LAYER PER ELEMENT — 46 for tpot's map — and slams into the 120-layer cap for a reason that has
    // nothing to do with complexity. Flow layouts cannot express "at this coordinate", so authors had
    // no way down. With `free` + per-child `delay` the same composition is a single layer.
    if (L.layout === 'free') {
      el.style.display = 'block';
      el.dataset.free = '1'; // read by addGroupChild — children must place themselves
    } else if (L.layout === 'grid') {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(${L.gridCols ?? 2}, ${L.colw ? L.colw + 'px' : '1fr'})`;
      el.style.columnGap = (L.colGap ?? L.gap ?? 24) + 'px';
      el.style.rowGap = (L.rowGap ?? L.gap ?? 24) + 'px';
      el.style.justifyItems = L.items || L.align2 || 'stretch';
    } else {
      el.style.display = 'flex';
      el.style.flexDirection = (L.layout || L.direction) === 'column' ? 'column' : 'row';
      el.style.gap = (L.gap ?? 24) + 'px';
      el.style.flexWrap = L.wrap ? 'wrap' : 'nowrap';
      el.style.alignItems = L.items || L.align2 || 'center';
      el.style.justifyContent = L.justify || 'flex-start';
    }
    if (L.pad != null) el.style.padding = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
    if (L.h != null) el.style.height = L.h + 'px';
  }

  function sizeChild(c, C, isImg) {
    if (C.grow != null) c.style.flexGrow = String(C.grow);
    if (C.basis != null) c.style.flexBasis = typeof C.basis === 'number' ? C.basis + 'px' : C.basis;
    if (!isImg) { if (C.w != null) c.style.width = C.w + 'px'; if (C.h != null) c.style.height = C.h + 'px'; }
  }

  function addGroupChild(parentEl, C, rootL) { // recursive: nested group OR a text/image/count leaf
    const c = document.createElement('div');
    // A nested GROUP used to return here — before decorate(), before the timing dataset, before the
    // extra[] push. So `delay`, `anim`, `out`, `enterDur`, `mask`, `filter` and `vars` were accepted on
    // a nested group and silently ignored, while the identical props worked one node down on a leaf.
    // MISTAKES #69 fixed exactly this and fixed it for LEAVES ONLY; the early return was two lines
    // above the code being written and got missed. A group is a timed element like any other.
    const isGroup = C.type === 'group';
    // COMPUTED BEFORE the branch, because a group has to know its own window before it can hand it to
    // its children. It used to be computed at the bottom, after the recursion had already run with the
    // wrong one.
    const d = Math.max(0, +C.delay || 0);
    const cStart = (rootL.start ?? 0) + d, cDur = Math.max(0, (rootL.duration ?? 0) - d);
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
      for (const gc of C.children || []) addGroupChild(c, gc, { start: cStart, duration: cDur });
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
    // still faded in with its siblings. 69 authored uses, every one inert — including the one this prop
    // was added for, which was signed off from a settled frame where the stagger was already over
    // (MISTAKES #69). Writing the dataset hands the child to the same driver as a top-level layer, so
    // delay/anim/out/enterDur/exitDur mean here exactly what they mean out there.
    c.dataset.start = String(cStart);
    c.dataset.duration = String(cDur);
    if (C.anim) c.dataset.anim = C.anim;
    if (C.out) c.dataset.out = C.out;
    if (C.enterDur != null) c.dataset.enter = String(C.enterDur);
    if (C.exitDur != null) c.dataset.exitDur = String(C.exitDur);
    extra.push({ L: { ...C, start: cStart, duration: cDur }, el: c, units: C.split ? splitText(c, C.split) : null });
  }

  // `trackingCss` is exported so anything that needs to KNOW the settled letter-spacing can ask the
  // one resolver instead of re-deriving it. Reading it is free; writing it is styleText's alone.
  const api = { ...ctx, hexA, onDark, trackingCss, styleText, chipBox, applyFade, decorate, layoutGroup, sizeChild, addGroupChild };
  return api;
}
