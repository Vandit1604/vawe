// transitions.js — the scene-CUT kit. another engine's two-axis split, ported to the pure model:
// a TIMING shapes how progress 0→1 evolves through the cut window; a PRESENTATION says what the
// cut looks like — pure style objects for the entering / exiting scene root. Everything derives
// from sequence()'s enter/exit values, so it stays pure in n and composes with in-scene motion.
//
//   const seq = sequence(n, fps, SEGS, { transition: TRANS });
//   applyT(sceneRoot, cutStyle(sc.transition, seq, { dir: 'left' }));
//
// cutStyle ALWAYS returns the full style set (identity values in the steady state) so a property
// written during the cut can never stick — byte-identical DOM for any render order.
import { clamp01, lerp, easeInOutCubic, easeOutCubic, easeOutQuart, easeOutBack, wipe, circleWipe, clockWipe, accel, decel, speedRamp } from './lib.js';

export const TIMINGS = {
  linear: (p) => clamp01(p),
  smooth: (p) => easeInOutCubic(clamp01(p)),
  out: (p) => easeOutCubic(clamp01(p)),
  snappy: (p) => easeOutQuart(clamp01(p)),
  pop: (p) => easeOutBack(clamp01(p)),
  // velocity ramps: rush accelerates away (exits), brake decelerates in (entrances),
  // ramp is the slow-fast-slow editor's speed ramp (whips, camera throws)
  rush: (p) => accel(clamp01(p)),
  brake: (p) => decel(clamp01(p)),
  ramp: (p) => speedRamp(clamp01(p)),
};

const IDENT = { opacity: '1', transform: 'none', filter: 'none', clipPath: 'none', WebkitClipPath: 'none', maskImage: 'none', WebkitMaskImage: 'none', maskSize: 'auto', maskPosition: '0% 0%', WebkitMaskPosition: '0% 0%' };
const style = (over) => ({ ...IDENT, ...over });
const sign = (dir) => (dir === 'right' || dir === 'down' ? -1 : 1);
const axis = (dir) => (dir === 'up' || dir === 'down' ? 'Y' : 'X');
const mask = (img) => ({ maskImage: img, WebkitMaskImage: img });
// gradient angle that reveals FROM the given edge (mask black side leads)
const gradAngle = (dir) => (dir === 'right' ? '270deg' : dir === 'up' ? '0deg' : dir === 'down' ? '180deg' : '90deg');
// deterministic jitter: fract(sin()) hash of the quantized progress step — pure in p
const frac = (x) => { const s = Math.sin(x) * 43758.5453; return s - Math.floor(s); };

