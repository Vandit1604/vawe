// core/stings.js: thin re-export. The generative shader-overlay implementation moved to
// core/stings/ (one file per fx under units/, core/stings/index.js the generic runner that stitches
// them into one shader), the same loosely-coupled shape as core/seams.js. This file exists only so
// every importer's `from './stings.js'` keeps working unchanged.
export * from './stings/index.js';
