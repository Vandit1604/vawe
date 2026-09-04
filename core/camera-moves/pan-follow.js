import { span } from './units.js';

// panFollow: the camera TRANSLATES to keep pace with content that grows downward (the "terminal types
// while the camera pans down" move). Linear so the pan tracks the typing at constant speed, no easing lurch.
export function panFollow({ start = 0, dur = 5, dx = 0, dy = -300, s = 1, ease = 'linear' } = {}) {
  span('panFollow', 'dur', dur);
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: dy, ease }];
}
