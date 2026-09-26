import { BG_REGISTRY } from '../../core/backgrounds/index.js';
import { GRADIENT_RECIPE_REGISTRY } from '../../core/backgrounds/gradient-recipes.js';
import { LOOK_REGISTRY } from '../../core/looks/index.js';
import { FILTER_REGISTRY } from '../../core/looks/filters.js';
import { CANVAS_REGISTRY } from '../../core/canvas/effects.js';
import { AMBIENT_REGISTRY } from '../../core/surfaces/shaders-ambient.js';
import { PAINT_REGISTRY } from '../../core/surfaces/paint-fx.js';
import { PRESET_REGISTRY as KINETIC_REGISTRY } from '../../core/kinetic/presets.js';
import { GSAP_REGISTRY } from '../../core/engine/gsap-effects.js';
import { CAP_STYLE_REGISTRY } from '../../core/type/captions.js';
import { STAGGER_FROM_REGISTRY } from '../../core/type/type.js';
import { LAYER_REGISTRY } from '../../core/layers/index.js';
import { THREE_REGISTRY } from '../../core/surfaces/three-scenes.js';
import { GLOW_REGISTRY } from '../../core/layers/glow.js';
import { PARTICLES_REGISTRY } from '../../core/surfaces/particles.js';
import { RAYMARCH_REGISTRY } from '../../core/surfaces/raymarch-fx.js';
import { FX_REGISTRY } from '../../core/fx/index.js';
import { DEPTH_REGISTRY } from '../../core/fx/plane.js';
import { BLEND_REGISTRY } from '../../core/fx/mix-blend.js';
import { ADJUST_REGISTRY } from '../../core/layers/adjust.js';
import { ANIM_REGISTRY } from '../../core/timeline/clips.js';
import { EASING_REGISTRY } from '../../core/motion/motion.js';
import { IDLE_REGISTRY } from '../../core/engine/idle.js';
import { ENERGY_REGISTRY } from '../../core/transitions/energy.js';
import { TIME_REMAP_REGISTRY } from '../../core/timeline/time.js';
import { SHAPE_REGISTRY } from '../../core/motion/shapes.js';
import { CURVE_REGISTRY } from '../../core/motion/path-curves.js';
import { PART_REGISTRY } from '../../core/motion/parts.js';
import { CAMERA_REGISTRY } from '../../core/camera-moves/index.js';
import { CUT_REGISTRY } from '../../core/cuts/index.js';
import { SEAM_REGISTRY } from '../../core/timeline/seams.js';
import { SHADER_REGISTRY } from '../../core/stings/index.js';
import { TIMING_REGISTRY } from '../../core/cuts/timings.js';
import { MOTION_CUE_REGISTRY } from '../../core/audio/tactile.js';
import { SPECTACLE_DEVICES } from '../../core/registry/knobs.js';
import { PLACEMENT_REGISTRY } from '../../core/layout/safe.js';
import { DESTINATION_REGISTRY } from '../../core/layout/safe.js';
import { RECIPES } from '../../recipes/index.mjs';
import { score, toks } from './arsenal.mjs';

// `layer type:three` is excluded because its name is an ordinary counting word: calibrating against
// vawe-flow, a beat line like "(stills of three real vawe films...)" scored a false coverage-1.0 match
// against the 3D layer type.
const IDENTITY = new Set(['none', 'linear', 'hold', 'layer type:three']);
const identityKey = (e) => `${e.kind}:${e.name}`;

/** entriesOf(reg) -> [{name, kind, blurb}], the shape coverageIn/score both read. */
function entriesOf(reg) {
  return reg.names.filter((n) => !IDENTITY.has(n) && !IDENTITY.has(identityKey({ kind: reg.kind, name: n })))
    .map((n) => ({ name: n, kind: reg.kind, blurb: (reg.blurbs && reg.blurbs[n]) || '' }));
}

const recipeEntries = () => Object.entries(RECIPES).map(([name, r]) => ({ name, kind: 'recipe', blurb: r.blurb }));

