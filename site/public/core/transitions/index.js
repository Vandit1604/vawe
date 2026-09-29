// core/transitions/index.js: barrel for the transitions package (units.js/units-house.js: the
// GPU-blend seam primitives; energy.js: the shared speed-vs-drama dial; catalog.js: THE TRANSITION
// DATABASE, one entry per transition across all four mechanisms; lower.js: the unified transition
// surface, lowering an author's one field to the four raw mechanisms). catalog.js and lower.js
// were core/transitions.js and core/transitions-lower.js at the root (W9); root shims keep both
// import paths working. Same barrel-only shape as core/cuts/index.js's neighbours.
export * from './catalog.js';
export * from './lower.js';
export * from './energy.js';
