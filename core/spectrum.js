// core/spectrum.js: per-frame band energy, so a scene can move ON the music instead of near it.
//
// Pure maths, no deps, no I/O. The same arrangement as core/beats.js, and for the same reason: the
// analysis runs ONCE offline (scripts/media/spectrum.mjs writes a sidecar) and the render only ever
// reads a lookup table. That is what keeps audio-reactivity inside the determinism claim. Reacting to
// audio LIVE would mean the frame depends on a decoder's state; reacting to a baked table means
// renderFrame(412) reads row 412 and nothing else, which is as pure as a constant.
//
// Bands rather than an FFT: three envelopes (low/mid/high) is what motion design actually consumes,
// and band-pass energy gets there with a biquad and an RMS instead of a transform. If a future effect
// needs real bins, this is the file that grows. The sidecar shape already carries N bands.

/** Default band splits in Hz. Kick/bass · body/vocal · air/cymbals. */
export const BANDS = [
  { name: 'low', f0: 40, f1: 180 },
  { name: 'mid', f0: 180, f1: 2000 },
  { name: 'high', f0: 2000, f1: 12000 },
];

/** One-pole state-variable band-pass, applied forward over the whole signal. Deterministic. */
function bandPass(samples, sampleRate, f0, f1) {
  const out = new Float64Array(samples.length);
  // cascade a high-pass at f0 and a low-pass at f1 as one-poles; cheap, stable, and monotone in energy
  const kHi = Math.exp((-2 * Math.PI * f0) / sampleRate);
  const kLo = Math.exp((-2 * Math.PI * f1) / sampleRate);
  let lpLow = 0, lpHigh = 0;
  for (let i = 0; i < samples.length; i++) {
    lpLow = samples[i] * (1 - kHi) + lpLow * kHi;      // energy below f0
    const hp = samples[i] - lpLow;                      // high-passed at f0
    lpHigh = hp * (1 - kLo) + lpHigh * kLo;             // then low-passed at f1
    out[i] = lpHigh;
  }
  return out;
}

/**
 * bandEnergies(samples, sampleRate, fps, bands) → { fps, bands: [names], frames: [[b0..bn], …] }
 * One row per video frame, each value normalised to 0..1 across the track so a scene can map it
 * straight onto a range. Normalising per BAND (not globally) matters: a track with no top end would
 * otherwise leave `high` permanently at zero and the effect keyed to it looking broken.
 */
export function bandEnergies(samples, sampleRate, fps = 30, bands = BANDS) {
  const nFrames = Math.max(1, Math.floor((samples.length / sampleRate) * fps));
  const win = Math.max(1, Math.round(sampleRate / fps));
  const peaks = [];
  const cols = bands.map((b) => {
    const filtered = bandPass(samples, sampleRate, b.f0, b.f1);
    const col = new Float64Array(nFrames);
    for (let f = 0; f < nFrames; f++) {
      const o = f * win, end = Math.min(samples.length, o + win);
      let s = 0;
      for (let i = o; i < end; i++) s += filtered[i] * filtered[i];
      col[f] = Math.sqrt(s / Math.max(1, end - o));
    }
    const rawMax = col.reduce((m, v) => (v > m ? v : m), 0);
    peaks.push(rawMax);
    const max = rawMax || 1;
    for (let f = 0; f < nFrames; f++) col[f] = col[f] / max;
    return col;
  });
  const frames = [];
  for (let f = 0; f < nFrames; f++) frames.push(cols.map((c) => +c[f].toFixed(4)));
  // `peak` is each band's ABSOLUTE energy before normalisation. It has to be reported, because the
  // normalisation above is per band: on a bass-only track the `high` column still reaches 1.0, which
  // is what makes every band usable and also what would let an author key a pulse to silence and
  // wonder why it looks like noise. peak is how you tell the difference.
  return { fps, bands: bands.map((b) => b.name), peak: peaks.map((p) => +p.toFixed(5)), frames };
}

/**
 * sampleAt(spec, n, band) → 0..1 for video frame `n`. Holds the endpoints rather than wrapping, and
 * returns 0 for an unknown band so a typo makes the effect stand still instead of throwing mid-render.
 */
export function sampleAt(spec, n, band = 'low') {
  if (!spec || !spec.frames || !spec.frames.length) return 0;
  const i = spec.bands.indexOf(band);
  if (i < 0) return 0;
  const row = spec.frames[Math.max(0, Math.min(spec.frames.length - 1, Math.round(n)))];
  return row ? row[i] ?? 0 : 0;
}
