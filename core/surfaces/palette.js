// core/surfaces/palette.js — `L.colors` as GL float triples, or null for "use the effect's own
// colourful default". Its own file rather than a helper in index.js so a surface importing it does
// not import the registry that imports the surface.
//
// A stop MAY name its own position along the ramp, as `#rrggbb@0.42`. Without one, the stops are
// spread evenly, which is what every field written before this did and still gets.
//
// WHY POSITIONS EXIST. Eight evenly spaced stops cannot describe a feature narrower than a seventh of
// the ramp, however many of them you add. `spectrum` is fitted to a photograph whose trough is about
// 6% of the frame, and adding stops never reached it because count was never the missing axis.
//
// WHY IT IS A SUFFIX ON THE STRING and not a parallel array of numbers: a parallel array is a second
// thing to keep in the same order, and the position then belongs to whichever colour happens to sit
// at that index. Here a stop carries its own position and the two cannot come apart. It also keeps
// `colors` a plain array of strings, so the scene schema and every existing scene are untouched.
const STOP = /^#?([0-9a-fA-F]{6})(?:@(-?\d*\.?\d+))?$/;

export const palette = (L) => {
  if (!Array.isArray(L.colors) || !L.colors.length) return null;
  const parsed = L.colors.map((c, i) => {
    const m = STOP.exec(String(c).trim());
    // LOUD. `parseInt('teal', 16)` is NaN, which reached the shader as black and told nobody: a
    // mistyped stop used to render as a colour the author never chose. The engine refuses input it
    // cannot honour rather than substituting something.
    if (!m) throw new Error(`colors[${i}]: "${c}" is not a stop. Want #rrggbb, optionally #rrggbb@<position 0..1>.`);
    const n = parseInt(m[1], 16);
    const rgb = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    if (m[2] === undefined) return rgb;
    const at = Number(m[2]);
    if (!(at >= 0 && at <= 1)) throw new Error(`colors[${i}]: position ${m[2]} is outside 0..1.`);
    return [...rgb, at];
  });
  // All of them or none. A half-positioned ramp would have to guess where the rest sit, and the
  // shader refuses it for the same reason; catching it here names the layer instead of the frame.
  const given = parsed.filter((c) => c.length > 3).length;
  if (given && given !== parsed.length) {
    throw new Error(`colors: ${given} of ${parsed.length} stops give a position. Give every stop one, or none.`);
  }
  return parsed;
};
