// core/parts.js — the `parts` vocabulary: named entrances for the SUB-ELEMENTS of a hand-authored
// html/svg layer. A figure grows its bars, then draws its line, then pops its dots.
//
// It lived inline inside formats/scene/scene.js's build path until docs/MISTAKES.md #355. That is why it
// was the only vocabulary in the engine with no catalogue entry, no blurb map and no gate: nothing could
// import it to enumerate it. It also resolved `PARTS[p.anim] || PARTS.fadeUp`, so a mistyped part
// entrance silently faded up - the eighth instance of that pattern found in one sweep.
//
// Each entry is [staticSetup(target) | null, fromVars, toVars] and every one is a compositor-friendly
// transform / opacity / dashoffset, driven by GSAP and seeked per frame like everything else.
import { defineRegistry } from './registry.js';

      // author reaches for on a figure; every one is a compositor-friendly transform/opacity/dashoffset.
export const PARTS = {
    growUp: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 100%'; }, { scaleY: 0 }, { scaleY: 1 }],
    widen: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '0% 50%'; }, { scaleX: 0 }, { scaleX: 1 }],
    popIn: [(t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 50%'; }, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }],
    fadeUp: [null, { y: 24, opacity: 0 }, { y: 0, opacity: 1 }],
    riseIn: [null, { y: 48, opacity: 0 }, { y: 0, opacity: 1 }],
    drawOn: [(t) => { try { t.setAttribute('pathLength', '1'); } catch (e) {} t.style.strokeDasharray = '1 1'; }, { strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
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
