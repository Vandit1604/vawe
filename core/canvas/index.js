// core/canvas/index.js: barrel for the canvas package (effects.js: Tier-2 Canvas-2D per-pixel
// image passes, halftone/dither/mosaic/…; kind.js: what context kind a canvas holds, answered
// without asking for one). Two root files sharing a name prefix, grouped the same way audio/ is.
export * from './effects.js';
export * from './kind.js';
