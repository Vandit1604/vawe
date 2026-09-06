// core/paint-fx.js: thin re-export. Its only real caller is core/surfaces/paint.js, so it moved
// to core/surfaces/paint-fx.js (W9). Kept so every existing `from './paint-fx.js'` import keeps
// working unchanged.
export * from './surfaces/paint-fx.js';
