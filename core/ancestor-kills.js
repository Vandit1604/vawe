// core/ancestor-kills.js: thin re-export. Its only real caller is core/fx/mix-blend.js, so it
// moved to core/fx/ancestor-kills.js (W9). Kept so every existing `from './ancestor-kills.js'`
// import keeps working unchanged.
export * from './fx/ancestor-kills.js';
