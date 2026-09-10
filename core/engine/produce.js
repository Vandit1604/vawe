// core/produce.js, PRODUCE THE BASELINE. The engine's "go all-in" default: inject the universal produced
// motion into a scene that didn't specify it, so a film with cuts swaps its beats as whole scene-units
// by default. The another engine posture, forced at BUILD time.
//
// NO AUTO CAMERA. This pass used to inject a slowPush (s 1 -> 1.06) into every scene that declared no
// camera, so the frame "stayed alive". It fought text: a still headline zoomed the whole runtime, and
// `bg` (a REQUIRED, must-animate field) already keeps the frame alive without moving the subject. The
// doctrine is "move on purpose" (docs/CRAFT/TRANSITIONS.md): a push is an authored choice now, one line
// away (`cameraMove: {move:'slowPush', ...}`), not a default that resizes type nobody asked to move.
// ADDITIVE ONLY: it adds camera/sceneUnits fields; it NEVER rewrites a layer the author wrote (auto-
// splitting text for kinetic reveals mutated structure and broke motion-track layers + the contrast audit,
// so kinetic type is nudged by the direction floor instead, MISTAKES).
//
// The BACKGROUND is deliberately NOT here. It used to be injected (light brand → dotmatrix, dark → aurora),
// which meant the backdrop (the single largest area of the frame) was the one design decision no author
// ever made. `bg` is now a required field (core/validate.mjs); this pass supplies motion, not taste.
//
// Determinism: it only mutates the scene DATA once, before the first frame, renderFrame(n) stays pure.
// ABSENT-ONLY: an explicitly set field is the author's opt-out (set `sceneUnits` yourself to override).
// `"produced": false` disables the whole pass. Applies to the `scene` module only. Pure JS → runs in the
// browser AND in node gates, so the gates evaluate the SAME produced scene the renderer does.

import { buildCameraMove, followCamera } from '../camera-moves/index.js';
import { resolveCameraMove } from '../registry/vocab.js';
import { nearMisses } from '../registry/registry.js';
import { sceneDims } from '../layout/safe.js';
import { depthZ } from '../fx/plane.js';
import { inferCuts, chooseCutStyles } from '../timeline/junctions.js';
import { layerSpeedAt } from '../timeline/velocity-cut.js';
import { PRESENTATIONS as CUT_PRESENTATIONS } from '../cuts/presentations.js';
import { WARPABLE } from '../timeline/clips.js';
import { anticipateFromMotion } from '../motion/motion.js';
// Light-versus-dark is ONE question with ONE answer (core/motion.js isLightBg), in linear light.
// This file used to weight the gamma-encoded channels against 140/255, which agrees with the correct
// maths on every neutral and disagrees on 5.8% of the sRGB cube, all of it saturated.

// `look` (core/registry/theme-contract.js resolveLook): passed through from boot.js so a later phase
// can read the brand's own scale/layout/cuts/field defaults from the ONE place a scene's produced
// baseline is decided, instead of a second call site somewhere else. Nothing reads it yet: this phase
// only wires it through, phases 2-5 add the actual defaults inside this function.
// Same walk as harness/lib/layers.mjs flattenLayers, duplicated rather than imported because core/
// never imports scripts/ (a Node-tooling directory) and this pass must stay pure JS the browser can
// run. Parents before children, a non-object skipped rather than thrown on.
function flattenLayers(list, out = []) {
  for (const l of Array.isArray(list) ? list : []) {
    if (!l || typeof l !== 'object') continue;
    out.push(l);
    if (Array.isArray(l.children)) flattenLayers(l.children, out);
  }
  return out;
}

// resolveTextSize(value, scale, where) → a number. `size: "headline"` names a ROLE in `look.scale`
// (hook/headline/body/caption, core/registry/theme-contract.js LOOK_SCALE_KEYS) rather than a raw px
// count the author has to look up. Copies the refusal shape `resolveJunction`
// (core/timeline/junctions.js) already uses for "cut@1": an unknown name throws and names every role
// the theme actually defines, instead of silently landing on the hardcoded 96 the five `size ?? 96`
// sites in core/layers/text.js used to fall back to (a mistyped "headine" drew body-sized and no error
// said why). No new `role` field: the string already sitting in `size` IS the role.
export function resolveTextSize(value, scale, where = 'size') {
  if (value == null || typeof value === 'number') return value;
  if (typeof value !== 'string' || !scale || typeof scale[value] !== 'number') {
    const known = scale ? Object.keys(scale).filter((k) => typeof scale[k] === 'number') : [];
    throw new Error(`${where}: "${value}" is not a size role this theme's look.scale defines. Known `
      + `roles: ${known.length ? known.join(', ') : 'none (this theme carries no look.scale)'}.`);
  }
  return scale[value];
}

