// core/engine/index.js: barrel for the engine package (boot.js: the boot sequence that runs before
// frame 0; preload.js: the awaited readiness phase boot calls into, one async pass per asset kind;
// produce.js: bakes camera/depth/focus onto the baseline before the DOM exists; src-url.js: asset
// URL resolution; fonts.js: font loading; gsap-effects.js: the named GSAP effect library; webgl.js:
// shared GL setup; idle.js: how a layer lives between its ramps). Eight root singletons that all sit
// on the render page's LOAD path (W9), grouped the way core/audio/ groups a shared concern rather
// than a shared runner. Each file still exports its own surface; nothing here composes them.
export * from './boot.js';
export * from './preload.js';
export * from './produce.js';
export * from './src-url.js';
export * from './fonts.js';
export * from './gsap-effects.js';
export * from './webgl.js';
export * from './idle.js';
