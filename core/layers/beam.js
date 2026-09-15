// core/layers/beam.js. A per-frame ANIMATED accent: a light that travels a rounded-rect BORDER
// (border-beam) or a SHEEN that sweeps across the box (shine). The whole point of this file is to prove
// the killer web-styles (border-beam, shine) belong in a DETERMINISTIC engine: CSS @keyframes are killed
// (tokens.css), so the travel angle / sheen position is a CLOSED-FORM function of local time, recomputed
// each frame in frame(kit,el,L,t). Pure in t → renderFrame(n) stays seek-safe. Stamps el.dataset each
// frame so the render's static-frame dedup can't reuse a neighbour (same contract as glow.js / shader.js).
//
//   { "type":"beam", "x":700,"y":420,"w":520,"h":150, "radius":18, "thickness":2.5, "tail":90,
//     "speed":0.5, "color":"var(--accent)", "glow":0.6 }          // border-beam (default)
//   { "type":"beam", "mode":"shine", "w":520,"h":150, "period":1.6, "angle":18, "color":"#fff" }  // sheen
import { alphaMix } from './glow.js';
import { mergeProps, propsOf } from '../registry/props.js';

// pure: the beam head angle (deg) at local time lt; `speed` = full loops per second.
export const beamAngle = (lt, speed = 0.5) => (((lt * speed * 360) % 360) + 360) % 360;
// pure: sheen sweep position (%), travels -20 → 120 every `period` seconds.
// The sheen is WIDER THAN ITS BOX and slides across it; that ratio is named because two readers need
// it now, this file's own paint and the matte's mask geometry, and a second literal `260%` somewhere
// else is the one-fact-two-places drift that generates most of the defects logged here.
export const SHINE_SCALE = 2.6;

/** The sheen itself, as a CSS gradient. The ONE owner: frame() paints it, maskPaint() masks with it. Takes
 * `angle`/`intensity` directly rather than the whole layer, so its two callers each declare the read on
 * their own signature instead of both routing it through a shared `L`. */
export const shineGradient = (angle, intensity, c) =>
  `linear-gradient(${angle ?? 18}deg, transparent 38%, ${alphaMix(c, intensity ?? 0.55)} 50%, transparent 62%)`;

export const shinePos = (lt, period = 1.6) => { const u = (((lt / Math.max(0.1, period)) % 1) + 1) % 1; return -20 + u * 140; };

// pure: the conic-gradient string for the border ring at head angle `a`.
export const beamConic = (a, c, tail) =>
  `conic-gradient(from ${a.toFixed(1)}deg, transparent 0deg, ${alphaMix(c, 0.0)} 1deg, ` +
  `${alphaMix(c, 0.85)} ${(tail * 0.5).toFixed(0)}deg, ${c} ${tail.toFixed(0)}deg, transparent ${(tail + 1).toFixed(0)}deg)`;

// The props are read off build()'s, frame()'s and maskPaint()'s own signatures (propsOf, core/props.js).
// `mode:"shine"` and the default border-beam read disjoint halves of the union, but both halves are
// authored on the same prop (`mode`), so guarding either on the other would say the wrong thing.
export function build(kit, el, L, { w, h, color, mode, radius, thickness, tail, glow, angle, intensity } = L) {
  if (w != null) el.style.width = w + 'px';
  if (h != null) el.style.height = h + 'px';
  el.style.pointerEvents = 'none';
  const c = color && color !== true ? color : 'var(--accent)';
  const inner = document.createElement('div');
  const r = (radius ?? 16) + 'px';
  inner.style.cssText = `position:absolute;inset:0;pointer-events:none;border-radius:${r}`;

  if (mode === 'shine') {
    inner.style.background = shineGradient(angle, intensity, c);
    inner.style.backgroundSize = `${SHINE_SCALE * 100}% 100%`;
    inner.style.backgroundPosition = '-20% 0';
    inner.style.mixBlendMode = 'screen';
  } else {
    // border-beam: a conic light ring, masked to the border thickness (the classic gradient-border mask:
    // two full-coverage masks, one clipped to content-box, XOR/exclude → only the padding ring paints).
    const th = thickness ?? 2.5;
    inner.style.padding = th + 'px';
    inner.style.background = beamConic(0, c, tail ?? 90);
    inner.style.webkitMask = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';
    inner.style.mask = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';
    inner.style.webkitMaskComposite = 'xor';
    inner.style.maskComposite = 'exclude';
    if (glow) inner.style.filter = `drop-shadow(0 0 ${(6 * glow).toFixed(1)}px ${alphaMix(c, 0.7)})`;
  }
  el.appendChild(inner);
  el.__beamInner = inner;
  el.__beamMode = mode || 'border';
}

