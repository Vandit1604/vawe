// core/audio/index.js: barrel for the audio family (bridges.js: silence-gap crossfades between
// beats; cues.js: cut/seam sound cues; kit.mjs: the synth + WAV writer; select.js: profile-to-bed
// selection; tactile.js: motion-triggered SFX + density). Five separate concerns that were five
// root files sharing only a name prefix, not a runner one imports through the way backgrounds/ or
// camera-moves/ does; grouped here so `core/audio-*.js` at the root become one package instead of
// five siblings. Each file still exports its own surface; nothing here composes them.
export * from './bridges.js';
export * from './cues.js';
export * from './kit.mjs';
export * from './select.js';
export * from './tactile.js';
