// core/camera-moves.js: thin re-export. The camera-move generators, their registry and the sugar
// resolver now live in core/camera-moves/ (units.js for shared arithmetic, one file per move, index.js
// as the runner) so that adding a move means adding one file, not editing this one. Kept as a re-export
// so every existing `from './camera-moves.js'` import keeps working unchanged.
export * from './camera-moves/index.js';
