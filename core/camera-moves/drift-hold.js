import { span } from './units.js';

// driftHold: a held frame that is never DEAD. A sine micro-drift, pre-sampled on the same author-time
// contract as cameraShake (the render only lerps). Two things make it read as breathing rather than as
// machinery: the amplitude sits under the threshold where the eye reads travel between two frames (2-8px
// on x, 1-4px on y across seconds), and x/y run at DIFFERENT frequencies. A 1.0 ratio walks a perfect
// diagonal and looks mechanical; ~1.3 traces a Lissajous that never quite closes inside the window.
// 10 keys per cycle is plenty: a sine sampled that finely is not distinguishable from the curve.
export function driftHold({ start = 0, dur = 4, ax = 6, ay = 3, cycles = 1.5, ratio = 1.3, s = 1,
  keysPerCycle = 10 } = {}) {
  span('driftHold', 'dur', dur);
  if (!Number.isFinite(cycles) || cycles <= 0)
    throw new Error(`driftHold: "cycles" must be a positive number of cycles across the window; got ${JSON.stringify(cycles)}`);
  // A drift the eye can catch frame to frame is not a drift, it is a shake wearing the wrong name, and
  // nothing downstream would ever say so. cameraShake is one word away.
  for (const [k, v] of [['ax', ax], ['ay', ay]]) {
    if (!Number.isFinite(v) || Math.abs(v) > 12)
      throw new Error(`driftHold: "${k}" must be a micro-amplitude (|${k}| <= 12px); got ${JSON.stringify(v)}.`
        + ` Larger and it reads as a discrete shake per frame, use cameraShake if that is what you want.`);
  }
  const n = Math.max(2, Math.round(cycles * keysPerCycle));
  const kf = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = 2 * Math.PI * cycles * u;
    kf.push({ t: start + dur * u, s, x: ax * Math.sin(ph), y: ay * Math.sin(ph * ratio),
      ...(i ? { ease: 'linear' } : {}) });
  }
  return kf;
}
