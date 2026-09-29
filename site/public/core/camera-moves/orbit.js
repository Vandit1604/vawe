import { span } from './units.js';

// orbit: a gentle 3D swing around the frame (ry sweeps through 0), giving depth to a dimensional beat.
// 3 keyframes → interior gets ease:"linear" so the swing is one continuous arc, not two eased halves.
export function orbit({ start = 0, dur = 6, deg = 12, s = 1.05, ease = 'easeInOutSine' } = {}) {
  span('orbit', 'dur', dur);
  const mid = start + dur / 2;
  return [
    { t: start, s, x: 0, y: 0, ry: -deg },
    { t: mid, s, x: 0, y: 0, ry: 0, ease: 'linear' },   // interior: linear keeps velocity continuous (#125)
    { t: start + dur, s, x: 0, y: 0, ry: deg, ease },
  ];
}
