import { span, hold } from './units.js';
import { shake } from '../motion/motion.js';

// cameraShake: an IMPACT, pre-sampled to keyframes. The randomness is the engine's own deterministic
// `shake()` (core/motion.js, hashSeed/noise, lib-tested): sampled HERE, at author time, so renderFrame(n)
// only ever lerps numbers. Nothing stochastic runs at render time, by then the shake is DATA.
//
// Why one key PER FRAME instead of two keys per held step: the reference is a stepped table (14 steps of
// 0.03s, about one frame each at 30fps), and a step held across a lerp needs an arrive key AND a hold key.
// At fps sampling the two collapse: a key per frame IS the frame the renderer shows, so what the lerp
// does between adjacent keys is never seen. Half the keyframes for the same picture, and `freq`/`decay`
// stay real knobs instead of a frozen table.
//
// The defaults ARE that reference, restated as an envelope: amp 28 decaying to about 2 over 0.42s gives
// decay ≈ 6.3, and the table's sign flip every 0.03s is a ~16Hz oscillation. `y` is 0.7 of `x`, as
// measured. Then 0.1s of recovery to exactly zero, eased out, so the frame LANDS instead of stopping.
//
// THE INTERIOR-EASE EXEMPTION, and why it is deliberate: every other move in this package forces
// `ease:"linear"` on interiors so a chained tween stays velocity-continuous (#125, an eased curve at
// every key zeroes velocity and the push pulses). A shake IS that pulse. The samples reverse direction
// every frame or two, so the velocity discontinuity #125 forbids is here on purpose; the linear interiors
// below are not the rule being obeyed, they are what a per-frame sample wants between neighbours. The one
// eased key is the final recovery, because the settle is the only part of an impact that is a MOVE.
export function cameraShake({ start = 0, dur = 0.42, amp = 28, freq = 16, decay = 6.3, seed = 1,
  recover = 0.1, fps = 30 } = {}) {
  span('cameraShake', 'dur', dur);
  hold('cameraShake', 'recover', recover);
  if (!Number.isFinite(fps) || fps <= 0)
    throw new Error(`cameraShake: "fps" must be a positive sample rate; got ${JSON.stringify(fps)}`);
  const step = 1 / fps;
  const kf = [{ t: start, s: 1, x: 0, y: 0 }];
  // n starts at 1: the sample AT the hit is the zero key above (shake(0) is {0,0} by contract).
  for (let n = 1; n * step <= dur + 1e-9; n++) {
    const dt = n * step;
    const o = shake(dt, { amp, freq, decay, seed });
    kf.push({ t: start + dt, s: 1, x: o.x, y: o.y * 0.7, ease: 'linear' });
  }
  if (recover > 0) kf.push({ t: start + dur + recover, s: 1, x: 0, y: 0, ease: 'easeOutQuad' });
  return kf;
}
