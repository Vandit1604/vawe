// core/cuts/presentations.js: the cut fx themselves, moved verbatim out of core/cuts.js. Each
// presentation: { enter(p, o) -> style, exit(p, o) -> style }. p is that phase's progress (enter
// 0->1 = revealing, exit 0->1 = leaving); enter(1)/exit(0) must equal identity. cutStyle (./index.js)
// picks a TIMING (./timings.js) to drive p, and applies the result to the active scene root.
import { clamp01, lerp, wipe, circleWipe, clockWipe } from '../motion.js';
import { withBlurb, blurbsOf } from '../registry.js';

export const IDENT = { opacity: '1', transform: 'none', filter: 'none', clipPath: 'none', WebkitClipPath: 'none', maskImage: 'none', WebkitMaskImage: 'none', maskSize: 'auto', maskPosition: '0% 0%', WebkitMaskPosition: '0% 0%' };
const style = (over) => ({ ...IDENT, ...over });
// `dir` used to fall through to left/X for ANY unrecognised value, so `dir:"top"` on a wipe cut gave a
// leftward wipe with no signal - the same collapse of "absent" and "wrong" that cutStyle's own comment
// below argues against for `name` and `timing`. A cut is a junction; it is the worst place to guess.
// docs/MISTAKES.md #360.
export const DIRS = ['left', 'right', 'up', 'down'];
const okDir = (dir) => {
  if (dir == null) return 'left';                       // absent has a documented default
  if (DIRS.includes(dir)) return dir;
  throw new Error(`unknown direction "${dir}". One of: ${DIRS.join(', ')}. A direction the engine does `
    + `not know would otherwise travel LEFT and look deliberate.`);
};
const sign = (dir) => (okDir(dir) === 'right' || okDir(dir) === 'down' ? -1 : 1);
const axis = (dir) => (okDir(dir) === 'up' || okDir(dir) === 'down' ? 'Y' : 'X');
const mask = (img) => ({ maskImage: img, WebkitMaskImage: img });
// gradient angle that reveals FROM the given edge (mask black side leads)
const gradAngle = (dir) => (dir === 'right' ? '270deg' : dir === 'up' ? '0deg' : dir === 'down' ? '180deg' : '90deg');
// deterministic jitter: fract(sin()) hash of the quantized progress step, pure in p
const frac = (x) => { const s = Math.sin(x) * 43758.5453; return s - Math.floor(s); };

// matchCut's two radii, as a percentage of the clip reference box. FULL is generous rather than 71
// (the half-diagonal of a 16:9 frame) because an off-centre cx/cy needs more to still clear every
// corner; anything past full coverage is invisible, so there is no cost to the margin. HELD is the
// shape the eye carries across the join: big enough to read as a subject, small enough to be a shape.
const MATCH_FULL = 150, MATCH_R = 16;

