// harness/author/discovery.mjs: one owner for "which core kind is this authorable as", and "the
// exact line an author pastes for it" - shared by `make stage`'s adoption block
// (quality/gates/stage.mjs) and the live save-time nudge (harness/live/beat-surfacer.mjs), so the two
// never print two different spellings of the same capability.
//
// WHY A CORPUS BUILT HERE, NOT arsenal.mjs collect(). collect() dynamically readdirs every
// core/<pkg>/*.js and imports each one to find its registry, and a *.test.mjs living in that same
// directory (this repo's own convention) runs its node:test cases as an import side effect. That is an
// acceptable cost for `make arsenal`, run once, on demand. It is not acceptable here: `make stage` is
// read every turn (AGENTS.md, harness/live/stage-say.mjs) and beat-surfacer runs on every storyboard
// save, so a call that silently re-runs the engine's test suite on every keystroke is the wrong trade.
// So this imports each covered registry BY NAME, the same way stage.mjs already did for camera moves,
// transitions, kinetic presets and easings before this file existed: no readdir, no test file ever
// touched. The ranking itself is still the ONE ranker (arsenal.mjs's score/coverageIn/CONFIDENT),
// imported and reused rather than re-derived: only the corpus differs from arsenal's, never the math.
//
// FIXED SYNTAX. Five kinds keep the dedicated field they already had before `use:` existed; every other
// authorable kind below reaches the engine (once harness/lib/contract.mjs's `use:` grammar lands,
// landing in parallel with this) through `use: <name>` or `use: <kind>:<name>`:
//   camera move                -> camera: <name>
//   move shape, path curve     -> move: <name>:<band>
//   part entrance              -> motion: <selector>@<name>:<band>
//   cut, seam fx, sting fx     -> transition_in: fx:<name>
//   cut timing                 -> transition_in: fx:<fx> timing=<name>
//   recipe                     -> recipe: <name> <slot>=<fill> ...
//   anything else covered here -> use: <name>   (or use: <kind>:<name> when the bare name collides)
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

// Never a real choice: the absence of the family's own effect. `cut none`/`slide none` in the
// coordinator's own words is the SAME entry as bare `none`, so excluding it once covers every
// mechanism it appears under (kept from the pre-existing familyRow logic in stage.mjs).
//
// `three` (the layer type) is excluded for a different reason, found calibrating this file against
// vawe-flow: its own name is an ordinary counting word, so a beat's onscreen line "(stills of three
// real vawe films...)" reads as a confident match (coverage 1.0: "three" hits the name, "real" hits
// the blurb's own "a real three.js scene graph") while describing a COUNT, never the 3D layer. Every
// other covered kind's name is distinctive enough that this class of collision was not found again.
const IDENTITY = new Set(['none', 'linear', 'hold', 'layer type:three']);
const identityKey = (e) => `${e.kind}:${e.name}`;

/** entriesOf(reg) -> [{name, kind, blurb}], the shape coverageIn/score both read. */
function entriesOf(reg) {
  return reg.names.filter((n) => !IDENTITY.has(n) && !IDENTITY.has(identityKey({ kind: reg.kind, name: n })))
    .map((n) => ({ name: n, kind: reg.kind, blurb: (reg.blurbs && reg.blurbs[n]) || '' }));
}

const recipeEntries = () => Object.entries(RECIPES).map(([name, r]) => ({ name, kind: 'recipe', blurb: r.blurb }));

// GROUPS, in the print order the brief asks for: [label, entries()].
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

// kind -> the beat field that already reaches the engine for it, when that kind kept its own field
// rather than moving to `use:`. Absent from this map = a `use:` kind.
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

export const dedicatedField = (kind) => DEDICATED_FIELD[kind] || null;

// The free-prose fields that describe INTENT rather than reach the engine: the suggestion corpus
// (never the used count) is ranked against these, grounded in this film's own words and nothing else.
// Named explicitly rather than "the whole beat block" because a field label itself ("mechanism",
// "onscreen") would otherwise pad every beat's corpus with the same handful of words.
export const PROSE_FIELDS = ['mechanism', 'picture', 'style', 'becomes', 'onscreen'];

