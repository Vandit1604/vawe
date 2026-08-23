// core/parts.js — the `parts` vocabulary: named entrances for the SUB-ELEMENTS of a hand-authored
// html/svg layer. A figure grows its bars, then draws its line, then pops its dots.
//
// It lived inline inside formats/scene/scene.js's build path until docs/MISTAKES.md #355. That is why it
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
import { defineRegistry } from './registry.js';

      // author reaches for on a figure; every one is a compositor-friendly transform/opacity/dashoffset.
export const PARTS = {
    growUp: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 100%'; }, { scaleY: 0 }, { scaleY: 1 }, { scaleY: 0 }],
    widen: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '0% 50%'; }, { scaleX: 0 }, { scaleX: 1 }, { scaleX: 0 }],
    popIn: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 50%'; }, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0 }],
    fadeUp: [null, { y: 24, opacity: 0 }, { y: 0, opacity: 1 }, { y: -24, opacity: 0 }],
    riseIn: [null, { y: 48, opacity: 0 }, { y: 0, opacity: 1 }, { y: -48, opacity: 0 }],
    drawOn: [(t) => { try { t.setAttribute('pathLength', '1'); } catch (e) {} t.style.strokeDasharray = '1 1'; }, { strokeDashoffset: 1 }, { strokeDashoffset: 0 }, { strokeDashoffset: 1 }],
  };

export const PART_BLURBS = {
  growUp: 'scales up from its own bottom edge — a bar growing to its reading',
  widen: 'scales out from its left edge — a row, a rule, a progress track filling',
  popIn: 'scales from nothing at its centre with a fade — dots, chips, markers',
  fadeUp: 'a short rise with a fade — the quiet default for any part',
  riseIn: 'a longer rise with a fade — for parts that should feel like they arrive',
  drawOn: 'an SVG stroke draws itself along its own path (pathLength=1, no measurement)',
};

export const PART_REGISTRY = defineRegistry('part entrance', PARTS, { slot: 'parts[].anim', blurbs: PART_BLURBS });
export const PART_NAMES = PART_REGISTRY.names;
