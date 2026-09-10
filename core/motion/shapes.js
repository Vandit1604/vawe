// core/motion/shapes.js: MOVE SHAPES, the measured keyframe generators a storyboard's `move:` verb
// (harness/lib/contract.mjs) names and `make arsenal SHAPE=<name>` prints on demand.
//
// Moved here from harness/author/track.mjs (a tooling file, outside core/) because a storyboard verb
// that depends on tooling to build a JSON value makes authoring load-bearing on something core/ should
// own outright: `SHAPES` is engine vocabulary the same way `PARTS` (core/motion/parts.js) and `IDLE`
// (core/engine/idle.js) already are, wrapped in the same `defineRegistry` so an unknown shape is refused
// at LOAD with a hint, never silently defaulted.
//
// track.mjs keeps a thin CLI (`node harness/author/track.mjs pan --to -600 --dur 1.25`) and re-exports
// `SHAPES` from here; nothing about the CLI or its flags changed.
//
// NOTHING HERE IS INVENTED. Every shape is the normalised measurement of a real film in this repo. `pan`
// is the scroll rhythm of higgsfield-recreation beat 2, whose per-segment speed runs 1.03, 1.35, 1.29,
// 0.75, 0.59 of the average: the page surges and then gives up, which is what makes it read as somebody's
// hand rather than as an animation of a page. `blast` is brew's four-key punctuation. Both would be
// wrong if smoothed.
//
// `pan`'s interior keys are deliberately `linear`. core/timeline/sequence.js interpolates a segment
// shorter than DENSE_KEY_SEC (0.14s) linearly anyway, so naming it is documentation rather than
// instruction, and it keeps the file honest about which segments are mechanical. That reasoning covers
// `pan` and nothing else: `drift`, `enter` and `blast` turn around at their interior keys, so a
// near-zero velocity there is the shape and not a defect, and `exit` does not turn around at all.
import { defineRegistry } from '../registry/registry.js';

const r3 = (v) => +Number(v).toFixed(3);

// The scroll rhythm measured off `higgsfield-recreation` beat 2, normalised: [fraction of the pan's
// duration, fraction of its travel]. Moved here (from blueprints/beats-track.mjs) beside the shape that
// consumes it: it is a bare literal array with no dependency of its own, and leaving it in blueprints/
// would have made this core/ file import a blueprint to build its own vocabulary, exactly the load-bearing
// direction this move exists to cut off. blueprints/beats-track.mjs now imports it back from here.
export const SCROLL_RHYTHM = [[0.25, 0.258], [0.4125, 0.48], [0.625, 0.745], [0.8375, 0.903], [1, 1]];

// Nothing lands on a round number (KEYED-MOTION.md §4): a track whose keys sit on 0.5 and 1.0 reads as
// a preset with extra steps. The jitter is a pure function of the key's index, never Math.random, or
// the same command would emit a different file twice and renderFrame(n) would stop being reproducible.
const nudge = (i, amp = 0.012) => amp * (((i * 2654435761) % 1000) / 1000 - 0.5) * 2;

