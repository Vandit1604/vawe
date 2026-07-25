// core/gsap-effects.js — a NAMED library of GSAP effects, registered via gsap.registerEffect so a scene
// can reference one by name: `"fx": "popIn"` or `"fx": { "name": "elasticIn", "dur": 1.2 }` or an array
// `"fx": ["blurIn", "float"]` (an entrance + a loop). Exits go in the sibling field `"fxOut": "blurOut"`.
// Ported from the common GSAP/web motion vocabulary. Everything is a fromTo/to tween on the (paused,
// ticker-stopped) global timeline, so seekAll(t) makes it pure in n. Add a row here and it is instantly
// referenceable from JSON — the "store effects, reference by name" model.
//
//   ENTRANCES / TEXT  → pair with anim:"none" so GSAP owns the transform. immediateRender pins t=0.
//   EXITS             → via `fxOut`; anchored to the layer's exit time, immediateRender:false so the
//                       layer holds its built state until the exit begins, then animates away.

// ENTRANCES — one-shot fromTo. `_p` marks effects that need 3D perspective (flips/tilts).
const ENTRANCES = {
  fadeIn:     { from: { opacity: 0 }, to: { opacity: 1 }, ease: 'power2.out', dur: 0.6 },
  fadeUp:     { from: { opacity: 0, y: 60 }, to: { opacity: 1, y: 0 }, ease: 'power3.out', dur: 0.6 },
  fadeDown:   { from: { opacity: 0, y: -60 }, to: { opacity: 1, y: 0 }, ease: 'power3.out', dur: 0.6 },
  flyLeft:    { from: { opacity: 0, x: -320 }, to: { opacity: 1, x: 0 }, ease: 'power3.out', dur: 0.7 },
  flyRight:   { from: { opacity: 0, x: 320 }, to: { opacity: 1, x: 0 }, ease: 'power3.out', dur: 0.7 },
  popIn:      { from: { opacity: 0, scale: 0.6 }, to: { opacity: 1, scale: 1 }, ease: 'back.out(1.7)', dur: 0.55 },
  zoomIn:     { from: { opacity: 0, scale: 0.2 }, to: { opacity: 1, scale: 1 }, ease: 'power2.out', dur: 0.6 },
  zoomBlur:   { from: { opacity: 0, scale: 1.4, filter: 'blur(16px)' }, to: { opacity: 1, scale: 1, filter: 'blur(0px)' }, ease: 'power3.out', dur: 0.7 },
  blurIn:     { from: { opacity: 0, filter: 'blur(14px)' }, to: { opacity: 1, filter: 'blur(0px)' }, ease: 'power2.out', dur: 0.6 },
  elasticIn:  { from: { opacity: 0, scale: 0.3 }, to: { opacity: 1, scale: 1 }, ease: 'elastic.out(1,0.5)', dur: 1.1 },
  bounceIn:   { from: { opacity: 0, y: -140 }, to: { opacity: 1, y: 0 }, ease: 'bounce.out', dur: 1.0 },
  backIn:     { from: { opacity: 0, y: 90 }, to: { opacity: 1, y: 0 }, ease: 'back.out(2)', dur: 0.7 },
  dropIn:     { from: { opacity: 0, y: -220 }, to: { opacity: 1, y: 0 }, ease: 'bounce.out', dur: 1.0 },
  spinIn:     { from: { opacity: 0, rotation: -180, scale: 0.4 }, to: { opacity: 1, rotation: 0, scale: 1 }, ease: 'back.out(1.4)', dur: 0.9 },
  rollIn:     { from: { opacity: 0, x: -240, rotation: -120 }, to: { opacity: 1, x: 0, rotation: 0 }, ease: 'power3.out', dur: 0.8 },
  skewIn:     { from: { opacity: 0, skewX: 22, x: 80 }, to: { opacity: 1, skewX: 0, x: 0 }, ease: 'power3.out', dur: 0.7 },
  flipInX:    { _p: 1, from: { opacity: 0, rotationX: -90 }, to: { opacity: 1, rotationX: 0 }, ease: 'power3.out', dur: 0.8 },
  flipInY:    { _p: 1, from: { opacity: 0, rotationY: 90 }, to: { opacity: 1, rotationY: 0 }, ease: 'power3.out', dur: 0.8 },
  // added: reveals that wipe or open rather than slide, and a stepped glitch-in.
  clipUp:     { from: { opacity: 1, clipPath: 'inset(100% 0 0 0)', y: 0 }, to: { opacity: 1, clipPath: 'inset(0% 0 0 0)' }, ease: 'power3.out', dur: 0.7 },
  maskReveal: { from: { opacity: 1, clipPath: 'inset(0 100% 0 0)' }, to: { opacity: 1, clipPath: 'inset(0 0% 0 0)' }, ease: 'power4.out', dur: 0.8 },
  revealUp:   { from: { opacity: 0, y: 48, clipPath: 'inset(100% 0 0 0)' }, to: { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }, ease: 'power3.out', dur: 0.75 },
  expandIn:   { from: { opacity: 0, letterSpacing: '-0.3em', filter: 'blur(6px)' }, to: { opacity: 1, letterSpacing: '0em', filter: 'blur(0px)' }, ease: 'power3.out', dur: 0.9 },
  tiltIn:     { _p: 1, from: { opacity: 0, rotationY: 55, x: 120, transformOrigin: 'left center' }, to: { opacity: 1, rotationY: 0, x: 0 }, ease: 'power3.out', dur: 0.8 },
  driftIn:    { from: { opacity: 0, x: 40, y: 24, filter: 'blur(8px)' }, to: { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }, ease: 'power2.out', dur: 0.9 },
  glitchIn:   { from: { opacity: 0, x: -18, skewX: 12 }, to: { opacity: 1, x: 0, skewX: 0 }, ease: 'steps(5)', dur: 0.5 },
  foldIn:     { _p: 1, from: { opacity: 0, rotationX: -80, scaleY: 0.4, transformOrigin: 'top center' }, to: { opacity: 1, rotationX: 0, scaleY: 1 }, ease: 'back.out(1.5)', dur: 0.8 },
};