// bakeTextSizeRoles(data, look): lower every layer's `size: "<role>"` to the theme's real px number.
// Walks the WHOLE tree including group children (unlike flattenLayers above, which this file's other
// passes use top-level-only): a role written inside a group is still a role.
//
// CRITICAL ORDERING, and it is why this is a separate exported bake rather than a line inside
// produceBaseline: resolveCoords (core/engine/boot.js) reads `L.size` DIRECTLY to estimate a text
// layer's height for a bottom pin ("hEst"), and produceBaseline itself runs AFTER resolveCoords
// (boot.js calls resolveCoords then produceBaseline, in that order). A string size reaching that
// arithmetic becomes NaN with no error. boot.js calls this one line earlier, between resolving `look`
// and calling resolveCoords, the one gap the existing ordering leaves for it.
export function bakeTextSizeRoles(data, look) {
  const scale = look && look.scale;
  const walk = (ls) => { for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    if (typeof L.size === 'string') L.size = resolveTextSize(L.size, scale, `layer "${L.id || L.type || 'text'}" size`);
    walk(L.children);
  } };
  walk(data && data.layers);
  return data;
}

export function produceBaseline(data, theme, frame, look) {
  if (!data || typeof data !== 'object') return data;
  if (data.module && data.module !== 'scene') return data;   // scene module only
  if (data.produced === false) return bakeCameraMove(data, frame);  // opts out of the INJECTED baseline, not of
  // the author's own `cameraMove` sugar: that must still become real keys or it renders as nothing.
  // NOTE: the baseline no longer INJECTS a background. `bg` is a REQUIRED authoring field
  // (core/validate.mjs): the author must declare a preset or an explicit `plain`, so the backdrop is
  // always a deliberate choice, never a silent default that can be brand-wrong (the paperShapes lesson).

  // A scene that already choreographs layers with `motion` tracks is ALREADY directed, and its tracks often
  // span beats and use absolute times, which fight the injected camera and the beat-wrapper model. So the
  // DIRECTED injections (camera + sceneUnits) SKIP such a scene (a camera×motion / sceneUnits×motion
  // interaction produced non-deterministic garbage on motion-reel-v2, MISTAKES). The author can still opt in.
  const choreographed = (data.layers || []).some(function has(L) { return L && typeof L === 'object' && (Array.isArray(L.motion) && L.motion.length > 1 || (L.children || []).some(has)); });

  // INFERRED CUTS. 101 of 181 films ship with no joint at all: no cut, no seam, no transition. That one
  // fact suppresses four systems downstream that only fire when a film HAS a joint (sceneUnits below,
  // bindWindowsToJunctions, audio-bridge cues, shotWindows). ABSENT-ONLY and ADDITIVE, the same two
  // constraints MISTAKES #157 paid for: a film that already declares a cut, a seam, or motion tracks is
  // untouched, and one where inferCuts finds no boundary (a contact sheet, everything arriving at once)
  // gets none, which is the true answer for it. `look.cuts.default` supplies the fx name so the injected
  // cut still carries the brand's own cut personality rather than a hardcoded 'fade'.
  //
  // `sceneUnits: false`, WRITTEN BY THE AUTHOR, skips injection outright. A `fade` (or any other
  // fading/masking style) on a whole-frame cut with no scene-unit wrapper is refused at render
  // (formats/scene/scene.js: "transitions only by fading/masking, which a whole-frame cut cannot do"),
  // because there is nothing under the fade to cross into. sceneUnits below only fills an ABSENT field,
  // so an explicit `false` would survive untouched under a freshly-injected fading cut and turn what was
  // a clean render into a boot-time refusal. cadence-film.json is exactly this case in the library today
  // (sceneUnits:false, no joints): skipped, not force-converted to a moving style, because "false" is a
  // decision an author made and this pass does not get to overrule it.
  //
  // ORDER IS LOAD-BEARING: injection must run BEFORE the sceneUnits block below, so that block sees the
  // cuts just added and turns beat wrappers on for them in the SAME pass. Reorder the two and a freshly
  // cut film would hit the identical fading-cut refusal on its first render.
  if (data.sceneUnits !== false
      && !(Array.isArray(data.cuts) && data.cuts.length) && !(Array.isArray(data.seams) && data.seams.length)
      && !choreographed) {
    const flat = flattenLayers(data.layers);
    const boundaries = inferCuts(flat, data.duration);
    // CONTENT-AWARE, NOT CONTENT-BLIND. inferCuts only knows the GAP between beat starts; it says
    // nothing about what sits on either side. chooseCutStyles (core/timeline/junctions.js) reads the
    // relationship at each joint (a surviving layer, overlapping boxes, a medium/backdrop change, a
    // layer still moving) and RULES OUT what that relationship makes dishonest, choosing only among
    // what remains: the theme's own two named cuts (`look.cuts.default`/`accent`) or the doctrine's
    // hard-cut default. The engine narrows a set the theme already supplied; it never invents a name
    // into it, which is the whole distinction that keeps this from repeating MISTAKES #159 (the engine
    // once picked the BACKGROUND itself, and nobody ever designed one again).
    if (boundaries.length) {
      // A raw `cuts[].style` drives a whole-frame CUT presentation only (core/cuts/presentations.js);
      // `look.cuts.accent` is written for the richer `transitions[]` sugar and its DEFAULT value
      // (`cinematicZoom`) is a seam-only name that PRESENTATIONS does not carry at all, so offering it
      // here would inject a cut that throws at render on the very first film that earns the accent.
      // This is the same structural rule-out as a surviving layer or an overlapping box: a name that
      // is not mechanically usable as a raw cut is never in the compatible set, theme-picked or not.
      const defaultName = (look && look.cuts && look.cuts.default) || 'fade';
      const accentName = (look && look.cuts && look.cuts.accent) || 'cinematicZoom';
      const cutsLook = { default: CUT_PRESENTATIONS[defaultName] ? defaultName : 'fade' };
      if (CUT_PRESENTATIONS[accentName]) cutsLook.accent = accentName;
      data.cuts = chooseCutStyles(boundaries, flat, { cuts: cutsLook, bg: data.bg, layerSpeedAt })
        .map(({ t, style, reason }) => ({ t, style, _why: reason }));
    }
  }

  // SCENE-UNIT TRANSITIONS. A film WITH cuts that hasn't opted into unit transitions gets them, so the
  //    beats swap as whole units (the produced default). Skip choreographed scenes.
  if (Array.isArray(data.cuts) && data.cuts.length && data.sceneUnits == null && !choreographed) {
    data.sceneUnits = true;
  }

  // NOTE: kinetic headlines are NOT injected here. Auto-splitting an existing text layer MUTATES its
  // structure, which broke a layer carrying a `motion` track (non-determinism) and masked the audit's
  // weak-headline contrast check (it measures the whole layer, not per-word units). Structure-changing
  // baselines are unsafe to inject blindly; kinetic type is nudged by the direction floor (no-kinetic-type)
  // and authored per-headline instead. The baseline stays ADDITIVE (sceneUnits + baking authored sugar),
  // it never rewrites a layer the author already wrote.
  applyAnticipateDefault(data, theme);
  bakeCameraMove(data, frame);
  return data;
}

