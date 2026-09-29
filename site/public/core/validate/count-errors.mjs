import { isObj } from './util.mjs';

// A COUNTER MUST NEVER OVERSHOOT. Overshoot is a claim about mass: a thing with weight passes its target
// and settles back. A number has no mass. `core/layers/count.js` runs the value through whatever ease it
// is handed, so a spring makes the count fly PAST its true figure and fall back, and for a few frames the
// film paints a number that is not true. `engine-doctrine/MOTION-CRAFT.md` used to recommend exactly that, twice,
// for "a value that should feel physical (number, bar, camera)".
//
// This is a CONTENT rule wearing a motion rule's clothes: "use real, accurate figures" is the one line in
// CLAUDE.md's content philosophy that has no exceptions, and a rendered 1,900 on the way to 1,822 breaks
// it. Refused rather than warned for that reason. No shipped scene trips it, so this closes a trap rather
// than reporting a defect (engine-doctrine/MISTAKES.md #385).
export function countEaseErrors(cfg) {
  // Declared INSIDE, not as a module const. This file is also a CLI, so its main block runs during
  // module evaluation; a const appended below it is still in the temporal dead zone when the main calls
  // through here, and every scene died with a ReferenceError instead of being validated.
  const OVERSHOOT_EASE = /spring|bounce|back|elastic/i;
  const out = [];
  const walk = (o, where) => {
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${where}[${i}]`));
    if (!isObj(o)) return;
    if (o.type === 'count' && typeof o.ease === 'string' && OVERSHOOT_EASE.test(o.ease))
      out.push(`${where}.ease "${o.ease}" overshoots, and a COUNT must not: the number would fly past `
        + `${o.to ?? 'its value'} and fall back, painting a figure that is not true for a few frames. `
        + `Overshoot is a claim about mass and a number has none. Use easeOutExpo or easeOutQuart, whose `
        + `deceleration IS the weight. (Springs are right on a motion/camera track, just not on a value.)`);
    for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`);
  };
  walk(cfg.layers, 'layers');
  return out;
}
