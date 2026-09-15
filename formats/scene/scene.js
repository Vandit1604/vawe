import { boot } from '/core/engine/boot.js';
import { junctionTable, marksOf, isJunctionRef, resolveJunction, bindWindowsToJunctions } from '/core/timeline/junctions.js';
import { PART_REGISTRY, PARTS } from '/core/motion/parts.js';
import { icon, clamp01, lerp, kenBurns, interpolate, resolveEasing, gsapEase, trackingFor, hashSeed, motionDefaults, stepClock } from '/core/motion/motion.js';
import { isLightBg } from '/core/color/engine.js';
import { collectClips, driveClips, clipStyleAt, enterDurOf, exitDurOf, seekAll, entranceWarp, BASE_ENTER, BASE_EXIT } from '/core/timeline/clips.js';
import { splitText, circleText, decodeText, gsapStagger, fitText, fitBox } from '/core/type/type.js';
import { buildMorph } from '/core/motion/morph.js';
import { GSAP_REGISTRY } from '/core/engine/gsap-effects.js';
import { ransomStyle } from '/core/type/ransom.js';
import { capUnitWins, capShape, wordU, lineU, CAP_STYLES, CAP_STYLE_REGISTRY } from '/core/type/captions.js';
import { renderBg, bgPreset, applyBgOver, bgPaletteFrom } from '/core/backgrounds/index.js';
import { expandThemeRotation } from '/core/backgrounds/theme-rotation.js';
import { createBgHtml } from '/core/layout/bg-html.js';
import { htmlSource } from '/core/type/sanitize-html.js';
import { cutStyle, soloCutStyle, SOLO_BLIND, PRESENTATIONS as CUT_PRESENTATIONS, TIMINGS as CUT_TIMINGS } from '/core/cuts/index.js';
import { IDENT as CUT_IDENT } from '/core/cuts/index.js';
import { checkCuts } from '/core/fx/ancestor-kills.js';
import { createShaderOverlay, SHADER_FX } from '/core/stings/index.js';
import { createSeamCompositor, SEAM_FX, stageToCanvas, isBlankRaster } from '/core/timeline/seams.js';
import { lowerScene, checkStingColor } from '/core/transitions/lower.js';
import { glowRGB } from '/core/looks/filters.js';
import { bindBeats, describeBind } from '/core/beats/index.js';
import { CUT_CUE, SEAM_CUE } from '/core/audio/cues.js';
import { tactileCues } from '/core/audio/tactile.js';
import { resolveBridges } from '/core/audio/bridges.js';
import { cameraAt, cameraVelocityAt, dollyZ, motionAt, resolveKeyedProps } from '/core/timeline/sequence.js';
import { layerTime } from '/core/timeline/time.js';
import { specsOf } from '/core/fx/index.js';
import { resolvePans } from '/core/timeline/pan-resolve.mjs';
import { watchProps, auditLayer, watchedTree } from '/core/registry/prop-audit.js';
import { createRenderer } from '/core/layers/index.js';
import { createTrackKit, runTracks } from '/core/tracks/index.js';
import { resolveCameraBlur, resolveShutter } from '/core/tracks/motion.js';
import { normalizeIdle } from '/core/engine/idle.js';
import { resolveSpectacle } from '/core/timeline/spectacle.js';
import { followOffset, followVelocity } from '/core/camera-moves/follow.js';
import { computeGroup3D, applyGroup3DOpacityAdapt } from '/core/tracks/group3d.js';
import { resolveRelativeTimes } from '/core/timeline/relative-time.js';
const $ = (id) => document.getElementById(id);

// GROUP 3D: computeGroup3D / applyGroup3DOpacityAdapt now live in core/tracks/group3d.js (unit-tested
// with plain mock elements there). Used at build (near `layers.push(...extra)`) and every frame inside
// renderFrame; see that module's header for the mechanism.

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// resolveBecomes, `becomes: "<layerId>"` on the OUTGOING layer declares that it CONTINUES as the
// incoming one. A cut transforms one root and a seam blends two frozen stills; neither connects the
// CONTENT, so the only thing that truly joins two scenes is a form that persists across the boundary.
// The engine could not express that: you hand-aligned coordinates either side and hoped, and when they
// drifted twenty pixels the match quietly stopped working with nothing to tell you.
//
// It resolves the incoming layer's OPENING pose from the outgoing layer's FINAL pose, centres matched,
// size matched by scale, then hands control back so the incoming layer animates away into its own
// geometry. Centres rather than corners, because two boxes of different sizes sharing a top-left corner
// visibly jump; sharing a centre does not.
//
// IT RUNS AFTER THE BUILD MEASUREMENT, not with the other data passes, and that is the whole point.
// It used to read `num(L.w, 0)`, so a layer that states no w/h scored ZERO on both axes: the scale
// ratio collapsed to 1 and the centre landed on the layer's top-left corner. A TEXT layer states no
// w/h (its box is its glyphs) so the most natural match cut anyone would write, a word becoming a
// card, was exactly the case that mis-scaled, and it did it in silence. Measured on a 780x187 word
// handing over to a 600x400 card: the card opened 401px off centre at 1.00 instead of 1.30, half of it
// off the left edge of the canvas, with every gate green. `baseSize` above already measures the real
// box for the same reason ("its box is its content"), so the fact existed and this pass simply could
// not see it. Declared w/h still wins over the measurement, matching resolveBoxes exactly, so nothing
// that states its size changes. A side that measures nothing is REFUSED rather than guessed at.
function resolveBecomes(data, sizeOf) {
  const byId = {};
  for (const L of data.layers || []) if (L.id) byId[L.id] = L;
  for (const A of data.layers || []) {
    if (typeof A.becomes !== 'string') continue;
    const B = byId[A.becomes];
    if (!B) throw new Error(`layer "${A.id || '?'}" becomes: no layer with id "${A.becomes}"`);
    if (B === A) throw new Error(`layer "${A.id}" becomes itself`);
    if (typeof B.becomes === 'string' && byId[B.becomes] === A) throw new Error(`layers "${A.id}" and "${B.id}" become each other`);
    const box = (L, role) => {
      const m = sizeOf(L) || {};
      const w = num(L.w, num(m.w, 0)), h = num(L.h, num(m.h, 0));
      if (w > 0 && h > 0) return { w, h };
      throw new Error(`layer "${L.id || L.type || '?'}" is the ${role} form of a becomes handover, but it `
        + `measures ${w}x${h} at build, so there is no box to match against. A handover aligns two `
        + `CENTRES and scales one box onto the other; with a zero side it can only put the form at its own `
        + `corner at scale 1, which renders a plausible frame in the wrong place. Give it w and h, or `
        + `make it paint something the browser can measure.`);
    };
    const a = box(A, 'outgoing'), b = box(B, 'incoming');
    const lastA = Array.isArray(A.motion) && A.motion.length ? A.motion[A.motion.length - 1] : {};
    const aS = num(lastA.scale, 1);
    // Centre of the outgoing layer on its last frame, and of the incoming layer where it is authored.
    // The UNSCALED half-width, deliberately: CSS scales about the element's own centre, so scaling does
    // not move the centre. Using the scaled half here put the handover 160px off and it looked almost
    // right, which is the worst kind of wrong for a match cut.
    const acx = num(A.x, 0) + num(lastA.x, 0) + a.w / 2;
    const acy = num(A.y, 0) + num(lastA.y, 0) + a.h / 2;
    const bcx = num(B.x, 0) + b.w / 2, bcy = num(B.y, 0) + b.h / 2;
    // match the LARGER axis ratio so the incoming form covers the outgoing one rather than sitting inside it
    const s0 = Math.max((a.w * aS) / b.w, (a.h * aS) / b.h);
    const rot = num(lastA.rot, 0);
    // 0.9s / easeInOutCubic reads as a visible morph; the old 0.42s / easeOutCubic read as a cut.
    const dur = Math.max(0.05, num(A.becomesDur, 0.9));
    const own = Array.isArray(B.motion) ? B.motion : [];
    const r3 = (v) => +(+v).toFixed(3);
    const open = { t: 0, x: r3(acx - bcx), y: r3(acy - bcy), scale: r3(s0) };
    const settle = { t: r3(dur), x: 0, y: 0, scale: 1, ease: A.becomesEase || 'easeInOutCubic' };
    if (rot) { open.rot = r3(rot); settle.rot = 0; }
    // the incoming layer's own keys resume once the handover is done; anything it declared inside the
    // handover window is dropped, because during it the layer is not itself yet.
    B.motion = [open, settle].concat(own.filter((k) => num(k.t, 0) > dur + 1e-6));
  }
}

