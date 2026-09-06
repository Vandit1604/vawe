// core/timeline/index.js: barrel for the timeline package (sequence.js: the keyed-motion clock;
// time.js: layer time remap; junctions.js: cut/seam joints and window binding; seams.js: two-scene
// GPU-blend transitions; clips.js: declarative composition, clipStyleAt/driveClips/seekAll;
// velocity-cut.js: cut-velocity advice; spectacle.js: the one exaggerated-moment resolver). The
// clock, the joints, and the cuts in time, grouped as one concern (W9). Each file still exports its
// own surface; nothing here composes them.
export * from './sequence.js';
export * from './time.js';
export * from './junctions.js';
export * from './seams.js';
export * from './clips.js';
export * from './velocity-cut.js';
export * from './spectacle.js';
