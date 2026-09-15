// core/transitions.js: THE TRANSITION DATABASE. One catalog of every transition the engine has,
// across all four mechanisms, DERIVED from their source registries so it can never drift out of sync.
//
// FOUR MECHANISMS (a transition is exactly one of these, they are not interchangeable):
//   • anim: per-LAYER entrance/exit (`anim` / `out` on a layer).          core/clips.js  ANIM_NAMES
//   • cut, transforms ONE scene root over a window (`cut`, dir-aware).    core/cuts.js   PRESENTATIONS
//   • sting. A generative shader OVERLAY painted over one beat.             core/stings.js SHADER_FX
//   • seam. A two-scene GPU blend of BOTH beats across a boundary.         core/seams.js  SEAM_FX
//
// WHICH TO REACH FOR (short version; full theory in engine-doctrine/CRAFT/TRANSITIONS.md):
//   a real scene-to-scene transition → SEAM. a one-beat element move → ANIM. a whole-stage cut → CUT.
//   a texture/energy accent painted over a cut → STING.
//
// This file is the INVENTORY (what exists); engine-doctrine/CRAFT/TRANSITIONS.md is the DECISION layer (what to
// pick and why). `make transitions` prints this catalog.

import { ANIM_NAMES } from '../timeline/clips.js';
import { PRESENTATIONS } from '../cuts/index.js';
import { SHADER_FX } from '../stings/index.js';
import { SEAM_FX } from '../timeline/seams.js';
import { UNITS } from './units.js';

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

// Names that read a direction (up/down/left/right), PROBED rather than listed: a cut's presentation is
// called at all four cardinal dirs and a seam's shader body is scanned for u_dir. A hand-kept list here
// drifted (it named `drop`, which never reads dir, and missed cube, squeeze, roll and spin).
export const DIRECTIONAL_CUT = new Set(Object.keys(PRESENTATIONS).filter((name) => {
  const P = PRESENTATIONS[name];
  const outs = ['left', 'right', 'up', 'down'].map((dir) => {
    const o = { dir, dist: 90, cx: 50, cy: 50 };
    let s = '';
    for (let i = 1; i < 10; i++) { const p = i / 10; s += JSON.stringify(P.enter(p, o)) + JSON.stringify(P.exit(p, o)); }
    return s;
  });
  return outs.some((o) => o !== outs[0]);
}));

// A seam's GLSL has no JS function to call, but every "vawe" house unit is the SAME fixed preamble
// wrapped around a body (core/transitions/units.js `vawe()`), and that preamble is the only place
// `u_dir`/its `ax`/`sg` derivatives appear when the body itself never reads direction. Stripping the
// fixed text back off (when present) isolates exactly what the unit itself wrote; a raw (non-`vawe`)
// unit's own GLSL is used as-is. If the preamble text ever changes, the strip silently stops matching
// and this falls back to scanning the whole shader, which only makes it warn MORE often than it should,
// never less: false positives there resolve when someone reads the warning message and re-checks.
const VAWE_DIR_PREAMBLE = 'vec4 transition(vec2 uv){\n  float p = clamp(u_p, 0.0, 1.0);\n'
  + '  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);\n  float ax = abs(u_dir.x) > 0.5 ? uv.x : uv.y;\n'
  + '  float sg = u_dir.x + u_dir.y;\n  vec4 col;\n';
const VAWE_DIR_SUFFIX = '\n  return vec4(col.rgb, 1.0);\n}';
export const DIRECTIONAL_SEAM = new Set(UNITS.filter((u) => {
  const g = u.glsl || '';
  const body = g.startsWith(VAWE_DIR_PREAMBLE) && g.endsWith(VAWE_DIR_SUFFIX)
    ? g.slice(VAWE_DIR_PREAMBLE.length, g.length - VAWE_DIR_SUFFIX.length) : g;
  return /\bu_dir\b|\bax\b|\bsg\b/.test(body);
}).map((u) => u.name));

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
