import { boot } from '/core/boot.js';
import { icon, clamp01, lerp, fitText, fitBox, kenBurns, interpolate, resolveEasing, trackingFor, hashSeed, motionDefaults } from '/core/motion.js';
import { driveClips, seekAll, BASE_ENTER, BASE_EXIT } from '/core/clips.js';
import { splitText, animateUnits, circleText } from '/core/type.js';
import { buildMorph } from '/core/morph.js';
import { FX_DUR } from '/core/gsap-effects.js';
import { ransomStyle, ransomTick } from '/core/ransom.js';
import { capWords, wordU, lineU, CAP_STYLES } from '/core/captions.js';
import { renderBg, bgPreset, applyBgOver } from '/core/backgrounds.js';
import { createBgHtml } from '/core/bg-html.js';
import { cutStyle, soloCutStyle, SOLO_BLIND, PRESENTATIONS as CUT_PRESENTATIONS, TIMINGS as CUT_TIMINGS } from '/core/cuts.js';
import { createShaderOverlay, SHADER_FX } from '/core/stings.js';
import { createSeamCompositor, SEAM_FX, stageToCanvas, isBlankRaster } from '/core/seams.js';
import { lowerScene } from '/core/transitions-lower.js';
import { CUT_CUE, SEAM_CUE } from '/core/audio-cues.js';
import { cameraAt, motionAt } from '/core/sequence.js';
import { sampleAt } from '/core/spectrum.js';
import { createRenderer } from '/core/layers/index.js';
const $ = (id) => document.getElementById(id);
// px travelled in ONE frame before motion blur switches itself on. 16px/frame is ~480px/s at 30fps,
// about a quarter of a 1920 frame per second — fast enough that a real camera would smear it.
const AUTO_BLUR_FLOOR = 16;
const AUTO_SHUTTER = 0.16;   // higgsfield-recreation's own hand-picked value for its fastest layer

// resolveRelativeStarts — a layer `start` may be a STRING like "otherId+0.5" or "otherId.end-0.2", so
// stagger chains are declared relationships (the temporal twin of `anchor`) instead of hand-added
// arithmetic. Multi-pass (a target may itself be relative); an unresolvable/circular ref fails loud.
// Pure in `data` — mutates the layers' start fields in place before any DOM exists.
function resolveRelativeStarts(data) {
  const byId = {};
  for (const L of data.layers || []) if (L.id) byId[L.id] = L;
  const RX = /^([\w-]+?)(\.end)?\s*([+-]\s*[\d.]+)?$/;
  for (let pass = 0; pass < 8; pass++) {
    let pending = 0;
    for (const L of data.layers || []) {
      if (typeof L.start !== 'string') continue;
      const m = RX.exec(L.start.trim());
      if (!m || !byId[m[1]]) throw new Error(`layer start "${L.start}": unknown reference`);
      const T = byId[m[1]];
      if (typeof T.start === 'string') { pending++; continue; } // resolve target first
      L.start = (T.start ?? 0) + (m[2] ? (T.duration ?? 2) : 0) + (m[3] ? parseFloat(m[3].replace(/\s+/g, '')) : 0);
    }
    if (!pending) break;
    if (pass === 7) throw new Error('relative starts: circular reference');
  }
}

// resolvePans — `panWith: "<layerId>"` copies another layer's motion track onto this one, keeping the
// SAME wall clock and this layer's OWN origin. A pan of the page is not a camera move: a camera
// transforms the whole frame, scrim included, so a film that wants the page to slide under a fixed
// frame has to move the chosen layers together. Doing that by hand means writing the same deltas once
// per layer and time-shifting each by its own start, which is what the exemplar does — twice, across
// five of its six moving layers (docs/CRAFT/KEYED-MOTION.md). Six identical delta lists kept in sync by
// hand, where a one-key drift is invisible in the JSON and obvious on screen.
//
// Copied as DELTAS, not absolute values, because each layer sits at its own x/y; and shifted by the
// difference in `start`, because a `motion` t is local to its layer. A layer may carry its own extra
// keys after the shared ones (the exemplar's button pans with the page, then leaves and does its own
// thing): keys already declared past the source's last shared time are kept.
function resolvePans(data) {
  const byId = {};
  for (const L of data.layers || []) if (L.id) byId[L.id] = L;
  for (const L of data.layers || []) {
    if (typeof L.panWith !== 'string') continue;
    const src = byId[L.panWith];
    if (!src) throw new Error(`layer "${L.id || '?'}" panWith: no layer with id "${L.panWith}"`);
    if (src === L) throw new Error(`layer "${L.id}" panWith: a layer cannot pan with itself`);
    if (typeof src.panWith === 'string') throw new Error(`layer "${L.id}" panWith "${src.id}", which itself pans with another layer — chain them off the ORIGIN so one track stays the source of truth`);
    if (!Array.isArray(src.motion) || !src.motion.length) throw new Error(`layer "${L.id}" panWith "${src.id}", but "${src.id}" has no motion track to share`);
    const shift = (src.start ?? 0) - (L.start ?? 0);         // src-local t → this layer's local t
    const own = Array.isArray(L.motion) ? L.motion : [];
    const base = src.motion;
    const PAN = ['x', 'y'];                                   // the only properties a pan supplies
    const bx = num(base[0].x, 0), by = num(base[0].y, 0);     // deltas from the source's first key
    const ox = num(own[0]?.x, 0), oy = num(own[0]?.y, 0);     // ...applied from THIS layer's own origin
    // A property the layer states once and never animates (the exemplar's button holds y:82 through the
    // whole pan) must survive every shared key. Copying only key 0 dropped it and the button flew.
    const sticky = {};
    if (own.length) for (const k of Object.keys(own[0])) if (k !== 't' && k !== 'ease' && !PAN.includes(k)) sticky[k] = own[0][k];
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const shared = base.map((k) => {
      const t = +(num(k.t, 0) + shift).toFixed(4);
      const out = { ...sticky, ...k, t };
      if (k.x != null) out.x = +(ox + (num(k.x, 0) - bx)).toFixed(3);
      if (k.y != null) out.y = +(oy + (num(k.y, 0) - by)).toFixed(3);
      else if (sticky.y == null && oy) out.y = oy;
      // ...and the layer may declare its OWN key at a shared time: the spinner rotates while it travels,
      // and the button states its own x/y at t=1.25, the moment it peels off the page. What the author
      // writes WINS, x and y included — the pan only supplies what the layer did not state. Letting the
      // pan win on position instead put the button back on the page at the exact key where it leaves.
      const mine = own.find((o) => near(num(o.t, 0), t));
      if (mine) for (const p of Object.keys(mine)) if (p !== 't') out[p] = mine[p];
      return out;
    });
    // ...and any key of its own at a time the pan does not cover, WHEREVER it falls. Restricting these
    // to times after the pan ended silently dropped the exemplar button's key at t=1.18, which sits
    // between two shared keys and is where it peels away from the page. Keys are then sorted, because
    // motionAt walks the track in order.
    const extra = own.filter((o) => !shared.some((sh) => near(sh.t, num(o.t, 0))));
    L.motion = shared.concat(extra).sort((a, b) => num(a.t, 0) - num(b.t, 0));
  }
}
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// resolveAnchors — position a layer RELATIVE to another (`anchor` id → `at`/`dx`/`dy`), so annotations,
// chips and badges point at what they annotate by declared relationship, not eyeballed coordinates.
// Resolved purely from the JSON geometry before any DOM exists (targets need w; h falls back to size*1.2).
function resolveAnchors(data) {
  const byId = {};
  for (const L of data.layers || []) if (L.id) byId[L.id] = L;
  for (const L of data.layers || []) {
    const T = L.anchor && byId[L.anchor];
    if (!T) continue;
    const tw = T.w ?? 0, th = T.h ?? ((T.size ?? 96) * 1.2);
    const dx = L.dx ?? 0, dy = L.dy ?? 12, at = L.at || 'below';
    if (at.startsWith('below')) L.y = (T.y ?? 0) + th + dy;
    else if (at.startsWith('above')) L.y = (T.y ?? 0) - ((L.h ?? (L.size ?? 96) * 1.2) + dy);
    else L.y = (T.y ?? 0) + (L.dy ?? 0);
    if (at === 'right') L.x = (T.x ?? 0) + tw + (L.dx ?? 12);
    else if (at === 'left') L.x = (T.x ?? 0) - ((L.w ?? 300) + (L.dx ?? 12));
    else if (at.endsWith('center') && L.w != null) L.x = (T.x ?? 0) + tw / 2 - L.w / 2 + dx;
    else L.x = (T.x ?? 0) + dx;
  }
}