// applyAnticipateDefault(data, theme): ANTICIPATE, OPT-OUT NOT OPT-IN. docs/CRAFT/AFTER-EFFECTS-
// RECIPES.md #5 calls a wind-up before a directional entrance "the loudest missing principle in the
// engine" as long as it has to be typed. On every entrance that already carries travel (`WARPABLE`,
// core/timeline/clips.js, imported rather than re-listed: one fact, one owner) it becomes the reflex
// instead: a qualifying layer that names none gets `anticipate` added, amount DERIVED from the theme's
// own `bounce` (`anticipateFromMotion`, core/motion/motion.js) the same way `exitRatioFromMotion` reads
// `durationScale` above it, so a calm brand winds up less than a bouncy one instead of every theme
// getting one constant.
//
// STILL BY DEFAULT, KEPT: this reshapes the EASE CURVE of an entrance the author already wrote; it
// never sets an unmoving layer moving. `warpEase` is terminal at both ends (0 at u<=0, 1 at u>=1), so
// the resting pose a layer settles to is unchanged.
//
// TWO EXCLUSIONS, both named by the recipe doc's own caution ("wrong: anywhere the viewer is already
// looking, and on anything informational"):
//   - the FIRST WAVE (the earliest `start` in the flattened tree): the viewer is watching the frame
//     open, already looking there, so a wind-up would buy attention already held.
//   - `type: "count"`: a rolling number is read, not glanced at; the doc names counters by name.
// Split and cut layers are excluded outright: `formats/scene/scene.js` (setLayerTiming) THROWS if
// either carries an `anticipate`, because a split's rhythm and a cut's entrance are owned elsewhere.
//
// OPT-OUT via the same sentinel this file already uses for `produced`/`sceneUnits`: `anticipate: false`
// on a qualifying layer strips the field, rather than reaching scene.js, which validates it as a
// 0.01-0.6 fraction and would throw on `false`. Any OTHER authored value (including a real number) is
// the author's own choice and is left untouched (ABSENT-ONLY).
export function applyAnticipateDefault(data, theme) {
  const flat = flattenLayers(data.layers);
  if (!flat.length) return;
  const bounce = (theme && theme.motion && typeof theme.motion.bounce === 'number') ? theme.motion.bounce : 0;
  const amount = anticipateFromMotion(bounce);
  const starts = flat.map((L) => L.start ?? 0);
  const firstWave = Math.min(...starts);
  flat.forEach((L, i) => {
    if ('anticipate' in L) { if (L.anticipate === false) delete L.anticipate; return; }
    if (L.split || L.cut) return;
    if (L.type === 'count') return;
    if (starts[i] === firstWave) return;
    if (!WARPABLE.includes(L.anim)) return;
    L.anticipate = amount;
  });
}

