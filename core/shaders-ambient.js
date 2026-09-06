// core/shaders-ambient.js: thin re-export. Its only real caller is core/surfaces/shader.js, so it
// moved to core/surfaces/shaders-ambient.js (W9). Kept so every existing
// `from './shaders-ambient.js'` import keeps working unchanged.
export * from './surfaces/shaders-ambient.js';
