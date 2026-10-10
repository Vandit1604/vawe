// How much a music bed changes over time. A stationary drone keeps one spectrum for the whole film, so loudness alone cannot tell it from
// music: this reads the spectrum of each half second and asks how far it moves to the next. A tremolo on a drone moves the loudness and not
// the spectrum, so it still fails. Pure over mono samples; harness/media/page-audio.mjs decodes the file.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

const BED = LIMITS['sound-level'];
export const BED_RATE = 8000;
const FRAME = 256;
const HOP = 128;
const BANDS = 32;
const BLOCK_S = 0.5;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const [wr, wi] = [Math.cos(ang * k), Math.sin(ang * k)];
        const [a, b] = [i + k, i + k + len / 2];
        const [tr, ti] = [re[b] * wr - im[b] * wi, re[b] * wi + im[b] * wr];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
}

/** The mean magnitude spectrum, in BANDS bands, of each BLOCK_S block of the samples, normalised to sum 1. */
function blockSpectra(samples, rate) {
  const perBlock = Math.floor(BLOCK_S * rate);
  const spectra = [];
  for (let start = 0; start + perBlock <= samples.length; start += perBlock) {
    const bands = new Float64Array(BANDS);
    let frames = 0;
    for (let f = start; f + FRAME <= start + perBlock; f += HOP) {
      const re = new Float64Array(FRAME), im = new Float64Array(FRAME);
      for (let i = 0; i < FRAME; i++) re[i] = samples[f + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME));
      fft(re, im);
      for (let k = 1; k < FRAME / 2; k++) bands[Math.floor(((k - 1) * BANDS) / (FRAME / 2 - 1))] += Math.hypot(re[k], im[k]);
      frames++;
    }
    const total = bands.reduce((a, b) => a + b, 0);
    if (frames && total > 1e-9) spectra.push(bands.map((v) => v / total));
  }
  return spectra;
}

/** The mean distance between the spectra of consecutive half seconds, 0 (one spectrum for ever) to 2. Null when the samples are under 4 blocks long or silent. */
export function spectralChange(samples, rate = BED_RATE) {
  const spectra = blockSpectra(samples, rate);
  if (spectra.length < 4) return null;
  let sum = 0;
  for (let i = 1; i < spectra.length; i++) sum += spectra[i].reduce((a, v, k) => a + Math.abs(v - spectra[i - 1][k]), 0);
  return sum / (spectra.length - 1);
}

/** The advice line for one bed, or null when it changes enough or was not measured. `bed` is { name, change }. */
export function bedLine(bed) {
  if (bed.change == null || bed.change >= BED.bed_change_min) return null;
  return `sound: the bed "${bed.name}" keeps one spectrum for the whole film (change ${bed.change.toFixed(3)}, music beds in the reference films change at least ${BED.bed_change_min}): a drone is not a bed. Use a music file that moves, or no bed`;
}
