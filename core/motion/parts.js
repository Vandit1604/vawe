// core/parts.js. The `parts` vocabulary: named entrances for the SUB-ELEMENTS of a hand-authored
// html/svg layer. A figure grows its bars, then draws its line, then pops its dots.
//
// It lived inline inside films/scene/scene.js's build path until engine-doctrine/MISTAKES.md #355. That is why it
// was the only vocabulary in the engine with no catalogue entry, no blurb map and no gate: nothing could
// import it to enumerate it. It also resolved `PARTS[p.anim] || PARTS.fadeUp`, so a mistyped part
// entrance silently faded up - the eighth instance of that pattern found in one sweep.
//
// Each entry is [staticSetup(target) | null, fromVars, toVars, outVars] and every one is a
// compositor-friendly transform / opacity / dashoffset, driven by GSAP and seeked per frame like
// everything else.
//
// THE FOURTH SLOT IS THE EXIT, AND IT IS NOT A REVERSAL. A part could arrive and never leave: every
// entry was a one-way tween, so a hand-authored html figure faded out as ONE card while a native
// layer stack left piece by piece. That difference was read as a limit of hand-written HTML in a
// head-to-head build. It was not. It was this missing slot.
//
// Whether an exit reverses or CONTINUES is decided per entry by what the part is doing, following the
// rule CLAUDE.md already states for layers: "a layer that enters from the right should leave to the
// left, one continuous direction of travel per beat, never enter-and-retreat".
//   * A TRANSLATE continues. `fadeUp` rises in from +24 and leaves upward through -24. Retreating back
//     down to +24 is the enter-and-retreat the house rule refuses.
//   * A SCALE reverses, because there is no "onward" for a bar that grew from its own baseline: it
//     shrinks back to it. Continuing past 1 would be a different gesture entirely.
//   * `drawOn` un-draws, which is the same argument as a scale: a stroke's onward direction is off the
//     end of its own path, and it has nowhere to go.
import { defineRegistry } from '../registry/registry.js';

// The layer prop that turns this vocabulary on. Declared here, beside the vocabulary, so core/preload.js
// cannot be the only place that knows a `parts` layer needs GSAP loaded. That was #148 exactly.
export const GSAP_TRIGGER = 'parts';

      // author reaches for on a figure; every one is a compositor-friendly transform/opacity/dashoffset.
export const PARTS = {
    growUp: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 100%'; }, { scaleY: 0 }, { scaleY: 1 }, { scaleY: 0 }],
    widen: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '0% 50%'; }, { scaleX: 0 }, { scaleX: 1 }, { scaleX: 0 }],
    popIn: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 50%'; }, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0 }],
    fadeUp: [null, { y: 24, opacity: 0 }, { y: 0, opacity: 1 }, { y: -24, opacity: 0 }],
    riseIn: [null, { y: 48, opacity: 0 }, { y: 0, opacity: 1 }, { y: -48, opacity: 0 }],
    // REAL length, not the `pathLength="1"` normalise trick: GSAP/the browser round a px-unit style
    // value to the nearest whole pixel, so animating strokeDashoffset across a [0,1] normalised range
    // has only two representable states (1px, 0px) and a seven-second draw renders as a one-frame
    // snap partway through. getTotalLength() gives GSAP hundreds of real pixels to interpolate
    // across, so the rounding is imperceptible. Same fix shape as core/layers/svg.js's applyDraw
    // (engine-doctrine/MISTAKES.md #581), for a different, GSAP-side reason: that bug was Chromium's own
    // arc-flattening estimate disagreeing with pathLength=1, not integer px rounding.
    drawOn: [(t) => {
      try { t.removeAttribute('pathLength'); } catch (e) {}
      const total = typeof t.getTotalLength === 'function' ? t.getTotalLength() : 0;
      t.__drawLen = total;
      t.style.strokeDasharray = `${total} ${total}`;
    }, { strokeDashoffset: (i, t) => t.__drawLen ?? 0 }, { strokeDashoffset: 0 }, { strokeDashoffset: (i, t) => t.__drawLen ?? 0 }],
    // THESE THREE TAKE THE LAYER'S OWN NAMES, and the casing mismatch beside `fadeUp` is deliberate.
    // The two vocabularies had ZERO overlap: nineteen layer `anim` names, six part entrances, not one
    // word shared. So an author who already knew `anim: "fade"` had to learn a second, disjoint set to
    // animate the pieces of a figure. One name meaning one thing in both slots is worth more than this
    // file reading consistently.
    // `fade` is the gap that mattered most: `fadeUp` was the documented "quiet default" and it MOVES,
    // so there was no way to bring a part in without displacing it.
    // The slides are the other axis. Every part entrance translated on Y and none on X.
    fade: [null, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
    'slide-left': [null, { x: -40, opacity: 0 }, { x: 0, opacity: 1 }, { x: 40, opacity: 0 }],
    'slide-right': [null, { x: 40, opacity: 0 }, { x: 0, opacity: 1 }, { x: -40, opacity: 0 }],
  };

export const PART_BLURBS = {
  growUp: 'scales up from its own bottom edge, a bar growing to its reading',
  widen: 'scales out from its left edge. A row, a rule, anything that should fill rather than appear',
  popIn: 'scales from nothing at its centre with a fade, dots, chips, markers',
  fadeUp: 'a short rise with a fade, the quiet default for any part',
  riseIn: 'a longer rise with a fade, for parts that should feel like they arrive',
  drawOn: 'an SVG stroke draws itself along its own path, measured at build with getTotalLength()',
  fade: 'opacity alone, no displacement · the quiet default when a part should arrive without moving',
  'slide-left': 'enters from its left and, with `out`, keeps going right · one direction of travel, never a retreat',
  'slide-right': 'enters from its right and, with `out`, keeps going left · the mirror of slide-left',
};

export const PART_REGISTRY = defineRegistry('part entrance', PARTS, { slot: 'parts[].anim', blurbs: PART_BLURBS,
  catalog: {
    title: 'Part entrances',
    tag: 'per-layer',
    intro: 'THE BRIDGE between hand-written markup and the engine\'s clock. `parts: [{ select, anim, each, stagger, delay, out, exitDur }]` on a hand-authored html/svg layer. A CSS SELECTOR into your own markup, and every matched element gets an engine-driven, SEEKED entrance with a stagger, so a figure can grow its bars, then draw its line, then pop its dots. `out: true` gives each part its paired exit, anchored to the layer\'s end, so a hand-authored figure leaves piece by piece instead of fading as one card. That is the whole point on an `html` layer: the markup keeps the entire CSS surface AND the clock still owns each piece, which a hand-rolled `calc()` off `var(--t)` never gives back. A translate exit CONTINUES and a scale exit REVERSES, the same never-enter-and-retreat rule layers follow. Selectors default to `rect, circle, path, polyline, line, [data-part]`.',
    usage: (n, { j }) => j({ type: 'html', html: '<svg>…</svg>', x: 160, y: 200, w: 1600, parts: [{ select: 'rect', anim: n, each: 0.4, stagger: 0.06 }] }),
    noPreview: "a part entrance staggers across a figure's own children, so it needs your figure.",
  },
});
export const PART_NAMES = PART_REGISTRY.names;
