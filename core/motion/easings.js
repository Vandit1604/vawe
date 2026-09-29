import * as curves from './curves.js';
import { spring } from './springs.js';

// Named easings by name, for tools that fit a measured curve to the closest one.
export const EASINGS = {
  linear: (t) => t,
  ...Object.fromEntries(Object.entries(curves).filter(([name, fn]) => name.startsWith('ease') && typeof fn === 'function')),
  spring: (t) => spring(t),
  hold: (t) => (t >= 1 ? 1 : 0),
};
