// core/audio/dsp.mjs: the sample-level primitives every voice is built from. Pure functions, no I/O,
// no Math.random: noise runs off a seeded PRNG so a cue is a pure function of its spec and seed.

export const SR = 44100;
export const TAU = Math.PI * 2;
export const sec = (s) => Math.round(s * SR);
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Seeded LCG. A cue that used Math.random would re-bake differently every time and silently break
// byte-stability of the shipped audio, which is the same class of bug as a wall-clock in a frame.
export function rng(seed = 0x9e3779b1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s / 4294967296) * 2 - 1; };
}

// `triangle` IS AN ALIAS FOR `tri`, AND AN UNKNOWN NAME THROWS. The old final `return Math.sin(ph)` turned
// a misspelt name into a sine without a word: silent substitution, this repo's worst bug class.
const WAVES = { sine: 1, tri: 1, triangle: 'tri', saw: 1, square: 1 };
export function osc(type, f, t, phase = 0) {
  const ph = TAU * f * t + phase;
  const w = WAVES[type];
  if (!w) throw new Error(`audio: unknown waveform "${type}". Use ${Object.keys(WAVES).join(', ')}.`);
  const kind = w === 1 ? type : w;
  if (kind === 'tri') return (2 / Math.PI) * Math.asin(Math.sin(ph));
  if (kind === 'saw') return 2 * (((f * t) % 1) + phase / TAU % 1) - 1;
  if (kind === 'square') return Math.sin(ph) >= 0 ? 1 : -1;
  return Math.sin(ph);
}

// Biquad (RBJ cookbook). The bandpass Q is what makes a tick a click and not a thud.
export function biquad(type, f0, Q) {
  let B0, B1, B2, A1, A2;
  // `tune` is separate from construction so the cutoff can MOVE. Coefficients change; the delay
  // state (x1..y2) does not, which is what keeps a swept filter continuous instead of clicking.
  const tune = (f) => {
    const w0 = TAU * clamp(f, 20, SR / 2 - 100) / SR;
    const c = Math.cos(w0), s = Math.sin(w0), alpha = s / (2 * Math.max(0.0001, Q));
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
    else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; } // bandpass (0dB peak)
    B0 = b0 / a0; B1 = b1 / a0; B2 = b2 / a0; A1 = a1 / a0; A2 = a2 / a0;
  };
  tune(f0);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const run = (x) => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  run.tune = tune;
  return run;
}

// In-place iterative radix-2 FFT; re and im are Float64Array of one power-of-two length.
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, ang = (inverse ? TAU : -TAU) / len;
    const wr = new Float64Array(half), wi = new Float64Array(half);
    for (let k = 0; k < half; k++) { wr[k] = Math.cos(ang * k); wi[k] = Math.sin(ang * k); }
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tr = re[b] * wr[k] - im[b] * wi[k], ti = re[b] * wi[k] + im[b] * wr[k];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

export const nextPow2 = (n) => { let p = 1; while (p < n) p <<= 1; return p; };

/** Linear convolution of x with h by FFT; the result has x.length + h.length - 1 samples. */
export function convolve(x, h) {
  const len = x.length + h.length - 1, n = nextPow2(len);
  const xr = new Float64Array(n), xi = new Float64Array(n), hr = new Float64Array(n), hi = new Float64Array(n);
  xr.set(x); hr.set(h);
  fft(xr, xi); fft(hr, hi);
  for (let i = 0; i < n; i++) { const r = xr[i] * hr[i] - xi[i] * hi[i]; xi[i] = xr[i] * hi[i] + xi[i] * hr[i]; xr[i] = r; }
  fft(xr, xi, true);
  return Float32Array.from(xr.subarray(0, len));
}

/** Run a filter over a copy of the samples. */
export function filtered(samples, filt) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = filt(samples[i]);
  return out;
}

/** The samples delayed by `seconds` (zero filled), same length. */
export function delayed(samples, seconds) {
  const d = sec(seconds), out = new Float32Array(samples.length);
  for (let i = d; i < samples.length; i++) out[i] = samples[i - d];
  return out;
}

/** Fade the last `seconds` to zero with a raised cosine so a cut tail never clicks. */
export function fadeTail(samples, seconds = 0.03) {
  const n = Math.min(samples.length, sec(seconds));
  for (let i = 0; i < n; i++) samples[samples.length - n + i] *= 0.5 + 0.5 * Math.cos(Math.PI * (i + 1) / n);
  return samples;
}
