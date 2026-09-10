// core/camera-moves/follow.js: THE CAMERA TRACKS A LAYER'S LIVE BOX, by id, the way core/tracks/
// follow.js already pins one LAYER to another's. That file's own header explains why the shape is
// needed at all: `diveIn`/`travel` centre a FIXED point, resolved once at build against numbers, and
// neither can express "keep the camera on the card" once the card is moving, because the card's
// position after its own motion track is only known at t. An author wanting that today hand-keys
// `diveIn`/`travel` at the card's authored coordinates and re-copies them by hand every time the card
// is retimed: the identical duplicate-source-of-truth defect `follow` exists to kill for a label, one
// layer over from a camera.
//
// WHY THIS FILE DOES NOT RETURN KEYFRAMES, unlike every other move in this package. A keyframe array
// is resolved ONCE at build (bakeCameraMove, core/engine/produce.js), before the DOM exists, so it can
// only encode geometry known from numbers alone. The target's on-screen box depends on its entrance
// pose, its group nesting and its measured text size, none of which exist before the first frame
// renders (formats/scene/scene.js resolveBoxes). So `follow` is resolved at RENDER time instead, from
// the same `scene.boxOf(id)` accessor core/tracks/follow.js reads a live box through, and this
// function only VALIDATES the params and returns the descriptor `bakeCameraMove` stores on
// `data.cameraFollow` (a field the keyframe pipeline never touches). See that file for why it cannot
// simply be one more element of the `data.camera` array.
//
// WHAT "FOLLOW" MEANS FOR A CAMERA, decided rather than guessed. A camera that rigidly RE-CENTRES a
// moving target every frame keeps the target locked dead centre and instead moves the BACKGROUND
// under it, which reads as the world sliding rather than a camera tracking a subject: exactly what
// `panFollow`'s own choice (translate to keep pace, never re-lock every frame) already avoids. So this
// move keeps a SOFT MARGIN around frame centre: the camera holds still while the target's centre stays
// inside that margin, and translates only the minimum needed to bring it back inside once it would
// cross the edge. That is a clamp, so it is 1-Lipschitz in the target's own (already smooth) position:
// no separate damping pass is layered on top, because damping by lerp toward a moving target needs the
// PREVIOUS frame's camera position as state, and renderFrame(n) must stay a pure function of n
// (core/fx/lag.js reaches for the same purity by reading the leader's KEYFRAMES at a delayed t instead
// of its rendered pose; that trick is unavailable here because a box's build-time components, esp. a
// text layer's measured size, are not sampleable at an arbitrary t the way a keyframe array is).
//
// ZOOM IS HELD, not framed: `to` sets a fixed scale for the whole shot. Framing the target (solving a
// scale from its live size every frame) is a second feature with a different failure mode (the frame
// breathing size every time the target resizes) and is not built here.
export function followCamera({ id, margin = 0.18, to = 1 } = {}) {
  if (typeof id !== 'string' || !id)
    throw new Error(`cameraMove "followLayer" needs \`"id"\`, the layer whose live box the camera tracks. `
      + `Got ${JSON.stringify(id)}.`);
  if (!(typeof margin === 'number' && Number.isFinite(margin) && margin > 0 && margin < 0.5))
    throw new Error(`cameraMove "followLayer": "margin" is the fraction of each half-axis the target may `
      + `drift from centre before the camera moves to keep it in frame, 0 < margin < 0.5; got `
      + `${JSON.stringify(margin)}.`);
  if (!(typeof to === 'number' && Number.isFinite(to) && to >= 1))
    throw new Error(`cameraMove "followLayer": "to" is the scale held for the whole shot and must be >= 1 `
      + `(zoom is HELD, not framed, in this version); got ${JSON.stringify(to)}.`);
  return { id, margin, to };
}

// followOffset(box, { margin, to }, W, H) -> { s, x, y }, the ONE piece of arithmetic formats/scene/
// scene.js's followCameraAt runs per frame. Pulled out here, pure and DOM-free, so it is unit-testable
// on its own (core/camera-moves/follow.test.mjs): hand it two different `box` centres (standing in for
// "before a retime" and "after one") and the two outputs must differ exactly as the boxes do, which is
// the whole proof that nothing about this shot is baked from the layer's ORIGINAL keyframes.
export function followOffset(box, spec, W, H) {
  const marginX = spec.margin * (W / 2), marginY = spec.margin * (H / 2);
  const lo = { x: W / 2 - marginX, y: H / 2 - marginY }, hi = { x: W / 2 + marginX, y: H / 2 + marginY };
  const clampTo = (v, a, z) => Math.min(Math.max(v, a), z);
  return { s: spec.to, x: clampTo(box.cx, lo.x, hi.x) - box.cx, y: clampTo(box.cy, lo.y, hi.y) - box.cy };
}

// followVelocity(boxNow, boxPrev, spec, W, H, dt) -> {vx, vy, speed}, the follow camera's translation
// over the window ending at "now", in the SAME shape and space core/timeline/sequence.js's
// cameraVelocityAt reports for a keyed camera (px/s, x/y only: see that function's header for why s/
// rx/ry/roll are excluded). A keyed camera derives both samples from one keyframe array; this move has
// no keyframes; its pose at any time is `followOffset` of the target's box AT THAT TIME. So the two
// samples this needs are the two boxes, not two reads of one track, and the caller (formats/scene/
// scene.js) is the one that can produce a box at an arbitrary t, by re-running resolveBoxes there.
// Kept here, beside followOffset, because both are the one place that knows what this move's pose IS.
export function followVelocity(boxNow, boxPrev, spec, W, H, dt) {
  if (!(dt > 0)) throw new Error(`followVelocity: dt must be a positive lookback in seconds, got ${JSON.stringify(dt)}.`);
  const now = followOffset(boxNow, spec, W, H), prev = followOffset(boxPrev, spec, W, H);
  const vx = (now.x - prev.x) / dt, vy = (now.y - prev.y) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy) };
}
