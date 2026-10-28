/**
 * The frames of an animatic: one entry per world, { id, frames, hold } where `frames` is how many output frames its still fills at `fps`
 * and `hold` is its span in seconds. The frame index of each cut is round(cutTime * fps), so the counts add up to round(duration * fps)
 * and every later cut lands on time; a world shorter than one frame gets 0. `cuts` is the cutSpans output, one [start, end] per shot. Pure.
 */
export function animaticHolds(shots, cuts, fps) {
  return shots.map((s, i) => {
    const [start, end] = cuts[i];
    const valid = Number.isFinite(start) && Number.isFinite(end);
    const frames = valid ? Math.round(end * fps) - Math.round(start * fps) : 0;
    return { id: s.id, frames, hold: valid ? end - start : 0 };
  });
}
