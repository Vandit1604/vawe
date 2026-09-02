import { defineRegistry } from './registry.js';
// core/gsap-effects.js: a NAMED library of GSAP effects, registered via gsap.registerEffect so a scene
// can reference one by name: `"fx": "popIn"` or `"fx": { "name": "elasticIn", "dur": 1.2 }` or an array
// `"fx": ["blurIn", "float"]` (an entrance + a loop). Exits go in the sibling field `"fxOut": "blurOut"`.
// Ported from the common GSAP/web motion vocabulary. Everything is a fromTo/to tween on the (paused,
// ticker-stopped) global timeline, so seekAll(t) makes it pure in n. Add a row here and it is instantly
// referenceable from JSON. The "store effects, reference by name" model.
//
//   ENTRANCES / TEXT  → pair with anim:"none" so GSAP owns the transform. immediateRender pins t=0.
//   EXITS             → via `fxOut`; anchored to the layer's exit time, immediateRender:false so the
//                       layer holds its built state until the exit begins, then animates away.

// ENTRANCES: one-shot fromTo. `_p` marks effects that need 3D perspective (flips/tilts).
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

// PER-LETTER TEXT, same fromTo shape as entrances, but tuned to read one glyph at a time (they ride the
// split-layer units path, which staggers automatically). Transform/filter/opacity only, so still pure in n.
const TEXT = {
  charFold:        { _p: 1, from: { opacity: 0, rotationX: -90, transformOrigin: 'bottom center' }, to: { opacity: 1, rotationX: 0 }, ease: 'back.out(1.6)', dur: 0.5 },
  charTilt:        { _p: 1, from: { opacity: 0, rotationY: 70, y: 10 }, to: { opacity: 1, rotationY: 0, y: 0 }, ease: 'power3.out', dur: 0.5 },
  charBlurCascade: { from: { opacity: 0, y: 22, filter: 'blur(10px)' }, to: { opacity: 1, y: 0, filter: 'blur(0px)' }, ease: 'power2.out', dur: 0.55 },
  charOvershoot:   { from: { opacity: 0, y: 40, scale: 0.7 }, to: { opacity: 1, y: 0, scale: 1 }, ease: 'back.out(2.2)', dur: 0.5 },
};

// EXITS: one-shot fromTo that LEAVES. Anchored to the layer exit (scene.html sets the delay); the tween
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

// LOOPS: continuous emphasis (repeat:-1, yoyo). Seeked to t → state at t mod period → deterministic.
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

