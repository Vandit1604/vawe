// core/three-fx.js: thin re-export. Its only real caller is core/surfaces/three.js, so it moved
// to core/surfaces/three-fx.js (W9), taking its two private siblings (three-scenes.js,
// globe-dots.js) with it. Kept so every existing `from './three-fx.js'` import keeps working
// unchanged.
export * from './surfaces/three-fx.js';
