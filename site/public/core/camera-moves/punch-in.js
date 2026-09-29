import { span } from './units.js';

// punchIn. The crash zoom: the frame is THROWN at you, recoils, and rings out. Three legs, and the ease
// FAMILY is the whole point. Every other move here is a `.out` (fast, then settle) because it is a move.
// This one accelerates INTO frame, so leg 1 is `easeInExpo`: nothing, nothing, then all of it at once.
// Leg 2 is the recoil past the resting scale (a squash below `to`), leg 3 rings back with
// `easeOutElastic`. Both easings already exist in EASINGS (core/motion.js), nothing was approximated.
// Interiors are NOT linear and must not be: the velocity break at each key IS the impact, the same
// deliberate exemption from #125 that cameraShake takes.
export function punchIn({ start = 0, dur = 0.32, from = 0.72, to = 1, squash = 0.96, squashDur = 0.08,
  settleDur = 0.5 } = {}) {
  span('punchIn', 'dur', dur);
  span('punchIn', 'squashDur', squashDur);
  span('punchIn', 'settleDur', settleDur);
  for (const [k, v] of [['from', from], ['to', to], ['squash', squash]]) {
    if (!(Number.isFinite(v) && v > 0))
      throw new Error(`punchIn: "${k}" must be a positive magnification; got ${JSON.stringify(v)}`);
  }
  const t1 = start + dur, t2 = t1 + squashDur;
  return [
    { t: start, s: from, x: 0, y: 0 },
    { t: t1, s: to, x: 0, y: 0, ease: 'easeInExpo' },
    { t: t2, s: squash, x: 0, y: 0, ease: 'easeOutQuad' },
    { t: t2 + settleDur, s: to, x: 0, y: 0, ease: 'easeOutElastic' },
  ];
}
