import { span } from './units.js';

// diveIn: zoom INTO a target point (a UI element, a face), which travels to centre as the scale grows.
// power4.out feel (fast in, long settle) via easeOutQuart. tx/ty in stage coords.
export function diveIn({ start = 0, dur = 1.6, tx, ty, to = 1.6, canvasW = 1920, canvasH = 1080,
  targetW, targetH, headroom = 0.88, ease = 'easeOutQuart' } = {}) {
  // tx/ty have no default and cannot have one: the whole move is "go to THIS point". Omit either and the
  // keyframe carried NaN, cameraAt lerped NaN, and the camera pose was NaN for the entire segment with
  // nothing said. The silent-substitution class this repo logs most. dollyZ already refuses a bad `s`
  // for the same reason, and this is the same refusal one field over.
  for (const [k, v] of [['tx', tx], ['ty', ty]]) {
    if (!Number.isFinite(v)) throw new Error(`diveIn needs a finite "${k}" (the stage coordinate to centre on); got ${JSON.stringify(v)}`);
  }
  span('diveIn', 'dur', dur);
  // HEADROOM. `to` was accepted at any value, and past a point the thing you dove at is BIGGER than the
  // frame: the camera lands with the target's edges outside the canvas, cropped, and nothing said a word.
  // The rule is that the target ends at most `headroom` of the frame on each axis, so
  // maxScale = min(0.88*W/targetW, 0.88*H/targetH). It REFUSES rather than clamps: a clamp is silent
  // substitution. The film renders a move nobody authored and the author never learns which, and this
  // engine's cardinal sin is exactly that (the tx/ty refusal three lines up is the same call).
  // KNOW THE LIMIT: this can only fire when the CALLER says how big the target is. This module cannot
  // measure a layer, so without targetW/targetH there is no size to check against and the guard is a
  // no-op. Pass them from wherever the size is known.
  if (targetW != null || targetH != null) {
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
    if (to > maxScale)
      throw new Error(`diveIn: "to" ${to} pushes a ${targetW ?? '?'}x${targetH ?? '?'} target past the frame.`
        + ` At most ${maxScale.toFixed(3)} keeps it inside ${Math.round(headroom * 100)}% of the`
        + ` ${canvasW}x${canvasH} canvas. Lower "to", or raise "headroom" if you mean to crop.`);
  }
  return [
    { t: start, s: 1, x: 0, y: 0 },
    { t: start + dur, s: to, x: canvasW / 2 - tx, y: canvasH / 2 - ty, ease },
  ];
}
