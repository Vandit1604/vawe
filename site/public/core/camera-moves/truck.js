import { span } from './units.js';

// truck: the plain lateral travel (the camera runs along a wall of cards). panFollow's defaults are
// VERTICAL (dy: -300), so a sideways move had no name and got hand-typed each time. Linear because a
// constant-speed side move reads as the camera tracking; an eased one reads as a lurch.
export function truck({ start = 0, dur = 3, dx = -1920, s = 1, ease = 'linear' } = {}) {
  span('truck', 'dur', dur);
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: 0, ease }];
}