// THE ONE FUNNEL. `cameraMove` is sugar; nothing at render time reads it (formats/scene/scene.js reads
// `data.camera`). It used to be resolved only by harness/author/expand-blocks.mjs, at AUTHOR time, so the
// baseline push produce.js injects at BOOT time, after expansion, was written and never once read: a static
// scene rendered identically at frame 2 and frame 170. Resolving it HERE, on the one path every render goes
// through, means the field cannot be written and ignored again. Runs even under `produced: false`, because
// that opts out of the injected baseline, not out of the author's own sugar.
// `frame` is the ONE frame object (core/safe.js frameOf), and passing it is not optional politeness.
// Without it this fell back to `sceneDims(data)`, which reads `data.aspect` from the scene and CANNOT
// see the `?aspect=`/`--aspect` override that boot has already resolved. So rendering a 16:9 scene at
// 9:16 centred every diveIn/travel/workspaceZoomOut against 1920x1080 on a 1080x1920 canvas: a silent
// mis-centre of hundreds of pixels per axis, which is the exact failure core/camera-moves.js's
// "it needs the frame it centres in" refusal exists to prevent. The frame is built at boot.js before
// this is called; take it from there, and fall back only for callers that have no frame at all.
// bindCursorCamera(spec, data): `{ move: "followCursor", cursor: "<layer id>" }` -> the same spec with
// the named cursor layer's OWN path, clicks, base and start filled in.
//
// THE POINT OF THE WHOLE FEATURE IS HERE. A cursor layer already states where the pointer goes and when
// it presses. Before this, an author who wanted the camera to go there too typed those coordinates a
// second time into `diveIn` and kept the two copies in step by eye. Now the path is the single owner
// and the camera is derived from it, so the two cannot disagree.
//
// IT RUNS INSIDE bakeCameraMove, on the ONE funnel every render goes through, for the reason that funnel
// exists (docs/MISTAKES.md #424): a binding resolved anywhere else is a field an author can write and
// nothing can read. core/boot.js already throws on a `cameraMove` that survives to render, so a scene
// reaching a frame with this unresolved is impossible rather than silent.
//
// EVERY REFUSAL NAMES THE LAYER AND SAYS WHAT TO DO INSTEAD, because "invalid" is worse than the silence
// it replaces. The one it does not raise itself is the scene that also declares its own `camera`:
// bakeCameraMove refuses that for every move at once, three lines below.
function bindCursorCamera(spec, data) {
  if (!spec || typeof spec !== 'object') return spec;
  const move = spec.move ? resolveCameraMove(spec.move) : null;
  if (move !== 'followCursor') {
    if (spec.cursor != null)
      throw new Error(`cameraMove "${spec.move}" carries a "cursor" (${JSON.stringify(spec.cursor)}), and only`
        + ' "followCursor" derives its keys from a pointer. Every other move would drop the field and fly'
        + ' somewhere nobody authored. Use `"move": "followCursor"`, or take the cursor off this spec.');
    return spec;
  }
  if (spec.cursor == null)
    throw new Error('cameraMove "followCursor" needs `"cursor": "<layer id>"`, the id of the cursor layer'
      + ' whose path the camera follows. The move exists so the pointer stays the ONLY place that path is'
      + ' written, and without the id there is nothing to derive from.');
  const cursors = [];
  let hit = null;
  const walk = (ls) => { for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.type === 'cursor') cursors.push(L);
    if (!hit && L.id === spec.cursor) hit = L;
    walk(L.children); walk(L.layers);
  } };
  walk(data.layers);
  const menu = cursors.length ? cursors.map((L) => JSON.stringify(L.id ?? '(no id)')).join(', ') : 'none';
  if (!hit)
    throw new Error(`cameraMove "followCursor" names a layer "${spec.cursor}" that this scene does not have.`
      + ` Its cursor layers are: ${menu}. Give the pointer an \`id\` and name that one.`);
  if (hit.type !== 'cursor')
    throw new Error(`cameraMove "followCursor" names "${spec.cursor}", which is a ${hit.type || 'text'} layer.`
      + ` Only a \`cursor\` layer carries the \`path\` and \`clicks\` this move reads (this scene's cursors:`
      + ` ${menu}). To push toward a fixed point on any other layer, use \`diveIn\` with its tx/ty.`);
  if (!Array.isArray(hit.path) || !hit.path.length)
    throw new Error(`cameraMove "followCursor" follows cursor "${spec.cursor}", which declares no \`path\`, so`
      + ' there is nowhere to follow. Give the pointer `"path": [{t,x,y}, ...]`, or drop the sugar and'
      + ' hand-key `diveIn` at the point you mean.');
  if (!Array.isArray(hit.clicks) || !hit.clicks.length)
    throw new Error(`cameraMove "followCursor" follows cursor "${spec.cursor}", which declares no \`clicks\`.`
      + ' The move IS the arrival at a press, so with none there is no moment to arrive at. Add'
      + ' `"clicks": [t]`, or use `travel`/`panFollow` to ride the pointer without one.');
  if (spec.start != null)
    throw new Error(`cameraMove "followCursor" takes its "start" from cursor "${spec.cursor}" (${hit.start ?? 0}s),`
      + ' because the click times are on that layer\'s own clock. A second start here would slide the'
      + ' camera off the presses it was derived from. Move the cursor layer instead.');
  // The base the path is measured from. core/layers/cursor.js anchors a pathed pointer at (0,0) when the
  // author gives it no x/y, so this reads that same default rather than holding a second opinion about it.
  // A RELATIVE COORDINATE IS REFUSED AND NOT GUESSED: this bake runs before resolveCoords (core/boot.js),
  // so "center" or "40%" is still a string here and would aim the camera at NaN without a word.
  const base = [hit.x ?? 0, hit.y ?? 0];
  for (const [i, k] of [[0, 'x'], [1, 'y']]) {
    if (!Number.isFinite(base[i]))
      throw new Error(`cameraMove "followCursor" reads the base position of cursor "${spec.cursor}", and its`
        + ` "${k}" is ${JSON.stringify(base[i])}. The camera bakes before relative coordinates resolve, so a`
        + ' cursor it follows states its base in absolute stage px, or omits x/y entirely (which anchors the'
        + ' path at 0,0, the same default the pointer itself uses).');
  }
  const { cursor: _named, ...rest } = spec;
  return { ...rest, path: hit.path, clicks: hit.clicks, base, start: hit.start ?? 0 };
}

