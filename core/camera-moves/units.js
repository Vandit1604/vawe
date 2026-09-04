// core/camera-moves/units.js: the shared arithmetic every camera move is built on. A move is pure
// (params) → camera-keyframe array, the same shape core/sequence.js `cameraAt` interpolates
// ([{t,s,x,y,rx,ry,ease}], t in absolute seconds), and every one of them advances a clock the same way.
// Kept in ONE place because a bug here is a bug in every move at once.

// EVERY DURATION HERE ADVANCES A CLOCK, so a non-positive one walks the keyframe times BACKWARD and the
// array stops being ascending. `cameraAt` scans for the bracketing pair assuming ascending `t`
// (core/sequence.js:31), so against a jumbled array it locks onto the last keyframe and the camera
// teleports to the destination at t=0 and stays there. A whole move silently deleted. A zero duration
// is the same class one step milder: two keys at the same `t` make cameraAt divide by zero and lerp NaN.
// Neither errors. `slowPush({dur:-4})` emits [0, -4] and `panFollow({dur:0})` emits [0, 0]; both looked
// like working calls. Guarded in ONE place because all six generators advance a clock the same way, and
// the review that caught it named only the two new ones (docs/MISTAKES.md #341).
export const span = (move, key, v) => {
  if (!Number.isFinite(v) || v <= 0)
    throw new Error(`${move}: "${key}" must be a positive number of seconds (it advances the camera clock); got ${JSON.stringify(v)}`);
  return v;
};
// A HOLD may be zero (that just means "do not hold") but never negative, which rewinds the clock.
export const hold = (move, key, v) => {
  if (v == null) return 0;
  if (!Number.isFinite(v) || v < 0)
    throw new Error(`${move}: "${key}" must be zero or a positive number of seconds; got ${JSON.stringify(v)}`);
  return v;
};
