// core/generators/index.js: barrel for the procedural-picture-generator registry (was
// core/layout/generators.js, moved here because it is a live rendering registry, not layout math and
// not an asset the way top-level generators/ bakes one: it never writes to assets/, it is called at
// render/preview time and deeply imports core internals (lightfield, layers, registry, type, looks,
// motion)).
export * from './generators.js';