// bindFollowCamera(spec, data): `{ move: "follow", id: "<layer>", margin, to }` -> the validated
// descriptor stored on `data.cameraFollow`. Two refusals live here rather than in follow.js itself,
// because both need the FULL layer tree, which a pure (params) generator never sees:
//
//   UNKNOWN ID, by name, with near-miss hints, the same shape validate.mjs already gives a bad
//   `panWith` (validate.mjs:83-89): list every id the scene actually has and, where one is close,
//   name it, instead of a bare "no such layer".
//
//   THE CHAIN. `follow` (core/tracks/follow.js) pins a LAYER to another's box resolved BEFORE any
//   track runs, so a layer that itself carries `follow` reports its UNPINNED position; that file
//   refuses being asked to chain through one for exactly that reason. The camera reads boxes through
//   the identical accessor (`scene.boxOf`), so pointing it at a layer that is itself pinned would read
//   that same stale, unpinned box in silence. Refused here rather than let it render a technically
//   legal but quietly wrong shot.
function bindFollowCamera(spec, data) {
  const { move: _m, ...params } = spec;
  const ids = [];
  const walk = (ls) => { for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    if (typeof L.id === 'string') ids.push(L.id);
    walk(L.children);
  } };
  walk(data.layers);
  if (!ids.includes(params.id)) {
    const near = nearMisses(String(params.id), ids);
    throw new Error(`cameraMove "followLayer": no layer with id ${JSON.stringify(params.id)}.`
      + `${near.length ? ` Did you mean ${near.map((n) => `"${n}"`).join(', ')}?` : ''} `
      + `Known ids: ${ids.length ? ids.join(', ') : '(this scene has none)'}.`);
  }
  const target = (() => { let hit = null; const find = (ls) => { for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.id === params.id) { hit = L; return; }
    find(L.children);
  } }; find(data.layers); return hit; })();
  if (target && target.follow)
    throw new Error(`cameraMove "followLayer": "${params.id}" is itself following "${target.follow.id}". `
      + `A box is resolved before any track runs, so "${params.id}" would report its UNPINNED `
      + `position and the camera would track a place nothing is on screen. Point the camera at `
      + `"${target.follow.id}" directly, or give "${params.id}" the motion instead of a pin.`);
  return followCamera(params);
}

