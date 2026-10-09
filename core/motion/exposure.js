// Exposure flashes on hard cuts, as a pure function of the seek time.

/**
 * Exposure state at time t for hard cuts at `cuts` (seconds). The peak is `frames` frames at `fps` of white
 * and brightness centred on the cut (the page swaps the shot at the cut, inside the peak), then the new shot
 * starts at `over` brightness and settles to 1 in `settle` s.
 * Returns { white, brightness, shot, flashing }: white is an additive overlay alpha, shot is the cut count so far.
 */
export function flashAt(t, cuts, { fps = 30, frames = 3, peak = 0.75, over = 2, settle = 0.15 } = {}) {
  const kept = flashCuts(cuts);
  const half = frames / fps / 2;
  const shot = cuts.filter((c) => t >= c).length;
  let white = 0, brightness = 1;
  for (const c of kept) {
    if (t >= c - half && t < c + half) { white = peak; brightness = over; }
    else if (t >= c + half && t < c + half + settle) {
      const u = (t - c - half) / settle;
      brightness = 1 + (over - 1) * (1 - u) ** 2;
    }
  }
  return { white, brightness, shot, flashing: white > 0 };
}

/** The cuts that may flash: at most 3 in any one second; a later cut in a crowded second cuts without a flash. */
export function flashCuts(cuts, { limit = 3 } = {}) {
  const kept = [];
  for (const c of [...cuts].sort((a, b) => a - b)) {
    if (kept.filter((k) => c - k < 1).length < limit) kept.push(c);
  }
  return kept;
}