// GSAP_BLURBS: one line per named effect, next to the registry that defines it (the `blurb` pattern of
// blocks/catalog.mjs). Consumed by the generated docs table and by any catalog/MCP surface; a key here
// with no effect, or an effect with no key, is a bug. Character comes from the ease: back overshoots and
// settles, elastic/bounce wobble, power4/expo are fast-then-long-settle, sine.inOut never stops.
export const GSAP_BLURBS = {
  // entrances
  fadeIn: 'plain opacity fade, nothing moves. The neutral default when motion would distract',
  fadeUp: 'lifts 60px into place while fading. The workhorse entrance for body copy and cards',
  fadeDown: 'as fadeUp but settling downward from above, for anything hanging off a header',
  flyLeft: 'travels in from off the left edge and decelerates hard, pair with a leftward exit',
  flyRight: 'travels in from off the right edge and decelerates hard, pair with a rightward exit',
  popIn: 'springs up from 60% and overshoots slightly past full size before settling, playful, for badges and chips',
  zoomIn: 'grows from a fifth of its size on a plain decelerate, no overshoot. Bigger travel than popIn, calmer landing',
  zoomBlur: 'rushes back from too close while the defocus resolves. A camera pulling focus, premium hero beat',
  blurIn: 'resolves out of heavy defocus in place, calm, premium, no travel at all',
  elasticIn: 'springs from tiny and wobbles several times before it stills, over a slow 1.1s, only ever playful, never for a serious brand',
  bounceIn: 'drops in from above and bounces on landing, cartoon weight, for a punchline',
  backIn: 'rises 90px and overshoots past its mark before settling, as fadeUp with a spring on the end',
  dropIn: 'as bounceIn but falling from much further up, so it lands harder',
  spinIn: 'rotates a half turn anticlockwise while growing, overshooting on the settle, logos, badges, seals',
  rollIn: 'rolls in from the left, its rotation unwinding as it travels, reads as a wheel arriving',
  skewIn: 'slides in sheared and straightens as it lands, velocity you can read in the letterforms',
  flipInX: 'hinges up into the frame about its horizontal axis, cards and panels, needs 3D perspective',
  flipInY: 'hinges in about its vertical axis, like a page turning. Cards and panels, needs 3D perspective',
  clipUp: 'a hard bottom-to-top wipe that uncovers the layer in place, opacity untouched, type reveals behind a mask',
  maskReveal: 'a hard left-to-right wipe, fast then a long settle. The premium editorial reveal for a headline',
  revealUp: 'clipUp plus a short lift and fade, so the layer rises as it is uncovered, the fuller version of clipUp',
  expandIn: 'letters start crushed together and spread out of blur to their real tracking, a title-card open',
  tiltIn: 'swings open about its left edge, like a door facing the camera, needs 3D perspective',
  driftIn: 'floats a short diagonal out of soft blur, slowly. The quietest entrance here, for atmosphere',
  glitchIn: 'snaps in through five hard steps, sheared and offset. No smoothing at all, alarm and glitch beats only',
  foldIn: 'unfolds downward from its top edge and springs level, dropdowns, panels, receipts; needs 3D perspective',
  // per-letter text (ride the split-layer units path, so they stagger glyph by glyph)
  charFold: 'each glyph unfolds up from its own baseline with a small overshoot, kinetic type, warm',
  charTilt: 'each glyph swings in about its vertical axis and straightens, kinetic type, needs 3D perspective',
  charBlurCascade: 'each glyph rises out of blur in turn, the calm, premium per-letter reveal',
  charOvershoot: 'each glyph pops up from small and springs past its mark, the loudest per-letter reveal',
  // loops (repeat forever, never settle, never use one as an entrance)
  float: 'LOOP, never settles: rises and sinks 18px forever, idle life for a hero object',
  pulse: 'LOOP, never settles: breathes 6% larger and back every second, draws the eye to a CTA',
  breathe: 'LOOP, never settles: a slow 2.2s swell with a slight dim, ambient, calmer than pulse',
  wobble: 'LOOP, never settles: rocks 3 degrees each way, restless, for a warning or a toy',
  swing: 'LOOP, never settles: a slow pendulum rock. Hanging objects; needs 3D perspective',
  drift: 'LOOP, never settles: a very slow 3s sideways wander. Background parallax, easy to miss on purpose',
  heartbeat: 'LOOP, never settles: a fast 12% throb twice a second. Urgency, live counts, recording dots',
};

// GSAP_EXIT_BLURBS: one line per EXITS entry, i.e. the values valid in `fxOut`. Exits use `.in` eases,
// so they ACCELERATE away rather than decelerating in.
export const GSAP_EXIT_BLURBS = {
  fadeOut: 'plain opacity fade to nothing, the neutral exit, safe under any cut',
  fadeOutUp: 'accelerates upward off its mark as it fades, the exit that pairs with fadeDown',
  fadeOutDown: 'accelerates downward as it fades, the exit that pairs with fadeUp',
  flyOutLeft: 'throws off the left edge, gathering speed. The exit that pairs with flyRight',
  flyOutRight: 'throws off the right edge, gathering speed, the exit that pairs with flyLeft',
  popOut: 'shrinks away with a small anticipation swell first, the mirror of popIn, playful',
  zoomOut: 'swells past the camera as it fades, product focus, the leaving beat gets out of the way',
  blurOut: 'defocuses away without moving, correct for faces, cards and dense grids, where sliding reads as chaos',
  dropOut: 'falls out of the bottom of the frame under gravity, a thing discarded',
  collapseOut: 'folds down flat to a line from its top edge, terminal output, rows, receipts',
  spinOut: 'rotates a half turn while shrinking away, winding up before it goes, the mirror of spinIn',
};

// the names, for the schema/docs to derive instead of restating. EXIT_FX are the ones valid in `fxOut`.
export const GSAP_FX = [...Object.keys(ONESHOT), ...Object.keys(LOOPS)];

// The loops, NAMED, because the flat list above cannot tell an entrance from something that never
// settles. `float`/`pulse`/`breathe`/`wobble`/`swing`/`drift`/`heartbeat` repeat forever by design, and a
// layer given one as its entrance simply never arrives. It reads as a render that hung, and no gate can
// currently say so because nothing distinguishes the two halves of GSAP_FX. Exported so one can.
export const LOOP_FX = Object.keys(LOOPS);
export const ONESHOT_FX = Object.keys(ONESHOT);
export const EXIT_FX = Object.keys(EXITS);
// default duration per effect, so scene.html can anchor an exit so it ENDS exactly at the layer's end.
export const FX_DUR = Object.fromEntries(
  Object.entries({ ...ONESHOT, ...EXITS, ...LOOPS }).map(([k, v]) => [k, v.dur]));

