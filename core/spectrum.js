// core/spectrum.js: thin re-export. Its only real caller is core/tracks/react.js, so it moved to
// core/tracks/spectrum.js (W9). Kept so every existing `from './spectrum.js'` import keeps
// working unchanged.
export * from './tracks/spectrum.js';
