// core/tracks/resample.js: drive whatever resampler a layer attached, once per layer per frame.
//
// It is a track and not a modifier for the reason the registry gives: it runs for every layer whether
// the author asked or not, and it has to interleave at an exact point, immediately after `primitive`,
// because a `paint` or `shader` layer draws its own canvas there and the pass must read THIS frame's
// pixels, never the last frame's.
//
// It used to be two call sites: core/layers/image.js and core/layers/canvas.js each ticked their own,
// which is why no other layer type could be resampled at all, a text layer has no frame() to hang it
// off. One owner, every type, and the ordering fact lives in one place (engine-doctrine/MISTAKES.md #425).
import { tickResample } from '../resample/index.js';

export const slot = 'resample';

// `resample` and `seed` are declared here rather than on each layer type, because this track is what
// reads them for EVERY type now. core/resample.js still exports the same pair for image/canvas, and
// mergeProps unions the two claims.
export { PROPS } from '../resample/index.js';

export function frame(ctx) {
  const { el, L, t, start, end } = ctx;
  if (L.resample) tickResample(el, L, t, t >= start && t < end);
}
