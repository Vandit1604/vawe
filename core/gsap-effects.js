// core/gsap-effects.js — a NAMED library of GSAP effects, registered via gsap.registerEffect so a scene
// can reference one by name: `"fx": "popIn"` or `"fx": { "name": "elasticIn", "dur": 1.2 }` or an array
// `"fx": ["blurIn", "float"]` (an entrance + a loop). Ported from the common GSAP/web motion vocabulary.
// Everything is a fromTo/to tween on the (paused, ticker-stopped) global timeline, so seekAll(t) makes it
// pure in n. Add a row here and it is instantly referenceable from JSON — the "store effects, reference
// by name" model. Pair an entrance with `anim:"none"` so GSAP owns the transform.

// ENTRANCES — one-shot fromTo. `_p` marks effects that need 3D perspective (flips).
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

export function registerGsapEffects(gsap) {
  if (!gsap || gsap.__vaweEffects) return;
  for (const [name, e] of Object.entries(ENTRANCES)) {
    gsap.registerEffect({
      name,
      defaults: { duration: e.dur, ease: e.ease },
      effect: (targets, cfg) => {
        const from = { ...e.from }, to = { ...e.to, duration: cfg.duration, ease: cfg.ease, delay: cfg.delay || 0, immediateRender: true };
        if (e._p) { from.transformPerspective = 800; to.transformPerspective = 800; }
        return gsap.fromTo(targets, from, to);
      },
    });
  }
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

// the names, for the schema/docs to derive instead of restating.
export const GSAP_FX = [...Object.keys(ENTRANCES), ...Object.keys(LOOPS)];
