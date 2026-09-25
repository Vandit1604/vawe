// core/tracks/box.js: the layer's SIZE over time (w/h), which is a different material from `scale`.
// Scale magnifies a layer and everything drawn in it; a box track changes the frame the content lives
// in and lets the content re-fit. That is the difference between zooming a photo grid and reflowing
// one, and it is the move every collapsing sidebar, expanding card and FLIP transition is made of.
//
// Written on EVERY frame, not only inside the layer's window, and it is the ONE track in the pipeline
// that runs outside the window on purpose. The transform tracks can live inside the window because
// driveClips rewrites transform from scratch each frame; width is a layout property nothing else
// touches, so a value left behind by a later frame would survive a seek backwards and a warm render
// would disagree with a cold one. renderFrame(n) has to be pure in n.
import { motionAt } from '../timeline/sequence.js';

export const slot = 'box';

// w/h are read as the value to fall back to OUTSIDE the window, so this file only reads them where a
// track exists. They are unconditional elsewhere (the layer's own box), and the union says so.
export const PROPS = { motion: {}, w: { when: 'motion' }, h: { when: 'motion' } };

// DEPTH over time. core/clips.js:83 writes zIndex from the static data-track first, driveClips before
// any track. Rounded because a track keyed across several siblings crosses them one at a time, which
// is what makes a ribbon pass behind the thing it is orbiting and then in front of it again.
function applyBoxZIndex(el, L, inWin, b) {
  if (inWin && b.track != null) el.style.zIndex = String(Math.round(b.track));
  else if (L.motion[0].track != null) el.style.zIndex = String(Math.round(L.motion[0].track));
}

// core/layers/image.js sizes the <img> itself in px unless the layer opted into cover-fit, in which
// case the img is already 100%/100% and rides the wrapper. Memoised on the element since a track has
// no build hook: `undefined` means not looked up yet, `null` is a real answer.
function applyBoxImgSize(el, bw, bh) {
  if (el.__hsImg === undefined) el.__hsImg = el.querySelector('img.hs-img');
  const im = el.__hsImg;
  if (im && im.style.width && im.style.width.endsWith('px')) {
    if (bw != null) im.style.width = bw.toFixed(2) + 'px';
    if (bh != null) im.style.height = bh.toFixed(2) + 'px';
  }
}

export function frame(ctx) {
  const { el, L, t, start, end } = ctx;
  if (!(L.motion && L.motion.length && (L.motion[0].w != null || L.motion[0].h != null || L.motion[0].track != null))) return;
  const inWin = t >= start && t < end;
  const b = inWin ? motionAt(L.motion, t - start, L.motionDelay) : null;
  const bw = inWin && b.w != null ? b.w : L.w;
  const bh = inWin && b.h != null ? b.h : L.h;
  if (bw != null) el.style.width = bw.toFixed(2) + 'px';
  if (bh != null) el.style.height = bh.toFixed(2) + 'px';
  applyBoxZIndex(el, L, inWin, b);
  applyBoxImgSize(el, bw, bh);
}
