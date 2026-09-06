// core/three-scenes.js: thin re-export. Its only real caller is core/surfaces/three-fx.js, so it
// moved to core/surfaces/three-scenes.js (W9). Kept so every existing `from './three-scenes.js'`
// import keeps working unchanged.
export * from './surfaces/three-scenes.js';
