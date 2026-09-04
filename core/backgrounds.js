// backgrounds.js: thin re-export of the core/backgrounds/ package (fx.js: the painters; palette.js:
// PAL_PLINTH + bgPaletteFrom; presets.js: the named preset library; index.js: the generic runner that
// resolves a name, reads the opts vocabulary off the painters, and renders). This is the reference
// pattern from core/transitions/units.js + core/seams.js applied here: "add a background preset" is
// "add one entry to presets.js", never edit this file or the runner. Every existing import of
// `./backgrounds.js` keeps working unchanged.
export * from './backgrounds/index.js';
