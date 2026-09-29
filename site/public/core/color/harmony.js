// core/color/harmony.js: classic hue-wheel colour harmonies, built on toHsl/fromHsl. Each returns
// hex strings so an authoring tool can drop the result straight into a scene JSON's palette.
import { toHsl, fromHsl } from './hsl.js';
import { format, asColor } from './parse.js';

const rotate = (c, deg) => {
  const hsl = toHsl(asColor(c));
  return format(fromHsl({ ...hsl, h: hsl.h + deg }));
};

/** complementary(c): the hue directly opposite c, as a one-item hex array. */
export function complementary(c) { return [rotate(c, 180)]; }

/** analogous(c): the two hues 30 degrees either side of c, as hex. */
export function analogous(c) { return [rotate(c, -30), rotate(c, 30)]; }

/** triad(c): the two hues 120 degrees either side of c (a triad together with c), as hex. */
export function triad(c) { return [rotate(c, 120), rotate(c, 240)]; }
