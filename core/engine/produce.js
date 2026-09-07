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

import { buildCameraMove } from '../camera-moves/index.js';
import { resolveCameraMove } from '../registry/vocab.js';
import { sceneDims } from '../layout/safe.js';
import { depthZ } from '../fx/plane.js';
// Light-versus-dark is ONE question with ONE answer (core/motion.js isLightBg), in linear light.
// This file used to weight the gamma-encoded channels against 140/255, which agrees with the correct
// maths on every neutral and disagrees on 5.8% of the sRGB cube, all of it saturated.

// `look` (core/registry/theme-contract.js resolveLook): passed through from boot.js so a later phase
// can read the brand's own scale/layout/cuts/field defaults from the ONE place a scene's produced
// baseline is decided, instead of a second call site somewhere else. Nothing reads it yet: this phase
// only wires it through, phases 2-5 add the actual defaults inside this function.
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
  bakeCameraMove(data, frame);
  return data;
}

// THE ONE FUNNEL. `cameraMove` is sugar; nothing at render time reads it (formats/scene/scene.js reads
// `data.camera`). It used to be resolved only by scripts/author/expand-blocks.mjs, at AUTHOR time, so the
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

export function bakeCameraMove(data, frame) {
  if (!data || !data.cameraMove) return data;
  const specs = Array.isArray(data.cameraMove) ? data.cameraMove : [data.cameraMove];
  if (Array.isArray(data.camera) && data.camera.length)
    throw new Error('scene declares BOTH `camera` keyframes and `cameraMove` sugar, one would silently'
      + ' overwrite the other. Keep one: the sugar, or the keys it builds.');
  // sceneDims so a move that centres a point centres it in the REAL canvas (core/camera-moves.js can only
  // default to landscape). Same call expand-blocks.mjs makes; the math stays in camera-moves.js.
  const dims = (frame && frame.W > 0 && frame.H > 0) ? [frame.W, frame.H] : sceneDims(data);
  // A cursor binding resolves HERE, inside the one funnel, so `cursor` cannot be a field an author
  // writes and nothing reads.
  data.camera = specs.flatMap((s) => buildCameraMove(bindCursorCamera(s, data), dims));
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
