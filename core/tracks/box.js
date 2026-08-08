// core/tracks/box.js — the layer's SIZE over time (w/h), which is a different material from `scale`.
// Scale magnifies a layer and everything drawn in it; a box track changes the frame the content lives
// in and lets the content re-fit. That is the difference between zooming a photo grid and reflowing
// one, and it is the move every collapsing sidebar, expanding card and FLIP transition is made of.
//
// Written on EVERY frame, not only inside the layer's window, and it is the ONE track in the pipeline
// that runs outside the window on purpose. The transform tracks can live inside the window because
// driveClips rewrites transform from scratch each frame; width is a layout property nothing else
// touches, so a value left behind by a later frame would survive a seek backwards and a warm render
// would disagree with a cold one. renderFrame(n) has to be pure in n.
import { motionAt } from '../sequence.js';

export const slot = 'box';

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(L.motion && L.motion.length && (L.motion[0].w != null || L.motion[0].h != null || L.motion[0].track != null))) return;
  const inWin = t >= start && t < end;
  const b = inWin ? motionAt(L.motion, t - start) : null;
  const bw = inWin && b.w != null ? b.w : L.w;
  const bh = inWin && b.h != null ? b.h : L.h;
  if (bw != null) el.style.width = bw.toFixed(2) + 'px';
  if (bh != null) el.style.height = bh.toFixed(2) + 'px';
  // DEPTH over time. core/clips.js:83 writes zIndex from the static data-track on every frame, so this
  // has to land after it and does — driveClips runs before any track. Rounded because z-index is an
  // integer: a track keyed across several siblings crosses them one at a time, which is what makes a
  // ribbon pass BEHIND the thing it is orbiting and then in front of it again.
  if (inWin && b.track != null) el.style.zIndex = String(Math.round(b.track));
  else if (L.motion[0].track != null) el.style.zIndex = String(Math.round(L.motion[0].track));
  // core/layers/image.js sizes the <img> itself in px unless the layer opted into cover-fit (via
  // `radius` or `ken`), in which case the img is already 100%/100% and rides the wrapper. Resizing
  // only the wrapper in that first case would move nothing on screen and say nothing about it.
  const im = el.querySelector('img.hs-img');
  if (im && im.style.width && im.style.width.endsWith('px')) {
    if (bw != null) im.style.width = bw.toFixed(2) + 'px';
    if (bh != null) im.style.height = bh.toFixed(2) + 'px';
  }
}
