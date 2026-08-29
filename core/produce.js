// core/produce.js, PRODUCE THE BASELINE. The engine's "go all-in" default: inject the universal produced
// motion into a scene that didn't specify it, so EVERY video is rich by default (a moving camera · scene-unit
// transitions). The another engine posture, forced at BUILD time.
// ADDITIVE ONLY: it adds camera/sceneUnits fields; it NEVER rewrites a layer the author wrote (auto-
// splitting text for kinetic reveals mutated structure and broke motion-track layers + the contrast audit,
// so kinetic type is nudged by the direction floor instead, MISTAKES).
//
// The BACKGROUND is deliberately NOT here. It used to be injected (light brand → dotmatrix, dark → aurora),
// which meant the backdrop (the single largest area of the frame) was the one design decision no author
// ever made. `bg` is now a required field (core/validate.mjs); this pass supplies motion, not taste.
//
// Determinism: it only mutates the scene DATA once, before the first frame, renderFrame(n) stays pure.
// ABSENT-ONLY: an explicitly set field is the author's opt-out (set `cameraMove` yourself to override).
// `"produced": false` disables the whole pass. Applies to the `scene` module only. Pure JS → runs in the
// browser AND in node gates, so the gates evaluate the SAME produced scene the renderer does.

import { isLightBg as bgIsLight } from './motion.js';
import { buildCameraMove } from './camera-moves.js';
import { sceneDims, MAX_ZOOM } from './safe.js';
import { depthZ } from './fx/plane.js';
// Light-versus-dark is ONE question with ONE answer (core/motion.js isLightBg), in linear light.
// This file used to weight the gamma-encoded channels against 140/255, which agrees with the correct
// maths on every neutral and disagrees on 5.8% of the sRGB cube, all of it saturated.

// THE BASELINE PUSH. 1.06, not 1.04: under a 5% scale change a push is below the perception threshold,
// so the frame reads as dead however long it runs (the old 1.04 default did, for every scene that took
// it). 5-15% is the comfortable-emphasis band; sit at its bottom so this never fights an authored film.
// That reasoning is about the EYE, so this number is owned here and is not derived from anything.
//
// What it is NOT free to be is larger than the safe margin can absorb. `core/safe.js` owns that limit
// and states the arithmetic; this reads it rather than keeping a second copy of the same geometry. The
// two numbers were independent until now, and the coincidence that both read 0.06 hid the fact that
// they describe one thing: how far a layer placed on the safe line may travel before it is cropped
// (docs/MISTAKES.md #458). A push past MAX_ZOOM would deliver clipped edges on every film that never
// declared a camera, which is most of the library, so it stops the build instead.
const BASELINE_PUSH = 1.06;
if (BASELINE_PUSH > MAX_ZOOM)
  throw new Error(`core/produce.js injects a slowPush to ${BASELINE_PUSH}, and core/safe.js's MARGIN `
    + `absorbs only ${MAX_ZOOM.toFixed(4)}. Every scene that declares no camera would have content `
    + 'pinned to the safe edge cropped by the frame edge. Lower the push, or widen MARGIN and re-run '
    + '`node scripts/gates/snap-scenes.mjs`: widening it moves every pinned layer in the library.');

export function produceBaseline(data, theme, frame) {
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

  // 2. CAMERA. A gentle slow push if the scene declares no camera move at all (the frame stays alive).
  const hasCam = (Array.isArray(data.cameraMove) && data.cameraMove.length) || (Array.isArray(data.camera) && data.camera.length);
  if (!hasCam && !choreographed) {
    data.cameraMove = [{ move: 'slowPush', start: 0, dur: data.duration || 12, from: 1, to: BASELINE_PUSH }];
  }

  // 3. SCENE-UNIT TRANSITIONS. A film WITH cuts that hasn't opted into unit transitions gets them, so the
  //    beats swap as whole units (the produced default over a flat cam-bump). Skip choreographed scenes.
  if (Array.isArray(data.cuts) && data.cuts.length && data.sceneUnits == null && !choreographed) {
    data.sceneUnits = true;
  }

  // NOTE: kinetic headlines are NOT injected here. Auto-splitting an existing text layer MUTATES its
  // structure, which broke a layer carrying a `motion` track (non-determinism) and masked the audit's
  // weak-headline contrast check (it measures the whole layer, not per-word units). Structure-changing
  // baselines are unsafe to inject blindly; kinetic type is nudged by the direction floor (no-kinetic-type)
  // and authored per-headline instead. The baseline stays ADDITIVE (bg · camera · sceneUnits), it never
  // rewrites a layer the author already wrote.
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
export function bakeCameraMove(data, frame) {
  if (!data || !data.cameraMove) return data;
  const specs = Array.isArray(data.cameraMove) ? data.cameraMove : [data.cameraMove];
  if (Array.isArray(data.camera) && data.camera.length)
    throw new Error('scene declares BOTH `camera` keyframes and `cameraMove` sugar, one would silently'
      + ' overwrite the other. Keep one: the sugar, or the keys it builds.');
  // sceneDims so a move that centres a point centres it in the REAL canvas (core/camera-moves.js can only
  // default to landscape). Same call expand-blocks.mjs makes; the math stays in camera-moves.js.
  const dims = (frame && frame.W > 0 && frame.H > 0) ? [frame.W, frame.H] : sceneDims(data);
  data.camera = specs.flatMap((s) => buildCameraMove(s, dims));
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
        (L.modifiers || (L.modifiers = [])).push({ plane: { z } });
        delete L.depth;
      }
      walk(L.children, true);
      walk(L.layers, inGroup);
    }
  };
  walk(data && data.layers, false);
  return data;
}
