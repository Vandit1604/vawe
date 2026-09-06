// core/frame-settle.js: thin re-export. Its only real caller is core/layers/video.js, so it moved
// to core/layers/frame-settle.js (W9). Kept so every existing `from './frame-settle.js'` import
// keeps working unchanged.
export * from './layers/frame-settle.js';