export const SHAPES = {
  // higgsfield beat 2: irregular gaps, linear interior, everything relative to a single travel.
  pan: ({ dur = 1.25, to = -600, from = 0, axis = 'x' }) => {
    const keys = [{ t: 0, [axis]: r3(from) }];
    SCROLL_RHYTHM.forEach(([ft, fd], i) => {
      const last = i === SCROLL_RHYTHM.length - 1;
      keys.push({
        t: r3(dur * ft + (last ? 0 : nudge(i) * dur)),
        [axis]: r3(from + (to - from) * fd),
        ease: last ? 'easeOutCubic' : 'linear',
      });
    });
    return keys;
  },
  // brew's punctuation: arrive over-size, settle, drift, then leave THROUGH the frame rather than fade.
  blast: ({ dur = 1.5, peak = 1.5, out = 1.9 }) => ([
    { t: 0, scale: r3(peak), opacity: 0, ease: 'easeOutCubic' },
    { t: r3(dur * 0.28), scale: 1, opacity: 1, ease: 'easeOutCubic' },
    { t: r3(dur * 0.8), scale: 1.04, ease: 'linear' },
    { t: r3(dur), scale: r3(out), opacity: 0, ease: 'easeInCubic' },
  ]),
  // an ambient hold that is not a still: small, slow, and never returning to exactly where it began.
  drift: ({ dur = 3, amp = 12, axis = 'y' }) => ([
    { t: 0, [axis]: 0 },
    { t: r3(dur * 0.38), [axis]: r3(amp), ease: 'easeInOutSine' },
    { t: r3(dur * 0.71), [axis]: r3(-amp * 0.55), ease: 'easeInOutSine' },
    { t: r3(dur), [axis]: r3(amp * 0.22), ease: 'easeInOutSine' },
  ]),
  // A KEYED DEPARTURE that accelerates off-frame, opacity trailing the move rather than leading it, so
  // the layer is gone because it LEFT and not because it dimmed. `ease: "through"` on the waypoint takes
  // its tangent from the keys either side (no stall at the interior key); `easeIn: "fling"` on the last
  // key shapes only the arriving side of the final segment so it leaves the waypoint already moving.
  exit: ({ dur = 0.55, to = -260, axis = 'y' }) => ([
    { t: 0, [axis]: 0, opacity: 1 },
    { t: r3(dur * 0.34), [axis]: r3(to * 0.12), opacity: 1, ease: 'through' },
    { t: r3(dur), [axis]: r3(to), opacity: 0, easeIn: 'fling' },
  ]),
  // a keyed entrance, so a beat can open on choreography instead of on a preset name.
  enter: ({ dur = 0.9, from = 40, axis = 'y' }) => ([
    { t: 0, [axis]: r3(from), opacity: 0 },
    { t: r3(dur * 0.62), [axis]: r3(-from * 0.06), opacity: 1, ease: 'easeOutCubic' },
    { t: r3(dur), [axis]: 0, ease: 'easeOutCubic' },
  ]),
};

export const SHAPE_BLURBS = {
  pan: 'an irregular multi-key horizontal (or vertical) pan, linear interior keys: surges then gives up, reads as a hand scrolling, not an animation of a page',
  blast: 'four-key punctuation: arrives oversize, settles, drifts, then grows OUT through the frame. A hard pop, never a fade',
  drift: 'a slow ambient hold on one axis that never returns to where it began, for a layer that should keep living through a beat',
  exit: 'a keyed departure that accelerates off-frame, opacity trailing the move: the layer is gone because it LEFT, not because it dimmed',
  enter: 'a keyed entrance track on the layer itself rather than a preset name: rises in, overshoots slightly, settles',
};

export const SHAPE_REGISTRY = defineRegistry('move shape', SHAPES, { slot: 'move:<shape>:<band>', blurbs: SHAPE_BLURBS,
  catalog: {
    title: 'Move shapes (measured keyframe tracks)',
    tag: 'per-layer',
    intro: 'A storyboard\'s `move: <shape>:<band>` (harness/lib/contract.mjs, scope LAYER: a sustained '
      + 'track on the beat\'s own layer, never a one-shot entrance), or a hand-keyed `motion` built '
      + 'directly: `node harness/author/track.mjs pan --dur 1.25 --to -600`. Every shape is the '
      + 'normalised measurement of a real film in this repo, never invented, so a beat that names one '
      + 'keeps moving for its whole length instead of landing an entrance and holding still.',
    usage: (n, { full }) => full({ motion: SHAPES[n]({ dur: 1.25 }) }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, motion: SHAPES[n]({ dur: 1.25 }) }] }),
  },
});
export const SHAPE_NAMES = SHAPE_REGISTRY.names;
