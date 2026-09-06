// core/type/index.js: barrel for the type package (type.js: kinetic-typography kit, splitText +
// PRESETS + animateUnits; on-screen-text.js: onScreenText/glyphText measurement; sanitize-html.js:
// html layer sanitizing + timeCssUsed; captions.js: the caption unit/style vocabulary; ransom.js:
// the ransom-glyph face registry). Words on screen, grouped as one concern (W9). Each file still
// exports its own surface; nothing here composes them.
export * from './type.js';
export * from './on-screen-text.js';
export * from './sanitize-html.js';
export * from './captions.js';
export * from './ransom.js';