boot((data, fps, theme, canvas) => {
  // lower the unified `transitions`/`layers[].transition` surface into the raw cuts/stings/seams/
  // anim fields BEFORE any parse below reads them. Pure + idempotent; a scene without the unified
  // keys is untouched. Kept here (top of the callback) so every parser sees the lowered form.
  data = lowerScene(data);
  // canvas W,H come from boot (aspect-resolved). Fallback keeps standalone use working.
  const [W, H] = [canvas?.width || 1080, canvas?.height || 1920];
  const landscape = W > H;
  const cam = $('cam'), cv = $('cv');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // motion personality: the theme's {durationScale, stagger, ...}, resolved ONCE. This is what
  // makes a brand's snap real at render time (it was defined but never applied before). Layers
  // that set their own enterDur/exitDur/stagger still win; this only supplies the default.
  const M = motionDefaults(theme);

  // ---- bg windows: [{preset, from, to, value}] drawn on canvas from the THEME's palette ----
  // bg seed: default = hash(theme name + preset) so the SAME preset looks different across brands;
  // override per-window with b.seed. Injected into every fx (dots/aurora/shapes/particles read it).
  const bgWins = (data.bg || []).map((b0) => {
    // use:"theme" pulls the brand's OWN authored backdrop from themes/<name>.json (bgDefault) —
    // so each brand has a custom bg it declares once, not a shared global preset name repeated
    // (the "customize, don't default" rule; fails loud if the theme never authored one).
    if (b0.use === 'theme' && !(theme && theme.bgDefault)) throw new Error(`bg use:"theme" but theme "${(theme && theme.name) || '?'}" defines no bgDefault`);
    const b = b0.use === 'theme' ? { ...theme.bgDefault, from: b0.from, to: b0.to } : b0;
    // a HAND-AUTHORED window (core/bg-html.js) paints in the DOM, not on the canvas: no preset spec,
    // and the canvas is hidden while it is on screen.
    if (b.html != null) return { from: b.from ?? 0, to: b.to ?? 1e9, html: b.html, tone: b.tone, spec: null };
    const spec = applyBgOver(bgPreset(b.preset || 'paper', b.value, (theme && theme.bg) || undefined), b.opts);
    // grain is OPT-IN (`"grain": true`) — strip the in-engine canvas grain unless a video asks for
    // it, matching the ffmpeg pass. Default-off: no per-frame speck crawl over sharp text.
    if (data.grain !== true) spec.fx = (spec.fx || []).filter((f) => f.type !== 'grain');
    const sd = b.seed != null ? b.seed : hashSeed(String((theme && theme.name) || 'x') + ':' + (b.preset || 'paper')) % 1000;
    for (const f of spec.fx || []) if (f.seed == null) f.seed = sd;
    return { from: b.from ?? 0, to: b.to ?? 1e9, preset: b.preset || 'paper', value: b.value, spec };
  });
  if (!bgWins.length) cv.style.display = 'none'; // fallback: the .hs-stage theme gradient
  // hand-authored backdrops: built once here, shown/hidden per frame by drawBg (null if none declared,
  // so a scene using only presets adds no DOM and renders byte-identical to before).
  const bgHtml = createBgHtml($('root'), bgWins);
  // ink-aware default text color: a layer with no explicit color gets dark ink over light
  // bg windows and light text over dark ones (looked up at the layer's midpoint) — otherwise
  // a light-text theme (plinth) silently renders white-on-paper.
  const LIGHT_BGS = ['paper', 'paperShapes', 'paperDots', 'soft', 'dotmatrix'];
  // bg windows whose field IS the accent colour — accent-tinted emphasis would clash (blue-on-blue)
  const ACCENT_BGS = ['accent', 'accentPlain', 'brandglow'];
  const bgWinAt = (t) => {
    if (!bgWins.length) return null;
    let w = bgWins[0];
    for (const b of bgWins) if (t >= b.from && t < b.to) w = b;
    return w;
  };
  const inkAt = (t) => {
    const w = bgWinAt(t);
    if (!w) return null; // theme-gradient stage: keep the theme's own text color
    // A hand-authored backdrop is opaque to the engine — it cannot read the lightness out of somebody's
    // CSS. Guessing here would silently pick a text colour, and a wrong guess is invisible until the
    // frame is white-on-white. The author declares `tone`; without it we defer to the theme rather than
    // invent an answer.
    if (w.html != null) return w.tone === 'light' ? 'var(--ink)' : w.tone === 'dark' ? 'var(--text)' : null;
    const light = LIGHT_BGS.includes(w.preset) && w.value !== 'dark';
    return light ? 'var(--ink)' : 'var(--text)';
  };

  // ---- shader stings: [{t, fx, dur, seed, color?, intensity?}] — boundary effects on a WebGL overlay ----
  const hex01 = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const stings = (data.stings || []).filter((s) => SHADER_FX.includes(s.fx))
    .map((s) => ({ ...s, _tint: s.color ? hex01(s.color) : null, _intensity: s.intensity ?? 1, _pal: Array.isArray(s.colors) ? s.colors.map(hex01) : null }));
  const fxo = createShaderOverlay($('root'), W, H);

  // ---- scene cuts: [{t, style, dur?, dir?, timing?}] — the transition BETWEEN beats ----
  // Filtered and sorted once at build, never per frame. An unknown style would silently become
  // `fade` inside cutStyle, so it is rejected loudly here instead — that silent fallback is how
  // a nonexistent name survived in the schema for months (MISTAKES #21).
  const sceneCuts = (data.cuts || [])
    .filter((c) => c && c.style && c.style !== 'none')
    .map((c) => {
      if (!CUT_PRESENTATIONS[c.style]) throw new Error(`unknown cut style "${c.style}" at t=${c.t} — known: ${Object.keys(CUT_PRESENTATIONS).join(', ')}`);
      return c;
    })
    .sort((a, b) => +a.t - +b.t);

  // ---- SCENE UNITS (opt-in): beats that transition as WHOLE units (A slides out, B slides in) ----
  // The default `cuts` transform the whole `cam` at once (a camera bump). With `sceneUnits:true` each
  // BEAT (the interval between cut times) becomes its own wrapper, and a boundary moves the OUTGOING
  // wrapper (exit) against the INCOMING wrapper (enter) as separate units — a real scene swap, not a
  // pile of independent layer fades. Reuses the cutStyle PRESENTATIONS (slide/push/slideBlur/…), pure in
  // n. STRICTLY OPT-IN: without the flag, layers attach flat to `cam` exactly as before (snap-identical).
  const sceneUnits = data.sceneUnits === true && sceneCuts.length > 0;
  // Without sceneUnits a cut drives ONE root (drawCameraAndCut), so it can only transition through
  // transform/filter — the visibility channels are pinned open or the frame empties. A style whose
  // whole transition IS a visibility channel would therefore be silently inert here, so refuse it.
  if (!sceneUnits) for (const cu of sceneCuts) {
    if (!SOLO_BLIND.has(cu.style)) continue;
    throw new Error(`cut style "${cu.style}" at t=${cu.t} transitions only by fading/masking, which a `
      + `whole-frame cut cannot do (there is nothing underneath — the frame would go empty). Either set `
      + `"sceneUnits": true so the two beats cross-fade as units, or use a style that moves: `
      + `${Object.keys(CUT_PRESENTATIONS).filter((k) => !SOLO_BLIND.has(k)).join(', ')}.`);
  }
  const beatBounds = [], beatWrap = [];
  if (sceneUnits) {
    const ts = [...new Set(sceneCuts.map((c) => +c.t))].sort((a, b) => a - b);
    const edges = [0, ...ts];
    for (let i = 0; i < edges.length; i++) {
      const end = i < ts.length ? ts[i] : Infinity; // last beat runs to the end (no exit cut)
      beatBounds.push({ start: edges[i], end });
      const w = document.createElement('div');
      w.className = 'hs-beat';
      w.style.cssText = 'position:absolute;inset:0;transform-origin:50% 50%;will-change:transform,opacity';
      cam.appendChild(w);
      beatWrap.push(w);
    }
  }
  // which beat a top-level layer belongs to (by its start time). Group children ride their parent's beat.
  // `acrossBeats: true` opts a layer OUT: it belongs to the film, not to any one beat, so it attaches
  // flat to `cam` and keeps its authored duration and its own exit. That is the whole mechanism by
  // which a continuous object can exist in a cut film. Until this flag, beat wrapping truncated every
  // non-last-beat layer at its beat's end, so no object could survive a cut and the doctrine's central
  // rule was unexpressible in exactly the films it was written for. Three authors in one campaign hit it
  // and each worked around it differently, one by re-declaring the same 6KB of SVG seven times.
  //
  // Stacking: `cam` children are the beat wrappers (z auto) plus any across-beats layers, whose z-index
  // is `track ?? array index`, so a spine paints ABOVE beat content by default. Author `"track": -1` to
  // put it behind. Said out loud because a silent stacking change is worse than a documented one.
  const beatIndexOf = (L) => {
    if (!sceneUnits || L.acrossBeats === true) return null;
    const s = L.start ?? 0;
    for (let i = 0; i < beatBounds.length; i++) if (s >= beatBounds[i].start && s < beatBounds[i].end) return i;
    return beatBounds.length - 1;
  };
  const beatExitEnd = (i, half) => (beatBounds[i] && isFinite(beatBounds[i].end) ? beatBounds[i].end + half : null);

  resolveRelativeStarts(data); // "otherId+0.5" / "otherId.end-0.2" → numeric starts (declared stagger chains)
  resolvePans(data);           // panWith:"<id>" → that layer's motion, same wall clock, this layer's origin
  resolveAnchors(data);        // anchor/at/dx/dy → absolute x/y (annotations point at what they annotate)
  const extra = []; // group children (any depth), animated on their root group's window

  // applyGsapHooks — the GSAP-driven layer entrances/exits/paths, all built as PAUSED tweens on
  // gsap.globalTimeline at build; seekAll(t) seeks them per frame (runs AFTER driveClips, so GSAP
  // owns the transform), and fromTo/immediateRender pin the start values so a frame is pure in t
  // regardless of render order. Split layers target the per-unit `units` (staggered); else the layer.
  function applyGsapHooks(el, L, units) {
    // declarative tween: `gsap:{from,to,dur,ease}` → the whole GSAP easing library (elastic/back/…).
    if (L.gsap && window.gsap) {
      const g = L.gsap;
      window.gsap.fromTo(el, { ...(g.from || {}) },
        { ...(g.to || {}), duration: g.dur ?? (L.duration ?? 2), ease: g.ease || 'power2.out', delay: L.start ?? 0, immediateRender: true });
    }
    // TextMorph: letters migrate A->B (core/morph.js), tweened by GSAP. Rebuilds the layer's chars.
    // Guard on type: an svg layer's `morph` is a SHAPE morph it drives itself in svg.js frame() — without
    // this, buildMorph would rebuild the svg as text glyphs and render the target path `d` string as words
    // (docs/MISTAKES.md #140: the engine silently doing the wrong thing on an accepted input).
    if (L.morph && L.type !== 'svg' && window.gsap) buildMorph(el, L, window.gsap);
    // NAMED GSAP effects (core/gsap-effects.js): `fx:"popIn"` | `fx:{name,dur,ease}` | `fx:["blurIn","float"]`.
    if (L.fx && window.gsap) {
      const targets = (units && units.length) ? units : el; // split → per unit (staggered), else the layer
      for (const item of (Array.isArray(L.fx) ? L.fx : [L.fx])) {
        const spec = typeof item === 'string' ? { name: item } : (item || {});
        const fn = window.gsap.effects[spec.name];
        if (!fn) { console.warn(`fx: unknown GSAP effect "${spec.name}"`); continue; }
        const { name, dur, ease, delay, stagger, ...rest } = spec;
        fn(targets, { delay: (L.start ?? 0) + (delay || 0), stagger: stagger ?? (targets === units ? 0.04 : 0),
          ...(dur != null ? { duration: dur } : {}), ...(ease ? { ease } : {}), ...rest });
      }
    }
    // NAMED GSAP EXIT (`fxOut`): anchored so the exit ENDS exactly at the layer's end (delay = end - dur).
    // immediateRender:false (set at registration) holds the layer until then. Exclusive with `out` (validate).
    if (L.fxOut && window.gsap) {
      const spec = typeof L.fxOut === 'string' ? { name: L.fxOut } : (L.fxOut || {});
      const fn = window.gsap.effects[spec.name];
      if (!fn) console.warn(`fxOut: unknown GSAP effect "${spec.name}"`);
      else {
        const { name, dur, ease, stagger, ...rest } = spec;
        const d = dur ?? FX_DUR[spec.name] ?? 0.5;
        const end = (L.start ?? 0) + (L.duration ?? 2);
        const targets = (units && units.length) ? units : el;
        fn(targets, { delay: Math.max(0, end - d), duration: d, stagger: stagger ?? 0,
          ...(ease ? { ease } : {}), ...rest });
      }
    }
    // MOTION PATH (MotionPathPlugin): fly the layer along an SVG path. Closed-form position → pure in n.
    if (L.motionPath && window.gsap && window.MotionPathPlugin) {
      const mp = L.motionPath;
      window.gsap.to(el, {
        motionPath: { path: mp.path, align: mp.align, alignOrigin: mp.alignOrigin, autoRotate: mp.autoRotate ?? false, curviness: mp.curviness },
        duration: mp.dur ?? (L.duration ?? 2), ease: mp.ease || 'power1.inOut',
        delay: (L.start ?? 0) + (mp.delay || 0), immediateRender: true });
    }
    // PHYSICS 2D (Physics2DPlugin): velocity/gravity/friction scatter. On a split layer each unit gets an
    // index-based angle spread (deterministic, no random) so a word explodes outward. Closed-form → pure in n.
    if (L.physics && window.gsap && window.Physics2DPlugin) {
      const p = L.physics, tg = (units && units.length) ? units : [el];
      tg.forEach((u, i) => {
        const angle = (p.angle ?? -90) + (tg.length > 1 ? (i - (tg.length - 1) / 2) * (p.spread ?? 0) : 0);
        window.gsap.to(u, { physics2D: { velocity: p.velocity ?? 300, angle, gravity: p.gravity ?? 400, friction: p.friction ?? 0 },
          duration: p.dur ?? (L.duration ?? 2), ease: 'none', delay: (L.start ?? 0) + (p.delay || 0), immediateRender: true });
      });
    }
    // SPLIT TEXT (SplitText) — LINE level ONLY (char/word stay with the engine's own `split`): masked line
    // reveals, each line clipped so it slides up from behind. Do NOT combine with `split` on the same layer.
    // PARTS — dense per-CHILD choreography: stagger a named entrance across a layer's own child elements
    // (a bespoke SVG's bars/dots/paths, a group's cards), so a single figure animates piece by piece
    // instead of arriving as one block. This is the another engine density move (tl.fromTo on child elements
    // with a stagger), built on our seeked GSAP so it stays pure in n. Applies to any layer with children
    // (html inline-SVG, group, svg). `parts: { select, anim, each, stagger, delay, ease }`.
    if (L.parts && window.gsap) {
      // named part entrances: [staticSetup(t), fromVars, toVars]. Kept tiny + local — the vocabulary an
      // author reaches for on a figure; every one is a compositor-friendly transform/opacity/dashoffset.
      const PARTS = {
        growUp: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 100%'; }, { scaleY: 0 }, { scaleY: 1 }],
        widen: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '0% 50%'; }, { scaleX: 0 }, { scaleX: 1 }],
        popIn: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 50%'; }, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }],
        fadeUp: [null, { y: 24, opacity: 0 }, { y: 0, opacity: 1 }],
        riseIn: [null, { y: 48, opacity: 0 }, { y: 0, opacity: 1 }],
        drawOn: [(t) => { try { t.setAttribute('pathLength', '1'); } catch (e) {} t.style.strokeDasharray = '1 1'; }, { strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      };
      // one spec or an ARRAY of specs — a figure can grow its bars, THEN draw its line, THEN pop its dots.
      for (const p of (Array.isArray(L.parts) ? L.parts : [L.parts])) {
        const sel = p.select || 'rect, circle, path, polyline, line, [data-part]';
        const targets = [...el.querySelectorAll(sel)];
        if (!targets.length) continue;
        const spec = PARTS[p.anim] || PARTS.fadeUp;
        if (spec[0]) targets.forEach(spec[0]);
        window.gsap.fromTo(targets, { ...spec[1] }, {
          ...spec[2], duration: p.each ?? 0.5, stagger: p.stagger ?? 0.07,
          ease: p.ease || 'power3.out', delay: (L.start ?? 0) + (p.delay ?? 0.1), immediateRender: true,
        });
      }
    }
    if (L.splitText && window.gsap && window.SplitText) {
      const st = L.splitText;
      const parts = new window.SplitText(el, { type: 'lines', mask: st.mask === false ? undefined : 'lines', linesClass: 'sline' });
      parts.lines.forEach((ln, i) => {
        window.gsap.fromTo(ln, { yPercent: 120, opacity: st.mask === false ? 0 : 1 },
          { yPercent: 0, opacity: 1, duration: st.dur ?? 0.7, ease: st.ease || 'power3.out',
            delay: (L.start ?? 0) + i * (st.stagger ?? 0.09), immediateRender: true });
      });
    }
  }

  // the layer registry (core/layers/*) — one primitive per file; scene.html just dispatches.
  const renderer = createRenderer({ theme, W, H, cam, inkAt, bgWinAt, ACCENT_BGS, trackingFor,
    splitText, icon, motionAt, kenBurns, interpolate, resolveEasing, clamp01, fitText, fitBox,
    extra, components: window.__components, clips: window.__clips, lottie: window.__lottie });
  // setLayerTiming — write the data-* attributes driveClips reads (start/duration/track/anim/enter/exit).
  // Enter/exit default to the base snap durations scaled by the theme's durationScale; a split layer
  // enters instantly (units reveal themselves), and fxOut zeroes the fade so GSAP owns the exit alone.
  function setLayerTiming(el, L, idx) {
    el.dataset.start = String(L.start ?? 0);
    if (L.duration != null) el.dataset.duration = String(L.duration);
    el.dataset.track = String(L.track ?? idx);
    el.dataset.anim = (L.split || L.cut) ? 'none' : (L.anim || 'fade');
    if (L.cut === 'jitter') el.dataset.motion = 'loop'; // declared shake — exempt from shimmer checks
    if (L.split) el.dataset.enter = '0';
    else if (!L.cut) el.dataset.enter = String(+(L.enterDur ?? BASE_ENTER * M.durationScale).toFixed(3));
    if (L.out) el.dataset.out = L.out;
    if (L.fxOut) el.dataset.exitDur = '0';
    else if (L.exitDur != null) el.dataset.exitDur = String(L.exitDur);
    else if (!L.cut) el.dataset.exitDur = String(+(BASE_EXIT * M.durationScale * M.exitRatio).toFixed(3));
    // scene units: the beat WRAPPER owns the exit slide. Suppress this layer's own exit fade and keep it
    // alive through the wrapper's exit window, or it would vanish mid-slide. Non-last beats only (the
    // last beat has no exit cut). The incoming ENTER stays per-layer, so contents still stagger in.
    if (sceneUnits) {
      const bi = beatIndexOf(L);
      if (bi != null && bi < beatBounds.length - 1) {
        const be = beatBounds[bi].end;                    // this beat's exit cut time
        const cut = sceneCuts.find((c) => +c.t === be);
        const dur = cut && cut.dur != null ? +cut.dur : 0.4;
        el.dataset.exitDur = '0';                          // wrapper owns the exit slide (no per-layer fade)
        el.dataset.duration = String(+(be + dur - (L.start ?? 0)).toFixed(3)); // live through the slide-out
      }
    }
  }

  // buildLayer — turn one layer's JSON into its DOM element (position + class + timing), dispatch to the
  // primitive builder, apply split/ransom/circle, decorate, and wire the GSAP hooks. Returns the tuple
  // the per-frame loop drives: { L, el, units }. Order is load-bearing (see the decorate note below).
  function buildLayer(L, idx) {
    const el = document.createElement('div');
    el.className = 'hs-layer ' + (L.type === 'image' ? 'hs-img-wrap' : L.type === 'rect' ? 'hs-rect' : L.type === 'component' ? 'hs-comp-wrap' : L.type === 'group' ? 'hs-group' : 'hs-text');
    el.style.left = (L.x ?? 60) + 'px';
    el.style.top = (L.y ?? 240) + 'px';
    if (L.w != null) el.style.width = L.w + 'px';
    if (L.align) el.style.textAlign = L.align;
    if (L.filter) el.style.filter = L.filter;
    setLayerTiming(el, L, idx);
    renderer.build(el, L); // dispatch to the primitive (core/layers/<type>.js)
    // audit visibility: text layers ≥60px are critical unless opted out; anything can opt in
    if (L.critical === true || (L.critical !== false && !['rect', 'image', 'group', 'glow', 'shader', 'paint', 'board', 'doc', 'component', 'html', 'clip', 'cursor'].includes(L.type) && (L.size ?? 96) >= 60)) el.setAttribute('data-layer', 'critical');
    // scene units: a top-level layer lives inside its beat's wrapper (which owns the scene transform);
    // otherwise it attaches flat to cam exactly as before.
    const bi = beatIndexOf(L);
    (bi != null ? beatWrap[bi] : cam).appendChild(el);
    // ransom is a per-CHAR treatment, so it implies a char split when the author did not set one.
    const splitMode = L.split || ((L.ransom || L.circle) ? 'char' : null);
    const units = splitMode ? splitText(el, splitMode) : null; // 'char' | 'word' | 'line'
    if (L.ransom && units) ransomStyle(units, { seed: L.ransomSeed ?? L.text ?? '', accent: (theme && theme.accent) || undefined, ...(typeof L.ransom === 'object' ? L.ransom : {}) });
    if (L.circle && units) circleText(el, units, typeof L.circle === 'object' ? L.circle : {});
    // decorate LAST, and that order is load-bearing. A composite look appends overlay divs
    // (scanlines/grain/vignette/lightLeak/washes) as children of the layer, and everything above
    // rewrites children: the primitive builder does `el.innerHTML = …` and splitText re-wraps the
    // text. Decorating first meant those overlays were built and then silently thrown away, so a
    // top-level layer with `filter:"crt"` got the filter half of the look and none of the texture
    // half, with no error. Group children (core/layers/util.js:187) always built-then-decorated,
    // which is why the same look was correct inside a group and broken outside one.
    renderer.kit.decorate(el, L);   // mask + filter/look + fade + reflect + logotype — ONE definition, shared with group children
    applyGsapHooks(el, L, units);   // gsap / morph / fx / fxOut / motionPath / physics / splitText (all pure, seeked per frame)
    return { L, el, units };
  }

  const layers = (data.layers || []).map(buildLayer);

  layers.push(...extra); // group children join the per-frame animation loop
  // duration: explicit, else the last clip's end (+0.4 tail)
  const lastEnd = layers.reduce((m, { L }) => Math.max(m, (L.start ?? 0) + (L.duration ?? 2)), 0);
  const duration = data.duration || +(lastEnd + 0.4).toFixed(2);
  const caps = data.captions || [];
  const capMode = data.captionMode || 'sentence';
  // captionStyle: a word-timed treatment (core/captions.js) layered on the pop layout.
  // Unknown names fail LOUD at boot, matching the theme doctrine — never a silent fallback look.
  const capStyle = data.captionStyle || null;
  if (capStyle && !CAP_STYLES[capStyle])
    throw new Error(`unknown captionStyle "${capStyle}" — known: ${Object.keys(CAP_STYLES).join(', ')}`);
  const camKf = data.camera || []; // cameraAt/motionAt now live in /core/sequence.js (pure, tested)

  // ---- SEAMS: two-scene shader transitions (core/seams.js) ----
  // [{t, fx, dur, dir?, seed?, intensity?}] — the two beats either side of the boundary are
  // rasterised ONCE (bakeSeams, at build) into u_from/u_to; renderFrame only SAMPLES them, so
  // the whole thing stays pure in n. The compositor is created ONLY when a scene declares seams,
  // so a scene without them adds no DOM and renders byte-identical to before.
  // timing shapes how progress 0→1 evolves across the seam (core/cuts.js TIMINGS, shared with
  // scene cuts). Default `smooth` (ease-in-out) — a transition that MOVES content reads mechanical
  // at constant speed; ease-in-out gives it the accelerate-then-settle velocity (MOTION-CRAFT:
  // "never linear on visible moves"). `linear` is opt-in for a deliberately constant sweep. An
  // unknown timing is rejected loudly, not silently coerced (MISTAKES: silent substitution).
  const seams = (data.seams || [])
    .map((s) => {
      if (s.timing != null && !CUT_TIMINGS[s.timing])
        throw new Error(`unknown seam timing "${s.timing}" at t=${s.t} — known: ${Object.keys(CUT_TIMINGS).join(', ')}`);
      return { t: +s.t, fx: SEAM_FX.includes(s.fx) ? s.fx : 'fade', dur: +(s.dur ?? 0.5),
        dir: s.dir, seed: s.seed ?? 0, intensity: s.intensity ?? 1, timing: s.timing || 'smooth',
        _from: null, _to: null, _fallback: false };
    })
    .filter((s) => s.dur > 0 && isFinite(s.t))
    .sort((a, b) => a.t - b.t);
  const seamCompositor = seams.length ? createSeamCompositor($('root'), W, H) : null;

  // drawBg — the theme bg on canvas (last matching window wins) + a continuous slow breathe.
  // A hand-authored (`html`) window paints in the DOM instead, so the canvas is hidden for its span.
  function drawBg(t) {
    if (!bgWins.length) return;
    const w = bgWinAt(t);
    const authored = bgHtml ? bgHtml.frame(t, w) : false;
    cv.style.display = authored ? 'none' : '';
    if (authored) return;
    renderBg(ctx, W, H, t, w.spec);
    cv.style.transform = `scale(${(1.05 + 0.02 * Math.sin(t * 0.35)).toFixed(4)})`;
  }

  // updateLayer — everything a single layer does at time t that isn't its primitive's own frame():
  // the cut kit, kinetic split-text, ransom cycle, borderTrail/circle spins, animated CSS vars,
  // audio-react, and the motion track (+ motion blur). Each is a pure function of t (and f for the
  // spectrum table), composed onto what driveClips already wrote — so the frame stays pure in n.
  function updateLayer(el, L, units, t, f) {
    const start = L.start ?? 0, end = start + (L.duration ?? 2);
    // cut kit: a declared cut owns this layer's enter/exit styling (over driveClips's fade)
    if (L.cut && t >= start && t < end) {
      const enD = L.enterDur ?? 0.5, exD = L.exitDur ?? 0.5;
      const enter = enD > 0 ? clamp01((t - start) / enD) : 1;
      const exit = exD > 0 ? clamp01((t - (end - exD)) / exD) : 0;
      Object.assign(el.style, cutStyle(L.cut, { enter, exit }, { dir: L.dir, dist: L.dist ?? 110, timing: L.cutTiming, cx: L.cx, cy: L.cy }));
    }
    // kinetic split-text on its local clock (clip appears instantly, units reveal).
    // presetOpts spreads any per-preset knob (gradient c1/c2, highlight color, blur px, tilt deg…).
    if (units && !L.circle && !L.fx && t >= start && t < end) animateUnits(units, t - start, { preset: L.preset || (L.ransom ? 'fall' : 'up'), stagger: L.stagger ?? (L.ransom ? 0.08 : M.stagger), each: L.each ?? 0.5, loop: L.loop, dist: L.dist, speed: L.speed, phaseStep: L.phaseStep, ...(L.presetOpts || {}) });
    // ransom with `cycle`: re-roll each letter into a different cutout of the same glyph, in
    // place, every frame. Stateless and derived from t, so it stays pure in n.
    if (units && L.ransom && L.ransom.cycle && t >= start && t < end)
      ransomTick(units, t - start, { seed: L.ransomSeed ?? L.text ?? '', accent: (theme && theme.accent) || undefined, ...L.ransom });
    // per-TYPE frame update (count number / typing / cursor path / clip frame / image ken) —
    // dispatched to the primitive (core/layers/<type>.js). Cross-cutting cut/units/motion stay here.
    renderer.frame(el, L, t);
    // borderTrail: rotate the orbiting arc by an INLINE transform (in the DOM → seen by the
    // frame signature and pure in t; a WAAPI animation's state is not serialised, which broke dedup).
    if (L.borderTrail) { const s = el.querySelector('[data-trail]'); if (s) { const per = +(s.dataset.trailPeriod || 4) || 4; s.style.transform = `rotate(${(((t / per) * 360) % 360).toFixed(2)}deg)`; } }
    // spinning circular text: rotate the whole ring (chars are laid out on the circle at build).
    // Overrides the layer transform (after driveClips), so pair with anim:"fade"/"none". Pure in t.
    if (L.circle) { const per = (typeof L.circle === 'object' ? (L.circle.period ?? 8) : 8) || 8; el.style.transform = `rotate(${(((t / per) * 360) % 360).toFixed(2)}deg)`; }
    // ANIMATED CSS VARIABLES. The engine could drive transform, opacity and blur and nothing
    // else, so a block could only ever ENTER — every one of them wore the same `anim:'rise'`
    // because there was no way to animate what the block actually DOES. A gauge cannot sweep
    // to its reading, a bar cannot grow, a line cannot draw on. Interpolating a custom property
    // fixes the whole class at once: the block writes `var(--p)` into its own CSS or SVG and
    // the engine drives the number. Pure in n — the value is a function of t and nothing else.
    //   vars: { '--p': [0, 1] }, varsDur: 1.2, varsDelay: 0.15, varsEase: 'easeOutCubic'
    if (L.vars && t >= start) {
      const vd = L.varsDur ?? 1.0, v0 = start + (L.varsDelay ?? 0);
      const u = vd > 0 ? clamp01((t - v0) / vd) : 1;
      const e = resolveEasing(L.varsEase || 'easeOutCubic')(u);
      for (const [name, range] of Object.entries(L.vars)) {
        const [a, b] = Array.isArray(range) ? range : [0, range];
        el.style.setProperty(name, (a + (b - a) * e).toFixed(4));
      }
    }
    // AUDIO REACT: modulate a property from the baked per-frame band energy. Composed BEFORE
    // the motion track so an authored choreography still wins the outer transform, and read
    // from a table indexed by n — the frame never analyses audio, so purity is untouched.
    if (L.react && window.__spectrum && t >= start && t < end) {
      const rs = Array.isArray(L.react) ? L.react : [L.react];
      for (const r of rs) {
        const v = sampleAt(window.__spectrum, f, r.band || 'low');   // f IS the frame index
        const [lo, hi] = r.range || [0, 1];
        const val = lo + (hi - lo) * Math.max(0, Math.min(1, v));
        if (r.prop === 'opacity') el.style.opacity = ((parseFloat(el.style.opacity) || 1) * val).toFixed(3);
        else if (r.prop === 'blur') {
          const fb = (el.style.filter || '').replace(/blur\([^)]*\)/g, '').trim();
          el.style.filter = val > 0.4 ? (fb ? fb + ' ' : '') + `blur(${val.toFixed(2)}px)` : (fb || 'none');
        } else { // default: scale
          const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
          el.style.transform = `scale(${val.toFixed(4)})${base}`;
        }
      }
    }
    // motion track: compose element choreography ON TOP of the enter/exit/cut transform (which
    // driveClips/cutStyle already wrote to el.style), and multiply into the composed opacity.
    if (L.motion && L.motion.length && t >= start && t < end) {
      const m = motionAt(L.motion, t - start);
      const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
      el.style.transform = `translate(${m.dx.toFixed(2)}px, ${m.dy.toFixed(2)}px) scale(${m.scale.toFixed(4)}) rotate(${m.rot.toFixed(2)}deg)${base}`;
      el.style.opacity = ((parseFloat(el.style.opacity) || 1) * m.opacity).toFixed(3);
      // TWO blur materials, summed into one blur():
      //  (a) focus-pull — the authored m.blur track (depth / rack-focus).
      //  (b) motion blur — velocity-derived streak on fast moves. SEEK-SAFE: the track is sampled
      //      at t AND t-1frame, both PURE functions of the frame, so blur(n) is order-independent.
      //      Opt-in per layer: motionBlur:true (shutter 0.5) or a 0..1 strength. Needs a motion track.
      //      Opt-in was the whole policy, and across this entire library exactly ONE layer ever set it,
      //      so every fast move in every other film is a hard-edged slide. Blur is physics: a thing
      //      crossing the frame in a few frames smears whether or not the author remembered. So it is
      //      now AUTOMATIC above a speed the eye already reads as fast, and still fully controllable —
      //      `motionBlur: false` opts out, a number overrides the shutter (KEYED-MOTION.md).
      let blurPx = m.blur > 0.01 ? m.blur : 0;
      if (L.motionBlur !== false) {
        const p = motionAt(L.motion, Math.max(0, (t - start) - 1 / fps));
        const speed = Math.hypot(m.dx - p.dx, m.dy - p.dy); // px travelled in one frame
        // AUTO_BLUR_FLOOR is ~a quarter of the frame per second at 30fps: below it nothing smears in
        // life either, and a floor is what keeps this from softening every gentle drift in the library.
        const auto = speed >= AUTO_BLUR_FLOOR;
        if (L.motionBlur || auto) {
          // A GENTLER shutter when nobody asked. 0.5 is the right default for a layer whose author
          // reached for blur deliberately; applied automatically it peaked at the 24px cap on five
          // creed-launch rects and put 18px on a moving headline, which is dissolved, not smeared.
          // AUTO_SHUTTER is the value the exemplar's own author chose by eye for its fastest layer.
          const shutter = L.motionBlur == null ? AUTO_SHUTTER
            : L.motionBlur === true ? 0.5 : +L.motionBlur;
          blurPx += Math.min(24, shutter * speed * 0.5);    // half-shutter, capped so text never dissolves
        }
      }
      // authoritative: recompute the blur() from THIS frame every time (strip any prior, set new
      // or drop it) so a cold render == a warm render → order-independent even on a persistent DOM.
      const fBase = (el.style.filter || '').replace(/blur\([^)]*\)/g, '').trim();
      el.style.filter = blurPx > 0.4 ? (fBase ? fBase + ' ' : '') + `blur(${blurPx.toFixed(2)}px)` : (fBase || 'none');
    }
  }

  function renderFrame(f) {
    const t = f / fps;
    drawBg(t);
    driveClips(cam, t); // declarative clip timing + enter/exit + z-order
    driveSceneUnits(t); // move whole-beat wrappers across a cut (sceneUnits) — no-op otherwise
    for (const { L, el, units } of layers) updateLayer(el, L, units, t, f);
    drawCaptions(t);
    drawCameraAndCut(t);
    drawStings(t);
    drawSeams(t);
    seekAll(t); // drive any registered/WAAPI paused timelines (adapter interface)
  }

  // drawCaptions — show the caption whose window contains t. `captionStyle` layers a word-timed
  // treatment on the pop layout. DOM is rebuilt only when the LINE changes (the memo key is a pure
  // function of t), then every style prop is rewritten every frame (authoritative writes), so a cold
  // seek renders byte-identical to a warm one.
  function drawCaptions(t) {
    const cap = caps.find((c) => t >= c.t0 && t < c.t1);
    const capEl = $('cap');
    capEl.className = 'hs-cap ' + (capStyle ? 'styled ' + capStyle
      : capMode === 'word' ? 'word' : capMode === 'pop' ? 'pop' : '');
    if (cap) {
      const key = cap.t0 + '|' + cap.text;
      if (capEl.__key !== key) {
        capEl.__key = key;
        if (capStyle === 'clipWipe') {
          capEl.innerHTML = `<div class="cw base">${cap.text}</div><div class="cw over">${cap.text}</div>`;
          capEl.__units = null;
        } else if (capStyle) {
          capEl.innerHTML = cap.text;
          capEl.__units = splitText(capEl, 'word'); // the kinetic splitter (core/type.js)
        } else { capEl.innerHTML = cap.text; capEl.__units = null; }
        capEl.__wins = capStyle ? capWords(cap) : null;
      }
      const in01 = clamp01((t - cap.t0) / 0.14), out01 = clamp01((cap.t1 - t) / 0.14);
      capEl.style.opacity = (in01 * out01).toFixed(2);
      capEl.style.transform = (capMode === 'pop' || capStyle)
        ? `translateY(${((1 - in01) * 18).toFixed(1)}px) scale(${(0.95 + 0.05 * in01).toFixed(3)})` : 'none';
      if (capStyle === 'clipWipe') {
        Object.assign(capEl.lastElementChild.style, CAP_STYLES.clipWipe(lineU(t, capEl.__wins)));
      } else if (capStyle && capEl.__units && capEl.__units.length === capEl.__wins.length) {
        // length guard: pathological markup can make splitText and the stripped-word count
        // disagree; degrade to the plain styled plate instead of misaligned karaoke.
        capEl.__units.forEach((el, i) => {
          const win = capEl.__wins[i];
          Object.assign(el.style, CAP_STYLES[capStyle](wordU(t, win), t >= win.t0 && t < win.t1));
        });
      }
    } else { capEl.style.opacity = '0'; capEl.__key = null; }
  }

  // drawCameraAndCut — the global camera transform, plus any SCENE CUT (a transition between beats
  // applied to the camera root so the whole beat moves as one). cutStyle ALWAYS returns the full
  // style set (identity in steady state) so a cut property can never stick into a later frame,
  // whatever order frames render in. See MISTAKES #29 (the top-level `cuts` array was once inert).
  function drawCameraAndCut(t) {
    const c = cameraAt(camKf, t);
    // perspective() must lead the transform list, and is emitted ONLY when a tilt is actually asked
    // for — a perspective function with no rotation still promotes the layer into a 3D rendering
    // context and changes rasterisation, so scenes that never tilt stay byte-identical.
    const tilt = c && (Math.abs(c.rx) > 0.001 || Math.abs(c.ry) > 0.001)
      ? `perspective(${c.persp.toFixed(0)}px) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg) ` : '';
    const camTf = c ? `${tilt}scale(${c.s.toFixed(4)}) translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)` : '';
    let cutS = null;
    // sceneUnits mode drives the transition on the per-beat WRAPPERS (driveSceneUnits), not the whole
    // cam — so skip the cam-level cut entirely and let the wrappers swap the two beats as units.
    if (!sceneUnits) for (const cu of sceneCuts) {
      const half = (cu.dur ?? 0.36) / 2, ct = +cu.t;   // `dur` is the TOTAL window, split around t
      if (t <= ct - half || t >= ct + half) continue;
      const o = { timing: cu.timing, dir: cu.dir, dist: cu.dist, cx: cu.cx, cy: cu.cy };
      // SOLO: one root carries the whole frame, so exit-then-enter must not touch opacity/clip/mask —
      // sequencing those two halves on a single element blanks the frame at the midpoint. soloCutStyle
      // keeps the transform/filter character (a punch still punches) and holds visibility open.
      cutS = t < ct
        ? soloCutStyle(cu.style, { exit: (t - (ct - half)) / half, enter: 1 }, o)   // beat leaving
        : soloCutStyle(cu.style, { exit: 0, enter: (t - ct) / half }, o);            // beat arriving
      break;
    }
    if (!cutS) cutS = cutStyle('fade', { enter: 1, exit: 0 }, {}); // full identity reset
    const { transform: cutTf, ...cutRest } = cutS;
    Object.assign(cam.style, cutRest);
    cam.style.transform = [camTf, cutTf && cutTf !== 'none' ? cutTf : ''].filter(Boolean).join(' ') || 'none';
  }

  // driveSceneUnits — move each BEAT WRAPPER as one unit across a cut boundary: the outgoing beat plays
  // the cut's EXIT, the incoming beat its ENTER, using the same cutStyle vocabulary. A real A-out/B-in
  // scene swap (vs the cam-level bump). Pure in t (cutStyle is closed-form). No-op unless sceneUnits.
  function driveSceneUnits(t) {
    if (!sceneUnits) return;
    // steady state: identity + fully visible (each beat's own layers handle their in-window visibility)
    for (const w of beatWrap) { w.style.transform = 'none'; w.style.opacity = '1'; w.style.filter = 'none'; w.style.clipPath = 'none'; }
    for (let k = 0; k < sceneCuts.length; k++) {
      // window runs [ct, ct+dur] — the cut time is when the SWAP STARTS. The incoming beat's own layers
      // start at ct (its beat boundary), so they are present and slide IN as the outgoing slides OUT.
      const cu = sceneCuts[k], ct = +cu.t, dur = cu.dur ?? 0.4;
      if (t < ct || t >= ct + dur) continue;
      const p = (t - ct) / dur;                              // 0→1 across the whole window
      // a WHOLE-SCENE slide must clear the frame, so the default travel is the viewport (not the small
      // per-layer nudge the cut presets use). The opacity fade covers the presets' <1.0 travel factor.
      const o = { timing: cu.timing, dir: cu.dir, dist: cu.dist ?? W, cx: cu.cx, cy: cu.cy };
      const apply = (w, s) => { if (!w) return; const { transform, ...rest } = s; Object.assign(w.style, rest); w.style.transform = transform || 'none'; };
      apply(beatWrap[k], cutStyle(cu.style, { exit: p, enter: 1 }, o));     // beat k (outgoing) leaves
      apply(beatWrap[k + 1], cutStyle(cu.style, { exit: 0, enter: p }, o)); // beat k+1 (incoming) arrives
    }
  }

  // drawStings — the WebGL shader stings (single-scene boundary FX), each spanning its dur centered on t.
  function drawStings(t) {
    let drew = false;
    for (const s of stings) {
      const d = s.dur ?? 1.0;
      const p = (t - (s.t - d / 2)) / d;
      if (p > 0 && p < 1) { fxo.draw(s.fx, p, s.seed ?? 0, s._tint, s._intensity, s._pal); drew = true; }
    }
    if (!drew) fxo.clear();
  }

  // drawSeams — inside a seam window [t, t+dur] the compositor blends the two BAKED beats over the
  // whole stage (the live DOM/canvas underneath is covered by the opaque composite). Outside every
  // window the compositor is hidden, so normal frames render untouched.
  function drawSeams(t) {
    if (!seamCompositor) return;
    let inSeam = false;
    for (const s of seams) {
      if (t < s.t || t >= s.t + s.dur) continue;
      const p = CUT_TIMINGS[s.timing]((t - s.t) / s.dur); // ease the transition progress
      if (s._from && s._to) {
        const fx = s._fallback ? 'fade' : s.fx; // blank raster → plain cross-fade
        seamCompositor.draw(fx, p, s._from, s._to, { dir: s.dir, seed: s.seed, intensity: s.intensity });
      } else {
        seamCompositor.clear(); // never baked (e.g. bake threw) → show the live stage, no dip
      }
      inSeam = true; break;
    }
    if (!inSeam) seamCompositor.clear();
  }

  // bakeSeams(): rasterise the OUTGOING beat (frame just before the window) and the INCOMING beat
  // (frame just after it) for every seam, into static textures. Runs ONCE, awaited in boot before
  // the render loop — impure (async raster) is fine here; the per-frame path only samples the
  // result, so renderFrame stays pure in n. Mirrors the bake-then-pure pattern of core/canvas-fx.js.
  async function bakeSeams() {
    if (!seams.length) return;
    const useCanvasBg = bgWins.length > 0;
    const total = Math.max(1, Math.round(duration * fps));
    const root = $('root');
    // NO rAF await here: old --headless Chrome starves requestAnimationFrame before first paint,
    // so awaiting a real frame during boot would deadlock. renderFrame writes every inline style
    // synchronously and serialisation reads attributes (not computed layout), so a forced sync
    // reflow is all the settle we need.
    const renderAt = (frame) => {
      const fr = Math.max(0, Math.min(total - 1, frame));
      // setBake: seed RNG + frame time WITHOUT virtualizing page timers, so chromedp's rAF-driven
      // readiness Poll keeps ticking while the bake runs (else the render deadlocks).
      if (window.__vt) (window.__vt.setBake || window.__vt.set)(fr, fps);
      renderFrame(fr);
      void root.offsetWidth; // force synchronous layout so fit/measure has resolved
    };
    for (let i = 0; i < seams.length; i++) {
      const s = seams[i];
      try {
        renderAt(Math.round(s.t * fps) - 1);
        s._from = await stageToCanvas({ w: W, h: H, cv, cam, root, useCanvasBg });
        s._from.__seamId = 'from' + i;
        renderAt(Math.round((s.t + s.dur) * fps) + 1);
        s._to = await stageToCanvas({ w: W, h: H, cv, cam, root, useCanvasBg });
        s._to.__seamId = 'to' + i;
        if (isBlankRaster(s._from) || isBlankRaster(s._to)) s._fallback = true; // nothing rasterised → cross-fade
      } catch (e) {
        s._from = s._to = null; s._fallback = true;
        try { console.warn('seam bake failed at t=' + s.t + ': ' + (e && e.message)); } catch (_) {}
      }
    }
    seamCompositor && seamCompositor.clear();
  }
  // buildSfx — derive SFX cues deterministically from the scene's own cuts/stings/seams (when
  // audio:{auto:true}), plus author-placed cues and the per-keystroke click train. Pure: cue times
  // are a function of the JSON, so the mix is reproducible; it does NOT touch renderFrame, so frames
  // stay byte-identical (audio is a separate track). `auto` gates only the DERIVED cues — author
  // cues and keystrokes always fire (MISTAKES #70, where `auto` used to gate everything).
  function buildSfx() {
    let sfx = [];
    const audioCfg = data.audio || {};
    // CUT_CUE (cut style -> cue) and SEAM_CUE (seam fx -> cue) come from /core/audio-cues.js — one
    // shared source of truth, so the render mix and the baked catalogue cannot drift.
    const cues = [];
    if (audioCfg.auto) for (const { L } of layers) if (L.cut && L.cut !== 'none') cues.push({ t: +(L.start ?? 0).toFixed(2), name: CUT_CUE[L.cut] || 'whoosh' });
    // TOP-LEVEL cuts / seams were once silently dropped from sound design — they are how a scene
    // actually cuts between beats, so an auto-scored film came out with no transition sound at all.
    if (audioCfg.auto) for (const c of (data.cuts || [])) if (c && c.style !== 'none') cues.push({ t: +(+c.t).toFixed(2), name: CUT_CUE[c.style] || 'whoosh' });
    if (audioCfg.auto) for (const s of stings) cues.push({ t: +(+s.t).toFixed(2), name: 'reveal' });
    if (audioCfg.auto) for (const s of (data.seams || [])) if (s && s.fx && s.fx !== 'none') cues.push({ t: +(+(s.t ?? s.at ?? 0)).toFixed(2), name: SEAM_CUE[s.fx] || 'whoosh' });
    // author-placed cues always win: { audio: { cues: [{t, name, gain}] } }
    for (const c of ((data.audio && data.audio.cues) || [])) cues.push({ t: +(+c.t).toFixed(2), name: c.name, gain: c.gain });
    cues.sort((a, b) => a.t - b.t || (a.name < b.name ? -1 : 1));
    for (const c of cues) if (!sfx.length || c.t - sfx[sfx.length - 1].t > 0.09) sfx.push(c); // merge simultaneous
    // KEYSTROKES. core/layers/text.js reveals character i at exactly start + (i+1)/cps, so the click
    // for that character is that same expression — the sound is derived from the formula that draws
    // the picture, the only way a typing sound stays in sync when the copy or the speed changes.
    const keyCues = [];
    for (const { L } of layers) {
      if (!L.typing || L.keyClicks === false) continue;
      const cps = L.typing === true ? 24 : +L.typing;
      const full = String(L.text || ''), st = +(L.start ?? 0);
      const end = st + (L.duration != null ? +L.duration : Infinity);
      for (let i = 0; i < full.length; i++) {
        const kt = st + (i + 1) / cps;
        if (kt >= end) break;                       // never sound a character the window never reveals
        // Cuelume's `press` IS the key cue (the default), but which cue and how loud is a TASTE
        // decision, so it is authorable (`keyCue`, `keyGain`). Variation is DYNAMICS not a second
        // sound: a keyboard varies in force, not identity. Deterministic by index → always the same.
        const vary = 1 + ((i * 7919) % 5 - 2) * 0.06;   // +/-12%, pure function of the index
        keyCues.push({ t: +kt.toFixed(3), name: L.keyCue || 'key',
          gain: +(((L.keyGain ?? 0.13)) * (full[i] === ' ' ? 1.25 : vary)).toFixed(3) });
      }
    }
    // A key train is legitimately dense, so it gets its own tighter floor — the 0.09 structural
    // merge above, applied to keystrokes, would silently drop every other letter at real typing speed.
    if (keyCues.length) {
      keyCues.sort((a, b) => a.t - b.t);
      const keys = [];
      for (const c of keyCues) if (!keys.length || c.t - keys[keys.length - 1].t > 0.03) keys.push(c);
      sfx = sfx.concat(keys).sort((a, b) => a.t - b.t);
    }
    return sfx;
  }
  return { fps, duration, stings: stings.map((s) => s.t), sfx: buildSfx(), renderFrame, bakeSeams };
});