// PER-LETTER TEXT — same fromTo shape as entrances, but tuned to read one glyph at a time (they ride the
// split-layer units path, which staggers automatically). Transform/filter/opacity only, so still pure in n.
const TEXT = {
  charFold:        { _p: 1, from: { opacity: 0, rotationX: -90, transformOrigin: 'bottom center' }, to: { opacity: 1, rotationX: 0 }, ease: 'back.out(1.6)', dur: 0.5 },
  charTilt:        { _p: 1, from: { opacity: 0, rotationY: 70, y: 10 }, to: { opacity: 1, rotationY: 0, y: 0 }, ease: 'power3.out', dur: 0.5 },
  charBlurCascade: { from: { opacity: 0, y: 22, filter: 'blur(10px)' }, to: { opacity: 1, y: 0, filter: 'blur(0px)' }, ease: 'power2.out', dur: 0.55 },
  charOvershoot:   { from: { opacity: 0, y: 40, scale: 0.7 }, to: { opacity: 1, y: 0, scale: 1 }, ease: 'back.out(2.2)', dur: 0.5 },
};

// EXITS — one-shot fromTo that LEAVES. Anchored to the layer exit (scene.html sets the delay); the tween
// is built with immediateRender:false so the element holds its natural state until the exit begins.
const EXITS = {
  fadeOut:     { from: { opacity: 1 }, to: { opacity: 0 }, ease: 'power2.in', dur: 0.5 },
  fadeOutUp:   { from: { opacity: 1, y: 0 }, to: { opacity: 0, y: -60 }, ease: 'power3.in', dur: 0.5 },
  fadeOutDown: { from: { opacity: 1, y: 0 }, to: { opacity: 0, y: 60 }, ease: 'power3.in', dur: 0.5 },
  flyOutLeft:  { from: { opacity: 1, x: 0 }, to: { opacity: 0, x: -320 }, ease: 'power3.in', dur: 0.55 },
  flyOutRight: { from: { opacity: 1, x: 0 }, to: { opacity: 0, x: 320 }, ease: 'power3.in', dur: 0.55 },
  popOut:      { from: { opacity: 1, scale: 1 }, to: { opacity: 0, scale: 0.6 }, ease: 'back.in(1.7)', dur: 0.45 },
  zoomOut:     { from: { opacity: 1, scale: 1 }, to: { opacity: 0, scale: 1.6 }, ease: 'power2.in', dur: 0.5 },
  blurOut:     { from: { opacity: 1, filter: 'blur(0px)' }, to: { opacity: 0, filter: 'blur(14px)' }, ease: 'power2.in', dur: 0.5 },
  dropOut:     { from: { opacity: 1, y: 0 }, to: { opacity: 0, y: 220 }, ease: 'power2.in', dur: 0.55 },
  collapseOut: { from: { opacity: 1, scaleY: 1, transformOrigin: 'top center' }, to: { opacity: 0, scaleY: 0 }, ease: 'power3.in', dur: 0.45 },
  spinOut:     { from: { opacity: 1, rotation: 0, scale: 1 }, to: { opacity: 0, rotation: 180, scale: 0.4 }, ease: 'back.in(1.4)', dur: 0.6 },
};

