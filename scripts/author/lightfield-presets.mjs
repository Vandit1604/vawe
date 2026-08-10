// The committed fields. Each one is a full option set, so it doubles as a worked example of the API.
// Nothing here is special-cased inside the generator: a preset is just an argument.

export const PRESETS = {
  // The reference reproduction. Orange bloom high and left of centre, magenta below it, red body,
  // black falling off to the right, seen through a backlit blind.
  ref: {
    // Every number here was FITTED, not chosen: scripts/author/lightfield-seeds.mjs ranked four
    // million layouts against the image, and lightfield-fit.mjs confirmed the shortlist through the
    // real renderer, on the colour field AND on the striping. depth 0 is a result, not an oversight:
    // the colour field already drains to the ground, and every second fall on top measured worse.
    // colour.extra is empty for the same reason. Two accent colours were fitted end to end against
    // this image, a dark magenta and a cold blue, and the field came out 7.5% against 7.3% without
    // them. The list stays in the API because it is cheap and some palettes need it. This one does
    // not, and the number says so.
    seed: 3449610,
    colour: { bloom: '#ee7c56', mid: '#c22d45', deep: '#851b08', ground: '#000202' },
    shadow: { depth: 0, softness: 0.3, direction: 'bottom', seam: 0.5, sheen: 0.8 },
    pattern: { kind: 'slats', count: 62, jitter: 0.55 },
    motion: { kind: 'shimmer', speed: 1, amount: 1 },
  },

  // Cold water. Same idea, opposite temperature and a concentric structure, so the eye travels out
  // from a point instead of across a grille.
  tide: {
    seed: 4021,
    // `extra` earns its place here: a cold sea has a green in it that no role among bloom, mid,
    // deep and ground can name, and naming it as a fifth role would mean nothing on any other palette.
    colour: { bloom: '#8fe8ff', mid: '#2f6ea8', deep: '#10305c', ground: '#01060f', extra: ['#1f7d74'] },
    shadow: { depth: 0.82, softness: 0.95, direction: 'bottom', seam: 0.55, sheen: 0.4 },
    pattern: { kind: 'rings', count: 120, jitter: 0.3 },
    motion: { kind: 'breathe', speed: 0.7, amount: 1.2 },
  },

  // A fan of rays through green, with a hard, near-central falloff. The shadow dial is doing most
  // of the mood here: crisp and centred reads as a spotlight, not as weather.
  fern: {
    seed: 90210,
    colour: { bloom: '#d8f36a', mid: '#2fa06a', deep: '#12402f', ground: '#03110c' },
    shadow: { depth: 0.9, softness: 0.35, direction: 'center', seam: 0.7, sheen: 0.5 },
    pattern: { kind: 'shards', count: 34, jitter: 0.6 },
    motion: { kind: 'drift', speed: 1.4, amount: 0.8 },
  },
};
