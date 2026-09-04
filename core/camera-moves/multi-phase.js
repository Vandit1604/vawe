import { span } from './units.js';

// multiPhase: chain several legs into one journey (push → hold-with-drift → settle). Each leg is
// { dur, s?, x?, y? }; interior keyframes get ease:"linear" so the whole path is velocity-continuous and
// a "hold" leg still creeps (never a dead freeze). Only the last leg eases out.
export function multiPhase({ start = 0, legs = [], settleEase = 'easeOutCubic' } = {}) {
  const kf = [{ t: start, s: 1, x: 0, y: 0 }];
  let t = start;
  legs.forEach((leg, i) => {
    t += span('multiPhase', `legs[${i}].dur`, leg.dur ?? 1);
    const last = i === legs.length - 1;
    // Every axis a leg does not mention CARRIES FORWARD. `s` always did; x and y defaulted to 0 on the
    // same line, so the documented "hold" leg (`{dur: 2}` between a push and a settle) was not a hold at
    // all. It panned the camera the whole way back to centre, 180px over 2s in the docstring's own
    // example, a move as large as the push it was supposed to be holding after. The right idiom was
    // known and applied to one of three axes (docs/MISTAKES.md #197).
    const prev = kf[kf.length - 1];
    kf.push({ t, s: leg.s ?? prev.s, x: leg.x ?? prev.x, y: leg.y ?? prev.y, ease: last ? settleEase : 'linear' });
  });
  return kf;
}