// The pattern sits AFTER every argument the dispatcher passes, and that position is load-bearing.
// core/layers/index.js calls frame(kit, el, L, t, scene) with five arguments, so a pattern in the
// fifth slot destructures `scene` and every prop reads undefined. lib-test asserts the arity.
export function frame(kit, el, L, t, scene, { period, color, speed, tail } = L) {
  if (!el.__beamInner) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const lt = t - start;
  if (el.__beamMode === 'shine') {
    const p = shinePos(lt, period ?? 1.6);
    el.__beamInner.style.backgroundPosition = `${p.toFixed(2)}% 0`;
    el.dataset.bp = p.toFixed(2);
  } else {
    const c = color && color !== true ? color : 'var(--accent)';
    const a = beamAngle(lt, speed ?? 0.5);
    el.__beamInner.style.background = beamConic(a, c, tail ?? 90);
    el.dataset.ba = a.toFixed(1);
  }
}

// maskPaint: THIS LAYER, USED AS A LUMA MATTE. The reference technique is one move, draw a beam of
// light and reveal the text with it, and the two halves both existed here and could not be joined:
// `core/fx/matte.js` reveals a layer through another layer's brightness, and it read the SCENE JSON to
// find the source's paint, so it only ever accepted an image file or a declared gradient `bg`. A beam
// generates its gradient at frame time, so the layer built to make travelling light was refused by the
// effect built to reveal through light.
//
// The contract is `maskPaint(L, lt, geom) -> { image, size, position } | null`, and the type returns
// FINISHED CSS. It gets the geometry the matte already computed (the source's scaled extents and its
// origin relative to the masked layer) and hands back where its paint actually sits, because only the
// type knows that: a sheen is 2.6x its own box and slides, and no generic box maths would guess it.
//
// A BORDER BEAM RETURNS NULL, deliberately. It is a ring of light around a rounded rect, so as a matte
// it would reveal a hairline outline of the layer beneath and nothing else. Returning it because it is
// technically an image would be a working-looking answer to a question nobody meant to ask; null makes
// the matte say what it says for any other unusable source, by name.
//
// The pattern goes in the fourth slot: core/layers/index.js always calls `mod.maskPaint(spec, lt, geom)`
// with three arguments, so a pattern there only ever fires on the default.
export function maskPaint(L, lt, geom, { mode, color, period, angle, intensity } = L) {
  if ((mode || 'border') !== 'shine') return null;
  const c = color && color !== true ? color : 'var(--accent)';
  const w = geom.w * SHINE_SCALE;
  // CSS percentage positioning places the image so that p% of (container - image) is the offset. The
  // container here is the source's own box, which is what the live beam positions against, so the
  // travel is derived the same way rather than re-derived in pixels and drifting from it.
  const travel = (shinePos(lt, period ?? 1.6) / 100) * (geom.w - w);
  return {
    image: shineGradient(angle, intensity, c),
    size: `${w.toFixed(2)}px ${geom.h.toFixed(2)}px`,
    position: `${(geom.x + travel).toFixed(2)}px ${geom.y.toFixed(2)}px`,
  };
}

export const PROPS = mergeProps(propsOf(build), propsOf(frame), propsOf(maskPaint));

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a light that travels the rounded-rect border, or a sheen that sweeps across the box; the travel is closed-form in t, not a CSS keyframe";