// LOOPS — continuous emphasis (repeat:-1, yoyo). Seeked to t → state at t mod period → deterministic.
const LOOPS = {
  float:     { to: { y: -18 }, ease: 'sine.inOut', dur: 1.8 },
  pulse:     { to: { scale: 1.06 }, ease: 'sine.inOut', dur: 1.0 },
  breathe:   { to: { scale: 1.03, opacity: 0.86 }, ease: 'sine.inOut', dur: 2.2 },
  wobble:    { to: { rotation: 3 }, ease: 'sine.inOut', dur: 0.7 },
  swing:     { _p: 1, to: { rotationZ: 4 }, ease: 'sine.inOut', dur: 1.4 },
  drift:     { to: { x: 14 }, ease: 'sine.inOut', dur: 3.0 },
  heartbeat: { to: { scale: 1.12 }, ease: 'power1.inOut', dur: 0.5 },
};

// The one-shot families share a fromTo registration; only the immediateRender anchor differs (an entrance
// pins t=0, an exit holds until its delay). EXITS carry `_exit` so registration flips that flag.
const ONESHOT = { ...ENTRANCES, ...TEXT };

export function registerGsapEffects(gsap) {
  if (!gsap || gsap.__vaweEffects) return;
  const registerOneShot = (name, e, isExit) => {
    gsap.registerEffect({
      name,
      defaults: { duration: e.dur, ease: e.ease },
      effect: (targets, cfg) => {
        const from = { ...e.from }, to = { ...e.to, duration: cfg.duration, ease: cfg.ease, delay: cfg.delay || 0, immediateRender: !isExit };
        if (e._p) { from.transformPerspective = 800; to.transformPerspective = 800; }
        return gsap.fromTo(targets, from, to);
      },
    });
  };
  for (const [name, e] of Object.entries(ONESHOT)) registerOneShot(name, e, false);
  for (const [name, e] of Object.entries(EXITS)) registerOneShot(name, e, true);
  for (const [name, e] of Object.entries(LOOPS)) {
    gsap.registerEffect({
      name,
      defaults: { duration: e.dur, ease: e.ease },
      effect: (targets, cfg) => {
        const to = { ...e.to, duration: cfg.duration, ease: cfg.ease, delay: cfg.delay || 0, repeat: -1, yoyo: true };
        if (e._p) to.transformPerspective = 800;
        return gsap.to(targets, to);
      },
    });
  }
  gsap.__vaweEffects = true;
}

// the names, for the schema/docs to derive instead of restating. EXIT_FX are the ones valid in `fxOut`.
export const GSAP_FX = [...Object.keys(ONESHOT), ...Object.keys(LOOPS)];
export const EXIT_FX = Object.keys(EXITS);
// default duration per effect, so scene.html can anchor an exit so it ENDS exactly at the layer's end.
export const FX_DUR = Object.fromEntries(
  Object.entries({ ...ONESHOT, ...EXITS, ...LOOPS }).map(([k, v]) => [k, v.dur]));