// Each presentation: { enter(p, o) → style, exit(p, o) → style }. p is that phase's progress
// (enter 0→1 = revealing, exit 0→1 = leaving); enter(1)/exit(0) must equal identity.
export const PRESENTATIONS = {
  none: withBlurb('no transition at all, the beats simply replace each other. Masks nothing and moves nothing, so a whole-frame cut needs sceneUnits', { enter: () => style({}), exit: () => style({}) }),
  fade: withBlurb('opacity only, masks, so a whole-frame cut needs sceneUnits', {
    enter: (p) => style({ opacity: p.toFixed(3) }),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  slide: withBlurb('the frame travels one way, dir-aware. The plain workhorse, between same-background beats only', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.4).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 0.7).toFixed(2)}px)` }),
  }),
  // whip-pan: fast directional throw with motion blur peaking at the cut
  whip: withBlurb('motion-blurred directional throw, momentum, between same-background beats only', {
    enter: (p, o) => style({ opacity: clamp01(p * 2).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 3.2).toFixed(2)}px)`, filter: `blur(${((1 - p) * 14).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 3.2).toFixed(2)}px)`, filter: `blur(${(p * 14).toFixed(2)}px)` }),
  }),
  // scale-punch: outgoing bursts toward the camera, incoming settles down onto the page
  punch: withBlurb('scale burst, the leaving beat bursts past the camera, product focus', {
    enter: (p) => style({ opacity: clamp01(p * 1.6).toFixed(3), transform: `scale(${lerp(1.07, 1, p).toFixed(4)})` }),
    exit: (p) => style({ opacity: (1 - p * p).toFixed(3), transform: `scale(${lerp(1, 1.12, p).toFixed(4)})`, filter: `blur(${(p * 10).toFixed(2)}px)` }),
  }),
  wipe: withBlurb('hard directional reveal, playful, "notice the cut"; masks, so a whole-frame cut needs sceneUnits', {
    enter: (p, o) => style(wipe(p, o.dir)),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  iris: withBlurb('circular reveal growing from a point (cx/cy), masks, so a whole-frame cut needs sceneUnits', {
    enter: (p, o) => style(circleWipe(p, o.cx, o.cy)),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  clock: withBlurb('clock-hand sweep reveal, masks, so a whole-frame cut needs sceneUnits', {
    enter: (p) => style(clockWipe(p)),
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  flip: withBlurb('perspective hinge flip about an edge, cards and panels', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.5).toFixed(3), transform: `perspective(1400px) rotate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * 55).toFixed(1)}deg)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `perspective(1400px) rotate${axis(o.dir)}(${(-sign(o.dir) * p * 55).toFixed(1)}deg)` }),
  }),
  rise: withBlurb('translate up + fade in', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.3).toFixed(3), transform: `translateY(${((1 - p) * o.dist).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `translateY(${(-p * o.dist * 0.6).toFixed(2)}px)` }),
  }),
  // blur dissolve: the classic premium fade, defocus swaps for opacity doing all the work
  blur: withBlurb('resolve out of blur, calm, premium', {
    enter: (p) => style({ opacity: clamp01(p * 1.2).toFixed(3), filter: `blur(${((1 - p) * 16).toFixed(2)}px)` }),
    exit: (p) => style({ opacity: (1 - p).toFixed(3), filter: `blur(${(p * 16).toFixed(2)}px)` }),
  }),
  // zoom-through: camera pushes forward, outgoing shrinks away, incoming arrives from too-close
  zoom: withBlurb('push-through: the leaving beat shrinks away, the arriving one lands from too close, product focus', {
    enter: (p) => style({ opacity: clamp01(p * 1.5).toFixed(3), transform: `scale(${lerp(1.35, 1, p).toFixed(4)})`, filter: `blur(${((1 - p) * 10).toFixed(2)}px)` }),
    exit: (p) => style({ opacity: (1 - p * p).toFixed(3), transform: `scale(${lerp(1, 0.82, p).toFixed(4)})`, filter: `blur(${(p * 10).toFixed(2)}px)` }),
  }),
  // cube-ish perspective push: rotates in around a vertical/horizontal hinge
  cube: withBlurb('perspective hinge with travel, the beats turning like faces of a cube', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.4).toFixed(3), transform: `perspective(1400px) translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 2.4).toFixed(2)}px) rotate${axis(o.dir) === 'X' ? 'Y' : 'X'}(${((axis(o.dir) === 'X' ? -1 : 1) * sign(o.dir) * (1 - p) * 55).toFixed(1)}deg)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `perspective(1400px) translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 2.4).toFixed(2)}px) rotate${axis(o.dir) === 'X' ? 'Y' : 'X'}(${((axis(o.dir) === 'X' ? 1 : -1) * sign(o.dir) * p * 55).toFixed(1)}deg)` }),
  }),
  // barn doors: reveal opens from the center out
  barn: withBlurb('barn doors open from the centre outward, cinematic opener; masks, so a whole-frame cut needs sceneUnits', {
    enter: (p) => { const r = ((1 - clamp01(p)) * 50).toFixed(2); const c = `inset(0 ${r}% 0 ${r}%)`; return style({ opacity: clamp01(p * 3).toFixed(3), clipPath: c, WebkitClipPath: c }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  // soft wipe: the feathered-edge reveal. A 20%-wide gradient band instead of a hard line
  softwipe: withBlurb('feathered wipe, a 20%-wide gradient band instead of a hard line; masks, so a whole-frame cut needs sceneUnits', {
    enter: (p, o) => { const e = clamp01(p) * 130 - 5; return style({ ...mask(`linear-gradient(${gradAngle(o.dir)}, #000 ${(e - 18).toFixed(1)}%, transparent ${(e + 2).toFixed(1)}%)`) }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  // soft iris: feathered circular reveal from a point
  softiris: withBlurb('feathered circular reveal from a point (cx/cy), masks, so a whole-frame cut needs sceneUnits', {
    enter: (p, o) => { const r = clamp01(p) * 92; return style({ ...mask(`radial-gradient(circle at ${o.cx}% ${o.cy}%, #000 ${r.toFixed(1)}%, transparent ${(r + 14).toFixed(1)}%)`) }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  // squeeze: horizontal smear-stretch through the cut (speed-ramp feel)
  squeeze: withBlurb('smear-stretch along the travel axis, a speed ramp you can see', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.6).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 1.6).toFixed(2)}px) scale${axis(o.dir)}(${lerp(1.55, 1, p).toFixed(4)})`, filter: `blur(${((1 - p) * 8).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 1.6).toFixed(2)}px) scale${axis(o.dir)}(${lerp(1, 1.55, p).toFixed(4)})`, filter: `blur(${(p * 8).toFixed(2)}px)` }),
  }),
  // roll: rotates in from a corner tilt, settles level
  roll: withBlurb('tilts in from a corner and settles level', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.4).toFixed(3), transform: `rotate(${(sign(o.dir) * (1 - p) * 7).toFixed(2)}deg) translateY(${((1 - p) * o.dist * 0.8).toFixed(2)}px) scale(${lerp(0.96, 1, p).toFixed(4)})` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `rotate(${(-sign(o.dir) * p * 7).toFixed(2)}deg) translateY(${(-p * o.dist * 0.5).toFixed(2)}px)` }),
  }),
  // letterbox: reveal opens like cinema curtains top+bottom
  letterbox: withBlurb('cinema curtains open and close top and bottom, cinematic opener; masks, so a whole-frame cut needs sceneUnits', {
    enter: (p) => { const r = ((1 - clamp01(p)) * 50).toFixed(2); const c = `inset(${r}% 0 ${r}% 0)`; return style({ opacity: clamp01(p * 3).toFixed(3), clipPath: c, WebkitClipPath: c }); },
    exit: (p) => { const r = (clamp01(p) * 50).toFixed(2); const c = `inset(${r}% 0 ${r}% 0)`; return style({ opacity: (1 - p * 0.4).toFixed(3), clipPath: c, WebkitClipPath: c }); },
  }),
  // drop: falls in from above with a settle, exits by falling away
  drop: withBlurb('falls in from above under gravity, leaves by falling away', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.8).toFixed(3), transform: `translateY(${(-(1 - p) * (1 - p) * o.dist * 2.2).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translateY(${(p * p * o.dist * 2.2).toFixed(2)}px) rotate(${(p * 2.5).toFixed(2)}deg)` }),
  }),
  // venetian blinds: slat mask sweeps open (editorial reveal)
  blinds: withBlurb('venetian slat mask sweeps open, editorial reveal; masks, so a whole-frame cut needs sceneUnits', {
    enter: (p, o) => { const off = ((1 - clamp01(p)) * 120).toFixed(1); return style({ ...mask(`repeating-linear-gradient(${gradAngle(o.dir)}, #000 0 84px, transparent 84px 120px)`), maskSize: '100% 100%', maskPosition: `0 ${off}px`, WebkitMaskPosition: `0 ${off}px`, opacity: clamp01(p * 1.2 + 0.25).toFixed(3) }); },
    exit: (p) => style({ opacity: (1 - p).toFixed(3) }),
  }),
  // skew whip: the whip with shear that straightens, velocity you can see in the letterforms
  skewWhip: withBlurb('sheared throw whose shear straightens as it lands, velocity you can read in the letterforms, same-background beats only', {
    enter: (p, o) => style({ opacity: clamp01(p * 2).toFixed(3), transform: `translate${axis(o.dir)}(${(sign(o.dir) * (1 - p) * o.dist * 2.6).toFixed(2)}px) skew${axis(o.dir) === 'X' ? 'X' : 'Y'}(${(sign(o.dir) * (1 - p) * -12).toFixed(2)}deg)`, filter: `blur(${((1 - p) * 10).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p * p).toFixed(3), transform: `translate${axis(o.dir)}(${(-sign(o.dir) * p * o.dist * 2.6).toFixed(2)}px) skew${axis(o.dir) === 'X' ? 'X' : 'Y'}(${(-sign(o.dir) * p * 12).toFixed(2)}deg)`, filter: `blur(${(p * 10).toFixed(2)}px)` }),
  }),
  // spin: rotate + scale settle (logos, badges, seals)
  spin: withBlurb('rotate in with a scale settle, logos, badges, seals', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.6).toFixed(3), transform: `rotate(${(sign(o.dir) * (1 - p) * 90).toFixed(1)}deg) scale(${lerp(0.5, 1, p).toFixed(4)})` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `rotate(${(-sign(o.dir) * p * 60).toFixed(1)}deg) scale(${lerp(1, 0.7, p).toFixed(4)})` }),
  }),
  // collapse: vertical fold (terminal/data beats)
  collapse: withBlurb('vertical fold down to a line, terminal and data beats', {
    enter: (p) => style({ opacity: clamp01(p * 1.5).toFixed(3), transform: `scaleY(${lerp(0.05, 1, p).toFixed(4)})` }),
    exit: (p) => style({ opacity: (1 - p).toFixed(3), transform: `scaleY(${lerp(1, 0.05, p).toFixed(4)})` }),
  }),
  // rise-blur: slow premium arrival, rise through heavy defocus
  riseBlur: withBlurb('slow rise through heavy defocus, premium slow beats', {
    enter: (p, o) => style({ opacity: clamp01(p * 1.2).toFixed(3), transform: `translateY(${((1 - p) * o.dist * 0.8).toFixed(2)}px)`, filter: `blur(${((1 - p) * 22).toFixed(2)}px)` }),
    exit: (p, o) => style({ opacity: (1 - p).toFixed(3), transform: `translateY(${(-p * o.dist * 0.5).toFixed(2)}px)`, filter: `blur(${(p * 22).toFixed(2)}px)` }),
  }),
  // matchCut: the GRAPHIC MATCH, and the mechanism is a SHARED MASK carried across the junction.
  //
  // THE NAME AND THE RECIPE. An editor calls this a match cut (a graphic match, or an invisible cut
  // when it is meant not to be noticed): two shots joined because a shape in the first lines up with a
  // shape in the second, so the eye follows one continuous form and never registers the join. Every
  // other presentation in this file dissolves, moves or wipes BETWEEN two frames. This one holds a
  // shape STILL and swaps what is inside it.
  //
  // Three steps, and the third is the one that separates it from `iris`:
  //   1. the outgoing frame closes down to the shape,
  //   2. the content swaps at the closed state, a HARD cut inside a held shape,
  //   3. the incoming frame opens back out of the SAME shape, in the same place, at the same size.
  // `iris` and `softiris` do step 3 alone, against a plain fade-out, so the shape belongs to the
  // arriving shot only and there is nothing for the eye to carry.
  //
  // THE SWAP IS AT THE MIDPOINT, not at the ends, which is why each half is opacity-gated: at p = 0.5
  // the two frames are both clipped to the identical circle, the outgoing one stops painting and the
  // incoming one starts. A crossfade there would show two subjects through each other and lose the
  // match entirely.
  //
  // WHAT YOU STILL HAVE TO DO, because no engine can do it for you: put the two subjects in the same
  // place at the same size. `cx`/`cy` aim the shape; the match is only a match if the thing inside it
  // is the same shape in both shots. That is composition, and it is the whole craft of the device.
  // Masks the frame, so a whole-frame cut needs sceneUnits.
  matchCut: withBlurb('a GRAPHIC MATCH: both beats are clipped to the same circle at cx/cy, the content swaps inside it at the midpoint, and the shape opens back out. The eye follows one form across the join. Unlike `iris`, the shape belongs to BOTH shots, which is what makes it a match rather than a reveal. You still have to place the two subjects at the same size and spot; masks, so a whole-frame cut needs sceneUnits', {
    enter: (p, o) => {
      const q = clamp01(p);
      if (q >= 1) return style({});
      if (q < 0.5) return style({ opacity: '0' });     // the outgoing beat owns the first half
      const c = `circle(${lerp(MATCH_R, MATCH_FULL, (q - 0.5) * 2).toFixed(2)}% at ${o.cx}% ${o.cy}%)`;
      return style({ clipPath: c, WebkitClipPath: c });
    },
    exit: (p, o) => {
      const q = clamp01(p);
      if (q <= 0) return style({});
      if (q >= 0.5) return style({ opacity: '0' });    // swapped: the incoming beat owns the second half
      const c = `circle(${lerp(MATCH_FULL, MATCH_R, q * 2).toFixed(2)}% at ${o.cx}% ${o.cy}%)`;
      return style({ clipPath: c, WebkitClipPath: c });
    },
  }),
  // glitch jitter: quantized deterministic shake that decays as the scene lands
  jitter: withBlurb('decaying deterministic shake, alarm and glitch beats only', {
    enter: (p) => { const q = Math.floor(clamp01(p) * 10), amp = (1 - clamp01(p)) * 14; const jx = (frac(q * 12.9898 + 78.233) - 0.5) * 2 * amp, jy = (frac(q * 39.3468 + 11.135) - 0.5) * 2 * amp; return style({ opacity: clamp01(p * 2).toFixed(3), transform: `translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)` }); },
    exit: (p) => { const q = Math.floor(clamp01(p) * 10), amp = clamp01(p) * 14; const jx = (frac(q * 26.651 + 43.77) - 0.5) * 2 * amp, jy = (frac(q * 51.313 + 7.19) - 0.5) * 2 * amp; return style({ opacity: (1 - p).toFixed(3), transform: `translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)` }); },
  }),
};

// CUT_BLURBS: derived from the presentations, which each carry their own blurb (core/registry.js).
// Consumed by the generated docs table and by any catalog/MCP surface. There is no second list to keep
// in step: a presentation with no blurb throws here, naming itself.
// The MASK-ONLY styles (SOLO_BLIND, derived just below) say so: on a whole-frame cut there is nothing
// underneath them, so formats/scene/scene.js refuses them unless `sceneUnits: true` splits the beats.
export const CUT_BLURBS = blurbsOf('cut', PRESENTATIONS);

// ---- SOLO MODE: a cut applied to ONE root that carries the whole frame ----
// The A/B model above assumes two elements: the outgoing plays exit while the incoming plays enter,
// so the frame is always covered. Drive the SAME sequential pair onto a single root and the two
// halves stack in time instead of in space. The root dims/masks itself to nothing at the midpoint
// and the frame goes empty (MISTAKES #166). Solo mode holds every VISIBILITY channel at identity and
// lets the transition ride on transform + filter alone, so anything on screen stays on screen.
const HIDE_CHANNELS = ['opacity', 'clipPath', 'WebkitClipPath', 'maskImage', 'WebkitMaskImage', 'maskSize', 'maskPosition', 'WebkitMaskPosition'];
const KEEP_CHANNELS = ['transform', 'filter'];

// SOLO_BLIND: presentations whose whole transition lives in the visibility channels: strip those and
// nothing moves, so on a single root they are a silent no-op. DERIVED by probing the presentations,
// never hand-listed, so a newly added style classifies itself. Callers must refuse the combination
// loudly rather than render an invisible transition.
export const SOLO_BLIND = new Set(Object.keys(PRESENTATIONS).filter((name) => {
  const P = PRESENTATIONS[name], o = { dir: 'left', dist: 90, cx: 50, cy: 50 };
  const ident = KEEP_CHANNELS.map((k) => IDENT[k]).join('|');
  for (let i = 1; i < 10; i++) {
    const p = i / 10;
    for (const s of [P.enter(p, o), P.exit(p, o)]) if (KEEP_CHANNELS.map((k) => s[k]).join('|') !== ident) return false;
  }
  return true;
}));

// cutWrites(name, {solo}): the CSS channels this presentation actually MOVES away from identity.
// DERIVED by probing the presentation, exactly like SOLO_BLIND above and for the same reason: a
// presentation added tomorrow classifies itself and no hand-kept list can drift from it.
//
// It exists because a cut writes onto an ANCESTOR of every layer, and some ancestor properties
// silently disable what a descendant can do (core/ancestor-kills.js). The refusal has to name the
// property, so something has to know which ones a given cut style touches.
//
// The vendor-prefixed and sub-property spellings collapse onto the one name the matrix reasons about:
// `WebkitMaskImage`, `maskSize` and `maskPosition` are all "this cut masks".
const CHANNEL = { WebkitClipPath: 'clipPath', WebkitMaskImage: 'maskImage', maskSize: 'maskImage',
  maskPosition: 'maskImage', WebkitMaskPosition: 'maskImage' };
export function cutWrites(name, { solo = false } = {}) {
  const P = PRESENTATIONS[name];
  if (!P) throw new Error(`cutWrites: unknown cut style "${name}"`);
  const o = { dir: 'left', dist: 90, cx: 50, cy: 50 }, out = new Set();
  for (let i = 1; i < 10; i++) {
    const p = i / 10;
    for (const s of [P.enter(p, o), P.exit(p, o)]) {
      for (const k of Object.keys(IDENT)) {
        if (s[k] === IDENT[k]) continue;
        if (solo && HIDE_CHANNELS.includes(k)) continue;   // solo pins the visibility channels open
        out.add(CHANNEL[k] || k);
      }
    }
  }
  return out;
}

// exported for the solo-mode style builder in ./index.js, which pins these channels back open.
export { HIDE_CHANNELS };
