import { defineRegistry } from './registry.js';
// core/three-scenes.js — the `three` scene NAME registry, and nothing else.
//
// It is split out for one concrete reason: core/three-fx.js imports the vendored three.js by its
// BROWSER-absolute path (/assets/vendor/three.module.js), which Node cannot resolve. Every gate that
// needs the list of scenes runs in Node, so importing the implementation to read its registry made
// `make schema-drift` crash outright.
//
// The obvious alternative, hand-copying the names into each gate, is the exact failure this repo has
// now logged three times in one day (#83 counts, #90 doc claims, #94 coverage lists): a hand-kept
// list of things that exist elsewhere decays the moment someone ships. So there is still exactly ONE
// list, here, with no imports; core/three-fx.js imports it, and lib-test asserts that the SCENES it
// actually implements match it name for name. Splitting the file does not get to mean splitting the
// source of truth.
export const THREE_FX = ['deviceShowcase', 'uiParallax', 'pointCloud', 'extrudeText', 'globe', 'shatter', 'magnetic', 'liquidBackground'];

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a three scene" when someone writes it somewhere else. core/registry.js.
export const THREE_REGISTRY = defineRegistry('three scene', Object.fromEntries(THREE_FX.map((n) => [n, n])), { slot: 'three' });
