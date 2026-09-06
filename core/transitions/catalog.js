// core/transitions.js: THE TRANSITION DATABASE. One catalog of every transition the engine has,
// across all four mechanisms, DERIVED from their source registries so it can never drift out of sync.
//
// FOUR MECHANISMS (a transition is exactly one of these, they are not interchangeable):
//   • anim: per-LAYER entrance/exit (`anim` / `out` on a layer).          core/clips.js  ANIM_NAMES
//   • cut, transforms ONE scene root over a window (`cut`, dir-aware).    core/cuts.js   PRESENTATIONS
//   • sting. A generative shader OVERLAY painted over one beat.             core/stings.js SHADER_FX
//   • seam. A two-scene GPU blend of BOTH beats across a boundary.         core/seams.js  SEAM_FX
//
// WHICH TO REACH FOR (short version; full theory in docs/CRAFT/TRANSITIONS.md):
//   a real scene-to-scene transition → SEAM. a one-beat element move → ANIM. a whole-stage cut → CUT.
//   a texture/energy accent painted over a cut → STING.
//
// This file is the INVENTORY (what exists); docs/CRAFT/TRANSITIONS.md is the DECISION layer (what to
// pick and why). `make transitions` prints this catalog.

import { ANIM_NAMES } from '../timeline/clips.js';
import { PRESENTATIONS } from '../cuts/index.js';
import { SHADER_FX } from '../stings/index.js';
import { SEAM_FX } from '../timeline/seams.js';

// family = what the transition DOES (a name can appear in several mechanisms; the family is the same).
const FAMILY_OF = (name) => {
  const n = name.toLowerCase();
  if (/^(fade|dissolve|crossfade|defocus|blur|riseblur)/.test(n)) return 'fade';
  if (/^(slide|push|cover|uncover|drop|lift|rise|up|down|left|right)/.test(n) || /slide-/.test(n)) return 'slide';
  if (/^(wipe|blinds|barn|squares|polka|doors|letterbox|grid|scan|softwipe)/.test(n) || /wipe-/.test(n)) return 'wipe';
  if (/^(iris|softiris|circle|sdfiris|clock|pinwheel|swirl|vortex)/.test(n)) return 'iris';
  if (/^(jitter|shake)/.test(n)) return 'motion';
  if (/^(zoom|punch|scale|pop|cinema|crosszoom)/.test(n)) return 'zoom';
  if (/^(flip|cube|roll|spin|collapse|squeeze)/.test(n)) return '3d';
  if (/^(whip|streak|skewwhip)/.test(n)) return 'motion';
  if (/^(glitch|pixel|chromatic|dispersion|thermal|ripple|warp|crosswarp|domainwarp|heatwarp)/.test(n)) return 'distort';
  if (/^(flash|leak|burn|ridgedburn|flashwhite|lens|iridescence|bokeh|grain|light)/.test(n)) return 'light';
  if (/^(ink|confetti)/.test(n)) return 'ink';
  return 'other';
};

// the BASIC set: the fundamentals every editor/motion tool ships. "Cover the basics" = these exist.
const BASIC = new Set([
  'none', 'fade', 'dissolve', 'slide', 'push', 'uncover', 'wipe', 'iris', 'zoom', 'blur',
  'slide-left', 'slide-right', 'slide-up', 'slide-down', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down',
  'up', 'rise', 'pop', 'clock', 'flip',
]);

// names that read a direction (up/down/left/right). cuts/seams take a `dir`; some anims bake it in.
const DIRECTIONAL_CUT = new Set(['slide', 'whip', 'skewWhip', 'punch', 'blur', 'flip', 'wipe', 'drop', 'push']);
const DIRECTIONAL_SEAM = new Set(['slide', 'push', 'uncover', 'wipe', 'whipPan']);

function entry(name, mechanism) {
  const dir = mechanism === 'cut' ? DIRECTIONAL_CUT.has(name)
    : mechanism === 'seam' ? DIRECTIONAL_SEAM.has(name)
      : /-(left|right|up|down)$/.test(name);
  return { name, mechanism, family: FAMILY_OF(name), basic: BASIC.has(name), dir };
}

// THE CATALOG: derived from the live registries, so adding an effect to any registry auto-lists it.
// `none` stays OUT of the anim listing's cut row in `make transitions` (it is the absence of an
// effect, not one to browse), but it is still a real PRESENTATIONS entry, and `boundaryMechanism`
// below routes it to `cut` explicitly: a scene using `transitions[]` must be able to say "hard cut,
// no visual transition" the same way a raw `cuts[].style:"none"` always could.
export const TRANSITIONS = [
  ...ANIM_NAMES.map((n) => entry(n, 'anim')),
  ...Object.keys(PRESENTATIONS).filter((n) => n !== 'none').map((n) => entry(n, 'cut')),
  ...SHADER_FX.map((n) => entry(n, 'sting')),
  ...SEAM_FX.map((n) => entry(n, 'seam')),
];

export const MECHANISMS = ['anim', 'cut', 'sting', 'seam'];
export const FAMILIES = [...new Set(TRANSITIONS.map((t) => t.family))].sort();

// helpers for authoring / gates
export const basics = () => TRANSITIONS.filter((t) => t.basic);
export const byMechanism = (m) => TRANSITIONS.filter((t) => t.mechanism === m);
export const byFamily = (f) => TRANSITIONS.filter((t) => t.family === f);
// names with no family match (would-be 'other'): a gate can flag these so the classifier stays honest.
export const unclassified = () => TRANSITIONS.filter((t) => t.family === 'other');
