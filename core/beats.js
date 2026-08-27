// core/beats.js: find the pulse of a track, so cuts can land ON the beat instead of near it.
//
// Pure maths, no deps, no I/O: every function here is a deterministic transform of a sample array,
// so the same track always yields the same grid and a beat-matched video stays reproducible.
// (scripts/media/beatmap.mjs does the file reading and writes the sidecar.)
//
// The chain is the standard one, kept deliberately small:
//   samples -> onset envelope -> tempo by autocorrelation -> phase by pulse-train correlation -> grid
// Energy flux rather than spectral flux: no FFT, and for the mixed music a launch video actually uses
// (drums or a clear rhythmic pulse) the onset peaks land in the same places. Where it cannot find a
// convincing pulse it says so via `confidence` instead of inventing a grid, an ambient pad has no
// beat, and pretending otherwise would scatter cuts at meaningless times.

/** Frame the signal and return a half-wave-rectified energy-flux onset envelope (one value per hop). */
export function onsetEnvelope(samples, sampleRate, hop = 512, win = 1024) {
  const frames = Math.max(0, Math.floor((samples.length - win) / hop));
  const energy = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const o = f * hop;
    for (let i = 0; i < win; i++) { const v = samples[o + i]; s += v * v; }
    energy[f] = Math.sqrt(s / win);
  }
  // flux = positive change in energy against a short moving average (a local, not global, threshold,
  // so a quiet intro and a loud chorus both produce usable onsets)
  const env = new Float64Array(frames);
  const W = 8;
  for (let f = 0; f < frames; f++) {
    let mean = 0, n = 0;
    for (let k = Math.max(0, f - W); k < f; k++) { mean += energy[k]; n++; }
    mean = n ? mean / n : 0;
    env[f] = Math.max(0, energy[f] - mean);
  }
  return { env, hopSeconds: hop / sampleRate };
}

/**
 * Tempo by autocorrelation of the onset envelope, searched over a musical BPM range.
 * Returns { bpm, periodFrames, confidence }: confidence is the winning lag's correlation relative
 * to the mean, so a track with no pulse scores near 1 and can be rejected by the caller.
 */
export function estimateTempo(env, hopSeconds, { minBpm = 70, maxBpm = 180 } = {}) {
  const minLag = Math.max(2, Math.round(60 / maxBpm / hopSeconds));
  const maxLag = Math.min(env.length - 1, Math.round(60 / minBpm / hopSeconds));
  if (maxLag <= minLag) return { bpm: 0, periodFrames: 0, confidence: 0 };
  let mean = 0;
  for (let i = 0; i < env.length; i++) mean += env[i];
  mean /= env.length || 1;
  const cor = new Float64Array(maxLag + 1);
  let best = minLag, bestV = -Infinity, sum = 0, n = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < env.length; i++) s += (env[i] - mean) * (env[i + lag] - mean);
    s /= (env.length - lag);
    cor[lag] = s; sum += s; n++;
    if (s > bestV) { bestV = s; best = lag; }
  }
  const avg = n ? sum / n : 0;
  // Octave check: autocorrelation happily locks to half-tempo. If double-time correlates nearly as
  // well, prefer it, 140bpm cuts feel right where 70bpm cuts feel like the video is dragging.
  const half = Math.round(best / 2);
  if (half >= minLag && cor[half] > bestV * 0.82) best = half;
  const confidence = avg !== 0 ? Math.abs(bestV / avg) : 0;
  return { bpm: 60 / (best * hopSeconds), periodFrames: best, confidence };
}

/**
 * Phase: slide a pulse train of the detected period across the envelope and keep the offset whose
 * pulses collect the most onset energy. Tempo alone is not enough, a grid at the right spacing but
 * the wrong phase puts every cut exactly between the beats.
 */
export function estimatePhase(env, periodFrames) {
  if (!periodFrames) return 0;
  let best = 0, bestScore = -Infinity;
  for (let off = 0; off < periodFrames; off++) {
    let s = 0;
    for (let f = off; f < env.length; f += periodFrames) s += env[f];
    if (s > bestScore) { bestScore = s; best = off; }
  }
  return best;
}

/** Beat times in seconds across `duration`, from the detected period and phase. */
export function beatGrid(periodFrames, phaseFrames, hopSeconds, duration) {
  if (!periodFrames) return [];
  const period = periodFrames * hopSeconds;
  const out = [];
  for (let t = phaseFrames * hopSeconds; t < duration; t += period) out.push(+t.toFixed(4));
  return out;
}

/**
 * Snap a time to the nearest beat, but only if a beat is close enough to be the SAME moment.
 * Beyond `maxShift` the intended edit point matters more than the grid: silently dragging a cut a
 * third of a second to hit a beat destroys the timing the author actually wrote.
 */
export function snapToBeat(t, beats, maxShift = 0.12) {
  if (!beats || !beats.length) return t;
  let best = beats[0];
  for (const b of beats) if (Math.abs(b - t) < Math.abs(best - t)) best = b;
  return Math.abs(best - t) <= maxShift ? +best.toFixed(3) : t;
}

/** Every Nth beat: the bar line. Cuts on a downbeat read as intentional; off-bar reads as drift. */
export const downbeats = (beats, per = 4, offset = 0) => beats.filter((_, i) => (i - offset) % per === 0);
