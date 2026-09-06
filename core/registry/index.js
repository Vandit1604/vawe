// core/registry/index.js: barrel for the registry package (registry.js: defineRegistry +
// checkCovered/checkCatalog/checkBlurb, refused at LOAD; vocab.js: the shared naming/feel
// vocabulary; props.js: the guard vocabulary a layer's props are checked against; prop-audit.js:
// watches/audits a built layer's props against that guard; knobs.js: the per-preset dial manifest;
// theme-contract.js: the required theme keys). What an author may write, and its blurbs, grouped as
// one concern (W9). Each file still exports its own surface; nothing here composes them.
export * from './registry.js';
export * from './vocab.js';
export * from './props.js';
export * from './prop-audit.js';
export * from './knobs.js';
export * from './theme-contract.js';
