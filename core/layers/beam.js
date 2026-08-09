// core/layers/beam.js — a per-frame ANIMATED accent: a light that travels a rounded-rect BORDER
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

// pure: the beam head angle (deg) at local time lt; `speed` = full loops per second.
export const beamAngle = (lt, speed = 0.5) => (((lt * speed * 360) % 360) + 360) % 360;
// pure: sheen sweep position (%), travels -20 → 120 every `period` seconds.
export const shinePos = (lt, period = 1.6) => { const u = (((lt / Math.max(0.1, period)) % 1) + 1) % 1; return -20 + u * 140; };

// pure: the conic-gradient string for the border ring at head angle `a`.
export const beamConic = (a, c, tail) =>
  `conic-gradient(from ${a.toFixed(1)}deg, transparent 0deg, ${alphaMix(c, 0.0)} 1deg, ` +
  `${alphaMix(c, 0.85)} ${(tail * 0.5).toFixed(0)}deg, ${c} ${tail.toFixed(0)}deg, transparent ${(tail + 1).toFixed(0)}deg)`;

// `mode:"shine"` and the default border-beam read disjoint halves of this list, but both halves are
// authored on the same prop (`mode`), so guarding either on the other would say the wrong thing.
export const PROPS = { w: {}, h: {}, radius: {}, color: {}, mode: {}, intensity: {},
  angle: {}, thickness: {}, tail: {}, glow: {}, period: {}, speed: {} };

export function build(kit, el, L) {
  if (L.w != null) el.style.width = L.w + 'px';
  if (L.h != null) el.style.height = L.h + 'px';
  el.style.pointerEvents = 'none';
  const c = L.color && L.color !== true ? L.color : 'var(--accent)';
  const inner = document.createElement('div');
  const r = (L.radius ?? 16) + 'px';
  inner.style.cssText = `position:absolute;inset:0;pointer-events:none;border-radius:${r}`;

  if (L.mode === 'shine') {
    const ang = L.angle ?? 18;
    inner.style.background =
      `linear-gradient(${ang}deg, transparent 38%, ${alphaMix(c, L.intensity ?? 0.55)} 50%, transparent 62%)`;
    inner.style.backgroundSize = '260% 100%';
    inner.style.backgroundPosition = '-20% 0';
    inner.style.mixBlendMode = 'screen';
  } else {
    // border-beam: a conic light ring, masked to the border thickness (the classic gradient-border mask:
    // two full-coverage masks, one clipped to content-box, XOR/exclude → only the padding ring paints).
    const th = L.thickness ?? 2.5;
    inner.style.padding = th + 'px';
    inner.style.background = beamConic(0, c, L.tail ?? 90);
    inner.style.webkitMask = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';
    inner.style.mask = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';
    inner.style.webkitMaskComposite = 'xor';
    inner.style.maskComposite = 'exclude';
    if (L.glow) inner.style.filter = `drop-shadow(0 0 ${(6 * L.glow).toFixed(1)}px ${alphaMix(c, 0.7)})`;
  }
  el.appendChild(inner);
  el.__beamInner = inner;
  el.__beamMode = L.mode || 'border';
}

export function frame(kit, el, L, t) {
  if (!el.__beamInner) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const lt = t - start;
  if (el.__beamMode === 'shine') {
    const p = shinePos(lt, L.period ?? 1.6);
    el.__beamInner.style.backgroundPosition = `${p.toFixed(2)}% 0`;
    el.dataset.bp = p.toFixed(2);
  } else {
    const c = L.color && L.color !== true ? L.color : 'var(--accent)';
    const a = beamAngle(lt, L.speed ?? 0.5);
    el.__beamInner.style.background = beamConic(a, c, L.tail ?? 90);
    el.dataset.ba = a.toFixed(1);
  }
}
