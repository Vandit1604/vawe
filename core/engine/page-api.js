// core/engine/page-api.js: wires `window.vawe` for a hand-authored BARE HTML page, the render target
// harness/media/render-page.mjs and preview-server.mjs serve (never a scene-JSON film: scene.js drives
// its own layers directly and never imports this file). Importing this ONE module gives such a page:
//
//   vawe.onFrame((t) => { ... })   registers a per-frame hook; the same list core/timeline/clips.js's
//                                  seekAll(t) already calls for a scene-module page, so a scene layer
//                                  and a hand-written page share ONE hook mechanism, not two.
//   vawe.value(row, t)             samples a timing-sheet row ({at,dur,from,to,ease}, core/motion/
//                                  timeline.js's own row shape) as a plain NUMBER, so a three.js pose
//                                  and an authored HTML entrance can read the same row.
//   vawe.three.studio/extrude/material   the tuned three.js helpers core/surfaces/three-fx.js already
//                                  builds for the declarative `object`/`three` layer types: one lighting
//                                  rig, one SVG-path extruder, one material-preset table, two consumers.
//
// Nothing here is a new mechanism: every piece is imported from the ONE file that already owns it and
// reattached to the existing `window.vawe` global core/motion/timeline.js's own bottom line already
// populates (`timeline`/`timelineFromScript`). A second global would be the exact drift
// engine-doctrine/CRAFT/ENGINE-CHANGES.md warns against ("one fact, one owner").
import { onFrame } from '../timeline/clips.js';
import { studio, extrude, material } from '../surfaces/three-fx.js';
import { interpolate, resolveEasing, cubicBezier } from '../motion/motion.js';

// The four native CSS easing keywords WAAPI parses on its own but `resolveEasing` does not carry (its
// table holds named engine curves and GSAP aliases, never these four generic CSS spellings): the
// standard cubic-beziers CSS itself defines for them, https://drafts.csswg.org/css-easing-1/#easing-functions.
const CSS_EASE = { ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
const easingFor = (e) => (typeof e === 'string' && CSS_EASE[e] ? cubicBezier(...CSS_EASE[e]) : resolveEasing(e));

/** vawe.value(row, t) → a NUMBER, `row.from` eased toward `row.to` between `row.at` and `row.at+row.dur`. */
export function value(row, t) {
  const { at = 0, dur = 0.5, from = 0, to = 1, ease } = row;
  return interpolate(t, [at, at + dur], [from, to], { easing: easingFor(ease) });
}

// Guarded the same way core/motion/timeline.js's own bottom line already is: importable in Node
// (so tooling that walks every core/ module, e.g. `make check GATE=word-action`, does not choke on it)
// even though the assignment itself only means anything in a browser page.
if (typeof window !== 'undefined') Object.assign(window.vawe || (window.vawe = {}), { onFrame, value, three: { studio, extrude, material } });