export function bakeCameraMove(data, frame) {
  if (!data || !data.cameraMove) return data;
  const specs = Array.isArray(data.cameraMove) ? data.cameraMove : [data.cameraMove];
  if (Array.isArray(data.camera) && data.camera.length)
    throw new Error('scene declares BOTH `camera` keyframes and `cameraMove` sugar, one would silently'
      + ' overwrite the other. Keep one: the sugar, or the keys it builds.');
  // `follow` cannot become a keyframe array (see core/camera-moves/follow.js: the target's live box
  // does not exist until resolveBoxes(t) runs, per frame). It resolves onto its OWN field,
  // `data.cameraFollow`, which the keyframe pipeline (`cameraAt`, `assertKeyHandles`, …) never reads,
  // and it cannot be one leg among others: there is no keyframe array to splice it into.
  if (specs.some((s) => s && resolveCameraMove(s.move) === 'followLayer')) {
    if (specs.length > 1)
      throw new Error('cameraMove "followLayer" tracks a live layer box at RENDER time, not at build time '
        + 'like every other move, so it is not a keyframe array a second leg can be spliced into. '
        + 'Give the scene one `cameraMove: {move:"followLayer", id:"<layer>"}` with nothing else in the list.');
    if (data.cameraFollow)
      throw new Error('scene declares BOTH `cameraFollow` and `cameraMove: {move:"followLayer"}`, one would'
        + ' silently overwrite the other. Keep one.');
    data.cameraFollow = bindFollowCamera(specs[0], data);
    delete data.cameraMove;
    return data;
  }
  // sceneDims so a move that centres a point centres it in the REAL canvas (core/camera-moves.js can only
  // default to landscape). Same call expand-blocks.mjs makes; the math stays in camera-moves.js.
  const dims = (frame && frame.W > 0 && frame.H > 0) ? [frame.W, frame.H] : sceneDims(data);
  // A cursor binding resolves HERE, inside the one funnel, so `cursor` cannot be a field an author
  // writes and nothing reads.
  const built = specs.map((s) => ({ spec: s, kf: buildCameraMove(bindCursorCamera(s, data), dims) }));

  // THE ONE PLACE EVERY CAMERA SPEC MEETS, REGARDLESS OF WHO WROTE IT. `data.cameraMove` can be filled
  // by hand, by harness/author/assemble.mjs (one entry per beat's `camera:` line), or by
  // recipes/expand.mjs (a camera-kind recipe like `window-dolly`), and those three never see each
  // other's work: assemble only knows about beats, the recipe expander only appends. This funnel is the
  // only point that sees the FINAL array, so it is the only point that can referee it.
  //
  // A window is read off the spec's OWN built keyframes (min/max `t`), never assumed from `start`/`dur`
  // alone: not every move keys a flat span (`travel` visits several stations with per-station dwells,
  // `cameraShake` pre-samples one key per rendered frame), so the keyframes it actually produced are the
  // only honest account of when it is live.
  const windows = built.map(({ spec, kf }) => {
    const ts = kf.map((k) => k.t);
    return { move: spec.move, from: Math.min(...ts), to: Math.max(...ts) };
  });
  // Strict overlap, not touch: two specs sharing an endpoint (one ends exactly where the next begins,
  // e.g. assemble's per-beat windows at a real cut) is ordinary editing grammar, not a race, and MUST
  // stay legal, or every beat-cut film with more than one `camera:` line would refuse itself.
  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 1; j < windows.length; j++) {
      const a = windows[i], b = windows[j];
      if (a.from < b.to && b.from < a.to) {
        throw new Error(`cameraMove: "${a.move}" (${a.from}s-${a.to}s) and "${b.move}" (${b.from}s-${b.to}s) `
          + `overlap. Two camera specs cannot race the same seconds, whichever mechanism wrote them (a `
          + `hand-authored cameraMove, a beat's own camera:, a camera-kind recipe): the engine concatenates `
          + `every spec's keyframes into one flat array and reads it assuming ascending time, so an overlap `
          + `does not blend, it corrupts the read. Retime one, or combine them into a single continuous move.`);
      }
    }
  }
  // SORTED BY START, NOT TRUSTED IN ARRAY ORDER. `cameraAt` (core/timeline/sequence.js) walks the flat
  // array assuming it is already ascending in time; a camera-kind recipe's leg is appended to whatever
  // `cameraMove` already held (recipes/expand.mjs), which can land it BEFORE an earlier-written, later-
  // starting spec in the array without landing before it in TIME. Sorting here, once, on the one array
  // every source feeds, is cheaper than asking every writer to keep the array sorted by hand.
  const order = built.map((_, i) => i).sort((i, j) => windows[i].from - windows[j].from);
  data.camera = order.flatMap((i) => built[i].kf);
  delete data.cameraMove;
  return data;
}