export const GROUPS = [
  ['look and ground', () => [
    ...entriesOf(BG_REGISTRY), ...entriesOf(GRADIENT_RECIPE_REGISTRY), ...entriesOf(LOOK_REGISTRY),
    ...entriesOf(FILTER_REGISTRY), ...entriesOf(CANVAS_REGISTRY), ...entriesOf(AMBIENT_REGISTRY),
    ...entriesOf(PAINT_REGISTRY),
  ]],
  ['type', () => [
    ...entriesOf(KINETIC_REGISTRY), ...entriesOf(GSAP_REGISTRY), ...entriesOf(CAP_STYLE_REGISTRY),
    ...entriesOf(STAGGER_FROM_REGISTRY),
  ]],
  ['layers and 3D', () => [
    ...entriesOf(LAYER_REGISTRY), ...entriesOf(THREE_REGISTRY), ...entriesOf(GLOW_REGISTRY),
    ...entriesOf(PARTICLES_REGISTRY), ...entriesOf(RAYMARCH_REGISTRY), ...entriesOf(FX_REGISTRY),
    ...entriesOf(DEPTH_REGISTRY), ...entriesOf(BLEND_REGISTRY), ...entriesOf(ADJUST_REGISTRY),
  ]],
  ['motion and time', () => [
    ...entriesOf(ANIM_REGISTRY), ...entriesOf(EASING_REGISTRY), ...entriesOf(IDLE_REGISTRY),
    ...entriesOf(ENERGY_REGISTRY), ...entriesOf(TIME_REMAP_REGISTRY), ...entriesOf(SHAPE_REGISTRY),
    ...entriesOf(CURVE_REGISTRY), ...entriesOf(PART_REGISTRY),
  ]],
  ['camera', () => entriesOf(CAMERA_REGISTRY)],
  ['transitions', () => [
    ...entriesOf(CUT_REGISTRY), ...entriesOf(SEAM_REGISTRY), ...entriesOf(SHADER_REGISTRY),
    ...entriesOf(TIMING_REGISTRY),
  ]],
  ['sound', () => entriesOf(MOTION_CUE_REGISTRY)],
  ['structure', () => [
    ...recipeEntries(), ...entriesOf(SPECTACLE_DEVICES), ...entriesOf(PLACEMENT_REGISTRY),
    ...entriesOf(DESTINATION_REGISTRY),
  ]],
];

const DEDICATED_FIELD = {
  'camera move': 'camera',
  'move shape': 'move',
  'path curve': 'move',
  'part entrance': 'motion',
  cut: 'transition_in',
  'seam fx': 'transition_in',
  'sting fx': 'transition_in',
  'cut timing': 'transition_in',
  recipe: 'recipe',
};

// Returns null (a `use:` kind) when the kind kept no dedicated field of its own.
export const dedicatedField = (kind) => DEDICATED_FIELD[kind] || null;

// Named explicitly rather than the whole beat block: a field label itself ("mechanism", "onscreen")
// would otherwise pad every beat's corpus with the same handful of words.
export const PROSE_FIELDS = ['mechanism', 'picture', 'style', 'becomes', 'onscreen'];

export const fieldBlob = (beats, keys = PROSE_FIELDS) => beats.map((b) => keys.map((k) => {
  const v = b[k];
  return Array.isArray(v) ? v.join(' ') : (v || '');
}).join(' ')).join(' ');

// Measured calibrating this file: "which" alone put thermalBlur and followLayer over CONFIDENT on
// vawe-flow, and "their" alone put three unrelated background presets over it on ab-skill-shotcode;
// this only prunes beat-prose windows, it is deliberately not a change to core/registry/registry.js's STOP.
const PROSE_STOP = new Set(['which', 'their', 'while', 'then', 'each', 'same', 'being', 'whose',
  'whom', 'who', 'this', 'these', 'those', 'than', 'once', 'twice',
  // Measured over the 157-doc corpus: `choose` has df 1 and `font` has df 4, so a question's own verb
  // outweighs its subject noun and wins a match with nothing behind it.
  'how', 'what', 'when', 'where', 'why', 'do', 'does', 'should', 'would', 'could',
  'choose', 'choosing', 'pick', 'picking', 'use', 'using', 'make', 'making', 'get', 'find']);

/** filteredToks(text) -> toks(text) with PROSE_STOP removed, the same filter tokenGroupsOf applies to
 * a beat's fields, exported so a caller working from raw text (ideate.mjs's act prose, never a beat
 * object) gets the identical filtering rather than a second copy of this list. */
export const filteredToks = (text) => toks(text).filter((t) => !PROSE_STOP.has(t));

