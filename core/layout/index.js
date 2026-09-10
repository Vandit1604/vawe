// core/layout/index.js: barrel for the layout package (safe.js: the canvas table + safe-zone math;
// bg-html.js: the HTML-backdrop layer). generators.js, icons.js and pan-resolve.mjs moved out to
// core/generators, core/icons and core/timeline: layout is the frame and the safe zone inside it,
// not a home for whatever else needed a package.
export * from './safe.js';
export * from './bg-html.js';
