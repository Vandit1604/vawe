import { span } from './units.js';

// slowPush: a gentle, continuous zoom in (the default "the frame is alive" move). One segment, ease-out.
export function slowPush({ start = 0, dur = 6, from = 1, to = 1.12, ease = 'easeOutCubic' } = {}) {
  span('slowPush', 'dur', dur);
  return [{ t: start, s: from, x: 0, y: 0 }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}
