// core/motion/path-curves.js: the named SVG curves a caption can set type ON (core/fx/along-path.js)
// and a whole LAYER can fly ALONG (harness/lib/contract.mjs, `move:` scope 'path', MotionPathPlugin
// via `layers[].motionPath`, films/scene/scene.js). One catalog, two consumers, wrapped in the same
// `defineRegistry` every other named-vocabulary set here uses (SHAPES, PARTS, IDLE) so an unknown
// curve is refused at the write site with a hint, never silently defaulted, and `make arsenal` can
// list it without a second, hand-maintained catalogue entry.
//
// Each curve is a function of the box it is drawn in (`w`, `h`), written against that box so it scales
// with it. An author who wants something else passes `d` (along-path) or picks a speed band that
// scales the box (the LAYER-scope path move, harness/lib/contract.mjs pathMotion).
import { defineRegistry } from '../registry/registry.js';

const r = (n) => Math.round(n * 100) / 100;

export const CURVES = {
  arc: (w, h) => `M 0 ${r(h * 0.94)} Q ${r(w / 2)} ${r(-h * 0.5)} ${w} ${r(h * 0.94)}`,
  dip: (w, h) => `M 0 ${r(h * 0.12)} Q ${r(w / 2)} ${r(h * 1.5)} ${w} ${r(h * 0.12)}`,
  wave: (w, h) => `M 0 ${r(h * 0.5)} C ${r(w * 0.18)} ${r(h * 0.04)} ${r(w * 0.32)} ${r(h * 0.04)} `
    + `${r(w * 0.5)} ${r(h * 0.5)} S ${r(w * 0.82)} ${r(h * 0.96)} ${w} ${r(h * 0.5)}`,
  ramp: (w, h) => `M 0 ${r(h * 0.9)} L ${w} ${r(h * 0.18)}`,
};

export const CURVE_BLURBS = {
  arc: 'a shallow rise-and-fall, peak in the middle',
  dip: 'a shallow sag-and-rise, trough in the middle',
  wave: 'an S-curve, one full up-down cycle',
  ramp: 'a straight diagonal, top-left to bottom-right',
};

export const CURVE_REGISTRY = defineRegistry('path curve', CURVES, { slot: 'move:<curve>:<band> | alongPath.curve', blurbs: CURVE_BLURBS,
  catalog: {
    title: 'Path curves (SVG "d" generators)',
    tag: 'per-layer',
    intro: 'A storyboard\'s `move: <curve>:<band>` (harness/lib/contract.mjs, scope PATH: flies the '
      + 'beat\'s own layer along the curve, MotionPathPlugin), or `modifiers: [{ alongPath: { curve } }]` '
      + '(core/fx/along-path.js) to set a line of type on it instead of moving a whole layer.',
    usage: (n) => ({ path: CURVES[n](500, 220) }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, motionPath: { path: CURVES[n](500, 220), dur: 1.25 } }] }),
  },
});
export const CURVE_NAMES = CURVE_REGISTRY.names;
