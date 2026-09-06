// core/raymarch-fx.js: thin re-export. Its only real caller is core/surfaces/raymarch.js, so it
// moved to core/surfaces/raymarch-fx.js (W9). Kept so every existing `from './raymarch-fx.js'`
// import keeps working unchanged.
export * from './surfaces/raymarch-fx.js';
