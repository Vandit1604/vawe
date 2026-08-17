// core/fx/index.js — the MODIFIER registry, the mirror of core/layers/index.js. A layer TYPE answers
// "what is this thing"; a modifier answers "what is done to it". Each modifier is a file exporting
// build(kit,el,L,spec) and optionally frame(kit,el,L,t,scene,spec); `createRenderer` (core/layers/
// index.js) dispatches both by name, so adding a modifier = adding a file, exactly as adding a
// primitive = adding a file.
//
// It exists because the alternative was another layer type per effect, and that road is already
// visible in the type list: glow/beam/paint/shader/raymarch are one idea wearing five costumes,
// because a thing that paints has to BE a layer to get built at all. A modifier applies to whatever
// is already there — an image, a captured component, a group — so an effect stops being a thing you
// place and becomes a thing you do.
//
// AUTHOR-FACING NAME: `modifiers`, NOT `fx`. `L.fx` has been the named-GSAP-effect slot since
// core/gsap-effects.js shipped (`fx:"popIn"` | `{name,dur,ease}` | `["blurIn","float"]`) and
// `L.fxOut` is its exit half. Putting modifiers in the same array would have meant two dispatch
// tables in one prop, told apart by whether an object carries a `name` key, and would have silently
// changed two live behaviours: scene.js gates kinetic units on `!L.fx`, and applyGsapHooks warns
// "unknown GSAP effect" for any item the effect registry does not know.
import * as mixBlend from './mix-blend.js';
import * as occlude from './occlude.js';
import * as progress from './progress.js';
import * as kick from './kick.js';
import * as shadow from './shadow.js';
import * as tilt from './tilt.js';
import * as plane from './plane.js';

const REGISTRY = { kick, mixBlend, occlude, plane, progress, shadow, tilt };

// Exported so gates DERIVE the modifier vocabulary instead of restating it — the contract LAYER_TYPES
// already has. schema-drift compares the schema's copy of this list against it in both directions.
export const FX_TYPES = Object.keys(REGISTRY);

// One line per modifier, beside the registry, each condensed from that module's own header. docs/EFFECTS.md
// renders these and scripts/gates/lib-test.mjs fails when one is missing.
//
// This family is here because it was the LAST place the flat name-keyed map in effects-catalog.mjs could
// still lie: with no map of its own, `tilt` fell through to the KINETIC TEXT PRESET called `tilt` and the
// per-layer fx table said "3D tilt-in", an entrance. The modifier is nothing of the kind — it turns a
// layer out of the picture plane and holds it there. Same name, two registries, one shared description,
// and the wrong one won. A family-scoped map is the only thing that makes that impossible.
export const FX_BLURBS = {
  kick: 'hit the layer on the film\'s own joints — a cut, a seam or a sting shoves it, so the frame feels the edit',
  mixBlend: 'how this layer\'s pixels combine with what is already painted behind it — knock a headline out of a photo',
  occlude: 'hide this layer where another one covers it — put something BEHIND something else without reordering the stack',
  plane: 'stand the layer at a DEPTH so the camera moves it by a different amount than its neighbours — this is parallax',
  progress: 'hand the layer the FILM\'s progress, 0 at the first frame and 1 at the last, as a CSS custom property its markup can draw with',
  shadow: 'a drop shadow that knows where the light is, so every layer does not point the same way',
  tilt: 'turn the layer out of the picture plane and hold it there — a card leaning away, a phone at an angle, panels receding',
};

// An unknown name is a HARD ERROR, never a skipped entry. A modifier that quietly does nothing is the
// worst shape this repo has: `fx:[{"mixBlned":"screen"}]` would render a frame that looks plausible,
// pass every gate, and differ from what was asked in a way only the author's memory can catch. Input
// accepted and then ignored is the bug class logged most here (docs/MISTAKES.md #210 #213 #215 #217).
const pick = (name) => {
  if (REGISTRY[name]) return REGISTRY[name];
  throw new Error(`unknown modifier "${name}" — known: ${FX_TYPES.join(', ')}. `
    + `\`modifiers\` is a list of { <modifier>: <spec> } objects; a name the registry does not know `
    + `would otherwise apply nothing and leave the layer looking untouched.`);
};

const NONE = Object.freeze([]);

// ---- COMPOSITION ORDER, because an array of effects is meaningless without one ----
//
// 1. WITHIN a layer, modifiers apply in ARRAY ORDER, left to right, and within a single object in key
//    order. Two modifiers writing the same CSS property therefore resolve last-writer-wins, and the
//    rightmost is what you see. No modifier may depend on being first.
// 2. ACROSS phases, a modifier is always LAST, and that is now enforced rather than described: the
//    modifier pass is the final SLOT in the per-frame pipeline (core/tracks/index.js), and a second
//    track claiming it is an error at load. build() runs after the primitive's build() (a modifier
//    modifies something that already exists), and frame() runs after the primitive's frame() and after
//    every other track — cut, kinetic units, borderTrail, vars, audio react, the box track and the
//    motion track. A modifier sees the finished frame.
// 3. `transform`, `opacity` and `filter` on the LAYER ELEMENT belong to those tracks, and a modifier
//    must not append to them. That is a purity rule, not a style one: driveClips rewrites `transform`
//    from the anim registry's resting keys, and a layer whose own anim contributes no transform key
//    (`anim:"none"` resolves to fade, which writes opacity alone) never has it rewritten. A modifier
//    that read the current transform and appended to it would be appending to ITS OWN value from
//    whichever frame ran last, growing the string without bound and making renderFrame(n) depend on
//    what rendered before it. A modifier needing a transform gets an element of its own to put it on.
// The one layer prop this registry reads. What is INSIDE a modifier's options bag is that modifier's
// own vocabulary and not a layer prop — `{ tilt: { dist: 900 } }` and a layer's `dist` are two different
// things that share a spelling, and merging them would make each excuse the other.
export const PROPS = { modifiers: {} };

export function specsOf(L) {
  const raw = L.modifiers;
  if (raw == null) return NONE;           // the path every existing scene takes, untouched
  if (!Array.isArray(raw))
    throw new Error(`\`modifiers\` must be an ARRAY of { <modifier>: <spec> } objects — got ${typeof raw}. `
      + `The array is the order they apply in, so a bare object would have no order to read.`);
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error(`every entry in \`modifiers\` is an object like { "mixBlend": "difference" } — `
        + `got ${JSON.stringify(item)}. Known modifiers: ${FX_TYPES.join(', ')}.`);
    for (const [name, spec] of Object.entries(item)) out.push({ name, mod: pick(name), spec });
  }
  return out;
}

// Both passes resolve the list the same way, so a name that throws throws at BUILD — before a single
// frame is drawn — rather than 30 times a second into a render nobody is watching.
export function buildFx(kit, el, L) {
  for (const { mod, spec } of specsOf(L)) if (mod.build) mod.build(kit, el, L, spec);
}

// `scene` is the same frozen read-only view a primitive's frame() gets — geometry (boxOf, specOf, ids),
// the frame's own properties (light, camera, canvas, safe, bg), the clock, the theme's palette and the
// film's joints (marks) — because the effects this slot exists for are properties of the FRAME, not of
// one layer. Every field is built before the frame pass and named beside its consumer where it is
// assembled (formats/scene/scene.js). `spec` rides LAST so the shared arguments keep the same positions
// they have on a primitive.
export function frameFx(kit, el, L, t, scene) {
  for (const { mod, spec } of specsOf(L)) if (mod.frame) mod.frame(kit, el, L, t, scene, spec);
}
