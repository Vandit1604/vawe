// core/path-morph.js: thin re-export. Its only real caller is core/layers/svg.js, so it moved to
// core/layers/path-morph.js (W9). Kept so every existing `from './path-morph.js'` import keeps
// working unchanged.
export * from './layers/path-morph.js';
