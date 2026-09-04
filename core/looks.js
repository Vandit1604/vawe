// looks.js: thin re-export of the core/looks/ package (presets.js: the pass library + the named look
// library, one entry per look with its blurb; index.js: the generic runner that builds the registry,
// merges knobs, composes a look's passes and applies the result to a DOM layer). This is the reference
// pattern from core/backgrounds/ + core/stings/ applied here: "add a look" is "add one entry to
// presets.js", never edit this file or the runner. Every existing import of `./looks.js` keeps working
// unchanged.
export * from './looks/index.js';