// resolveAnchors: position a layer RELATIVE to another (`anchor` id → `at`/`dx`/`dy`), so annotations,
// chips and badges point at what they annotate by declared relationship, not eyeballed coordinates.
// Resolved purely from the JSON geometry before any DOM exists (targets need w; h falls back to size*1.2).
function resolveAnchors(data) {
  const byId = {};
  for (const L of data.layers || []) if (L.id) byId[L.id] = L;
  for (const L of data.layers || []) {
    // NO ANCHOR and a WRONG ANCHOR are different questions, and `if (!T) continue` answered both with
    // silence. A typo'd id left the layer at whatever x/y it happened to carry, usually 0,0 or on top
    // of something else, with no error, no warning and no gate, because `anchor` is a bare string in
    // schema.json and nothing checked it resolves. Same shape as ANIM[name] || fade (core/registry/registry.js).
    if (L.anchor && !byId[L.anchor]) {
      const near = Object.keys(byId).filter((id) => id.toLowerCase().includes(String(L.anchor).toLowerCase().slice(0, 4)));
      throw new Error(`layer${L.id ? ` "${L.id}"` : ''} anchors to "${L.anchor}", which is not the id of any layer in this scene.`
        + `${near.length ? ` Did you mean ${near.map((n) => `"${n}"`).join(', ')}?` : ''}`
        + ` Known ids: ${Object.keys(byId).join(', ') || '(no layer declares an id)'}.`
        + ` An unresolved anchor leaves the layer wherever it already was, which renders a plausible`
        + ` frame in the wrong place, so it is refused.`);
    }
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
  // lower the unified `transitions` surface into the raw cuts/stings/seams fields BEFORE any parse
  // below reads them. Pure + idempotent; a scene without the unified key is untouched. Kept here (top
  // of the callback) so every parser sees the lowered form.
  //
  // block/beat/comp sugar is NOT expanded here: this file never imports core/engine/expand.js, on purpose
  // (core/engine/expand.js's own banner says why, and internal/render/expand.go is where that expansion
  // actually happens for this render path, server-side, before the page ever fetches this JSON).
  data = lowerScene(data);
  // Snap the film's joints to the track's pulse, if the scene named a grid. AFTER lowering (a cut
  // written as `transitions` has no `t` until then) and BEFORE anything reads a cut time, the bg
  // windows bound to `cut@n` below therefore follow the snapped joint rather than the written one.
  // Once, at build, so renderFrame(n) stays pure. Throws when a grid was named and none arrived.
  // The note is KEPT, not only logged: console.log runs inside the headless page and the render
  // process cannot hear it, so an author rendering to mp4 never learned that a cut had moved
  // (docs/MISTAKES.md #477). It rides out through the meta channel boot.js already owns.
  let beatSyncNote = '';
  { const r = bindBeats(data, canvas && canvas.beats); if (r) { beatSyncNote = describeBind(r); console.log(beatSyncNote); } }
  // The film's nominated loud moment: write the device as a sting at `at` and pull every competing
  // amplitude dial in the film down around it (core/timeline/spectacle.js). BEFORE the sting/seam/layer parses
  // below, because those are its subject; a no-op when the scene declares no `spectacle`.
  resolveSpectacle(data);
  // canvas W,H come from boot (aspect-resolved). Fallback keeps standalone use working.
  const [W, H] = [canvas?.width || 1080, canvas?.height || 1920];
  const cam = $('cam'), cv = $('cv');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // motion personality: the theme's {durationScale, stagger, ...}, resolved ONCE. This is what
  // makes a brand's snap real at render time (it was defined but never applied before). Layers
  // that set their own enterDur/exitDur/stagger still win; this only supplies the default.
  const M = motionDefaults(theme);
  // THE FILM'S IDLE, resolved once, at the middle rung of layer -> scene -> theme -> engine default.
  // `!== undefined` rather than `??` because `null` and `false` are how an author says "no idle", and
  // `??` would read either as "not set" and hand the theme's answer back over the top of the opt-out.
  const sceneIdle = data.idle !== undefined ? data.idle : M.idle;

  // ---- bg windows: [{preset, from, to, value}] drawn on canvas from the THEME's palette ----
  // bg seed: default = hash(theme name + preset) so the SAME preset looks different across brands;
  // override per-window with b.seed. Injected into every fx (dots/aurora/shapes/particles read it).
  // A bg window may bind its edges to a JOINT instead of a time: `"from": "cut@1"`. brew-launch-act1
  // cuts its backdrop per beat - paper, dark, paper, accent - and wrote every boundary twice, once here
  // and once in `transitions`, with nothing keeping the two equal. Now the cut owns the number.
  // core/timeline/junctions.js, docs/MISTAKES.md #358.
  const BG_JUNCTIONS = junctionTable(marksOf(data));
  const atTime = (v, where) => (isJunctionRef(v) ? resolveJunction(v, BG_JUNCTIONS, where) : v);
  const BG_DURATION = Number(data.duration) || Infinity;
  // A single undated `{use:"theme"}` window, on a film with joints, whose theme declares a ROTATION
  // (`bgDefault` as an array), expands to one window per shot BEFORE bindWindowsToJunctions places
  // them: applying a decision the theme already made, not inventing one (core/backgrounds/theme-rotation.js).
  const bgAuthored = expandThemeRotation(data.bg || [], theme, BG_JUNCTIONS, BG_DURATION);
  // Windows that declare NO times at all bind to the film's own joints, in order, see
  // bindWindowsToJunctions. Untouched when there is one window, or when any window names an edge.
  const bgWins = bindWindowsToJunctions(bgAuthored, BG_JUNCTIONS, BG_DURATION).map((b0, bi) => {
    // use:"theme" pulls the brand's OWN authored backdrop from themes/<name>.json (bgDefault),
    // so each brand has a custom bg it declares once, not a shared global preset name repeated
    // (the "customize, don't default" rule; fails loud if the theme never authored one).
    if (b0.use === 'theme' && !(theme && theme.bgDefault)) throw new Error(`bg use:"theme" but theme "${(theme && theme.name) || '?'}" defines no bgDefault`);
    const b = b0.use === 'theme' ? { ...theme.bgDefault, from: b0.from, to: b0.to } : b0;
    // a HAND-AUTHORED window (core/layout/bg-html.js) paints in the DOM, not on the canvas: no preset spec,
    // and the canvas is hidden while it is on screen.
    // `src` is resolved to markup HERE, once, so every downstream reader of a window (bg-html, the ink
    // picker, bgAt) keeps asking the one question it already asks: does this window have `html`?
    if (b.html != null || b.src != null)
      return { from: atTime(b.from, `bg[${bi}].from`) ?? 0, to: atTime(b.to, `bg[${bi}].to`) ?? 1e9, html: htmlSource(b, window.__html, 'bg window'), tone: b.tone, spec: null };
    const spec = applyBgOver(bgPreset(b.preset || 'paper', b.value, (theme && theme.bg) || bgPaletteFrom(theme && theme.palette) || undefined), b.opts);
    // grain is OPT-IN (`"grain": true`), strip the in-engine canvas grain unless a video asks for
    // it, matching the ffmpeg pass. Default-off: no per-frame speck crawl over sharp text.
    if (data.grain !== true) spec.fx = (spec.fx || []).filter((f) => f.type !== 'grain');
    const sd = b.seed != null ? b.seed : hashSeed(String((theme && theme.name) || 'x') + ':' + (b.preset || 'paper')) % 1000;
    for (const f of spec.fx || []) if (f.seed == null) f.seed = sd;
    // `breathe` is OPT-IN (see drawBg): a canvas-painted window held nothing but its own preset motion
    // until now, so this is authoring, not a fallback. `true` uses the old feel (2% scale, ~18s period);
    // an object overrides `amp`/`period`.
    return { from: atTime(b.from, `bg[${bi}].from`) ?? 0, to: atTime(b.to, `bg[${bi}].to`) ?? 1e9, preset: b.preset || 'paper', value: b.value, spec, breathe: b.breathe ?? null };
  });
  // --alpha exports a compositable OVERLAY, so the backdrop is the compositor's job, not the scene's.
  // Suppressing it here is what makes the alpha channel real: core/tokens.css clears CSS backgrounds
  // and cannot touch canvas pixels, and `bg` is a required field, so every scene painted an opaque
  // canvas over the whole frame and every exported alpha channel came back 255 (MISTAKES #224).
  // Read off the class core/engine/boot.js already set, so the flag is parsed in exactly one place.
  const ALPHA = document.documentElement.classList.contains('alpha');
  if (!bgWins.length || ALPHA) cv.style.display = 'none'; // fallback: the .hs-stage theme gradient
  // hand-authored backdrops: built once here, shown/hidden per frame by drawBg (null if none declared,
  // so a scene using only presets adds no DOM and renders byte-identical to before).
  const bgHtml = ALPHA ? null : createBgHtml($('root'), bgWins, window.__html);
  // ink-aware default text color: a layer with no explicit color gets dark ink over light
  // bg windows and light text over dark ones (looked up at the layer's midpoint), otherwise
  // a light-text theme (plinth) silently renders white-on-paper.
  const LIGHT_BGS = ['paper', 'paperShapes', 'paperDots', 'soft', 'dotmatrix'];
  // bg windows whose field IS the accent colour: accent-tinted emphasis would clash (blue-on-blue)
  const ACCENT_BGS = ['accent', 'accentPlain', 'brandglow'];
  const bgWinAt = (t) => {
    if (!bgWins.length) return null;
    let w = bgWins[0];
    for (const b of bgWins) if (t >= b.from && t < b.to) w = b;
    return w;
  };
  // THE COLOUR FOR TEXT OVER A DARK WINDOW, MEASURED RATHER THAN NAMED. `var(--text)` was hard-coded
  // here on the assumption that a theme's `text` is its LIGHT one. That is true of a dark-first theme
  // and false of a white-first one: `themes/vawe.json` sets text AND ink to the same #0f1620, so a dark
  // bg window rendered dark-on-dark and the beat simply was not there. Nothing failed and nothing
  // warned. The same invisible-output class as #213 and #369, and Phase-4 per-beat backdrops make it
  // the common case rather than the rare one. So ask the palette instead of trusting the token name:
  // use `--text` when it really is light, and otherwise the theme's own light ground.
  // isLightBg is core/color/engine.js's single definition of light-versus-dark, in linear light, the same
  // one backgrounds.js and produce.js ask. A second hand-kept copy of that question is MISTAKES #159.
  const P = (theme && theme.palette) || {};
  const ON_DARK = isLightBg(P.text) ? 'var(--text)'
    : isLightBg(P.bg) ? 'var(--bg)'
    : isLightBg(P.surface) ? 'var(--surface)' : '#ffffff';

  // IS THIS WINDOW LIGHT? Measured off the colour the preset actually resolved to, not off its name.
  // LIGHT_BGS is a hand-kept list of preset names, and a preset's lightness is not a property of the
  // name: `bgPreset` builds every base out of the THEME's own ramp, so `accent` is a pale tint in a
  // white-first brand and a saturated field in a dark one. Naming it light or dark once, globally, is
  // right for whichever family the list was written against and silently wrong for the other, which
  // is how `three` rendered white-on-pale in the very first film that used a per-beat backdrop.
  // Returns null for a hand-authored backdrop with no `tone`: the engine cannot read lightness out of
  // somebody's CSS, and guessing there is how a frame ends up white-on-white.
  const baseColorOf = (spec) => spec?.base?.color ?? spec?.base?.from ?? null;
  const windowIsLight = (w) => {
    if (w.html != null) return w.tone === 'light' ? true : w.tone === 'dark' ? false : null;
    if (w.value === 'dark' || w.value === 'ink') return false;
    const c = baseColorOf(w.spec);
    return c == null ? LIGHT_BGS.includes(w.preset) : isLightBg(c);
  };

  const inkAt = (t) => {
    const w = bgWinAt(t);
    if (!w) return null; // theme-gradient stage: keep the theme's own text color
    const light = windowIsLight(w);
    if (light == null) return null; // authored backdrop, no tone declared: defer to the theme
    return light ? 'var(--ink)' : ON_DARK;
  };

  // ---- shader stings: [{t, fx, dur, seed, color?, intensity?}]. Boundary effects on a WebGL overlay ----
  // A sting tint is a COLOUR: a hex, an rgb(), a CSS name, or a theme token. This read `parseInt(hex,
  // 16)` and nothing else, so every other form became NaN and then [0,0,0] -- "var(--accent)" tinted
  // the sting BLACK with no error (docs/MISTAKES.md #476). core/looks/filters.js `glowRGB` is the engine's
  // one owner of token -> literal rgb (feFlood cannot resolve var() either); core/transitions/lower.js
  // owns the refusal, at the write site, so an unresolvable tint is named before a browser starts.
  const tint01 = (c, where) => glowRGB(checkStingColor(c, where)).map((v) => v / 255);
  // `.filter(s => SHADER_FX.includes(s.fx))` until now: a sting with an unknown fx was DROPPED and
  // simply never happened, which is the quietest failure of the three junction kinds. #361.
  for (const s of data.stings || [])
    if (s && s.fx != null && !SHADER_FX.includes(s.fx))
      throw new Error(`unknown sting fx "${s.fx}" at t=${s.t}, one of: ${SHADER_FX.join(', ')}`);
  const stings = (data.stings || []).filter((s) => SHADER_FX.includes(s.fx))
    .map((s) => ({
      ...s,
      _tint: s.color ? tint01(s.color, `sting "${s.fx}" at t=${s.t}: color`) : null,
      _intensity: s.intensity ?? 1,
      _pal: Array.isArray(s.colors) ? s.colors.map((c, i) => tint01(c, `sting "${s.fx}" at t=${s.t}: colors[${i}]`)) : null,
    }));
  const fxo = createShaderOverlay($('root'), W, H);

  // ---- scene cuts: [{t, style, dur?, dir?, timing?}], the transition BETWEEN beats ----
  // Filtered and sorted once at build, never per frame. An unknown style would silently become
  // `fade` inside cutStyle, so it is rejected loudly here instead, that silent fallback is how
  // a nonexistent name survived in the schema for months (MISTAKES #21).
  const sceneCuts = (data.cuts || [])
    .filter((c) => c && c.style && c.style !== 'none')
    .map((c) => {
      if (!CUT_PRESENTATIONS[c.style]) throw new Error(`unknown cut style "${c.style}" at t=${c.t}, known: ${Object.keys(CUT_PRESENTATIONS).join(', ')}`);
      return c;
    })
    .sort((a, b) => +a.t - +b.t);

  // ---- SCENE UNITS (opt-in): beats that transition as WHOLE units (A slides out, B slides in) ----
  // The default `cuts` transform the whole `cam` at once (a camera bump). With `sceneUnits:true` each
  // BEAT (the interval between cut times) becomes its own wrapper, and a boundary moves the OUTGOING
  // wrapper (exit) against the INCOMING wrapper (enter) as separate units, a real scene swap, not a
  // pile of independent layer fades. Reuses the cutStyle PRESENTATIONS (slide/push/slideBlur/…), pure in
  // n. STRICTLY OPT-IN: without the flag, layers attach flat to `cam` exactly as before (snap-identical).
  const sceneUnits = data.sceneUnits === true && sceneCuts.length > 0;
  // Without sceneUnits a cut drives ONE root (drawCameraAndCut), so it can only transition through
  // transform/filter. The visibility channels are pinned open or the frame empties. A style whose
  // whole transition IS a visibility channel would therefore be silently inert here, so refuse it.
  if (!sceneUnits) for (const cu of sceneCuts) {
    if (!SOLO_BLIND.has(cu.style)) continue;
    throw new Error(`cut style "${cu.style}" at t=${cu.t} transitions only by fading/masking, which a `
      + `whole-frame cut cannot do (there is nothing underneath, the frame would go empty). Either set `
      + `"sceneUnits": true so the two beats cross-fade as units, or use a style that moves: `
      + `${Object.keys(CUT_PRESENTATIONS).filter((k) => !SOLO_BLIND.has(k)).join(', ')}.`);
  }
  // A cut styles an ANCESTOR of every layer, and some ancestor styles silently disable what a
  // descendant can do: a `filter` makes the element a backdrop root, so a `glass` layer under it
  // samples nothing and stops being glass, for exactly the length of the cut. core/ancestor-kills.js
  // owns which property takes which capability away; this is the one place the film is checked
  // against it. docs/MISTAKES.md #542.
  checkCuts({ cuts: sceneCuts, layers: data.layers || [], sceneUnits: data.sceneUnits === true });
  const beatBounds = [], beatWrap = [];
  if (sceneUnits) {
    const ts = [...new Set(sceneCuts.map((c) => +c.t))].sort((a, b) => a - b);
    const edges = [0, ...ts];
    for (let i = 0; i < edges.length; i++) {
      const end = i < ts.length ? ts[i] : Infinity; // last beat runs to the end (no exit cut)
      beatBounds.push({ start: edges[i], end });
      const w = document.createElement('div');
      w.className = 'hs-beat';
      // no `will-change` here either: it promotes the beat to a compositor layer whose raster is
      // reused across seeks, so the frame depends on the frames painted before it (see scene.css).
      w.style.cssText = 'position:absolute;inset:0;transform-origin:50% 50%';
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

  // THE BEAT'S CURRENT STATE, which is what a cut carries, versus the beat's HISTORY, which it must
  // not. The wrapper owns the exit slide, so a layer still on screen when the cut starts has its own
  // exit suppressed and its VISIBILITY stretched to the cut (setLayerTiming below); doing that to
  // every layer of the beat, including ones the beat had already moved on from, painted a whole act's
  // superseded type lines superimposed from the cut onward (docs/MISTAKES.md #555).
  //
  // A layer is the beat's current state ONLY while it is on screen when the cut starts: its own end
  // reaches the beat's end. A layer that ended earlier is gone at the cut on its own clock, same as
  // any layer outside a scene-units film; nothing here revives it. This used to also credit a layer
  // nothing else in the beat started after (a "deliberate hold"), which read the wrapper's stretched
  // `data-duration` back into every per-layer clock downstream (frame(), the tracks pipeline), and a
  // primitive that stops at its OWN authored end when handed a `t` past it (`cursor.js`'s early
  // return, the guard every "if (!(t>=start&&t<end)) return" primitive shares) rendered its resting
  // pose, at the origin, instead of holding: the cursor drawn top-left at 6.9s, the caption solid past
  // its own end at 7.2s (docs/MISTAKES.md, this fix). An author who wants a line to persist to the
  // cut authors its `duration` to reach the beat's end; the wrapper no longer guesses it for them.
  const EPS = 1e-6; // float noise only: `start + duration` lands on 20.099999999999998 for a cut at 20.1
  const beatIsCurrent = (L, bi, beatEnd) => (L.start ?? 0) + (L.duration ?? Infinity) >= beatEnd - EPS;

  // PROP AUDIT: every layer is watched from here, before the first read of any layer prop, so the
  // record covers the pre-passes below as well as the build itself.
  data.layers = (data.layers || []).map(watchProps);
  resolveRelativeTimes(data); // "otherId+0.5" / "otherId.end-0.2" → numeric starts (declared stagger chains).
  // A no-op when Go already pre-expanded this scene (internal/render/expand.go); still needed here for a
  // scene with nothing else to expand, since that gate only shells to Node on block/beat/comp/recipes/voice.
  resolvePans(data);           // panWith:"<id>" → that layer's motion, same wall clock, this layer's origin
  // becomes:"<id>" is NOT resolved here. It needs the measured box of a layer that states no w/h, and
  // nothing is measured until the DOM exists, so it runs beside `baseSize` below (see resolveBecomes).
  resolveAnchors(data);        // anchor/at/dx/dy → absolute x/y (annotations point at what they annotate)
  resolveKeyedProps(data.layers);   // a key that states w/h → every key on that track states it (see core/timeline/sequence.js)
  const extra = []; // group children (any depth), animated on their root group's window
  const GROUP_3D_OPACITY_ADAPT = []; // { el, children }, filled once groups are known: see "GROUP 3D" below
  const loggedGroup3DOpacity = new Set(); // one console line per group id, not per frame

  // applyGsapHooks: the GSAP-driven layer entrances/exits/paths, all built as PAUSED tweens on
  // gsap.globalTimeline at build; seekAll(t) seeks them per frame (runs AFTER driveClips, so GSAP
  // owns the transform), and fromTo/immediateRender pin the start values so a frame is pure in t
  // regardless of render order. Split layers target the per-unit `units` (staggered); else the layer.
  function applyGsapHooks(el, L, units) {
    // `gsap:{from,to,dur,ease}` USED TO LIVE HERE and never worked. Under the seek model it did not
    // interpolate: sampled every 0.1s a layer tweening x from 0 to 1500 read 100, then -4 (off frame)
    // for most of a second, then alternated 1556 / 100 / 1592 / 100 / 1600 frame to frame. It rendered
    // flicker and said nothing, for as long as it has existed, because no scene in the library ever
    // used it. A feature with the SILENT verdict the rules audit gives a rule nobody trips.
    // Removed rather than repaired: `motion` does everything it claimed and more (a real keyframe
    // track, holds, reversals, per-key easing), deterministically. Rejected loudly at validate so an
    // author who reaches for it is redirected instead of shipping a flickering layer. (MISTAKES #208.)
    // TextMorph: letters migrate A->B (core/motion/morph.js), tweened by GSAP. Rebuilds the layer's chars.
    // Guard on type: an svg layer's `morph` is a SHAPE morph it drives itself in svg.js frame(), without
    // this, buildMorph would rebuild the svg as text glyphs and render the target path `d` string as words
    // (docs/MISTAKES.md #140: the engine silently doing the wrong thing on an accepted input).
    if (L.morph && L.type !== 'svg' && window.gsap) buildMorph(el, L, window.gsap);
    // NAMED GSAP effects (core/engine/gsap-effects.js): `fx:"popIn"` | `fx:{name,dur,ease}` | `fx:["blurIn","float"]`.
    if (L.fx && window.gsap) {
      const targets = (units && units.length) ? units : el; // split → per unit (staggered), else the layer
      for (const item of (Array.isArray(L.fx) ? L.fx : [L.fx])) {
        const spec = typeof item === 'string' ? { name: item } : (item || {});
        // `console.warn` and continue meant the effect simply did not happen, and a warning in a
        // headless render nobody reads is the same as silence. validate.mjs rejects an unknown name
        // at author-check time, so this only bit under NOCHECK=1 - which is exactly when a render is
        // least supervised. docs/MISTAKES.md #360.
        GSAP_REGISTRY.pick(spec.name);
        const fn = window.gsap.effects[spec.name];
        if (!fn) throw new Error(`fx "${spec.name}" is registered but GSAP has no such effect, the `
          + `effect registry and the GSAP registration have drifted apart.`);
        const { name, dur, ease, delay, stagger, ...rest } = spec;
        fn(targets, { delay: (L.start ?? 0) + (delay || 0), stagger: stagger ?? (targets === units ? 0.04 : 0),
          ...(dur != null ? { duration: dur } : {}), ...(ease ? { ease } : {}), ...rest });
      }
    }
    // MOTION PATH (MotionPathPlugin): fly the layer along an SVG path. Closed-form position → pure in n.
    if (L.motionPath && window.gsap && window.MotionPathPlugin) {
      const mp = L.motionPath;
      window.gsap.to(el, {
        motionPath: { path: mp.path, align: mp.align, alignOrigin: mp.alignOrigin, autoRotate: mp.autoRotate ?? false, curviness: mp.curviness },
        duration: mp.dur ?? (L.duration ?? 2), ease: gsapEase(mp.ease, 'power1.inOut', `layer ${L.type} motionPath`),
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
    // SPLIT TEXT (SplitText), LINE level ONLY (char/word stay with the engine's own `split`): masked line
    // reveals, each line clipped so it slides up from behind. Do NOT combine with `split` on the same layer.
    // PARTS, dense per-CHILD choreography: stagger a named entrance across a layer's own child elements
    // (a bespoke SVG's bars/dots/paths, a group's cards), so a single figure animates piece by piece
    // instead of arriving as one block. This is the another engine density move (tl.fromTo on child elements
    // with a stagger), built on our seeked GSAP so it stays pure in n. Applies to any layer with children
    // (html inline-SVG, group, svg). `parts: { select, anim, each, stagger, delay, ease }`.
    if (L.parts && window.gsap) {
      // The PARTS vocabulary used to be declared right here, inside the build path, which is why it was
      // the one registry with no name, no catalogue entry and no gate: core/motion/parts.js now owns it.
      // one spec or an ARRAY of specs: a figure can grow its bars, THEN draw its line, THEN pop its dots.
      for (const p of (Array.isArray(L.parts) ? L.parts : [L.parts])) {
        const sel = p.select || 'rect, circle, path, polyline, line, [data-part]';
        const targets = [...el.querySelectorAll(sel)];
        if (!targets.length) continue;
        // absent → fadeUp (the documented default); named-but-unknown → throw (was `|| PARTS.fadeUp`)
        const spec = p.anim == null ? PARTS.fadeUp : PART_REGISTRY.pick(p.anim);
        if (spec[0]) targets.forEach(spec[0]);
        window.gsap.fromTo(targets, { ...spec[1] }, {
          // `stagger` is a number OR the object form { each, from, amount }, the SAME two dials a split
          // text layer takes. It used to reach GSAP as an unvalidated, undocumented pass-through:
          // whatever the author wrote arrived at the library and nothing said whether it meant anything
          // (docs/CRAFT/PARITY-AUDIT.md). It is now the engine's own vocabulary,
          // refused by `validate` when it is not, and translated here at the single seam where a spec
          // meets GSAP's two different words for the same two places (`start`/`end`).
          ...spec[2], duration: p.each ?? 0.5, stagger: gsapStagger(p.stagger, 0.07),
          ease: gsapEase(p.ease, 'power3.out', `layer ${L.type} parts`), delay: (L.start ?? 0) + (p.delay ?? 0.1), immediateRender: true,
        });
        // A PART CAN NOW LEAVE. Every entry used to be a one-way tween, so a hand-authored html figure
        // could only ever fade out as ONE card while a native layer stack left piece by piece. That
        // read as a limit of hand-written HTML in a head-to-head build and it was this line missing.
        // Opt in with `out: true` (the entrance's own paired exit, core/motion/parts.js slot 4) so an
        // existing scene cannot grow an exit it never asked for.
        // `fromTo` from the SETTLED state, never a bare `to`: a `to` records its start values when the
        // tween first runs, which is a function of playback order rather than of n, and a backward seek
        // then restores the wrong thing. Anchored to the layer's own end so the parts are gone by the
        // time the layer is.
        if (p.out && spec[3]) {
          const exitDur = p.exitDur ?? p.each ?? 0.45;
          const span = L.duration ?? 0;
          window.gsap.fromTo(targets, { ...spec[2] }, {
            ...spec[3], duration: exitDur, stagger: gsapStagger(p.stagger, 0.07),
            ease: gsapEase(p.exitEase ?? p.ease, 'power2.in', `layer ${L.type} parts exit`),
            delay: (L.start ?? 0) + Math.max(0, span - exitDur), immediateRender: false,
          });
        }
      }
    }
    if (L.splitText && window.gsap && window.SplitText) {
      const st = L.splitText;
      const parts = new window.SplitText(el, { type: 'lines', mask: st.mask === false ? undefined : 'lines', linesClass: 'sline' });
      parts.lines.forEach((ln, i) => {
        window.gsap.fromTo(ln, { yPercent: 120, opacity: st.mask === false ? 0 : 1 },
          { yPercent: 0, opacity: 1, duration: st.dur ?? 0.7, ease: gsapEase(st.ease, 'power3.out', `layer ${L.type} splitText`),
            delay: (L.start ?? 0) + i * (st.stagger ?? 0.09), immediateRender: true });
      });
    }
  }

  // the layer registry (core/layers/*): one primitive per file; scene.html just dispatches.
  // `frame` is boot's one frame object (core/layout/safe.js frameOf), forwarded whole so createKit hands every
  // primitive the canvas instead of each one re-deriving or hardcoding it. Nothing recomputes it here.
  const renderer = createRenderer({ theme, W, H, frame: canvas?.frame, cam, inkAt, bgWinAt, ACCENT_BGS, trackingFor,
    splitText, icon, motionAt, kenBurns, interpolate, resolveEasing, clamp01, fitText, fitBox,
    extra, components: window.__components, clips: window.__clips, lottie: window.__lottie,
    html: window.__html });
  // setLayerTiming: write the data-* attributes driveClips reads (start/duration/track/anim/enter/exit).
  // Enter/exit default to the base snap durations scaled by the theme's durationScale; a split layer
  // enters instantly, units reveal themselves.
  function setLayerTiming(el, L, idx) {
    // THE LAYER'S INDEX IN THE AUTHORED ARRAY. Nothing in the render reads it. It exists so a tool can
    // map a painted pixel back to the JSON that produced it: studio's picker hit-tests the frame and
    // needs to answer "which layer is this", and `track` cannot answer it because an author may set it.
    el.dataset.idx = String(idx);
    // The author's OWN id, mirrored onto the element so a probe tool can find a layer by the name the
    // scene JSON gave it instead of re-deriving the array index (`make probe-frame`, docs/CRAFT). Not
    // read by anything in the render itself, same footing as data-idx above.
    if (L.id) el.dataset.id = String(L.id);
    el.dataset.start = String(L.start ?? 0);
    if (L.duration != null) el.dataset.duration = String(L.duration);
    el.dataset.track = String(L.track ?? idx);
    // REFUSE WHAT THIS FUNCTION IS ABOUT TO THROW AWAY. A split layer enters per unit and a cut layer's
    // entrance IS the cut, so both branches below discard `anim` and (for split) `enterDur`. Accepting
    // them and dropping them silently is the failure this engine logs most: 33 layers across 10 films
    // carried an entrance the render never performed, and every gate stayed green (docs/MISTAKES.md).
    // `anim: "none"` is exempt, it asks for exactly what happens.
    const owner = L.split ? `split: "${L.split}"` : `cut: "${L.cut}"`;
    const instead = L.split
      ? 'a split layer\'s rhythm is its `each`/`stagger`, not a layer entrance'
      : 'a cut layer\'s entrance IS the cut, reach for `cutTiming`/`dist`, or drop the `cut`';
    if ((L.split || L.cut) && L.anim != null && L.anim !== 'none') {
      throw new Error(`layer ${idx} (${L.type}) sets anim: "${L.anim}" with ${owner}. The engine cannot honour it: ${owner.split(':')[0]} owns this layer's entrance and the anim is discarded. Remove it, ${instead}.`);
    }
    if (L.split && L.enterDur != null) {
      throw new Error(`layer ${idx} (${L.type}) sets enterDur: ${JSON.stringify(L.enterDur)} with ${owner}. The engine cannot honour it: a split layer's units reveal themselves, so its enter window is fixed at 0. Remove it, ${instead}.`);
    }
    // NO DEFAULT ENTRANCE. A layer that names no `anim` is simply PRESENT for its window, not faded
    // in: `anim: "fade"` is one word for anyone who wants the old behaviour (core/timeline/clips.js
    // resolveAnim/ANIM.none).
    el.dataset.anim = (L.split || L.cut) ? 'none' : (L.anim || 'none');
    if (L.cut === 'jitter') el.dataset.motion = 'loop'; // declared shake, exempt from shimmer checks
    // Resolve this layer's idle AT BUILD, and throw the result away. The idle track resolves it again
    // for itself; what this call buys is WHEN a misspelled name is refused. Left to the track alone,
    // `idle: "breath"` would first throw on whichever frame that layer reaches its settled middle,
    // which is a dead render one third of the way in with a stack trace instead of an authoring error.
    normalizeIdle(L.idle !== undefined ? L.idle : sceneIdle);
    // THE TWO ENTRANCE DIALS (core/motion/motion.js: anticipation and the overshoot amount). Written here,
    // refused here for the same layers that already lose their `anim`: a split or cut layer's entrance
    // is owned by something else, so a dial on it would be an input accepted and dropped.
    for (const [prop, lo, hi] of [['anticipate', 0.01, 0.6], ['overshoot', 0.01, 0.6]]) {
      const v = L[prop];
      if (v == null) continue;
      if (L.split || L.cut)
        throw new Error(`layer ${idx} (${L.type}) sets ${prop}: ${JSON.stringify(v)} with ${owner}. The engine cannot honour it: ${owner.split(':')[0]} owns this layer's entrance, so the dial would be discarded. Remove it, ${instead}.`);
      if (typeof v !== 'number' || !(v >= lo && v <= hi))
        throw new Error(`layer ${idx} (${L.type}) sets ${prop}: ${JSON.stringify(v)}. It is a FRACTION of the travel, ${lo} to ${hi} (${prop === 'anticipate' ? '0.1 to 0.2 is the band motion designers quote' : '0.08 to 0.15 is the band motion designers quote'}).`);
      el.dataset[prop] = String(v);
    }
    // Resolve the dials once, at BUILD, and throw the result away: what this call buys is WHEN a dial
    // on an entrance that cannot carry it is refused. Left to the first frame, `anim:"fade"` with an
    // `overshoot` would fail one third of the way into a render instead of at authoring time.
    entranceWarp(el, BASE_ENTER);
    // `step` quantises this layer's clock (animate on twos = 15 in a 30fps film). On the element as
    // well as on the layer because the entrance is composed by core/timeline/clips.js, which sees only the DOM.
    if (L.step != null) {
      if (typeof L.step !== 'number' || !(L.step > 0) || L.step > fps)
        throw new Error(`layer ${idx} (${L.type}) sets step: ${JSON.stringify(L.step)}. It is UPDATES PER SECOND, above 0 and no faster than the film's own ${fps}fps: 15 is "on twos", 10 is "on threes". A step at or above the frame rate changes nothing.`);
      el.dataset.step = String(L.step);
    }
    if (L.split) el.dataset.enter = '0';
    else if (!L.cut) el.dataset.enter = String(+(L.enterDur ?? BASE_ENTER * M.durationScale).toFixed(3));
    if (L.out) el.dataset.out = L.out;
    // NO DEFAULT FADE-OUT. BASE_EXIT used to apply to every layer that named no `out`, so a layer
    // authored to simply END held nothing: it faded for its last ~0.26s whether or not anyone asked
    // for that fade, one more hand quietly writing this layer's life. An exit is now authored (`out`,
    // with or without `exitDur`) or it comes from the beat's transition (sceneUnits, below, or a
    // cut/seam/sting at the joint); a layer that states neither holds to its own end and simply stops
    // being drawn there. `exitDur` alone (no `out`) still opts into the OLD calm in-place fade
    // (clipStyleAt's default when `out` is absent), so that spelling keeps working unchanged.
    if (L.exitDur != null) el.dataset.exitDur = String(L.exitDur);
    else if (!L.cut && L.out) el.dataset.exitDur = String(+(BASE_EXIT * M.durationScale * M.exitRatio).toFixed(3));
    // scene units: the beat WRAPPER owns the exit slide. Suppress this layer's own exit fade and keep it
    // alive through the wrapper's exit window, or it would vanish mid-slide. Non-last beats only (the
    // last beat has no exit cut), and only the layers that are still the beat's CURRENT STATE
    // (beatIsCurrent above). The incoming ENTER stays per-layer, so contents still stagger in.
    if (sceneUnits) {
      const bi = beatIndexOf(L);
      if (bi != null && bi < beatBounds.length - 1 && beatIsCurrent(L, bi, beatBounds[bi].end)) {
        const be = beatBounds[bi].end;                    // this beat's exit cut time
        const cut = sceneCuts.find((c) => +c.t === be);
        const dur = cut && cut.dur != null ? +cut.dur : 0.4;
        el.dataset.exitDur = '0';                          // wrapper owns the exit slide (no per-layer fade)
        // KEEP THE AUTHORED NUMBER. This line REPLACES the author's `duration`, so a layer written to
        // leave at 2.0s can render to 9.8s, and until this attribute existed nothing downstream could
        // tell the difference: the DOM was the only record of timing and it held the rewritten value
        // alone. data-duration stays what the renderer needs (driveClips must hold the layer through
        // the wrapper's slide, or it vanishes mid-move); data-authored-duration is what the author
        // asked for, so every tool that REPORTS timing can show both and name the substitution.
        // KEPT (not deleted): studio/page.mjs reads it to show both numbers in the studio
        // inspector. Its OWN pose is no longer at risk from this stretch: renderFrame's per-layer loop
        // clamps every primitive's clock to `L.start + L.duration` (the authored number, read straight
        // off this object, not off the dataset this stretches), so the substitution below only ever
        // widens the window driveClips uses for VISIBILITY, never the window a primitive drives from.
        if (L.duration != null) el.dataset.authoredDuration = String(L.duration);
        el.dataset.duration = String(+(be + dur - (L.start ?? 0)).toFixed(3)); // live through the slide-out
      }
    }
  }

  // buildLayer: turn one layer's JSON into its DOM element (position + class + timing), dispatch to the
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
    // `critical: false` is documented as "force EXCLUDE from layout audit", and for the overlap/contrast
    // checks it was: those are scoped to [data-layer=critical], which this branch withholds. The
    // safe-zone and overflow walk reads every .hs-layer and consulted the flag nowhere, so an author who
    // opted a layer out was told it was out and it was not, documented input accepted and ignored, the
    // failure this codebase logs most. A deliberately frame-wide FIELD (a terrain strip, a bleeding
    // figure) has no other way to say so: the walk's own escape is a full-bleed box ≥90% of BOTH
    // dimensions, which a wide short band can never satisfy. Marked here so the audit can honour it.
    if (L.critical === false) el.setAttribute('data-audit', 'off');
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
    renderer.kit.decorate(el, L);   // mask + filter/look + fade + reflect + logotype. ONE definition, shared with group children
    applyGsapHooks(el, L, units);   // gsap / morph / fx / motionPath / physics / splitText (all pure, seeked per frame)
    // The read record is snapshotted HERE, the instant this layer's build finishes, and never later:
    // everything after this point (the frozen scene-view copies at specs, the per-frame pipeline)
    // reads layers in an order no worker agrees on, and a check that moved with it would not be a
    // check. Deterministic by construction.
    for (const w of watchedTree(L)) auditLayer(w);
    return { L, el, units };
  }

  const layers = (data.layers || []).map(buildLayer);

  // A MATTE SOURCE IS CONSUMED, NOT DRAWN, which is what a track matte means everywhere else and what
  // this engine did not do. A `beam` used to reveal a headline was still painting its own sheen over
  // the frame, so the light you cut with was also a bright band sitting on top of the shot. Nobody
  // wants both: the light IS the reveal.
  //
  // `visibility` and not `opacity` or `display`, and the difference is load-bearing. `display:none`
  // takes the element out of layout and the matte places its mask FROM the source's live box, so the
  // mask would lose its geometry. `opacity` is owned by driveClips, which writes the enter/exit
  // envelope there every frame and would overwrite this. `visibility:hidden` keeps the box, paints
  // nothing, and nothing else in the engine writes it.
  //
  // Done ONCE here rather than per frame, because the set of matte sources is a property of the scene
  // JSON and is known before frame 0. Writing to another layer's element from inside a frame() would
  // make the picture depend on which layer the render loop reached first, which is the one thing
  // renderFrame(n) promises it does not.
  //
  // Safe to make the default: no shipped scene used `matte` at all when this landed, so it changes
  // nothing that exists and matches what an author coming from After Effects already expects.
  {
    const consumed = new Set();
    for (const { L } of layers)
      for (const m of L.modifiers || []) {
        const spec = m && m.matte;
        const from = typeof spec === 'string' ? spec : (spec && spec.from);
        if (from) consumed.add(from);
      }
    if (consumed.size)
      for (const { L, el } of layers) if (L.id && consumed.has(L.id)) el.style.visibility = 'hidden';
  }
  const topCount = layers.length; // group children follow; their x/y are relative to their group
  // GROUP CHILDREN NEVER GOT parts/fx/motionPath/physics/splitText/morph: applyGsapHooks was called only
  // from buildLayer (top-level layers), and addGroupChild (core/layers/util.js) built children straight
  // into `extra` without ever passing them through it. A group's `html` child with `parts` rendered its
  // popped-in state from frame 0; only the group's OTHER children (typing, driven per-frame by driveClips
  // off data-*) worked, which is why the bug looked like "typing is fine, parts is broken" instead of
  // "GSAP hooks never run on a child". Same call, same function, every depth: addGroupChild already
  // resolves each child's absolute start into `L.start` (rootL.start + its own `delay`, recursively for
  // nested groups), so `(L.start ?? 0) + p.delay` inside applyGsapHooks lands on the same clock a
  // top-level layer's parts use, and a child's `delay` stays relative to its OWN group's window.
  for (const { L, el, units } of extra) applyGsapHooks(el, L, units);
  layers.push(...extra); // group children join the per-frame animation loop

  // ---- GROUP 3D: a `group` never gets its own preserve-3d, so a child's rotY/rotZ/z is flattened ----
  //
  // The rig above (`RIG`/`has3DMotion`) turns preserve-3d on for `#cam` and every beat wrapper the
  // moment ANY layer, top-level or nested, keys a 3D motion prop. But a GROUP sitting between the beat
  // wrapper and that layer stays flat by default (browsers default every element to
  // `transform-style: flat`), so a child's own rotateY/rotateX/translateZ is flattened onto the
  // group's 2D plane before it ever reaches the rig. This is the earlier group-plane case
  // (docs/CRAFT/KEYED-MOTION.md 5b) in reverse: there, a flat group is CORRECT because its children
  // have no 3D of their own and are meant to ride the group's tilt flat. Here the children carry their
  // OWN rotY/rotX/z, so the group has to open a 3D context for them to stand in, or the depth is lost.
  //
  // Decided once, from the resolved motion tracks, exactly like `has3DMotion` above: a group needs
  // `preserve-3d` iff some descendant (any depth) keys its own z/rotX/rotY, and so does every group
  // ancestor between it and the camera (the rig already reaches the camera and beat wrapper; this
  // closes the gap for every group in between). A group whose descendants are all flat is untouched.
  //
  // OPACITY AND FILTER ARE GROUPING PROPERTIES too (scene.js "THE CAMERA RIG" above): either one on a
  // 3D-holding group flattens it right back, motion track or not. Adapted rather than refused, because
  // an author writing a group-level fade has no way to know it kills its own children's depth: see
  // core/tracks/group3d.js for the per-frame push-down this feeds (`GROUP_3D_OPACITY_ADAPT` below).
  {
    const { need3D, adapt } = computeGroup3D(layers);
    for (const el of need3D) el.style.transformStyle = 'preserve-3d';
    GROUP_3D_OPACITY_ADAPT.push(...adapt);
  }

  // THE TIMED SET, taken here because here is where the scene has finished being built: every
  // top-level layer is in `cam` (or in its beat wrapper, which is), and every group child was appended
  // by addGroupChild during the map above. Both writers of `data-start` have run, and nothing after
  // this line adds one. Collected once instead of re-queried inside driveClips, which walked the tree
  // 780 times a render for a set that is fixed after build, and, worse, made what frame N renders a
  // function of what was in the DOM at that instant. core/timeline/clips.js carries the reasoning and the rule
  // for the day something legitimately needs to add a clip later.
  const CLIPS = collectClips(cam);

  // ---- SCENE VIEW: what one layer is allowed to know about the rest of the frame ----
  // A primitive was handed itself and the clock and nothing else, so occlusion, a shadow keyed to a
  // light and per-layer 3D could not be written at all: none of them is a property of one layer.
  // `scene` is passed as the 5th argument to every primitive's frame() (core/layers/index.js).
  //
  // Boxes are PURE GEOMETRY, authored x/y/w/h, the motion track sampled at t, and one size measured
  // at build for layers that state neither. Never a live DOM measurement, and that is the whole point:
  // a geometric box for EVERY layer is resolvable before ANY layer's frame() runs, so a layer can
  // never read a neighbour's box left behind by the previous frame. A measured box would be exactly
  // that stale value for every layer the loop has not reached yet, silently and only sometimes.
  const CANVAS = Object.freeze({ w: W, h: H });
  const SAFE = canvas?.safe ? Object.freeze({ ...canvas.safe }) : null; // computed once in core/engine/boot.js
  // THE SCENE'S LIGHT: one point in canvas space that every shadow aims away from (core/fx/shadow.js).
  // Resolved here rather than inside the modifier so the scene owns it and a second consumer (a shade,
  // a specular edge, a gradient that follows the key) reads the same value. Checked here too, and
  // loudly: a light with a mistyped key would leave every shadow pointing at the canvas origin, which
  // looks like a design decision rather than a typo.
  const LIGHT = (() => {
    const l = data.lighting;
    if (l == null) return null;
    if (typeof l !== 'object' || Array.isArray(l))
      throw new Error(`lighting must be an object like { "x": 540, "y": 120 }, got ${JSON.stringify(l)}.`);
    const KEYS = ['x', 'y', 'intensity'];
    for (const k of Object.keys(l))
      if (!KEYS.includes(k)) throw new Error(`lighting: unknown key "${k}", known: ${KEYS.join(', ')}.`);
    const fin = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!fin(l.x) || !fin(l.y))
      throw new Error(`lighting needs numeric x and y in canvas px (the point the light is at), got `
        + `${JSON.stringify({ x: l.x, y: l.y })}. The canvas is ${W}x${H}; a light OUTSIDE it is fine and `
        + `is usually what you want.`);
    const intensity = l.intensity == null ? 1 : l.intensity;
    if (!fin(intensity) || intensity < 0)
      throw new Error(`lighting.intensity must be a number 0 or more (it scales every shadow at once), got ${JSON.stringify(l.intensity)}.`);
    return Object.freeze({ x: l.x, y: l.y, intensity });
  })();
  // One measurement pass, at build, and only for layers an author gave an id (the only ones boxOf can
  // be asked about). Text states no w/h (its box is its content) so without this every text layer
  // would report a zero box, which is a wrong answer rather than no answer.
  const baseSize = new Map();
  // Keyed by the LAYER, not by its id, because `becomes` is declared on the outgoing layer and that
  // layer need not carry an id at all, only the incoming one is named. boxOf still answers from
  // `baseSize`, which stays id-only, so nothing outside this pair sees the unnamed entries.
  const measured = new WeakMap();
  for (let i = 0; i < topCount; i++) {
    const { L, el } = layers[i];
    const box = { w: el.offsetWidth, h: el.offsetHeight };
    measured.set(L, box);
    if (L.id) baseSize.set(L.id, box);
  }
  // The handover, now that both forms have a real box. Still ONCE, at build, still pure geometry on the
  // JSON: it writes `motion` keys, which every reader samples per frame. resolveKeyedProps runs again
  // because the keys it injects are new, and a target whose own track states w/h needs them stated on
  // every key (core/timeline/sequence.js keeps exactly one rule: both endpoints, or neither).
  resolveBecomes(data, (L) => measured.get(L));
  resolveKeyedProps(data.layers);
  // A GROUP CHILD'S BOX, which used to be null on the argument that flex and grid put it where only
  // layout knows. That argument was right about the AUTHORED x/y and wrong about the conclusion: the
  // child is laid out, so the browser knows exactly where it landed, and the one thing that must not
  // happen (measuring the DOM inside the frame loop) is avoidable because the offset INSIDE the
  // group is static. Flow position does not depend on t. So it is measured ONCE here, as a delta from
  // the top-level ancestor's own rect, and composed with that ancestor's per-frame box below.
  //
  // Rects rather than an offsetLeft/offsetTop chain: offsetParent skips any statically-positioned
  // ancestor, and a nested group is exactly that, so the chain silently reports the offset from two
  // levels up. Nothing has written a transform yet at build (driveClips runs per frame), so a rect
  // difference here IS the untransformed layout offset.
  const childRel = new Map();   // layers[] index -> { root, dx, dy, w, h }
  {
    const rootOf = new Map();
    for (let i = 0; i < topCount; i++) rootOf.set(layers[i].el, i);
    for (let i = topCount; i < layers.length; i++) {
      const { L, el } = layers[i];
      if (!L.id) continue;
      const rootEl = el.closest('.hs-layer');
      const root = rootOf.get(rootEl);
      if (root == null) continue;   // detached: nothing to be relative to
      const r = el.getBoundingClientRect(), rr = rootEl.getBoundingClientRect();
      childRel.set(i, { root, dx: r.left - rr.left, dy: r.top - rr.top, w: r.width, h: r.height });
    }
  }
  const boxes = new Map();
  // Every named value a layer PUBLISHES about its own private state (core/layers/index.js `expose`),
  // resolved fresh each frame beside `boxes` and for the same reason: rebuilt from nothing every call,
  // holding no history, so renderFrame(n) stays pure in n (make probe samples out of order to catch a
  // value that quietly closed over the previous frame).
  const exposed = new Map();
  const topGeom = new Array(topCount);   // every top-level layer, id or not, a child needs its parent's
  // `reflowed` is the ONE field of a top-level layer's geometry that is not part of its box: it says the
  // build-time child offsets went stale, which is a fact about this frame's bookkeeping and not about
  // where the layer is. It used to live ON the geometry object, so every id'd layer paid a second object
  // and a destructure per frame purely to take it back off again before freezing. Kept beside the array
  // instead, so `g` IS the box and can be frozen in place. Not folded into `g` and frozen with it: a box
  // handed to a modifier must advertise only what boxOf promises, and a stray key is how an effect comes
  // to read a field the contract never had (the same drift TRACK_PROPS and IDS exist to refuse).
  const topReflowed = new Uint8Array(topCount);
  // A REUSED object for every top-level layer that has NO id. Nothing outside this function can ever see
  // one (boxOf answers from `boxes`, which only id'd layers enter) so its only reader is the child loop
  // below, on the same frame that wrote it. An id'd layer still gets a fresh frozen object, because that
  // one IS handed out and freezing a reused object would freeze it for every later frame.
  // core/tracks/index.js states the rule this serves: nothing allocates per frame if it does not have to.
  const scratchGeom = Array.from({ length: topCount }, () => ({}));
  // THE ENTRANCE IS PART OF WHERE A LAYER IS, and for a long time this function said otherwise. A box
  // was composed from the authored x/y plus the motion track and nothing else, so through a `rise` the
  // target sat 48px below the box that claimed to describe it, through a `slide-left` 60px to the side,
  // and through a `pop` at 86% of the size. Every reader of boxOf got that wrong answer with nothing to
  // say so: a follower pinned itself to where its target WOULD BE and the target arrived underneath it
  // (measured 48.00px at t=0 on a plain rise), and a cast shadow aimed away from a point its object was
  // not at yet. driveClips owns the entrance and writes it as a CSS transform, which is why it never
  // reached the arithmetic here; `clipStyleAt` is that same composition as a VALUE, so the pose can now
  // be asked for rather than only drawn.
  //
  // ONE SCRATCH OBJECT AND ONE MATRIX, both reused, because this runs per id'd layer per frame and
  // core/tracks/index.js states what that costs (~50k times a minute of video). The work is also SKIPPED
  // outside the enter and exit ramps, which is where an entrance contributes identity anyway, so a
  // settled or off-window layer pays two comparisons and no allocation.
  const pose = { dx: 0, dy: 0, scale: 1 };
  const poseM = new DOMMatrix();
  // clipPose(el, t, visible) -> `pose`, the enter/exit transform's effect on the layer's CENTRE and size.
  // Translate moves the centre; scale multiplies about it and leaves it where it is, the same split
  // boxOf already makes between w/h and `scale`, and for the same reason (CSS scales about the
  // element's own centre, so folding scale into w/h would move the top-left corner with nothing on
  // screen moving with it).
  function clipPose(el, t, visible) {
    pose.dx = 0; pose.dy = 0; pose.scale = 1;
    if (!visible) return pose;   // an off-window box already reports the resting pose, and so does this
    const start = parseFloat(el.dataset.start) || 0;
    const dur = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
    const inEnter = t - start < enterDurOf(el);
    const inExit = Number.isFinite(dur) && t > start + dur - exitDurOf(el);
    if (!inEnter && !inExit) return pose;
    const tr = clipStyleAt(el, t).transform;
    if (!tr || tr === 'none') return pose;
    // DOMMatrix rather than a hand-rolled parse of the transform string: the anim registry is free to
    // write any transform list it likes, and a regex here would be a second, weaker implementation of
    // CSS that goes wrong silently the first time an entrance uses a function it does not know.
    poseM.setMatrixValue(tr);
    pose.dx = poseM.e; pose.dy = poseM.f; pose.scale = poseM.a;
    return pose;
  }
  function resolveBoxes(t) {
    boxes.clear();
    for (let i = 0; i < topCount; i++) {
      const { L, el } = layers[i];
      const start = L.start ?? 0, end = start + (L.duration ?? 2);
      const visible = t >= start && t < end;
      // THE LAYER'S OWN CLOCK, not the film's. `timeWarp`/`timeRemap` (core/timeline/time.js) are what
      // runTracks feeds every other track before it samples this layer's motion, so a warped layer's
      // real on-screen position at t is at layerTime(t), not at t. Reading `t - start` here instead used
      // to sample the UNWARPED track: a box, and therefore a `follow` pinned to it, would agree with the
      // layer's own rendering only where the warp happens to be the identity. layerTime is pure in
      // (L, t, start, end), so this keeps resolveBoxes pure in t.
      const lt = layerTime(L, t, start, end) - start;
      const m = visible && L.motion && L.motion.length ? motionAt(L.motion, lt, L.motionDelay) : null;
      const base = (L.id && baseSize.get(L.id)) || { w: 0, h: 0 };
      const w = m && m.w != null ? m.w : (L.w ?? base.w);
      const h = m && m.h != null ? m.h : (L.h ?? base.h);
      // `radius` is a STYLE WRITE beside w/h, not a transform: core/layers/util.js chipBox already
      // wrote the resting borderRadius at build, and this only overwrites it on a frame where the
      // track actually keys the property (both endpoints of the segment stated a number, POSE's null
      // identity). Written EVERY frame a track keys radius at all, inside the window or out, the same
      // purity rule core/tracks/box.js states for w/h: a value a later frame left behind must not
      // survive a seek backwards, so an out-of-window frame re-asserts the authored `L.radius` (or, if
      // that is also absent, leaves chipBox's own default alone rather than re-deriving it here).
      if (L.motion && L.motion.some((k) => k && k.radius != null)) {
        const r = m && m.radius != null ? m.radius : L.radius;
        if (r != null) el.style.borderRadius = r.toFixed(2) + 'px';
      }
      // The enter/exit transform, composed on top of the authored geometry and the motion track,
      // exactly as the browser composes them: driveClips writes this transform and the motion track
      // prepends to it, so the two are independent offsets of the same centre.
      const p = clipPose(el, t, visible);
      let x = (L.x ?? 60) + (m ? m.dx : 0) + p.dx;
      let y = (L.y ?? 240) + (m ? m.dy : 0) + p.dy;
      // A `cursor` layer's on-screen point is not expressed through `motion` like every other layer:
      // it is driven by `path` inside its own frame() (core/layers/cursor.js). `expose()` reports that
      // same offset (one fact, one owner: both this file and the primitive's own frame() read `path`
      // through the identical `motionAt`), resolved into `exposed` just above, so a `follow`ing layer
      // (including a `carry` binding) can grab the pointer's LIVE point instead of chasing where the
      // path started. cursor.js documents the one gap this leaves: a `snapTo` magnet is invisible
      // here, because expose() never receives a live `scene`.
      if (L.type === 'cursor' && L.id) {
        const cur = exposed.get(L.id);
        if (cur) { x += cur.dx; y += cur.dy; }
      }
      // w/h are the UNSCALED layout box and `scale` is reported beside them, because CSS scales about
      // the element's centre: folding the scale into w/h would move the top-left corner and nothing
      // on screen moves with it (the same error that put a `becomes` handover 160px off, above).
      const g = L.id ? {} : scratchGeom[i];
      g.id = L.id; g.x = x; g.y = y; g.w = w; g.h = h; g.cx = x + w / 2; g.cy = y + h / 2;
      g.scale = (m ? m.scale : 1) * p.scale; g.rot = m ? m.rot : 0; g.opacity = m ? m.opacity : 1; g.visible = visible;
      topGeom[i] = g;
      // a motion track that keys w/h RESIZES the group, and flex and grid reflow when it does, so
      // the offsets measured at build stop describing where the children are. Recorded, not guessed.
      topReflowed[i] = (m && (m.w != null || m.h != null)) ? 1 : 0;
      if (L.id) boxes.set(L.id, Object.freeze(g));
    }
    for (const [i, k] of childRel) {
      const { L } = layers[i];
      const p = topGeom[k.root];
      // THE ONE CONDITION THAT STAYS NULL, narrowed from "every group child" to this: a resized group
      // has reflowed, so the build-time offset is a stale measurement. Scaling or moving the group is
      // fine. Those transform the child with it, which the arithmetic below does exactly.
      if (topReflowed[k.root]) continue;
      const start = L.start ?? 0, end = start + (L.duration ?? 2);
      const visible = p.visible && t >= start && t < end;
      // The child rides the group's transform: its centre offset from the group's centre is scaled and
      // rotated about that centre, exactly as CSS composes them. w/h stay the child's own layout size
      // with the group's `scale` reported beside, matching what a top-level box means.
      const ox = k.dx + k.w / 2 - p.w / 2, oy = k.dy + k.h / 2 - p.h / 2;
      const r = (p.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      // The child's own entrance rides INSIDE the group, so its offset is rotated and scaled by the
      // group's transform like any other local displacement, and its scale multiplies the group's.
      const q = clipPose(layers[i].el, t, visible);
      const qx = (q.dx * c - q.dy * s) * p.scale, qy = (q.dx * s + q.dy * c) * p.scale;
      const cx = p.cx + (ox * c - oy * s) * p.scale + qx, cy = p.cy + (ox * s + oy * c) * p.scale + qy;
      boxes.set(L.id, Object.freeze({ id: L.id, x: cx - k.w / 2, y: cy - k.h / 2, w: k.w, h: k.h,
        cx, cy, scale: p.scale * q.scale, rot: p.rot, opacity: p.opacity, visible }));
    }
  }
  // boxOf's box IS AXIS-ALIGNED, and it is left that way rather than half-fixed. `g.rot` rides along as
// metadata that some callers read for the angle alone, but x/y/w/h/cx/cy never turn with it. So a
// `follow` pinned to a rotating layer resolves against the layer's UNROTATED box: on an arm pivoting
// about its foot it lands near the neutral position rather than riding the tip, which is what a real
// film measured today. Fixing it properly means a rotation-aware `edge` mode that computes the rotated
// edge from cx/cy/w/h/scale/rot, and that belongs in core/tracks/follow.js beside the other edge modes,
// not here. Recorded so the next author finds the gap rather than the symptom.
const boxOf = (id) => boxes.get(id) || null;

  // resolveExposed(t): every top-level, id'd layer's own `expose(L, t)` (core/layers/index.js),
  // resolved BEFORE any layer's frame() runs, same reason and same place as resolveBoxes: a value
  // published this frame must exist before anything can read it, and reading no DOM here keeps the
  // per-frame loop's read order unable to change the answer. Not composed with the box (position,
  // scale, rotation): `exposedOf` reports what the layer itself knows, exactly as `boxOf` reports
  // unscaled geometry and leaves scale/rotation to the caller.
  function resolveExposed(t) {
    exposed.clear();
    for (let i = 0; i < topCount; i++) {
      const { L } = layers[i];
      if (!L.id) continue;
      const v = renderer.expose(L, t, null);
      if (v) exposed.set(L.id, v);
    }
  }
  const exposedOf = (id) => exposed.get(id) || null;
  // followCameraAt(spec) -> the same shape cameraAt returns, computed from the target's LIVE box
  // instead of a keyframe. DEADZONE, not a rigid lock: the camera holds still while the target's
  // centre sits inside a `margin` band around frame centre, and moves only the minimum needed once it
  // would cross that band's edge (a clamp, so this is 1-Lipschitz in the target's own already-smooth
  // position, which is why no separate damping pass sits on top: see core/camera-moves/follow.js for
  // why a lerp-style damper would need the PREVIOUS frame's camera as state and break renderFrame(n)'s
  // purity). A rigid re-centre every frame would instead read as the BACKGROUND sliding under a still
  // subject, which is the failure this shape avoids. Zoom is HELD at `to`, not framed.
  function followCameraAt(spec) {
    const b = boxOf(spec.id);
    // Not a refusal: bindFollowCamera (core/engine/produce.js) already proved the id exists among the
    // scene's OWN layers at build time, and resolveBoxes writes a box for every id'd top-level layer on
    // every frame regardless of visibility. A miss here would mean the box pass itself regressed, not
    // an authoring error, so it fails the same way a null box would fail without this file's help.
    const { s, x, y } = followOffset(b, spec, W, H);
    return { s, x, y, rx: 0, ry: 0, roll: 0, persp: 1600, focus: null, aperture: 0 };
  }
  // followVelocityAt(spec, t, dt): the follow camera's speed, for the SAME reason cameraVelocityAt
  // exists for a keyed one, motionAt (core/tracks/motion.js) reads cam.vel to decide the shutter smear
  // regardless of which move produced the camera. A keyed camera has one track to sample twice; this
  // move has none, its pose at any time is the target's box AT THAT TIME, so the two samples this needs
  // are two boxes. resolveBoxes(t) is already pure in t (see its own header), so sampling it a second
  // time at t-dt and putting it back is cheap and correct, never a second box implementation.
  function followVelocityAt(spec, t, dt) {
    const boxNow = boxOf(spec.id);
    const prevT = Math.max(0, t - dt); // CLAMPED at t=0 like cameraVelocityAt: not moved yet, no speed
    resolveBoxes(prevT);
    const boxPrev = boxOf(spec.id);
    resolveBoxes(t); // restore: everything after this point reads boxOf expecting THIS frame's boxes
    return followVelocity(boxNow, boxPrev, spec, W, H, dt);
  }

  // ---- THE REST OF THE VIEW: identity, the clock, the locked look, the backdrop, the joints ----
  // Geometry alone was not enough to write real effects against. An effect could ask WHERE another
  // layer is and nothing else: not what it is, not what else exists, not how far through the film it
  // is, not what colour the film is allowed to use, not what it is compositing against, not where the
  // cuts are. Each of those is a property of the FRAME, which is exactly what this view is for.
  //
  // EVERY FIELD BELOW NAMES ITS CONSUMER, and that is a rule, not a courtesy: a view that advertises
  // something nothing implements is the same lie as a schema that does, which is what schema-drift
  // exists to refuse. Deliberately absent, with the reason, at the end of this block.

  // WHO ELSE IS IN THE FRAME. `ids` in PAINT ORDER (the z driveClips writes, `track ?? array index`),
  // so "everything in front of me" is a slice and not a sort the caller has to reinvent. `specOf`
  // hands back the layer's own authored JSON plus that z. Read by core/fx/occlude.js, whose `by`
  // accepts "above"/"below", occlusion by stacking order rather than by a hand-listed set of ids,
  // which is the form the effect actually wants ("hide me under everything on a higher track").
  //
  // A DEEP-FROZEN COPY, not the live object. The engine mutates layer specs (resolveRelativeTimes
  // rewrites `start`, resolveKeyedProps expands tracks), so handing out the real one would let a
  // modifier rewrite the input of a layer that has not rendered yet and make renderFrame(n) depend on
  // render order. Copied and frozen ONCE at build, so the per-frame cost is a Map lookup.
  // A PLAIN recursive copy, not structuredClone: a layer spec is a watched Proxy (core/registry/prop-audit.js)
  // and the structured-clone algorithm refuses an exotic object outright. Same output for the JSON
  // shapes a layer is made of, and it costs one pass that deepFreeze was making anyway.
  const deepCopy = (o) => (Array.isArray(o) ? o.map(deepCopy)
    : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deepCopy(v)]))
      : o);
  const deepFreeze = (o) => {
    if (o && typeof o === 'object') for (const v of Object.values(o)) deepFreeze(v);
    return Object.freeze(o);
  };
  // GROUP CHILDREN ARE IN HERE TOO, because boxOf answers for them. Their `z` is their GROUP's, which
  // is the truth: a group paints as one element and its children stack inside it, so a child is neither
  // above nor below anything outside the group. Ties are excluded by the stacking sentinels that read
  // this (core/fx/occlude.js), which is exactly right, a sibling is not "in front".
  const specs = new Map();
  for (let i = 0; i < layers.length; i++) {
    const { L } = layers[i];
    if (!L.id) continue;
    const root = i < topCount ? i : (childRel.get(i)?.root ?? i);
    specs.set(L.id, deepFreeze({ ...deepCopy(L), z: layers[root].L.track ?? root }));
  }
  const IDS = Object.freeze([...specs.keys()].sort((a, b) => specs.get(a).z - specs.get(b).z));
  const specOf = (id) => specs.get(id) || null;

  // THE LOCKED LOOK. A film's palette is decided once, in the theme, and an effect that wants to key
  // to the accent had to be handed the hex by the author, who then owns a colour the theme already
  // owns, in a second place, forever. `name` rides along so a modifier rejecting an unknown role can
  // say WHICH theme does not have it. Read by core/fx/shadow.js (`color` may be a palette role, and
  // its default resolves through this).
  //
  // `type` (the font roles) is NOT here. A face is written at build by the primitive that lays the
  // text out; a modifier changing font-family per frame would relayout mid-render, and nothing in the
  // registry can consume it. It goes in when something can.
  const THEME = Object.freeze({ name: (theme && theme.name) || null,
    palette: Object.freeze({ ...((theme && theme.palette) || {}) }) });

  // WHAT WE ARE COMPOSITING AGAINST, at t. Read by core/fx/shadow.js for `color: "auto"`, what colour
  // a shadow should be is a fact about the SURFACE IT FALLS ON, not about the layer casting it.
  //
  // The CLASSIFICATION, not the preset name. LIGHT_BGS and ACCENT_BGS are decided here, once, and a
  // view that handed out `preset` would make every consumer re-derive them from a copied list, the
  // duplicate-vocabulary shape this repo keeps logging. `light` is three-valued on purpose: true /
  // false / null, where null is a hand-authored backdrop that declared no `tone`. The engine cannot
  // read lightness out of somebody's CSS, and a guess there is how a frame ends up white-on-white, so
  // `authored` rides beside it to let a consumer say WHY it cannot answer.
  const bgAt = (t) => {
    const w = bgWinAt(t);
    if (!w) return null;                       // no bg windows: the .hs-stage theme gradient
    const authored = w.html != null;
    // ONE derivation, shared with inkAt. This used to be a second copy of the LIGHT_BGS test, which is
    // the duplicate-vocabulary shape the paragraph above warns about, written directly beneath it.
    return Object.freeze({ authored, light: windowIsLight(w), accent: !authored && ACCENT_BGS.includes(w.preset) });
  };
  // duration: explicit, else the last clip's end (+0.4 tail)
  const lastEnd = layers.reduce((m, { L }) => Math.max(m, (L.start ?? 0) + (L.duration ?? 2)), 0);
  const duration = data.duration || +(lastEnd + 0.4).toFixed(2);
  const caps = data.captions || [];
  const capMode = data.captionMode || 'sentence';
  // captionStyle: a word-timed treatment (core/type/captions.js) layered on the pop layout.
  // Unknown names fail LOUD at boot, matching the theme doctrine, never a silent fallback look.
  const capStyle = data.captionStyle || null;
  // One refusal, owned by the registry: it also searches every other vocabulary, so a name borrowed
  // from the kinetic presets or the looks is told where it really lives instead of being met with a
  // bare list of eighteen caption styles.
  if (capStyle) CAP_STYLE_REGISTRY.pick(capStyle);
  const camKf = data.camera || []; // cameraAt/motionAt now live in /core/timeline/sequence.js (pure, tested)
  // `cameraFollow` (core/camera-moves/follow.js): unlike camKf above, this cannot be a keyframe array,
  // because the target's on-screen box does not exist until resolveBoxes(t) has run for THIS frame.
  // Computed inside renderFrame, right after resolveBoxes(t), off the same `boxOf` accessor
  // core/tracks/follow.js reads a live box through, so it stays pure in t (a Map lookup plus a clamp).
  const CAM_FOLLOW = data.cameraFollow || null;

  // ---- THE CAMERA RIG: one model, two emissions ----
  //
  // The camera is a position in space (core/timeline/sequence.js). Where NOTHING in the frame leaves the canvas
  // plane, every point sits at z=0 and the perspective projection of the whole frame collapses exactly
  // to the affine `scale(s) translate(x,y)` this engine has always written, same picture, to the pixel,
  // proved in harness/dev/spike-dolly.mjs. So that string is still what gets emitted, for the reason
  // #59 gives: a 3D transform promotes the subtree into a 3D rendering context and changes rasterisation
  // even when it changes no geometry, and a film with no depth in it should not pay that.
  //
  // The moment anything DOES leave the plane. A tilted layer, a layer standing at a DEPTH
  // (core/fx/plane.js), or a camera that pitches, yaws or rolls.
  // The flat emission stops being equivalent, and it fails in the one way that matters: it moves an
  // already-finished projection, so a tilted card's vanishing point travels WITH the card and the
  // perspective never changes however far the camera goes. That is the tell in
  // docs/CRAFT/REF-pin-16818198602994243.md, and it is why this is a rig and not a transform.
  //
  //   #root  perspective + perspective-origin   the EYE, fixed to the frame
  //   #cam   transform-style: preserve-3d       the RIG, standing inside the eye's space
  //   layer  rotate: <axis> <deg>               tilt, unchanged (core/fx/tilt.js)
  //   layer  translate: 0 0 <z>px               depth, which plane the layer stands on (core/fx/plane.js)
  //
  // Every layer rotation now composes with the rig's own transform in ONE 3D space, projected once. A
  // pan becomes a TRUCK past the subject, `s` becomes a real dolly, and the vanishing point stays nailed
  // to the frame while the world crosses it.
  // KNOWN INTERACTION, named because it is invisible until it bites. `opacity < 1`, `filter` and a clip
  // are GROUPING properties: they flatten the element they sit on, 3D context and all. A cut writes
  // exactly those, onto `#cam` (whole-frame) or onto a beat wrapper (`sceneUnits`), which is where the
  // rig lives. So for the few frames a fading or blurring cut is mid-flight, a tilted frame loses its
  // depth and pops back. It is steady-state-safe (the identity reset writes `none`/`1`), and no shipped
  // scene both tilts and cuts. Pair depth with a cut that only TRANSLATES, or accept the pop. The fix,
  // when a film needs both, is to split the rig onto an element of its own between `#cam` and the
  // layers, so the cut and the camera stop sharing a node.
  const topFx = (name) => layers.slice(0, topCount)
    .map(({ L }) => specsOf(L).find((f) => f.name === name)).filter(Boolean);
  const tiltFx = topFx('tilt');
  // A DEPTH turns the rig on for the same reason an angle does, and the reason is worth stating: without
  // the rig `translate: 0 0 z` lands in a flat parent, is projected by no lens, and moves the layer by
  // exactly zero pixels, input accepted and then ignored. core/fx/plane.js refuses that case rather than
  // rendering it, so this is what keeps a depth from ever reaching it.
  //
  // A KEYED `z`/`rotX`/`rotY` is the SAME failure mode one level down: core/tracks/motion.js writes
  // `translateZ`/`rotateX`/`rotateY` for a layer whose track authors any of the three, and under a flat
  // parent those land with no lens to project through and no eye to tilt the picture toward, moving or
  // turning the layer by exactly zero pixels. Unlike `plane`/`tilt`, `motion` is not a top-level-only fx
  // (a group child keys its own track too), so this scans every layer this scene ever built, not just
  // the top ones `topFx` narrows to.
  const has3DMotion = layers.some(({ L }) => Array.isArray(L.motion)
    && L.motion.some((k) => k && (k.z != null || k.rotX != null || k.rotY != null)));
  const RIG = tiltFx.length > 0 || topFx('plane').length > 0 || has3DMotion
    || camKf.some((k) => Math.abs(k.rx || 0) > 1e-3 || Math.abs(k.ry || 0) > 1e-3 || Math.abs(k.roll || 0) > 1e-3);
  // THE LENS HAS ONE OWNER. `tilt.dist` and the camera's `p` are the same focal distance, and under the
  // rig only one of them can be on the stage, so a scene that states both is refused with both values
  // named, rather than one of them silently losing. Without a camera `p`, a top-level tilt's `dist` IS
  // the lens, which is what keeps `dist` meaningful instead of quietly ignored.
  const tiltDists = [...new Set(tiltFx.map((f) => f.spec && f.spec.dist).filter((d) => d != null))];
  if (RIG && tiltDists.length > 1)
    throw new Error(`tilt: top-level layers asked for different camera distances (${tiltDists.join(', ')}px). `
      + `One frame is one lens, give them the same \`dist\`, or set it once as the camera's \`p\`.`);
  if (RIG && tiltDists.length && camKf.some((k) => k.p != null))
    throw new Error(`the camera declares a lens (\`p\`) and a tilted layer declares another (\`dist\`: ${tiltDists[0]}px). `
      + `Under a moving camera the lens belongs to the camera: drop \`dist\` and keep \`p\`.`);
  // A LENS RAMP WITH NOTHING OFF THE PICTURE PLANE IS A MOVE THAT CANNOT EXIST. `p` only reaches the
  // frame under the rig, and the rig turns on for a tilt, a `plane` depth or a camera angle, never for
  // `p` alone. Turning it on here would not help: at z = 0 the magnification is `s` whatever the lens
  // says, so every layer would project identically and the author would watch a still frame with
  // nothing to tell them why. That is dollyZoom's one failure mode, and it is the engine's cardinal sin
  // (input accepted, then ignored), so it is named instead of drawn.
  if (!RIG && new Set(camKf.map((k) => k.p).filter((v) => v != null)).size > 1)
    throw new Error(`the camera ramps its lens (\`p\`) but nothing in this frame stands off the picture `
      + `plane, so there is no depth for the lens to counter-scale and every layer would project at `
      + `exactly \`s\`. Give the layers behind the subject a depth, "modifiers": [{ "plane": -800 }], `
      + `or drop the \`p\` keys.`);
  const rigLens = tiltDists.length ? tiltDists[0] : null;   // null → the camera's own `p` (keyable)
  // …and the vanishing point the same way. `tilt.origin` is where the eye sits IN THE FRAME, which under
  // the rig is a property of the stage rather than of any one layer's parent. Resolved here so an
  // authored origin still lands instead of being quietly overwritten by the rig's default centre.
  const tiltOrigins = [...new Set(tiltFx.map((f) => f.spec && f.spec.origin)
    .filter((o) => Array.isArray(o)).map((o) => `${o[0]}px ${o[1]}px`))];
  if (RIG && tiltOrigins.length > 1)
    throw new Error(`tilt: top-level layers asked for different camera origins (${tiltOrigins.join(' and ')}). `
      + `One frame is one vanishing point.`);
  // The identity camera. Under the rig `scene.camera` is always a value, because a tilted scene with no
  // camera keyframes still HAS a camera (one standing still at the default distance) and a modifier
  // asking where it is should not have to tell "no keyframes" apart from "at the origin".
  const CAM_REST = { s: 1, x: 0, y: 0, rx: 0, ry: 0, roll: 0, persp: 1600 };
  if (RIG) {
    $('root').style.perspectiveOrigin = tiltOrigins[0] || '50% 50%';
    cam.style.transformStyle = 'preserve-3d';
    // a beat wrapper sits BETWEEN the rig and its layers, and `transform-style: flat` is the default on
    // every element, so without this the whole 3D context dies one level down (spike-3d.mjs, case H).
    for (const w of beatWrap) w.style.transformStyle = 'preserve-3d';
  }

  // ---- SEAMS: two-scene shader transitions (core/timeline/seams.js) ----
  // [{t, fx, dur, dir?, seed?, intensity?, feather?}]. `dir` is a cardinal name or a number of
  // degrees; `feather` (0..0.2) is an edge-softness override, per-fx default when absent. The two
  // beats either side of the boundary are
  // rasterised ONCE (bakeSeams, at build) into u_from/u_to; renderFrame only SAMPLES them, so
  // the whole thing stays pure in n. The compositor is created ONLY when a scene declares seams,
  // so a scene without them adds no DOM and renders byte-identical to before.
  // timing shapes how progress 0→1 evolves across the seam (core/cuts.js TIMINGS, shared with
  // scene cuts). Default `smooth` (ease-in-out). A transition that MOVES content reads mechanical
  // at constant speed; ease-in-out gives it the accelerate-then-settle velocity (MOTION-CRAFT:
  // "never linear on visible moves"). `linear` is opt-in for a deliberately constant sweep. An
  // unknown timing is rejected loudly, not silently coerced (MISTAKES: silent substitution).
  const seams = (data.seams || [])
    .map((s) => {
      if (s.timing != null && !CUT_TIMINGS[s.timing])
        throw new Error(`unknown seam timing "${s.timing}" at t=${s.t}, known: ${Object.keys(CUT_TIMINGS).join(', ')}`);
      // `SEAM_FX.includes(s.fx) ? s.fx : 'fade'` until now, a silent swap at a JUNCTION, two lines
      // below a guard that already throws on an unknown seam TIMING. One half of the same object was
      // checked and the other was not. docs/MISTAKES.md #361.
      if (s.fx != null && !SEAM_FX.includes(s.fx))
        throw new Error(`unknown seam fx "${s.fx}" at t=${s.t}, one of: ${SEAM_FX.join(', ')}`);
      return { t: +s.t, fx: s.fx ?? 'fade', dur: +(s.dur ?? 0.5),
        dir: s.dir, seed: s.seed ?? 0, intensity: s.intensity ?? 1, feather: s.feather,
        timing: s.timing || 'smooth',
        _from: null, _to: null, _fallback: false };
    })
    .filter((s) => s.dur > 0 && isFinite(s.t))
    .sort((a, b) => a.t - b.t);
  const seamCompositor = seams.length ? createSeamCompositor($('root'), W, H) : null;

  // THE FILM'S JOINTS, as one sorted list of { t, kind }. The last piece of the scene view, built
  // here because it is the first point at which cuts, stings and seams all exist. Nothing exposed
  // where a film TURNS, so an effect could not fire on one: a punch on every cut had to be authored as
  // a hand-copied list of times that silently rots the moment a cut moves. Read by core/fx/punch.js.
  //
  // No `beat` kind, and that is not an omission: a beat boundary in this engine IS a cut time
  // (beatBounds is built from sceneCuts), so a second name for the same instant would let an author
  // write `on:"beat"`, get exactly `on:"cut"`, and believe the two differ.
  const MARKS = Object.freeze([
    ...sceneCuts.map((c) => ({ t: +c.t, kind: 'cut' })),
    ...seams.map((s) => ({ t: s.t, kind: 'seam' })),
    ...stings.map((s) => ({ t: +s.t, kind: 'sting' })),
  ].filter((m) => Number.isFinite(m.t)).sort((a, b) => a.t - b.t).map(Object.freeze));

  // THE FIELD RIDES THE CUT. A real transition at a joint (any entry in `sceneCuts`; style:"none" is
  // filtered out above) is the one moment the viewer is guaranteed to be looking, and a bg window that
  // switches HARD there while the content dissolves is a world that snaps while the foreground glides.
  // `bgCutAt(t)` names the cut straddling t, if any; drawBg below cross-dissolves the window either
  // side of it on that SAME curve and duration, so both readings of "a joint" (an explicit `from`/`to`
  // that happens to land on a cut time, and a window bound to the joint by bindWindowsToJunctions with
  // no from/to of its own) behave alike: both are just two windows meeting at the cut's `t`.
  // The window itself differs by mode, and this mirrors that rather than inventing a third: sceneUnits
  // swaps the two beat wrappers over [ct, ct+dur) (driveSceneUnits below, default 0.4); the plain
  // camera-level cut is CENTRED on ct, [ct-dur/2, ct+dur/2) (drawCameraAndCut below, default 0.36). A
  // bg blend on the wrong window would drift out of sync with the transition the viewer is watching.
  // p is not just the eased TIMING curve: a presentation shapes its OWN opacity on top of it
  // (`punch`'s exit is `1 - T(raw)^2`, `fade`'s is linear in `T(raw)`), so a bg blend driven by
  // T(raw) alone drifted from what the wrapper actually shows, worst on the shaped presentations
  // (seam-forensics "split seam ... jumps 2.7 ... while the transition is still dissolving the
  // layers on top of it", a punch cut). `cutStyle` IS the wrapper's own function (driveSceneUnits
  // below calls it with these same args), so asking it for the incoming beat's OWN opacity at this
  // progress reads its exact curve instead of re-deriving an approximation of it a second time. A
  // presentation that reveals through a MASK rather than opacity (wipe/iris/blinds/…) holds opacity
  // at '1' throughout, which would read as "already fully in": those fall back to the eased timing,
  // a reasonable dissolve in place of a shape this canvas cannot draw a clip-path reveal of anyway.
  const bgCutAt = (t) => {
    for (const cu of sceneCuts) {
      const ct = +cu.t;
      const from = sceneUnits ? ct : ct - (cu.dur ?? 0.36) / 2;
      const dur = sceneUnits ? (cu.dur ?? 0.4) : (cu.dur ?? 0.36);
      if (t >= from && t < from + dur) {
        const raw = clamp01((t - from) / dur);
        const T = cu.timing == null ? CUT_TIMINGS.smooth : CUT_TIMINGS[cu.timing];
        let p = T(raw);
        if (sceneUnits) {
          const opts = { timing: cu.timing, dir: cu.dir, dist: cu.dist ?? W, cx: cu.cx, cy: cu.cy };
          // The OUTGOING wrapper's own exit opacity is the signal: as it clears (fades toward 0),
          // more of the field behind it is what the viewer is actually seeing change, so the bg
          // reveals the incoming window at the complement of that same curve. `enter`'s opacity was
          // tried first and read WORSE (a punch's enter ramps `clamp01(p*1.5)`, reaching full before
          // its own exit has cleared, so the bg would have switched while the outgoing card was
          // still half-visible on top of it).
          const exitStyle = cutStyle(cu.style, { exit: raw, enter: 1 }, opts);
          const masked = exitStyle.clipPath !== 'none' || exitStyle.maskImage !== 'none';
          if (!masked && exitStyle.opacity != null) p = clamp01(1 - parseFloat(exitStyle.opacity));
        }
        return { ct: from, dur, p };
      }
    }
    return null;
  };
  // Off-screen scratch for the INCOMING side of a bg cross-dissolve, built lazily (most scenes never
  // blend a bg) and sized once: `renderBg` clears-then-paints its target, so painting both sides onto
  // the same canvas would erase the outgoing side the instant the incoming side starts drawing.
  let bgBlendCv = null;
  // drawBg: the theme bg on canvas (last matching window wins outside a transition). A hand-authored
  // (`html`) window paints in the DOM instead, so the canvas is hidden for its span; a hand-authored
  // window on either side of a cut cannot be blended here (the canvas cannot read lightness or pixels
  // out of somebody's CSS), so that case keeps the hard switch.
  //
  // NO DEFAULT ZOOM. This used to hardcode `scale(1.05 + 0.02*sin(t*0.35))` on every frame of every
  // film: a permanent 5% overscan plus a slow pulse nobody authored. Checked before removing it:
  // `renderBg` (core/backgrounds/index.js) clears then repaints the FULL `w`x`h` canvas every call, and
  // every fx in core/backgrounds/fx.js draws within (or wrapping around, for `particles`) those same
  // bounds, so the canvas never has an unpainted margin for a 5% overscan to hide. There is no edge
  // artifact here to compensate for; the zoom was invented motion, like the idle default it shipped
  // beside. Removed outright, not shrunk to a smaller constant.
  function drawBg(t) {
    if (!bgWins.length || ALPHA) return; // alpha export: no backdrop, so unpainted pixels stay transparent
    const cut = bgCutAt(t);
    const before = cut ? bgWinAt(cut.ct - 1e-4) : null;
    const after = cut ? bgWinAt(cut.ct + cut.dur + 1e-4) : null;
    const blending = !!(before && after && before !== after && before.spec && after.spec);
    const w = blending ? after : bgWinAt(t);
    const authored = bgHtml ? bgHtml.frame(t, w, duration) : false;
    cv.style.display = authored ? 'none' : '';
    // CLEAR IT, do not just hide it. Returning early left the canvas holding the last frame it painted,
    // so its pixels were a function of WHICH FRAME RENDERED BEFORE THIS ONE, the one thing renderFrame(n)
    // promises they are not. Invisible today, because the element is display:none while an authored
    // backdrop owns the frame; not invisible to the determinism net, which quarantined `refstudy` for it
    // and therefore left that scene with no regression baseline at all. And latent: the day anything
    // cross-fades a preset window into an html one, those stale pixels become visible.
    if (authored) { ctx.clearRect(0, 0, W, H); return; }
    if (blending) {
      const p = cut.p;
      renderBg(ctx, W, H, t, before.spec);       // the outgoing field, opaque, on the real canvas
      if (!bgBlendCv) { bgBlendCv = document.createElement('canvas'); bgBlendCv.width = W; bgBlendCv.height = H; }
      renderBg(bgBlendCv.getContext('2d'), W, H, t, after.spec); // the incoming field, off-screen
      ctx.save(); ctx.globalAlpha = p; ctx.drawImage(bgBlendCv, 0, 0); ctx.restore();
    } else {
      renderBg(ctx, W, H, t, w.spec);
    }
    // `bg[].breathe`: authorable, default off (see the field's own comment above). Reset to identity
    // when the active window does not ask for it, so a breathing window handing off to a still one
    // does not leave its last scale stuck on the canvas.
    const br = w && w.breathe;
    cv.style.transform = br
      ? `scale(${(1 + (br.amp ?? 0.02) * Math.sin((t / (br.period ?? 18)) * Math.PI * 2)).toFixed(4)})`
      : '';
  }

  // THE PER-FRAME PIPELINE is core/tracks/: everything a single layer does at time t, including its
  // primitive's own frame(), as one file per job with a declared slot in a single ordered list. It
  // used to be this function: nine statements whose sequence WAS the composition order, so adding any
  // cross-cutting per-frame behaviour meant editing the right paragraph of a 940-line file and the
  // order lived only in the reader's memory of having scrolled past it.
  // `data.idle` is the film's scene-level idle: one line opts the whole cast into ambient hold motion
  // (core/engine/idle.js). Normalized HERE so a misspelled name fails at boot with the registry's message,
  // rather than on whichever frame the first layer happens to reach its settled middle.
  const trackKit = createTrackKit({ renderer, theme, M, fps, idle: normalizeIdle(sceneIdle),
    shutter: resolveShutter(data.shutter), cameraBlur: resolveCameraBlur(data.cameraBlur) });

  function renderFrame(f) {
    const t = f / fps;
    drawBg(t);
    driveClips(CLIPS, t); // declarative clip timing + enter/exit + z-order
    driveSceneUnits(t); // move whole-beat wrappers across a cut (sceneUnits), no-op otherwise
    // EVERY exposed value for this frame, before ANY layer's frame() runs, see resolveExposed. Run
    // BEFORE resolveBoxes: a `cursor` layer's box folds in its own exposed path offset (see
    // resolveBoxes), and that value must already exist when resolveBoxes reads it. Safe because
    // expose() never receives a live `scene` (core/layers/index.js hands it null on purpose), so
    // nothing exposed here could have depended on a box in the first place.
    resolveExposed(t);
    // EVERY box for this frame, same rule, same reason: see resolveBoxes.
    resolveBoxes(t);
    // The camera is sampled ONCE and both consumers read that value: the view a layer sees and the
    // transform drawCameraAndCut writes cannot disagree about where the camera is on this frame.
    // `rig` and `lens` ride on the camera because a modifier asking about the frame's depth is asking
    // about the CAMERA, and core/fx/tilt.js reads exactly this to know whether the lens is already on
    // the stage or whether it has to put one on its own parent.
    const keyed = CAM_FOLLOW ? followCameraAt(CAM_FOLLOW) : cameraAt(camKf, t);
    const camNow = RIG
      ? { ...CAM_REST, ...keyed, rig: true, lens: rigLens ?? (keyed || CAM_REST).persp }
      : keyed;
    // THE CAMERA'S VELOCITY, sampled ONCE PER FRAME and not once per layer. Every layer needs the same
    // number, so re-deriving it per layer would evaluate the camera track fifty times for one answer,
    // which is the fact-with-many-owners shape this repo logs most. Attached to the camera the view
    // already carries, so the motion track reads the camera's speed off the camera.
    if (camNow) camNow.vel = CAM_FOLLOW ? followVelocityAt(CAM_FOLLOW, t, 1 / fps) : cameraVelocityAt(camKf, t, 1 / fps);
    // THE CLOCK. A layer was handed t and nothing to measure it against, so "how far through the film
    // am I" could only be answered by the author restating the runtime inside the layer, a second
    // copy of a number the scene already owns, which stops being true the moment the film is re-cut.
    // `frame` is the INTEGER frame, and it is here rather than left to `t * fps` because that product
    // re-derives a number f/fps already lost precision from: an event on frame 60 tested as t >= 2.0
    // lands on the wrong side of the boundary for some fps. core/fx/punch.js compares frames for that
    // reason; core/fx/progress.js reads t and duration.
    const clock = Object.freeze({ t, frame: f, fps, duration });
    const view = Object.freeze({ boxOf, exposedOf, specOf, ids: IDS, light: LIGHT, camera: camNow,
      canvas: CANVAS, safe: SAFE, clock, theme: THEME, bg: bgAt(t), marks: MARKS });
    // A layer carrying `step` runs its whole track pipeline on a QUANTISED clock: same seconds, held
    // for the whole step, so the layer updates 15 times a second inside a 30fps film. Pure, because the
    // quantised time is a function of t alone (core/motion/motion.js stepClock), and the entrance half of the
    // same layer is stepped identically inside clipStyleAt.
    for (const { L, el, units } of layers) {
      const rawT = L.step != null ? stepClock(t, L.step, L.start ?? 0) : t;
      // FREEZE THE PRIMITIVE'S OWN CLOCK AT ITS AUTHORED LIFE. The beat wrapper can stretch a current
      // layer's VISIBILITY past its own end (setLayerTiming's data-duration rewrite, so it survives to
      // the cut instead of fading early), but a primitive's frame() was never told about that stretch;
      // it still measures against `L.start`/`L.duration`, the authored numbers. Handed a `t` past its
      // own end, a primitive that stops driving there (the shared "if (!(t>=start&&t<end)) return"
      // guard, e.g. `cursor.js`) leaves whatever the LAST thing to touch the element wrote, which is
      // `driveClips`'s resting transform, i.e. the origin: the cursor at (0,0), not held in place. So
      // clock ownership is the layer's own, always: never hand a primitive a `t` beyond what it was
      // authored for, and it holds its last real pose by construction instead of by each primitive
      // remembering to (MISTAKES: the demo film's cursor at 6.9-7.2s).
      const ownEnd = L.duration != null ? (L.start ?? 0) + L.duration : Infinity;
      const lt = Number.isFinite(ownEnd) ? Math.min(rawT, ownEnd - EPS) : rawT;
      runTracks(trackKit, el, L, units, lt, L.step != null ? Math.round(lt * fps) : f, view);
    }
    // GROUP 3D OPACITY/FILTER PUSH-DOWN: see "GROUP 3D" at build, and applyGroup3DOpacityAdapt below.
    applyGroup3DOpacityAdapt(GROUP_3D_OPACITY_ADAPT, loggedGroup3DOpacity);
    drawCaptions(t);
    drawCameraAndCut(t, camNow);
    drawStings(t);
    drawSeams(t);
    seekAll(t); // drive any registered/WAAPI paused timelines (adapter interface)
  }

  // drawCaptions: show the caption whose window contains t. `captionStyle` layers a word-timed
  // treatment on the pop layout. DOM is rebuilt only when the LINE changes (the memo key is a pure
  // function of t), then every style prop is rewritten every frame (authoritative writes), so a cold
  // seek renders byte-identical to a warm one.
  function drawCaptions(t) {
    const cap = caps.find((c) => t >= c.t0 && t < c.t1);
    const capEl = $('cap');
    capEl.className = 'hs-cap ' + (capStyle ? 'styled ' + capStyle
      : capMode === 'word' ? 'word' : capMode === 'pop' ? 'pop' : '');
    if (cap) {
      // The windows are recomputed every frame rather than cached on the element. capUnitWins is
      // pure and a caption is a handful of units, and `mode:"one"` needs to know which unit is
      // active BEFORE deciding whether the DOM has to change, which a cache written by the DOM
      // rebuild cannot answer without a cycle.
      const shape = capStyle ? capShape(capStyle) : null;
      const wins = capStyle ? capUnitWins(cap, shape.unit || 'word') : null;
      const one = shape && shape.mode === 'one';
      const activeIdx = wins ? wins.findIndex((w) => t >= w.t0 && t < w.t1) : -1;
      // A one-word style changes its DOM at every ONSET, not only at every line, so the memo key
      // carries the active index. It is still a pure function of t, which is the only property
      // that matters here: the same frame number rebuilds the same DOM whatever order frames run in.
      const key = cap.t0 + '|' + cap.text + (one ? '|' + activeIdx : '');
      if (capEl.__key !== key) {
        capEl.__key = key;
        if (capStyle === 'clipWipe') {
          capEl.innerHTML = `<div class="cw base">${cap.text}</div><div class="cw over">${cap.text}</div>`;
          capEl.__units = null;
        } else if (one) {
          // ONE WORD, built directly rather than split out of the line: the other words are not in
          // the DOM at all, so there is nothing to hide. The word comes from the window, which is
          // the MARKUP-STRIPPED text, so a `<b>` around a single word is lost in this mode. That is
          // the honest trade for a mode whose whole point is that the line is not on screen.
          const w = wins[activeIdx < 0 ? 0 : activeIdx];
          const s = document.createElement('span');
          s.className = 'ku'; s.style.display = 'inline-block'; s.textContent = w ? w.w : '';
          capEl.replaceChildren(s);
          capEl.__units = [s];
        } else if (capStyle) {
          capEl.innerHTML = cap.text;
          capEl.__units = splitText(capEl, shape.unit || 'word'); // the kinetic splitter (core/type/type.js)
          // EMPHASIS, MARKED ONCE AT BUILD. `<b>`/`<em>` around a word is the author saying "this is
          // the one that matters", scene.css has painted it with the accent since captions existed,
          // and eight of the eleven styles silently ate it: splitText preserves the <b> element and
          // wraps the words INSIDE it, then the per-word style writes `color` inline on that inner
          // span, and an inline value on the child beats a rule on the parent every time. So the
          // markup was accepted, rendered, and had no effect, which is the silent-substitution shape
          // this repo logs more than any other. Whether a unit is emphasised is a fact about the DOM
          // and not about t, so it is read once here rather than 30 times a second.
          for (const u of capEl.__units) u.__em = !!u.closest('b, strong, em, i');
        } else { capEl.innerHTML = cap.text; capEl.__units = null; }
      }
      capEl.__wins = one && wins ? [wins[activeIdx < 0 ? 0 : activeIdx]] : wins;
      // PLACEMENT, WRITTEN EVERY FRAME. core/engine/boot.js has already resolved this caption's pin / edge
      // keywords / "50%" strings to px against the safe box, so all that is left is to emit them.
      // Every one of the six is assigned on every frame even when the caption places nothing, because
      // the alternative is a caption inheriting the position of whichever caption the tab happened to
      // draw before it. That is the same class of bug as #370: a frame that is a function of n AND of
      // the highest n this tab has drawn. An empty string hands the property back to scene.css, which
      // is where the defaults live, so a film that places nothing renders exactly as it did.
      const px = (v) => (v == null ? '' : `${Math.round(v)}px`);
      capEl.style.left = px(cap.x);
      capEl.style.top = px(cap.y);
      capEl.style.right = cap.x == null ? '' : 'auto';   // scene.css pins BOTH edges; an x with a live
      capEl.style.bottom = cap.y == null ? '' : 'auto';  // right is a box, not a position.
      capEl.style.width = px(cap.w);
      capEl.style.textAlign = cap.align || '';
      capEl.style.fontSize = cap.size ? `${Math.round(cap.size)}px` : '';

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
          const u = wordU(t, win), on = t >= win.t0 && t < win.t1;
          const st = CAP_STYLES[capStyle](u, on);
          // An emphasised word takes the accent WHEN IT ARRIVES, not before. Painting it accent
          // while it is still upcoming makes the emphasis the first thing read, which is the
          // opposite of emphasis: the point of a marked word is that it lands. Before its window it
          // keeps whatever dimmed treatment the style gives every other upcoming word.
          // Full accent rather than a mix of it, because the mixes are computed against `--text` and
          // a second ramp mixed the same way is a contrast claim nobody has checked.
          Object.assign(el.style, el.__em && (on || u > 0) ? { ...st, color: 'var(--accent)' } : st);
          // `scramble` is the one style whose work is not a style value: the letters settle out of
          // noise, which means rewriting textContent, and the contract is Object.assign on .style.
          // Same carve-out clipWipe already has, and the same reason. decodeText is pure in (u, i)
          // and caches the final string on the element, so a cold seek lands on the same glyphs.
          if (capStyle === 'scramble') decodeText(el, u, i);
        });
      }
    } else { capEl.style.opacity = '0'; capEl.__key = null; }
  }

  // drawCameraAndCut: the global camera transform, plus any SCENE CUT (a transition between beats
  // applied to the camera root so the whole beat moves as one). cutStyle ALWAYS returns the full
  // style set (identity in steady state) so a cut property can never stick into a later frame,
  // whatever order frames render in. See MISTAKES #29 (the top-level `cuts` array was once inert).
  function drawCameraAndCut(t, c) {
    // THE RIG. The translate is written LAST in the list, so it is applied to points AFTER the
    // orientation: x/y stay a screen-space slide and the dolly runs along the camera's own view axis
    // rather than along the world's. The lens is re-stated every frame because `p` is keyable, and a
    // dolly-zoom is exactly the shot where the camera moves and the lens changes together.
    let camTf = '';
    if (c && c.rig) {
      $('root').style.perspective = `${c.lens.toFixed(0)}px`;
      camTf = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, ${dollyZ(c.s, c.lens).toFixed(2)}px) `
        + `rotateZ(${c.roll.toFixed(3)}deg) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg)`;
    } else if (c) {
      // FLAT: nothing in this frame leaves the canvas plane, so the projection IS this affine map.
      camTf = `scale(${c.s.toFixed(4)}) translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)`;
    }
    let cutS = null;
    // sceneUnits mode drives the transition on the per-beat WRAPPERS (driveSceneUnits), not the whole
    // cam, so skip the cam-level cut entirely and let the wrappers swap the two beats as units.
    if (!sceneUnits) for (const cu of sceneCuts) {
      const half = (cu.dur ?? 0.36) / 2, ct = +cu.t;   // `dur` is the TOTAL window, split around t
      if (t <= ct - half || t >= ct + half) continue;
      const o = { timing: cu.timing, dir: cu.dir, dist: cu.dist, cx: cu.cx, cy: cu.cy };
      // SOLO: one root carries the whole frame, so exit-then-enter must not touch opacity/clip/mask.
      // Sequencing those two halves on a single element blanks the frame at the midpoint. soloCutStyle
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

  // driveSceneUnits, move each BEAT WRAPPER as one unit across a cut boundary: the outgoing beat plays
  // the cut's EXIT, the incoming beat its ENTER, using the same cutStyle vocabulary. A real A-out/B-in
  // scene swap (vs the cam-level bump). Pure in t (cutStyle is closed-form). No-op unless sceneUnits.
  function driveSceneUnits(t) {
    if (!sceneUnits) return;
    // steady state: identity + fully visible (each beat's own layers handle their in-window visibility)
    // Reset from CUT_IDENT, never from a hand-listed subset. This line used to name four channels and
    // cutStyle writes ten, so a `softwipe`/`blinds`/`softiris` cut left its MASK on the wrapper for
    // every later frame: the beat rendered correctly on a forward play and wrongly on a seek, which is
    // the exact purity contract renderFrame(n) exists to keep.
    for (const w of beatWrap) Object.assign(w.style, CUT_IDENT);
    for (let k = 0; k < sceneCuts.length; k++) {
      // window runs [ct, ct+dur]: the cut time is when the SWAP STARTS. The incoming beat's own layers
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

  // drawStings: the WebGL shader stings (single-scene boundary FX), each spanning its dur centered on t.
  function drawStings(t) {
    let drew = false;
    for (const s of stings) {
      const d = s.dur ?? 1.0;
      const p = (t - (s.t - d / 2)) / d;
      if (p > 0 && p < 1) { fxo.draw(s.fx, p, s.seed ?? 0, s._tint, s._intensity, s._pal); drew = true; }
    }
    if (!drew) fxo.clear();
  }

  // drawSeams: inside a seam window [t, t+dur] the compositor blends the two BAKED beats over the
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
        seamCompositor.draw(fx, p, s._from, s._to, { dir: s.dir, seed: s.seed, intensity: s.intensity, feather: s.feather });
      } else {
        seamCompositor.clear(); // never baked (e.g. bake threw) → show the live stage, no dip
      }
      inSeam = true; break;
    }
    if (!inSeam) seamCompositor.clear();
  }

  // bakeSeams(): rasterise the OUTGOING beat (frame just before the window) and the INCOMING beat
  // (frame just after it) for every seam, into static textures. Runs ONCE, awaited in boot before
  // the render loop, impure (async raster) is fine here; the per-frame path only samples the
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
  // buildSfx: derive SFX cues deterministically from the scene's own cuts/stings/seams (when
  // audio:{auto:true}), plus author-placed cues and the per-keystroke click train. Pure: cue times
  // are a function of the JSON, so the mix is reproducible; it does NOT touch renderFrame, so frames
  // stay byte-identical (audio is a separate track). `auto` gates only the DERIVED cues, author
  // cues and keystrokes always fire (MISTAKES #70, where `auto` used to gate everything).
  // An explicit `null` in CUT_CUE means SILENCE and must survive the fallback; only a MISSING key
  // (a presentation nobody has voiced yet) falls back, and lib-test now fails when one exists.
  const cutCue = (style) => {
    const v = CUT_CUE[style];
    return v === null ? null : (v || 'whoosh');
  };
  // How many elements a `parts` selector matched. The ONE fact core/audio-tactile.js cannot read off
  // the JSON, because only the built DOM knows it. Deterministic: the markup is static.
  const partCount = (el, sel) => { try { return el.querySelectorAll(sel).length; } catch { return 0; } };
  const withPartCounts = ({ L, el }) => (Array.isArray(L.parts) && L.parts.length
    ? { ...L, parts: L.parts.map((p) => ({ ...p, count: partCount(el, p.select) })) } : L);
  // TOP-LEVEL layers, plus the group children that declare a `delay`. A group is ONE object and it
  // lands once: voicing its six children as six arrivals at the identical instant is the hailstorm
  // core/audio-tactile.js exists to avoid. A child with a delay is different, it is a declared
  // stagger, the same rhythm argument as `parts`, so it keeps its own cue.
  const tactileLayers = () => layers.slice(0, topCount)
    .concat(layers.slice(topCount).filter(({ L }) => +L.delay > 0)).map(withPartCounts);
  function buildSfx() {
    let sfx = [];
    const audioCfg = data.audio || {};
    // Joint-cue derivation is ON BY DEFAULT: `audio.auto` opts OUT with an explicit `false`, not in
    // with an explicit `true`. Four in five films shipped silent because the mechanism existed and
    // nobody flipped the flag; the mechanism was proven (27 films already set it), the flag was the
    // gap. Author-placed `audio.cues` still win over a derived cue at the same joint (unchanged,
    // below), and a cut mapped to `none` in CUT_CUE stays silence, so opting out of nothing new is
    // free. `tactile` still IMPLIES it: motion cues without the cuts under them would be a film that
    // thuds and plucks through junctions it never marks.
    const auto = audioCfg.auto !== false || !!audioCfg.tactile;
    // CUT_CUE (cut style -> cue) and SEAM_CUE (seam fx -> cue) come from /core/audio-cues.js, one
    // shared source of truth, so the render mix and the baked catalogue cannot drift.
    const cues = [];
    if (auto) for (const { L } of layers) if (L.cut && L.cut !== 'none') cues.push({ t: +(L.start ?? 0).toFixed(2), name: cutCue(L.cut) });
    // TOP-LEVEL cuts / seams were once silently dropped from sound design, they are how a scene
    // actually cuts between beats, so an auto-scored film came out with no transition sound at all.
    if (auto) for (const c of (data.cuts || [])) if (c && c.style !== 'none') cues.push({ t: +(+c.t).toFixed(2), name: cutCue(c.style) });
    if (auto) for (const s of stings) cues.push({ t: +(+s.t).toFixed(2), name: 'reveal' });
    if (auto) for (const s of (data.seams || [])) if (s && s.fx && s.fx !== 'none') cues.push({ t: +(+(s.t ?? s.at ?? 0)).toFixed(2), name: SEAM_CUE[s.fx] || 'whoosh' });
    // author-placed cues always win: { audio: { cues: [{t, name, gain}] } }. `c._bakedName || c.name
    // || c.voice`: a voice cue with `params` was synthesised server-side and left its cache filename
    // in `_bakedName` (generators/media/voice-cue.mjs; never `name`, whose schema enum a generated
    // key can never join); a param-less voice names a role the static bake already ships
    // (assets/sfx/<voice>.wav) and resolves with no Node step at all.
    for (const c of ((data.audio && data.audio.cues) || [])) cues.push({ t: +(+c.t).toFixed(2), name: c._bakedName || c.name || c.voice, gain: c.gain });
    cues.sort((a, b) => a.t - b.t || (a.name < b.name ? -1 : 1));
    for (const c of cues) if (!sfx.length || c.t - sfx[sfx.length - 1].t > 0.09) sfx.push(c); // merge simultaneous
    // The STRUCTURAL cues, snapshotted before the keystroke train joins. Read by the tactile pass
    // below as the fixed points it must rank around. The keystrokes are deliberately NOT in it: a
    // typed line is legitimately dense and has its own tighter floor, so counting it as density
    // would silence every arrival that happens while anything is typing.
    const structural = sfx.slice();
    // KEYSTROKES. core/layers/text.js reveals character i at exactly start + (i+1)/cps, so the click
    // for that character is that same expression. The sound is derived from the formula that draws
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
    // A key train is legitimately dense, so it gets its own tighter floor, the 0.09 structural
    // merge above, applied to keystrokes, would silently drop every other letter at real typing speed.
    if (keyCues.length) {
      keyCues.sort((a, b) => a.t - b.t);
      const keys = [];
      for (const c of keyCues) if (!keys.length || c.t - keys[keys.length - 1].t > 0.03) keys.push(c);
      sfx = sfx.concat(keys).sort((a, b) => a.t - b.t);
    }
    // TACTILE SOUND DESIGN (`audio.tactile`). The film's own motion, voiced: core/audio-tactile.js
    // reads layer arrivals, camera moves, counters and `parts` staggers off the timeline the engine
    // already holds. It runs LAST and it is handed `structural`, the cut/seam/sting cues that just
    // survived the merge above, so its density rules can rank a card's arrival against the cut it
    // lands on. Those are passed for ranking only and come back untouched.
    // `parts[].count` is the one fact the JSON does not hold: only the DOM knows how many elements a
    // selector matched. Read once, off the elements this build just finished.
    if (audioCfg.tactile) {
      sfx = sfx.concat(tactileCues(
        { camera: camKf, spectacle: data.spectacle, duration, layers: tactileLayers() },
        { canvas: { w: W, h: H }, config: audioCfg.tactile, fixed: structural },
      )).sort((a, b) => a.t - b.t);
    }
    return sfx;
  }
  // Sound bridges resolve HERE because this is where the junctions are: `at:"cut@2"` is only
  // answerable next to MARKS. The result is spans of seconds, so the mixer never has to know what a
  // cut is (core/audio/bridges.js).
  return { fps, duration, stings: stings.map((s) => s.t), sfx: buildSfx(), beatSync: beatSyncNote,
    bridges: resolveBridges(data.audio, MARKS, duration), renderFrame, bakeSeams };
});
