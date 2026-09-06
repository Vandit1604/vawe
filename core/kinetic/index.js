// core/kinetic/index.js: barrel for the kinetic-type package (presets.js: the named kinetic-type
// preset library + its blurbs). One file today; the barrel exists so a second file (a per-preset
// split, if the library grows the way camera-moves/ did) has somewhere to land without every
// importer needing to change.
export * from './presets.js';
