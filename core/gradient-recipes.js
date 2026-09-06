// core/gradient-recipes.js: thin re-export. Its only real caller is core/backgrounds/fx.js, so it
// moved to core/backgrounds/gradient-recipes.js (W9). Kept so every existing
// `from './gradient-recipes.js'` import keeps working unchanged.
export * from './backgrounds/gradient-recipes.js';
