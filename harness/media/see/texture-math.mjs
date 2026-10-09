// Pure parts of `vawe look`, screen texture: the dominant repeating pattern of a dark block, from its 2D FFT, and whether its colour channels are in phase.
// No I/O.

export const BLOCK = 256;
const PERIOD_MAX = 16;
const PRESENT_RATIO = 100;
const AXIS_SHARE = 0.05;
const PHASE_SPLIT = 0.8;
const WEAK_CHANNEL = 0.25;
export const DARK_MEAN = 90;
export const DARK_PEAK = 200;

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
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
const signed = (k) => (k < BLOCK / 2 ? k : k - BLOCK);

/** The power spectrum (BLOCK x BLOCK, row = vertical frequency) of a BLOCK x BLOCK luma block, Hann-windowed, mean removed. Pure. */
export function powerSpectrum(block) {
  const w = hann(BLOCK);
  const n = BLOCK * BLOCK;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += block[i];
  mean /= n;
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let y = 0; y < BLOCK; y++) for (let x = 0; x < BLOCK; x++) re[y * BLOCK + x] = (block[y * BLOCK + x] - mean) * w[x] * w[y];
  const rowR = new Float64Array(BLOCK), rowI = new Float64Array(BLOCK);
  for (let y = 0; y < BLOCK; y++) {
    rowR.set(re.subarray(y * BLOCK, (y + 1) * BLOCK)); rowI.fill(0);
    fft(rowR, rowI);
    re.set(rowR, y * BLOCK); im.set(rowI, y * BLOCK);
  }
  for (let x = 0; x < BLOCK; x++) {
    for (let y = 0; y < BLOCK; y++) { rowR[y] = re[y * BLOCK + x]; rowI[y] = im[y * BLOCK + x]; }
    fft(rowR, rowI);
    for (let y = 0; y < BLOCK; y++) re[y * BLOCK + x] = rowR[y] * rowR[y] + rowI[y] * rowI[y];
  }
  return re;
}

const median = (a) => { const s = Float64Array.from(a).sort(); return s[s.length >> 1]; };

/** { fx, fy, ratio, axisX, axisY } of a power spectrum: the strongest frequency with a period of 2 to 16 px (cycles per block), its power over the median power of that band, and the strongest power on each axis (as a ratio and as a share of the peak). Pure. */
export function spectrumPeak(power) {
  const band = [];
  let best = { p: -1, fx: 0, fy: 0 };
  let ax = { p: -1, f: 0 }, ay = { p: -1, f: 0 };
  const rMin = BLOCK / PERIOD_MAX;
  for (let ky = 0; ky <= BLOCK / 2; ky++) {
    for (let kx = 0; kx < BLOCK; kx++) {
      const fx = signed(kx), fy = ky;
      if (ky === 0 && fx <= 0) continue;
      if (Math.abs(fx) > BLOCK / 2 || Math.hypot(fx, fy) < rMin) continue;
      const p = power[ky * BLOCK + kx];
      band.push(p);
      if (p > best.p) best = { p, fx, fy };
      if (fy === 0 && p > ax.p) ax = { p, f: fx };
      if (fx === 0 && p > ay.p) ay = { p, f: fy };
    }
  }
  const med = median(band) || 1e-12;
  return { fx: best.fx, fy: best.fy, ratio: best.p / med, axisX: { ratio: ax.p / med, share: ax.p / best.p, f: ax.f }, axisY: { ratio: ay.p / med, share: ay.p / best.p, f: ay.f } };
}

/** { kind, period, angle, ratio, text } from a spectrum peak: stripes, lines, a grid, a diagonal pattern or none. Pure. */
export function describePattern(peak) {
  const f = Math.hypot(peak.fx, peak.fy);
  const period = f ? BLOCK / f : 0;
  if (peak.ratio < PRESENT_RATIO) return { kind: 'none', period: 0, angle: 0, ratio: peak.ratio };
  const onAxis = (a) => a.ratio >= PRESENT_RATIO && a.share >= AXIS_SHARE;
  const gridX = onAxis(peak.axisX), gridY = onAxis(peak.axisY);
  const angle = (Math.atan2(peak.fy, peak.fx) * 180) / Math.PI;
  if (gridX && gridY) return { kind: 'grid', period, periodX: BLOCK / Math.abs(peak.axisX.f), periodY: BLOCK / Math.abs(peak.axisY.f), angle, ratio: peak.ratio };
  if (peak.fy === 0) return { kind: 'vertical stripes', period, angle: 0, ratio: peak.ratio };
  if (peak.fx === 0) return { kind: 'horizontal lines', period, angle: 90, ratio: peak.ratio };
  return { kind: 'diagonal', period, angle, ratio: peak.ratio };
}

/** The amplitude and phase (radians) of the (fx, fy) frequency in one channel of a block. Pure. */
export function channelPhase(block, fx, fy) {
  const w = hann(BLOCK);
  let re = 0, im = 0;
  for (let y = 0; y < BLOCK; y++) {
    for (let x = 0; x < BLOCK; x++) {
      const a = (-2 * Math.PI * (fx * x + fy * y)) / BLOCK;
      const v = block[y * BLOCK + x] * w[x] * w[y];
      re += v * Math.cos(a); im += v * Math.sin(a);
    }
  }
  return { amp: Math.hypot(re, im), phase: Math.atan2(im, re) };
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** { striped, spreadDeg } for the R, G and B phases at the peak: striped when two channels sit more than PHASE_SPLIT radians apart. Pure. */
export function channelsSplit(r, g, b) {
  const chans = [r, g, b];
  const top = Math.max(...chans.map((c) => c.amp));
  if (top <= 0) return { striped: false, spreadDeg: 0 };
  const live = chans.filter((c) => c.amp >= WEAK_CHANNEL * top);
  let spread = 0;
  for (const p of live) for (const q of live) spread = Math.max(spread, Math.abs(wrap(p.phase - q.phase)));
  return { striped: spread >= PHASE_SPLIT, spreadDeg: Math.round((spread * 180) / Math.PI) };
}
