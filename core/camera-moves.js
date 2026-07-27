// core/camera-moves.js — CAMERA CHOREOGRAPHY generators: pure (params) → camera-keyframe array, the same
// shape core/sequence.js `cameraAt` interpolates ([{t,s,x,y,rx,ry,ease}], t in absolute seconds). A move
// is smooth and CALCULATED instead of hand-typed, and the multi-keyframe ones emit interior `ease:"linear"`
// automatically so a chained push is velocity-CONTINUOUS (docs/MISTAKES.md #125: a chained ease-in-out
// pulses because it zeroes velocity at every keyframe — the "shaking zoom"). Only the final settle eases
// out. All pure → renderFrame(n) stays seek-safe; assert the endpoints with `make lib-test`.
//
// Pan math: the camera transform is `scale(s) translate(x,y)` about the stage centre, so translating by
// (W/2 - tx, H/2 - ty) brings a target point (tx,ty) to centre at ANY scale — diveIn uses exactly this.
//
// Author sugar: `"cameraMove": { "move":"diveIn", ... }` at the scene root expands (make expand) to
// `data.camera`. Compose legs by hand for anything these don't cover.

const CENTER = { w: 1920, h: 1080 };

// slowPush — a gentle, continuous zoom in (the default "the frame is alive" move). One segment, ease-out.
export function slowPush({ start = 0, dur = 6, from = 1, to = 1.12, ease = 'easeOutCubic' } = {}) {
  return [{ t: start, s: from, x: 0, y: 0 }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}

// diveIn — zoom INTO a target point (a UI element, a face), which travels to centre as the scale grows.
// power4.out feel (fast in, long settle) via easeOutQuart. tx/ty in stage coords.
export function diveIn({ start = 0, dur = 1.6, tx, ty, to = 1.6, canvasW = CENTER.w, canvasH = CENTER.h,
  ease = 'easeOutQuart' } = {}) {
  return [
    { t: start, s: 1, x: 0, y: 0 },
    { t: start + dur, s: to, x: canvasW / 2 - tx, y: canvasH / 2 - ty, ease },
  ];
}

// panFollow — the camera TRANSLATES to keep pace with content that grows downward (the "terminal types
// while the camera pans down" move). Linear so the pan tracks the typing at constant speed, no easing lurch.
export function panFollow({ start = 0, dur = 5, dx = 0, dy = -300, s = 1, ease = 'linear' } = {}) {
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: dy, ease }];
}

// workspaceZoomOut — start pushed IN on a detail, then pull back to reveal the whole workspace (the
// opposite of diveIn). Ends on a slow settle.
export function workspaceZoomOut({ start = 0, dur = 3, from = 1.4, to = 1, tx, ty, canvasW = CENTER.w,
  canvasH = CENTER.h, ease = 'easeOutCubic' } = {}) {
  const fx = tx != null ? canvasW / 2 - tx : 0, fy = ty != null ? canvasH / 2 - ty : 0;
  return [{ t: start, s: from, x: fx, y: fy }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}

// orbit — a gentle 3D swing around the frame (ry sweeps through 0), giving depth to a dimensional beat.
// 3 keyframes → interior gets ease:"linear" so the swing is one continuous arc, not two eased halves.
export function orbit({ start = 0, dur = 6, deg = 12, s = 1.05, ease = 'easeInOutSine' } = {}) {
  const mid = start + dur / 2;
  return [
    { t: start, s, x: 0, y: 0, ry: -deg },
    { t: mid, s, x: 0, y: 0, ry: 0, ease: 'linear' },   // interior: linear keeps velocity continuous (#125)
    { t: start + dur, s, x: 0, y: 0, ry: deg, ease },
  ];
}

// multiPhase — chain several legs into one journey (push → hold-with-drift → settle). Each leg is
// { dur, s?, x?, y? }; interior keyframes get ease:"linear" so the whole path is velocity-continuous and
// a "hold" leg still creeps (never a dead freeze). Only the last leg eases out.
export function multiPhase({ start = 0, legs = [], settleEase = 'easeOutCubic' } = {}) {
  const kf = [{ t: start, s: 1, x: 0, y: 0 }];
  let t = start;
  legs.forEach((leg, i) => {
    t += leg.dur ?? 1;
    const last = i === legs.length - 1;
    kf.push({ t, s: leg.s ?? kf[kf.length - 1].s, x: leg.x ?? 0, y: leg.y ?? 0, ease: last ? settleEase : 'linear' });
  });
  return kf;
}

// name → generator, so the scene sugar and any catalog derive the vocabulary from the code.
export const CAMERA_MOVES = { slowPush, diveIn, panFollow, workspaceZoomOut, orbit, multiPhase };
export const CAMERA_MOVE_NAMES = Object.keys(CAMERA_MOVES);

// buildCameraMove(spec) — the sugar resolver: { move, ...params } → a camera-keyframe array.
export function buildCameraMove(spec) {
  if (!spec || !spec.move) throw new Error('cameraMove needs a "move" name');
  const f = CAMERA_MOVES[spec.move];
  if (!f) throw new Error(`unknown cameraMove "${spec.move}". one of: ${CAMERA_MOVE_NAMES.join(', ')}`);
  const { move, ...params } = spec;
  return f(params);
}
