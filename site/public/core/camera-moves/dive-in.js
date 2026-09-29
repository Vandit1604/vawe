import { span } from './units.js';

// HEADROOM. Past a point the thing you dove at is BIGGER than the frame: the camera lands with the
// target's edges outside the canvas, cropped. The rule is that the target ends at most `headroom` of
// the frame on each axis, so maxScale = min(headroom*W/targetW, headroom*H/targetH).
// ADAPTS rather than refuses: an author who wrote `to` before the target's real size was known (or
// whose target grew) gets a film that still renders, clamped to the largest scale that keeps the
// subject in frame, with the change PRINTED so it stays inspectable rather than silently different
// from what was authored. `crop: true`, or a `headroom` raised above the 0.88 default, is the explicit
// opt-in that says "I mean to crop": either one keeps `to` exactly as written and prints nothing.
// KNOW THE LIMIT: this can only fire when the CALLER says how big the target is. This module cannot
// measure a layer, so without targetW/targetH there is no size to check against and the guard is a
// no-op. Pass them from wherever the size is known (bakeCameraMove does, for a `target:"#id"` spec).
function clampToHeadroom(to, { targetW, targetH, canvasW, canvasH, headroom, crop }) {
  if (targetW == null && targetH == null) return to;
  if (!(headroom > 0 && headroom <= 1))
    throw new Error(`diveIn: "headroom" is the share of the frame the target may fill (0 < h <= 1); got ${JSON.stringify(headroom)}`);
  const lim = [];
  for (const [k, v, frame] of [['targetW', targetW, canvasW], ['targetH', targetH, canvasH]]) {
    if (v == null) continue;
    if (!Number.isFinite(v) || v <= 0)
      throw new Error(`diveIn: "${k}" must be a positive size in stage units; got ${JSON.stringify(v)}`);
    lim.push(headroom * frame / v);
  }
  const maxScale = Math.min(...lim);
  if (to > maxScale) {
    if (crop || headroom !== 0.88) {
      // explicit opt-in: the author already said "let it crop" or moved the headroom dial themselves.
    } else {
      console.log(`adapted diveIn-headroom: to ${to} -> ${maxScale.toFixed(3)} (no crop declared)`);
      return maxScale;
    }
  }
  return to;
}

// diveIn: zoom INTO a target point (a UI element, a face), which travels to centre as the scale grows.
// power4.out feel (fast in, long settle) via easeOutQuart. tx/ty in stage coords.
export function diveIn({ start = 0, dur = 1.6, tx, ty, to = 1.6, canvasW = 1920, canvasH = 1080,
  targetW, targetH, headroom = 0.88, ease = 'easeOutQuart', crop = false } = {}) {
  // tx/ty have no default and cannot have one: the whole move is "go to THIS point". Omit either and the
  // keyframe carried NaN, cameraAt lerped NaN, and the camera pose was NaN for the entire segment with
  // nothing said. The silent-substitution class this repo logs most. dollyZ already refuses a bad `s`
  // for the same reason, and this is the same refusal one field over.
  for (const [k, v] of [['tx', tx], ['ty', ty]]) {
    if (!Number.isFinite(v)) throw new Error(`diveIn needs a finite "${k}" (the stage coordinate to centre on); got ${JSON.stringify(v)}`);
  }
  span('diveIn', 'dur', dur);
  to = clampToHeadroom(to, { targetW, targetH, canvasW, canvasH, headroom, crop });
  return [
    { t: start, s: 1, x: 0, y: 0 },
    { t: start + dur, s: to, x: canvasW / 2 - tx, y: canvasH / 2 - ty, ease },
  ];
}
