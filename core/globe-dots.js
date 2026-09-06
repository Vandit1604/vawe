// core/globe-dots.js: thin re-export. Its only real caller is core/surfaces/three-fx.js, so it
// moved to core/surfaces/globe-dots.js (W9). Kept so every existing `from './globe-dots.js'`
// import keeps working unchanged.
export * from './surfaces/globe-dots.js';
