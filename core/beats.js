// core/beats.js: thin re-export. Moved to core/beats/detect.js as part of the beats/ package
// (W9). Kept so every existing `from './beats.js'` import keeps working unchanged.
export * from './beats/detect.js';