// bakeDepth(data): `depth` sugar -> the real `plane` modifier, resolved against THIS film's lens.
//
// The same shape as bakeCameraMove above and for the same reason: a field written by an author and read
// by nothing at render time is the failure this whole path exists to make impossible. Nothing downstream
// knows the word `depth`; core/fx/plane.js reads `modifiers: [{ plane: { z } }]`, so the sugar either
// becomes that here or core/boot.js throws.
//
// THE LENS IS THE CAMERA'S, so it is read here rather than guessed per layer. A name is a fraction of it
// (core/fx/plane.js), which is what makes "back" mean the same distance under a 900px lens and a 1600px
// one. `p` is keyable, so a film that ramps its lens has more than one; the FIRST key is used, because a
// depth is a place a layer stands and not something that moves when the lens does, and the alternative
// is a layer whose z changes mid-shot for a reason nobody wrote down.
//
// A GROUP CHILD IS REFUSED HERE, not left to the modifier. core/fx/plane.js already refuses one, with a
// good message (a group is a flat parent, so the child would be projected by nothing: put the plane on
// the GROUP). Lowering it and letting that fire would work, but the error would name `plane` at a layer
// whose author wrote `depth`, and an error that names a word the author did not type is half an error.
const LENS_DEFAULT = 1600;

