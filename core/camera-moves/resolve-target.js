// core/camera-moves/resolve-target.js: turn a measured box into a diveIn/travel-station pose.
//
// Shared by bakeCameraMove (core/engine/produce.js) for BOTH camera-by-element features: a `target`
// resolved from a real layer box, and the plain headroom clamp on an author-declared targetW/targetH.
// One function, so "the largest scale that keeps a WxH box inside the frame" is computed once instead
// of twice (dive-in.js's own headroom check and the new by-id resolver would otherwise re-derive the
// identical arithmetic and could drift apart).
export function resolveCameraTarget(box, { margin = 0.06, to, canvasW = 1920, canvasH = 1080 } = {}) {
  if (!box || !Number.isFinite(box.w) || !Number.isFinite(box.h)
    || !Number.isFinite(box.cx) || !Number.isFinite(box.cy))
    throw new Error(`resolveCameraTarget: box needs finite w/h/cx/cy; got ${JSON.stringify(box)}`);
  if (!(margin >= 0 && margin < 0.5))
    throw new Error(`resolveCameraTarget: "margin" is the fraction of the frame kept clear around the `
      + `target on each axis, 0 <= margin < 0.5; got ${JSON.stringify(margin)}`);
  const padW = box.w * (1 + 2 * margin), padH = box.h * (1 + 2 * margin);
  const maxScale = Math.min(canvasW / padW, canvasH / padH);
  const s = (to != null && Number.isFinite(to)) ? Math.min(to, maxScale) : maxScale;
  return { tx: box.cx, ty: box.cy, s };
}
