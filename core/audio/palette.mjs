// core/audio/palette.mjs: the subtle sound palette. Quiet sounds for UI taps, camera moves, a key
// word and a big moment, built the way a sound designer builds them and not as one oscillator:
//   - a tap is a short noise transient plus a few damped resonant modes (a soft wooden or glass tap)
//   - air and swooshes are band-passed noise whose centre sweeps while a raised-cosine envelope breathes
//   - every instance draws its pitch, timing and detune from its seed, so eight taps are eight taps
//   - a generated room (a decaying noise impulse, convolved by FFT) and a gentle high cut give the tail
//   - width comes from a sub-millisecond delay between the channels and from two different room impulses
// Each voice is a pure function (params, seed) -> [left, right]. Same seed, same samples.
import { SR, TAU, sec, clamp, rng, biquad, convolve, filtered, delayed, fadeTail } from './dsp.mjs';

const dice = (seed) => {
  const r = rng(seed);
  const u = () => (r() + 1) / 2;
  return { r, u, pm: (base, pct) => base * (1 + pct * r()), between: (a, b) => a + (b - a) * u() };
};

function addMode(out, { t0 = 0, f, amp, decay, attack = 0.0006, phase = 0 }) {
  const start = sec(t0), life = Math.min(out.length - start, sec(decay * 7));
  for (let i = 0; i < life; i++) {
    const t = i / SR;
    out[start + i] += amp * Math.sin(TAU * f * t + phase) * Math.exp(-t / decay) * Math.min(1, t / attack);
  }
}

function addNoise(out, { t0 = 0, type = 'bandpass', f, Q = 0.8, amp, decay, attack = 0.0005, seed }) {
  const next = rng(seed), filt = biquad(type, f, Q), start = sec(t0), life = Math.min(out.length - start, sec(decay * 7 + attack));
  for (let i = 0; i < life; i++) {
    const t = i / SR;
    out[start + i] += filt(next()) * amp * Math.exp(-t / decay) * Math.min(1, t / attack);
  }
}

// Width: the right channel trails the left by 0.08 to 0.2 ms, on a side the seed picks. More than that
// puts a 1 kHz tone in antiphase and the cue thins out on a mono speaker.
function widen(m, d) {
  const ms = d.between(0.08, 0.2) / 1000, quiet = 0.85;
  return d.r() < 0 ? [m, delayed(m, ms).map((v) => v * quiet)] : [m.map((v) => v * quiet), delayed(m, ms)];
}

// A room: decaying noise whose high end dies faster than its low end, scaled to unit energy.
function roomImpulse(seed, time, cut) {
  const n = sec(time * 1.1), pre = sec(0.008), next = rng(seed), h = new Float32Array(n);
  let y = 0, energy = 0;
  for (let i = pre; i < n; i++) {
    const t = (i - pre) / SR;
    const fc = Math.max(400, cut * Math.pow(0.25, t / time));
    y += (1 - Math.exp(-TAU * fc / SR)) * (next() - y);
    h[i] = y * Math.exp(-6.9 * t / time) * Math.min(1, t / 0.004);
    energy += h[i] * h[i];
  }
  const g = 1 / Math.sqrt(energy || 1);
  return h.map((v) => v * g);
}

function room([l, r], seed, { time, wet, cut }) {
  const wl = convolve(l, roomImpulse(seed * 2 + 1, time, cut)), wr = convolve(r, roomImpulse(seed * 2 + 2, time, cut));
  const out = [new Float32Array(wl.length), new Float32Array(wr.length)];
  for (let i = 0; i < wl.length; i++) {
    out[0][i] = (i < l.length ? l[i] : 0) + wet * wl[i];
    out[1][i] = (i < r.length ? r[i] : 0) + wet * wr[i];
  }
  return out;
}

const highCut = (channels, f) => channels.map((c) => fadeTail(filtered(c, biquad('lowpass', f, 0.6))));

const finish = (stereo, seed, { time, wet, cut }) => highCut(room(stereo, seed, { time, wet, cut: cut * 1.2 }), cut);

// ---------------------------------------------------------------- taps

function tap(_, seed) {
  const d = dice(seed), m = new Float32Array(sec(0.16)), f = d.pm(430, 0.06);
  [[1, 1, 0.032], [2.76, 0.5, 0.017], [5.4, 0.22, 0.008]].forEach(([k, amp, decay]) => addMode(m, {
    t0: d.between(0, 0.0006), f: f * k * (1 + 0.004 * d.r()), amp, decay: d.pm(decay, 0.1), phase: d.r() * Math.PI,
  }));
  addNoise(m, { t0: d.between(0, 0.0012), f: d.pm(2800, 0.1), Q: 0.9, amp: 0.5, decay: 0.0025, seed: seed + 11 });
  return finish(widen(m, d), seed, { time: 0.3, wet: 0.1, cut: 5200 });
}

function tick(_, seed) {
  const d = dice(seed), m = new Float32Array(sec(0.08)), f = d.pm(1900, 0.07);
  [[1, 1, 0.007], [2.4, 0.4, 0.0035]].forEach(([k, amp, decay]) => addMode(m, {
    t0: d.between(0, 0.0005), f: f * k, amp, decay: d.pm(decay, 0.1), phase: d.r() * Math.PI,
  }));
  addNoise(m, { t0: d.between(0, 0.0008), f: d.pm(5200, 0.08), Q: 1.2, amp: 0.5, decay: 0.0015, seed: seed + 13 });
  return finish(widen(m, d), seed, { time: 0.15, wet: 0.05, cut: 7500 });
}