// bakeFocus: a camera keyframe may name its focus with a DEPTH NAME rather than a number, because an
// author who placed a layer on `front` should be able to focus on `front` without looking up what that
// resolved to. Resolved here, at boot, beside the depth bake that resolves the other half of the same
// vocabulary: one place knows the lens, one place turns names into distances, and a name that survives
// to render is impossible rather than silently ignored.
export function bakeFocus(data) {
  const cam = Array.isArray(data && data.camera) ? data.camera : null;
  if (!cam) return data;
  const lens = (cam.find((k) => k && typeof k.p === 'number')?.p) || LENS_DEFAULT;
  for (const k of cam) {
    if (!k || k.f == null || typeof k.f === 'number') continue;
    k.f = depthZ(k.f, lens);   // an unknown name throws here, by name, with the menu
  }
  return data;
}

export function bakeDepth(data) {
  const cam = Array.isArray(data && data.camera) ? data.camera : null;
  const lens = (cam && cam.find((k) => k && typeof k.p === 'number')?.p) || LENS_DEFAULT;
  const walk = (ls, inGroup) => {
    for (const L of ls || []) {
      if (!L || typeof L !== 'object') continue;
      if (L.depth != null) {
        if (inGroup) throw new Error(`a group child (${L.id ? `"${L.id}"` : `a ${L.type || 'text'}`}) sets `
          + `\`depth\`. A group is its own flat parent, so a child standing behind it would be projected by `
          + `nothing and drawn at exactly the size and place it already has. Put the \`depth\` on the GROUP: `
          + `the whole composed card then stands at that distance and its children ride it.`);
        const z = depthZ(L.depth, lens);
        if (z === 0) throw new Error(`\`depth\` resolved to z 0, which is the picture plane every layer is `
          + `already on. Drop the prop rather than declaring the distance you are already at.`);
        // `hold: true` is what makes `depth` the multiplane vocabulary rather than a raw distance: the
        // layer keeps the size it was laid out at and the depth shows up as a different RATE OF TRAVEL
        // under the camera, which is the one arithmetic step every AE multiplane tool automates and the
        // one we used to print in an error message. The raw primitive still does not hold: write
        // `modifiers: [{ plane: { z } }]` for that.
        (L.modifiers || (L.modifiers = [])).push({ plane: { z, hold: true } });
        delete L.depth;
      }
      walk(L.children, true);
      walk(L.layers, inGroup);
    }
  };
  walk(data && data.layers, false);

  // ONCE ANYTHING HAS DEPTH, `track` STOPS BEING THE ANSWER, and nothing used to say so. A depth puts
  // the layer in a real 3D rig, where occlusion is decided by DISTANCE, so a layer standing toward the
  // eye covers a layer at the picture plane no matter how high that layer's `track` is.
  //
  // It cost a real debugging session: a subject at z +180 with track 4 covered the payoff at track 6 for
  // two full seconds. Every gate was green, the DOM reported the covered layer at opacity 1 with its
  // text present, and it was invisible. Found by looking at a frame, which is the expensive way.
  //
  // A WARNING AND NOT A THROW, deliberately. Standing something in front of the frame is a legitimate
  // composition and the engine cannot know whether the layer underneath was meant to be seen. What it
  // can know is that the author wrote a `track` which is now being ignored, and that is worth saying out
  // loud on the run that introduces it rather than after a render nobody can explain.
  const top = (data && data.layers) || [];
  const trackOf = (L, i) => (typeof L.track === 'number' ? L.track : i);
  const near = top.map((L, i) => ({ L, i, z: (L.modifiers || []).find((m) => m && m.plane)?.plane?.z }))
    .filter((r) => typeof r.z === 'number' && r.z > 0);
  for (const n of near)
    for (let i = 0; i < top.length; i++) {
      const other = top[i];
      if (other === n.L) continue;
      const flat = !(other.modifiers || []).some((m) => m && m.plane);
      if (flat && trackOf(other, i) > trackOf(n.L, n.i))
        console.warn(`depth beats track: "${n.L.id || n.L.type || 'a layer'}" stands ${n.z}px toward the `
          + `camera, so it is drawn IN FRONT of "${other.id || other.type || 'a layer'}" even though that `
          + `layer's track (${trackOf(other, i)}) is higher (${trackOf(n.L, n.i)}). Once anything in the `
          + `frame has depth, track orders only the layers sharing a plane. Give both the same depth, or `
          + `drop it from the one in front.`);
    }
  return data;
}