// One token array PER FIELD, never fields joined: a window sliding across a field boundary would
// manufacture a phrase nobody wrote.
export const tokenGroupsOf = (beat, keys = PROSE_FIELDS) => keys
  .map((k) => (Array.isArray(beat[k]) ? beat[k].join(' ') : beat[k]))
  .filter(Boolean)
  .map((v) => filteredToks(v))
  .filter((t) => t.length);

const MIN_WINDOW = 2;
const MAX_WINDOW = 4;
function* windowsOf(tokens) {
  for (let w = MIN_WINDOW; w <= Math.min(MAX_WINDOW, tokens.length); w++) {
    for (let i = 0; i + w <= tokens.length; i++) yield tokens.slice(i, i + w);
  }
}

/** bestWindowMatch(entry, tokenGroups, coverage) -> {c, s, qt}, this entry's single best-matching span
 * across every field's sliding window. `tokenGroups` is an array of token arrays (one per field, or one
 * per beat-field pair for a whole storyboard); never a single joined blob. */
export function bestWindowMatch(entry, tokenGroups, coverage) {
  let best = null;
  for (const tokens of tokenGroups) {
    for (const qt of windowsOf(tokens)) {
      const c = coverage(entry, qt);
      if (!best || c > best.c) best = { c, s: score(entry, qt), qt };
    }
  }
  return best || { c: 0, s: 0, qt: [] };
}

/** usedNames(sbSrc, beats) -> {dedicated(entry), used(entry)}. Two different questions, on purpose:
 * a dedicated-field kind is used when a beat's own structured field (already parsed by
 * storyboard-parse.mjs) names it; a `use:` kind is used only by a real `use:` line, never by the word
 * turning up in prose elsewhere, the same "field written, not just a word said" test USED_FIELDS
 * always applied here. */
export function usedNames(sbSrc, beats) {
  const dedicatedBlob = beats.map((b) => [b.camera, b.move, b.motion, b.transition_in, b.recipe]
    .filter(Boolean).join(' ')).join(' ');
  const useLines = [...String(sbSrc).matchAll(/^\s*[-*]?\s*use\s*:\s*(.+)$/gim)].map((m) => m[1]).join(' ');
  return (entry) => {
    const field = dedicatedField(entry.kind);
    if (!field) return new RegExp(`\\b${entry.name}\\b`).test(useLines);
    if (field === 'transition_in') return new RegExp(`fx\\s*:\\s*${entry.name}\\b`).test(dedicatedBlob);
    return new RegExp(`\\b${entry.name}\\b`).test(dedicatedBlob);
  };
}

/** ambiguousNames(entries) -> the Set of bare names owned by more than one kind in this corpus. A
 * registry keys itself on {kind, name} (arsenal.mjs collect()), so two kinds ARE allowed to share a
 * word ("blur" a look and "blur" a transition); `use: blur` alone would not say which. */
export function ambiguousNames(entries) {
  const kindsOf = new Map();
  for (const e of entries) {
    if (!kindsOf.has(e.name)) kindsOf.set(e.name, new Set());
    kindsOf.get(e.name).add(e.kind);
  }
  return new Set([...kindsOf].filter(([, ks]) => ks.size > 1).map(([n]) => n));
}

/** pasteLine(entry, ambiguous?) -> the exact line an author types for this capability. `ambiguous` is
 * the Set from ambiguousNames(); when the bare name collides with another kind's, the line carries
 * `<kind>:<name>` instead of the bare name so it says which one is meant. */
export function pasteLine(entry, ambiguous = null) {
  const field = dedicatedField(entry.kind);
  if (entry.kind === 'cut timing') return `transition_in: fx:fade timing=${entry.name}`;
  if (field === 'transition_in') return `transition_in: fx:${entry.name}`;
  if (field === 'move') return `move: ${entry.name}:cinematic`;
  if (field === 'motion') return `motion: [data-part="headline"]@${entry.name}:cinematic`;
  if (field === 'camera') return `camera: ${entry.name}`;
  if (field === 'recipe') {
    const slots = Object.keys((RECIPES[entry.name] && RECIPES[entry.name].slots) || {});
    return `recipe: ${entry.name}${slots.map((s) => ` ${s}=<fill: ${s}>`).join('')}`;
  }
  const named = ambiguous && ambiguous.has(entry.name) ? `${entry.kind}:${entry.name}` : entry.name;
  return `use: ${named}`;
}
