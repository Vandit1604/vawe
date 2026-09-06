// core/layout/index.js: barrel for the layout package (safe.js: the canvas table + safe-zone
// math; generators.js: procedural picture generators; bg-html.js: the HTML-backdrop layer;
// icons.js: the inline-svg icon set; pan-resolve.mjs: merges a scene's authored camera pans). The
// frame and what fills it, grouped as one concern (W9). Each file still exports its own surface;
// nothing here composes them.
export * from './safe.js';
export * from './generators.js';
export * from './bg-html.js';
export * from './icons.js';
export * from './pan-resolve.mjs';