// Each presentation: { enter(p, o) → style, exit(p, o) → style }. p is that phase's progress
// (enter 0→1 = revealing, exit 0→1 = leaving); enter(1)/exit(0) must equal identity.
export const PRESENTATIONS = {
  none: { enter: () => style({}), exit: () => style({}) },
  fade: {
    enter: (p) => style({ opacity: p.toFixed(3) }),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  slide: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.4).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 0.7).toFixed(2)}px)` }),
  },
  // whip-pan: fast directional throw with motion blur peaking at the cut
  whip: {
    enter: (p, o) => style({ opacity: clamp01(p * 2).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 3.2).toFixed(2)}px)`, filter: `blur(${((1 - p) * 14).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 3.2).toFixed(2)}px)`, filter: `blur(${(p * 14).toFixed(2)}px)` }),
  },
  // scale-punch: outgoing bursts toward the camera, incoming settles down onto the page
  punch: {
    enter: (p) => style({ opacity: clamp01(p * 1.6).toFixed(3), transform: `scale(${lerp(1.07, 1, p).toFixed(4)})` }),
    exit: (p) => style({ opacity: (1 - p * p).toFixed(3), transform: `scale(${lerp(1, 1.12, p).toFixed(4)})`, filter: `blur(${(p * 10).toFixed(2)}px)` }),
  },
  wipe: {
    enter: (p, o) => style(wipe(p, o.dir)),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  iris: {
    enter: (p, o) => style(circleWipe(p, o.cx, o.cy)),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  clock: {
    enter: (p) => style(clockWipe(p)),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  flip: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.5).toFixed(3), transform: `perspective(1400px) rotate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * 55).toFixed(1)}deg)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `perspective(1400px) rotate${axis(o.dir)}(${(-sign(o.dir) * p * 55).toFixed(1)}deg)` }),
  },
  rise: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.3).toFixed(3), transform: `translateY(${((1 - p) * o.dist).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `translateY(${(-p * o.dist * 0.6).toFixed(2)}px)` }),
  },
  // blur dissolve: the classic premium fade — defocus swaps for opacity doing all the work
  blur: {
    enter: (p) => style({ opacity: clamp01(p * 1.2).toFixed(3), filter: `blur(${((1 - p) * 16).toFixed(2)}px)` }),
    exit: (p) => style({ opacity: (1 - p).toFixed(3), filter: `blur(${(p * 16).toFixed(2)}px)` }),
  },
  // zoom-through: camera pushes forward — outgoing shrinks away, incoming arrives from too-close
  zoom: {
    enter: (p) => style({ opacity: clamp01(p * 1.5).toFixed(3), transform: `scale(${lerp(1.35, 1, p).toFixed(4)})`, filter: `blur(${((1 - p) * 10).toFixed(2)}px)` }),
    exit: (p) => style({ opacity: (1 - p * p).toFixed(3), transform: `scale(${lerp(1, 0.82, p).toFixed(4)})`, filter: `blur(${(p * 10).toFixed(2)}px)` }),
  },
  // cube-ish perspective push: rotates in around a vertical/horizontal hinge
  cube: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.4).toFixed(3), transform: `perspective(1400px) translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 2.4).toFixed(2)}px) rotate${axis(o.dir) === 'X' ? 'Y' : 'X'}(${((axis(o.dir) === 'X' ? -1 : 1) * sign(o.dir) * (1 - p) * 55).toFixed(1)}deg)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `perspective(1400px) translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 2.4).toFixed(2)}px) rotate${axis(o.dir) === 'X' ? 'Y' : 'X'}(${((axis(o.dir) === 'X' ? 1 : -1) * sign(o.dir) * p * 55).toFixed(1)}deg)` }),
  },
  // barn doors: reveal opens from the center out
  barn: {
    enter: (p) => { const r = ((1 - clamp01(p)) * 50).toFixed(2); const c = `inset(0 ${r}% 0 ${r}%)`; return style({ opacity: clamp01(p * 3).toFixed(3), clipPath: c, WebkitClipPath: c }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  // soft wipe: the feathered-edge reveal — an 18%-wide gradient band instead of a hard line
  softwipe: {
    enter: (p, o) => { const e = clamp01(p) * 130 - 5; return style({ ...mask(`linear-gradient(${gradAngle(o.dir)}, #000 ${(e - 18).toFixed(1)}%, transparent ${(e + 2).toFixed(1)}%)`) }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  // soft iris: feathered circular reveal from a point
  softiris: {
    enter: (p, o) => { const r = clamp01(p) * 92; return style({ ...mask(`radial-gradient(circle at ${o.cx}% ${o.cy}%, #000 ${r.toFixed(1)}%, transparent ${(r + 14).toFixed(1)}%)`) }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  // squeeze: horizontal smear-stretch through the cut (speed-ramp feel)
  squeeze: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.6).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 1.6).toFixed(2)}px) scale${axis(o.dir)}(${lerp(1.55, 1, p).toFixed(4)})`, filter: `blur(${((1 - p) * 8).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 1.6).toFixed(2)}px) scale${axis(o.dir)}(${lerp(1, 1.55, p).toFixed(4)})`, filter: `blur(${(p * 8).toFixed(2)}px)` }),
  },
  // roll: rotates in from a corner tilt, settles level
  roll: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.4).toFixed(3), transform: `rotate(${(sign(o.dir) * (1 - p) * 7).toFixed(2)}deg) translateY(${((1 - p) * o.dist * 0.8).toFixed(2)}px) scale(${lerp(0.96, 1, p).toFixed(4)})` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `rotate(${(-sign(o.dir) * p * 7).toFixed(2)}deg) translateY(${(-p * o.dist * 0.5).toFixed(2)}px)` }),
  },
  // letterbox: reveal opens like cinema curtains top+bottom
  letterbox: {
    enter: (p) => { const r = ((1 - clamp01(p)) * 50).toFixed(2); const c = `inset(${r}% 0 ${r}% 0)`; return style({ opacity: clamp01(p * 3).toFixed(3), clipPath: c, WebkitClipPath: c }); },
    exit: (p) => { const r = (clamp01(p) * 50).toFixed(2); const c = `inset(${r}% 0 ${r}% 0)`; return style({ opacity: (1 - p * 0.4).toFixed(3), clipPath: c, WebkitClipPath: c }); },
  },
  // drop: falls in from above with a settle, exits by falling away
  drop: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.8).toFixed(3), transform: `translateY(${(-(1 - p) * (1 - p) * o.dist * 2.2).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translateY(${(p * p * o.dist * 2.2).toFixed(2)}px) rotate(${(p * 2.5).toFixed(2)}deg)` }),
  },
  // venetian blinds: slat mask sweeps open (editorial reveal)
  blinds: {
    enter: (p, o) => { const off = ((1 - clamp01(p)) * 120).toFixed(1); return style({ ...mask(`repeating-linear-gradient(${gradAngle(o.dir)}, #000 0 84px, transparent 84px 120px)`), maskSize: '100% 100%', maskPosition: `0 ${off}px`, WebkitMaskPosition: `0 ${off}px`, opacity: clamp01(p * 1.2 + 0.25).toFixed(3) }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  },
  // skew whip: the whip with shear that straightens — velocity you can see in the letterforms
  skewWhip: {
    enter: (p, o) => style({ opacity: clamp01(p * 2).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 2.6).toFixed(2)}px) skew${axis(o.dir) === 'X' ? 'X' : 'Y'}(${(sign(o.dir) * (1 - p) * -12).toFixed(2)}deg)`, filter: `blur(${((1 - p) * 10).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 2.6).toFixed(2)}px) skew${axis(o.dir) === 'X' ? 'X' : 'Y'}(${(-sign(o.dir) * p * 12).toFixed(2)}deg)`, filter: `blur(${(p * 10).toFixed(2)}px)` }),
  },
  // spin: rotate + scale settle (logos, badges, seals)
  spin: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.6).toFixed(3), transform: `rotate(${(sign(o.dir) * (1 - p) * 90).toFixed(1)}deg) scale(${lerp(0.5, 1, p).toFixed(4)})` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `rotate(${(-sign(o.dir) * p * 60).toFixed(1)}deg) scale(${lerp(1, 0.7, p).toFixed(4)})` }),
  },
  // collapse: vertical fold (terminal/data beats)
  collapse: {
    enter: (p) => style({ opacity: clamp01(p * 1.5).toFixed(3), transform: `scaleY(${lerp(0.05, 1, p).toFixed(4)})` }),
    exit: (p) => style({ opacity: (1 - p).toFixed(3), transform: `scaleY(${lerp(1, 0.05, p).toFixed(4)})` }),
  },
  // rise-blur: slow premium arrival — rise through heavy defocus
  riseBlur: {
    enter: (p, o) => style({ opacity: clamp01(p * 1.2).toFixed(3), transform: `translateY(${((1 - p) * o.dist * 0.8).toFixed(2)}px)`, filter: `blur(${((1 - p) * 22).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `translateY(${(-p * o.dist * 0.5).toFixed(2)}px)`, filter: `blur(${(p * 22).toFixed(2)}px)` }),
  },
  // glitch jitter: quantized deterministic shake that decays as the scene lands
  jitter: {
    enter: (p) => { const q = Math.floor(clamp01(p) * 10), amp = (1 - clamp01(p)) * 14; const jx = (frac(q * 12.9898 + 78.233) - 0.5) * 2 * amp, jy = (frac(q * 39.3468 + 11.135) - 0.5) * 2 * amp; return style({ opacity: clamp01(p * 2).toFixed(3), transform: `translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)` }); },
    exit: (p) => { const q = Math.floor(clamp01(p) * 10), amp = clamp01(p) * 14; const jx = (frac(q * 26.651 + 43.77) - 0.5) * 2 * amp, jy = (frac(q * 51.313 + 7.19) - 0.5) * 2 * amp; return style({ opacity: (1 - p).toFixed(3), transform: `translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)` }); },
  },
};

// cutStyle(name, seqState, opts) → style object for the ACTIVE scene root at this frame.
// seqState is the return of sequence(); opts: {timing, dir, dist, cx, cy}.
export function cutStyle(name, seqState, { timing = 'smooth', dir = 'left', dist = 90, cx = 50, cy = 50 } = {}) {
  const P = PRESENTATIONS[name] || PRESENTATIONS.fade;
  const T = typeof timing === 'function' ? timing : TIMINGS[timing] || TIMINGS.smooth;
  const o = { dir, dist, cx, cy };
  if (seqState.exit > 0) return P.exit(T(seqState.exit), o);
  if (seqState.enter < 1) return P.enter(T(seqState.enter), o);
  return P.enter(1, o); // steady state = identity (must not leave cut styles stuck)
}