export const fieldBlob = (beats, keys = PROSE_FIELDS) => beats.map((b) => keys.map((k) => {
  const v = b[k];
  return Array.isArray(v) ? v.join(' ') : (v || '');
}).join(' ')).join(' ');

// core/registry/registry.js's own STOP list is short on purpose (a,an,the,of,to,in,on,and,or,is,it,
// that,with,for,as): it strips what is common in a TECHNICAL BLURB, and a blurb is terse, impersonal
// prose that rarely uses a pronoun or a relative clause. Beat prose is neither: "the camera pans...,
// WHICH THEN..." uses words a blurb almost never does, so THEIR idf across this corpus reads as rare
// (high) and a window built from film prose can carry one into a match with nothing behind it.
// Measured calibrating this file: "which" alone put `thermalBlur` and `followLayer` over CONFIDENT on
// vawe-flow, and "their" alone put three unrelated background presets over it on ab-skill-shotcode.
// This is deliberately NOT a change to searchWords/STOP (core/registry/registry.js): that list grades
// a BLURB at write time and arsenal.mjs reuses it unchanged; this one only prunes the WINDOWS built
// from a beat's prose before they are handed to the same ranker, so a query built here never carries a
// word that could only look rare because film prose talks about people and time and a blurb does not.
const PROSE_STOP = new Set(['which', 'their', 'while', 'then', 'each', 'same', 'being', 'whose',
  'whom', 'who', 'this', 'these', 'those', 'than', 'once', 'twice']);

/** filteredToks(text) -> toks(text) with PROSE_STOP removed, the same filter tokenGroupsOf applies to
 * a beat's fields, exported so a caller working from raw text (ideate.mjs's act prose, never a beat
 * object) gets the identical filtering rather than a second copy of this list. */
export const filteredToks = (text) => toks(text).filter((t) => !PROSE_STOP.has(t));

// tokenGroupsOf(beat, keys) -> one token array PER FIELD (never fields joined), since a window sliding
// across a field boundary ("...onto the sidebar mechanism reveals..." if `becomes` were glued straight
// onto `mechanism`) would manufacture a phrase nobody wrote.
export const tokenGroupsOf = (beat, keys = PROSE_FIELDS) => keys
  .map((k) => (Array.isArray(beat[k]) ? beat[k].join(' ') : beat[k]))
  .filter(Boolean)
  .map((v) => filteredToks(v))
  .filter((t) => t.length);

// WHY A SLIDING WINDOW, NOT THE WHOLE FIELD. coverageIn's idf-weighted coverage divides by the SUM of
// idf across every query token (floored at MIN_MASS): a short human query (arsenal's own examples run
// 2-7 tokens) keeps that sum small enough for a real hit to clear CONFIDENT, but a beat's whole
// `mechanism` sentence can carry 15-25 content tokens describing several DIFFERENT techniques at once
// (a camera move, a blur, a layout shift), so no single entry's overlap with all of them ever clears
// the same threshold. Measured on vawe-flow beat 1 ("...while the camera pushes in"): the whole
// sentence scores `slowPush` at 0.05; the 2-word window ["camera","push"] scores it at 0.65. So this
// windows each field down to arsenal-query-sized spans and keeps the best one, the same ranker and the
// same cutoff, run against a query shaped the way the queries CONFIDENT was calibrated on actually are.
// MIN_WINDOW is 2, not 1. A single-token window lets a name that happens to BE an everyday English
// word ("three", the layer type) match a beat that says "three times" with no other evidence at all:
// measured on vawe-flow, that exact case cleared CONFIDENT on a 1-word window and stopped clearing it
// once a second word had to agree too. Two real query words is still short (arsenal's own shortest
// examples run 2-3), so this loses no real match while dropping the coincidental ones.
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