// Registered so a name in the WRONG SLOT is diagnosable: `anim:"popIn"` is told popIn is a gsap effect.
// Three shipped layers made exactly that mistake and silently faded for months (docs/MISTAKES.md #355).
// The blurbs are PASSED, not merely exported. They were written (48 of them, above) and both
// registries were built without them, so `defineRegistry` carried `blurbs: null` and every tool that
// asks a registry what a name MEANS got nothing for the two largest effect families. Measured the day
// this was found: `EXIT_FX` had zero users across 153 scenes and `GSAP_FX` 31 of 37 unused, which is
// what an undescribed vocabulary looks like from the outside. Written and unread is the same as unwritten.
// "letters get squeezed together kerning" found nothing, though `expandIn` is exactly that and its blurb
// even says "tracking". Type vocabulary has three words for one thing and a blurb can only use one.
const GSAP_AKA = { expandIn: ['kerning', 'letter-spacing', 'letterspacing', 'tracking out'] };
export const GSAP_REGISTRY = defineRegistry('gsap effect',
  Object.fromEntries(GSAP_FX.map((n) => [n, n])), { slot: 'fx', blurbs: GSAP_BLURBS, aka: GSAP_AKA,
  catalog: {
    title: 'GSAP named effects',
    tag: 'per-layer/text',
    intro: '`fx` (enter) / `fxOut` (exit); per-letter on a `split` layer. `{ "anim":"none", "fx":"charOvershoot" }`',
    usage: (n, { text }) => text({ anim: 'none', fx: n }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, anim: 'none', fx: n }] }),
  },
});
export const GSAP_EXIT_REGISTRY = defineRegistry('gsap exit',
  Object.fromEntries(EXIT_FX.map((n) => [n, n])), { slot: 'fxOut', blurbs: GSAP_EXIT_BLURBS,
  catalog: {
    title: 'GSAP exits',
    tag: 'exit',
    intro: '`fxOut`: pair every entrance with a directional exit.',
    usage: (n, { text }) => text({ anim: 'rise', fxOut: n, exitDur: 0.6 }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, anim: 'rise', fxOut: n, exitDur: 1, start: 0.4, duration: 4.2 }] }),
  },
});

// ---- DEPRECATED: names that duplicate an `anim` exactly ------------------------------------------
//
// The engine has FOUR vocabularies for "how does this appear": `anim` (19), kinetic `preset` (27),
// `fx` (37) and `parts[].anim` (6), 89 names for one idea, with FIVE spelled identically in two of
// them at once (`up`, `scale`, `swing`, `fadeUp`, `popIn`). That overlap is not cosmetic: three of the
// five layers stranded in docs/MISTAKES.md #355 were real names written into the wrong slot, because an
// author who learns one vocabulary reasonably expects its words in the next field along.
//
// These 16 are the ones that can go without losing a capability. Each has an exact `anim`/`out`
// equivalent that works on ANY layer type. The rest STAY, and the reason is worth stating: a kinetic
// preset only works on a TEXT layer with `split`, so `bounceIn` is NOT a duplicate of `preset:"bounce"`
// on an image. It is the only way to bounce one. `blurIn`, `elasticIn`, `dropIn`, `spinIn`, `rollIn`,
// `skewIn`, `flipInX/Y`, `clipUp`, `maskReveal`, `revealUp`, `tiltIn`, `driftIn`, `glitchIn`, `foldIn`,
// the four `char*` effects and every idle loop all survive that test.
//
// Deprecated, not deleted. Nothing in this library names one, but a fork might; the notice ships first
// and the removal comes after. docs/MISTAKES.md #364.
export const DEPRECATED_FX = {
  fadeIn: 'anim:"fade"', fadeUp: 'anim:"rise"', fadeDown: 'anim:"slide-down"',
  flyLeft: 'anim:"slide-left"', flyRight: 'anim:"slide-right"',
  popIn: 'anim:"pop"', zoomIn: 'anim:"scale"', expandIn: 'anim:"scale"',
};
export const DEPRECATED_EXIT = {
  fadeOut: 'out:"fade"', fadeOutUp: 'out:"slide-up"', fadeOutDown: 'out:"slide-down"',
  flyOutLeft: 'out:"slide-left"', flyOutRight: 'out:"slide-right"',
  popOut: 'out:"pop"', zoomOut: 'out:"scale"', blurOut: 'out:"defocus"',
};
