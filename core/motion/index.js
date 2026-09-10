// core/motion/index.js: barrel for the motion package (motion.js: the scene runtime + motion
// primitives, interpolate/spring/track/rise/fade/pop/slide/sequence + easings + the theme
// system; effector.js: element-choreography effector helpers; morph.js: TextMorph, letters migrate
// A to B; parts.js: the CSS-selector fragment-entrance registry). Keyframes and element
// choreography, grouped as one concern (W9). Each file still exports its own surface; nothing here
// composes them.
export * from './motion.js';
export * from './effector.js';
export * from './morph.js';
export * from './parts.js';
