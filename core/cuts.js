// core/cuts.js: thin re-export of the core/cuts/ package (presentations.js: the cut fx;
// timings.js: the shared speed dial; index.js: the generic runner that picks a presentation and a
// timing and turns seq() state into a style object). Same pattern as core/stings.js and
// core/backgrounds.js: "add a cut" is "add one entry to presentations.js", never edit this file.
// Every existing import of `./cuts.js` keeps working unchanged.
export * from './cuts/index.js';