const GLASS_PARTIALS = [[1, 1, 0.5], [2.32, 0.4, 0.28], [4.25, 0.16, 0.16], [6.63, 0.07, 0.09]];

function glassNote(m, d, t0, f0, amp) {
  for (const [k, a, decay] of GLASS_PARTIALS) {
    for (const side of [-1, 1]) {
      addMode(m, { t0: t0 + d.between(0, 0.0008), f: f0 * k * (1 + side * 0.0015), amp: amp * a * 0.5, decay: d.pm(decay, 0.08), attack: 0.0008, phase: d.r() * Math.PI });
    }
  }
}

function glass(_, seed) {
  const d = dice(seed), m = new Float32Array(sec(1.1)), f0 = d.pm(1175, 0.01);
  glassNote(m, d, 0, f0, 1);
  glassNote(m, d, d.between(0.075, 0.095), f0 * 1.4983, 0.85);
  return finish(widen(m, d), seed, { time: 1, wet: 0.3, cut: 8500 });
}

function shimmer(_, seed) {
  const d = dice(seed), m = new Float32Array(sec(0.7)), base = d.pm(1760, 0.02);
  const ratios = [1, 1.5, 2, 3, 4.5], amps = [1, 0.7, 0.5, 0.3, 0.2];
  ratios.forEach((k, i) => addMode(m, { t0: i * 0.022 + d.between(0, 0.01), f: base * k * (1 + 0.002 * d.r()), amp: 0.5 * amps[i], decay: d.pm(0.22, 0.2), attack: 0.035, phase: d.r() * Math.PI }));
  for (let g = 0; g < 14; g++) {
    addMode(m, { t0: Math.max(0, 0.015 + g * 0.026 + d.between(-0.008, 0.008)), f: base * ratios[Math.floor(d.u() * 4)] * (1 + 0.002 * d.r()), amp: 0.35 * (1 - g / 18), decay: 0.018, attack: 0.001, phase: d.r() * Math.PI });
  }
  addNoise(m, { type: 'highpass', f: 5500, Q: 0.7, amp: 0.12, decay: 0.12, attack: 0.06, seed: seed + 17 });
  return finish(widen(m, d), seed, { time: 1.4, wet: 0.45, cut: 10000 });
}

// ---------------------------------------------------------------- moves

const raisedCosine = (u, peak) => (u < peak ? Math.sin(Math.PI / 2 * u / peak) ** 2 : Math.cos(Math.PI / 2 * (u - peak) / (1 - peak)) ** 2);

// One band of noise per channel (two seeds, so the channels differ), its centre sweeping f0 to f1 on a smoothstep.
function sweep(seed, { length, f0, f1, Q, envelope, amp = 1 }) {
  const n = sec(length), dir = rng(seed)() < 0 ? -1 : 1;
  return [0, 1].map((ch) => {
    const next = rng(seed * 7 + ch * 977), filt = biquad('bandpass', f0, Q), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / n, s = u * u * (3 - 2 * u);
      if ((i & 31) === 0) filt.tune(f0 * Math.pow(f1 / f0, s));
      const side = 1 - 0.25 * dir * (ch === 0 ? 1 : -1) * (2 * u - 1);
      out[i] = filt(next()) * envelope(u) * amp * side;
    }
    return out;
  });
}

const sum = (a, b) => a.map((c, ch) => c.map((v, i) => v + b[ch][i]));

const band = (channels, hp, lp) => channels.map((c) => filtered(filtered(c, biquad('highpass', hp, 0.7)), biquad('lowpass', lp, 0.7)));

function air(p, seed) {
  const length = clamp(p.length ?? 0.45, 0.15, 3);
  const noise = sweep(seed, { length, f0: 900, f1: 2800, Q: 0.8, envelope: (u) => raisedCosine(u, 0.4) });
  return finish(band(noise, 250, 7500), seed, { time: 0.35, wet: 0.1, cut: 7500 });
}

function swooshLong(p, seed) {
  const length = clamp(p.length ?? 1.1, 0.4, 4);
  const env = (u) => raisedCosine(u, 0.55);
  const top = sweep(seed, { length, f0: 320, f1: 2400, Q: 0.7, envelope: env });
  const body = sweep(seed + 101, { length, f0: 110, f1: 420, Q: 1, envelope: env, amp: 0.5 });
  return finish(band(sum(top, body), 90, 7000), seed, { time: 0.9, wet: 0.22, cut: 7000 });
}

// ---------------------------------------------------------------- weight

function subThump(_, seed) {
  const d = dice(seed), n = sec(0.7), m = new Float32Array(n), f0 = d.pm(74, 0.05);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 40 + (f0 - 40) * Math.exp(-t / 0.05);
    phase += TAU * f / SR;
    const attack = Math.min(1, t / 0.006);
    m[i] = attack * (Math.sin(phase) * Math.exp(-t / 0.16) + 0.25 * Math.sin(2 * phase) * Math.exp(-t / 0.09));
  }
  addNoise(m, { type: 'lowpass', f: 180, Q: 0.7, amp: 0.3, decay: 0.01, seed: seed + 19 });
  return finish([m, m.slice()], seed, { time: 0.35, wet: 0.12, cut: 240 });
}

export const VOICES = { tap, tick, glass, shimmer, air, 'swoosh-long': swooshLong, 'sub-thump': subThump };

/** renderVoice(name, params, seed) -> [left, right]: equal-length Float32Array, not normalised. */
export function renderVoice(name, params = {}, seed = 1) {
  const voice = VOICES[name];
  if (!voice) throw new Error(`audio: unknown palette voice "${name}". Voices: ${Object.keys(VOICES).join(' ')}`);
  return voice(params, seed);
}
