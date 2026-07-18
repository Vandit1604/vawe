// core/audio-kit.mjs — the framework's OWN audio synthesis engine.
//
// Every sound a video uses is SYNTHESIZED here from parameters, never downloaded. That buys three
// things a sample library cannot:
//   • determinism — a cue is a pure function of its spec + seed, so the same JSON always scores the
//     same mix, byte for byte. (Math.random is banned; noise runs off a seeded PRNG.)
//   • licensing — nothing to attribute, nothing to re-license, nothing that 404s on a fresh clone.
//   • control — a brand's sound is a set of numbers, so it can be tuned per video the way the
//     palette and motion curves already are.
//
// The cue voicings are ported from Cuelume (MIT © Daniel White, https://github.com/dnlwhtly/cuelume,
// npm cuelume@0.1.2), which synthesizes UI interaction sounds through the Web Audio API. Web Audio
// is not available in a headless build step, so its graph (oscillator/noise -> biquad -> gain
// envelope -> feedback delay) is reimplemented here as offline DSP. The parameter tables are its
// design work; the DSP below is our implementation of the same signal path.
//
// Used by scripts/media/gen-audio.mjs (`make audio`) to bake assets/sfx/*.wav + assets/music/*.wav,
// which the Go mixer (internal/audio/audio.go) beds under the render.

import fs from 'node:fs';

export const SR = 44100;
export const TAU = Math.PI * 2;
const sec = (s) => Math.round(s * SR);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ---------------------------------------------------------------- deterministic noise
// Seeded LCG. A cue that used Math.random would re-bake differently every time and silently break
// byte-stability of the shipped audio, which is the same class of bug as a wall-clock in a frame.
export function rng(seed = 0x9e3779b1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s / 4294967296) * 2 - 1; };
}

export function osc(type, f, t, phase = 0) {
  const ph = TAU * f * t + phase;
  if (type === 'tri') return (2 / Math.PI) * Math.asin(Math.sin(ph));
  if (type === 'saw') return 2 * (((f * t) % 1) + phase / TAU % 1) - 1;
  if (type === 'square') return Math.sin(ph) >= 0 ? 1 : -1;
  return Math.sin(ph);
}

// ---------------------------------------------------------------- biquad (RBJ cookbook)
// Cuelume shapes its noise layers with BiquadFilterNode (lowpass/bandpass/highpass). A one-pole
// filter is not close enough — the bandpass Q is what makes `tick` a click and not a thud.
export function biquad(type, f0, Q) {
  const w0 = TAU * clamp(f0, 20, SR / 2 - 100) / SR;
  const c = Math.cos(w0), s = Math.sin(w0), alpha = s / (2 * Math.max(0.0001, Q));
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
  else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; } // bandpass (0dB peak)
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

// ---------------------------------------------------------------- envelope
// Linear attack to `peak`, then exponential decay — Web Audio's setTargetAtTime shape.
const env = (t, attack, decay, peak) => (t < attack ? (attack ? (t / attack) * peak : peak)
  : peak * Math.exp(-(t - attack) / Math.max(1e-4, decay)));

/**
 * Render one cue spec to mono samples.
 *   { masterGain, layers: [ {kind:'tone'|'noise', ...} ], shimmer?: {delay,feedback,wet,lowpass} }
 * tone  : waveform, frequency, glideTo, glideTime, detune (cents), offset, attack, decay, peak
 * noise : filterType, filterFrequency, filterQ, attack, decay, peak
 */
export function renderCue(spec, seed = 1) {
  const layers = spec.layers || [];
  const tail = (spec.shimmer ? spec.shimmer.delay * 6 : 0) + 0.08;
  const dur = Math.max(...layers.map((l) => (l.offset || 0) + (l.attack || 0) + (l.decay || 0) * 5), 0.05) + tail;
  const n = sec(dur), out = new Float32Array(n);

  layers.forEach((L, li) => {
    const off = sec(L.offset || 0);
    const noiseGen = rng((seed * 2654435761 + li * 40503) >>> 0);
    const filt = L.kind === 'noise' ? biquad(L.filterType || 'lowpass', L.filterFrequency || 1000, L.filterQ ?? 0.7) : null;
    const life = (L.attack || 0) + (L.decay || 0) * 5;
    const nn = Math.min(n - off, sec(life));
    let phase = 0;
    for (let i = 0; i < nn; i++) {
      const t = i / SR;
      let v;
      if (L.kind === 'noise') v = filt(noiseGen());
      else {
        // glide + detune are frequency-domain; integrate phase so a sweep stays continuous.
        let f = L.frequency || 440;
        if (L.glideTo != null) { const g = clamp(t / Math.max(1e-4, L.glideTime || 0.1), 0, 1); f = f + (L.glideTo - f) * g; }
        if (L.detune) f *= Math.pow(2, L.detune / 1200);
        phase += TAU * f / SR;
        v = osc(L.waveform || 'sine', 0, 0, phase);
      }
      out[off + i] += v * env(t, L.attack || 0, L.decay || 0.1, L.peak ?? 0.1);
    }
  });

  if (spec.shimmer) {
    const { delay = 0.1, feedback = 0.2, wet = 0.15, lowpass = 4000 } = spec.shimmer;
    const d = sec(delay), lp = biquad('lowpass', lowpass, 0.707), buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const echo = i >= d ? lp(buf[i - d]) : 0;
      buf[i] = out[i] + echo * feedback;
      out[i] += echo * wet;
    }
  }

  const g = spec.masterGain ?? 0.5;
  for (let i = 0; i < n; i++) out[i] = clamp(out[i] * g, -1, 1);
  return out;
}

/**
 * Peak-normalize to a ceiling. Cuelume's `peak` values are Web Audio gains for a UI sound playing
 * alone at system volume — they bake out at -25..-40 dBFS, which is inaudible under a music bed.
 * Normalizing preserves timbre and envelope (the shape that makes a tick a tick) and moves the
 * loudness decision to the mixer's per-cue gain, which is where balance belongs.
 */
export function normalize(samples, ceiling = 0.8) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  if (peak < 1e-6) return samples; // silence in, silence out — never divide by ~0
  const g = ceiling / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  return samples;
}

// ---------------------------------------------------------------- WAV
export function writeWav(file, samples, { stereo = false } = {}) {
  const ch = stereo ? 2 : 1, n = samples.length, bytes = n * 2 * ch;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2 * ch, 28); buf.writeUInt16LE(2 * ch, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const v = Math.round(clamp(samples[i], -1, 1) * 32767);
    buf.writeInt16LE(v, o); o += 2;
    if (stereo) { buf.writeInt16LE(v, o); o += 2; }
  }
  fs.writeFileSync(file, buf);
  return samples.length / SR;
}

// ---------------------------------------------------------------- CUE LIBRARY
// Voicings ported from Cuelume (MIT © Daniel White). Grouped by the role a video actually needs.
export const CUES = {
  // --- transitions / reveals -------------------------------------------------
  chime:   { masterGain: 0.5,  layers: [{ kind: 'tone', waveform: 'sine', frequency: 1046.5, attack: 0.006, decay: 0.22, peak: 0.09 }, { kind: 'tone', waveform: 'sine', frequency: 1568, offset: 0.09, attack: 0.006, decay: 0.26, peak: 0.08 }], shimmer: { delay: 0.12, feedback: 0.25, wet: 0.18, lowpass: 4000 } },
  sparkle: { masterGain: 0.5,  layers: [{ kind: 'tone', waveform: 'sine', frequency: 1760, offset: 0, attack: 0.003, decay: 0.09, peak: 0.045 }, { kind: 'tone', waveform: 'sine', frequency: 2217, offset: 0.045, attack: 0.003, decay: 0.09, peak: 0.04 }, { kind: 'tone', waveform: 'sine', frequency: 2637, offset: 0.09, attack: 0.003, decay: 0.1, peak: 0.038 }, { kind: 'tone', waveform: 'sine', frequency: 3520, offset: 0.135, attack: 0.003, decay: 0.12, peak: 0.032 }], shimmer: { delay: 0.07, feedback: 0.35, wet: 0.22, lowpass: 6000 } },
  droplet: { masterGain: 0.55, layers: [{ kind: 'tone', waveform: 'sine', frequency: 1200, glideTo: 550, glideTime: 0.14, attack: 0.004, decay: 0.2, peak: 0.075 }], shimmer: { delay: 0.09, feedback: 0.2, wet: 0.15, lowpass: 3000 } },
  bloom:   { masterGain: 0.5,  layers: [{ kind: 'tone', waveform: 'sine', frequency: 528, attack: 0.06, decay: 0.32, peak: 0.06 }, { kind: 'tone', waveform: 'sine', frequency: 528, detune: 12, attack: 0.06, decay: 0.34, peak: 0.05 }], shimmer: { delay: 0.15, feedback: 0.2, wet: 0.12, lowpass: 2500 } },
  whisper: { masterGain: 0.5,  layers: [{ kind: 'noise', filterType: 'lowpass', filterFrequency: 1200, filterQ: 0.7, attack: 0.04, decay: 0.16, peak: 0.05 }] },
  // --- clicks / UI -----------------------------------------------------------
  tick:    { masterGain: 0.4,  layers: [{ kind: 'noise', filterType: 'bandpass', filterFrequency: 5400, filterQ: 1.8, attack: 0.001, decay: 0.018, peak: 0.14 }, { kind: 'tone', waveform: 'sine', frequency: 2600, attack: 0.001, decay: 0.012, peak: 0.018 }] },
  press:   { masterGain: 0.4,  layers: [{ kind: 'noise', filterType: 'bandpass', filterFrequency: 1700, filterQ: 1.4, attack: 0.001, decay: 0.02, peak: 0.13 }] },
  release: { masterGain: 0.4,  layers: [{ kind: 'noise', filterType: 'bandpass', filterFrequency: 4600, filterQ: 1.8, attack: 0.001, decay: 0.016, peak: 0.12 }, { kind: 'tone', waveform: 'sine', frequency: 3200, offset: 0.006, attack: 0.001, decay: 0.05, peak: 0.02 }] },
  toggle:  { masterGain: 0.4,  layers: [{ kind: 'noise', filterType: 'bandpass', filterFrequency: 2400, filterQ: 1.6, attack: 0.001, decay: 0.022, peak: 0.12 }, { kind: 'tone', waveform: 'sine', frequency: 880, glideTo: 1320, glideTime: 0.05, attack: 0.002, decay: 0.06, peak: 0.03 }] },
  // --- states ----------------------------------------------------------------
  success: { masterGain: 0.5,  layers: [{ kind: 'tone', waveform: 'sine', frequency: 659.25, attack: 0.005, decay: 0.18, peak: 0.07 }, { kind: 'tone', waveform: 'sine', frequency: 987.77, offset: 0.08, attack: 0.005, decay: 0.24, peak: 0.06 }], shimmer: { delay: 0.11, feedback: 0.22, wet: 0.16, lowpass: 4200 } },
  error:   { masterGain: 0.45, layers: [{ kind: 'tone', waveform: 'sine', frequency: 320, glideTo: 190, glideTime: 0.12, attack: 0.004, decay: 0.16, peak: 0.08 }] },
  ready:   { masterGain: 0.5,  layers: [{ kind: 'tone', waveform: 'sine', frequency: 880, attack: 0.005, decay: 0.16, peak: 0.06 }, { kind: 'tone', waveform: 'sine', frequency: 1320, offset: 0.06, attack: 0.005, decay: 0.2, peak: 0.05 }], shimmer: { delay: 0.1, feedback: 0.2, wet: 0.14, lowpass: 5000 } },
};

/**
 * Music bed — a seamless ambient loop built from a chord, a slow tremolo and an optional pulse.
 * Every partial is snapped to an integer number of cycles over the loop so the seam is inaudible.
 * Parameterized so a brand's bed is numbers, not a downloaded track.
 */
export function musicBed({ loop = 8, root = 110, chord = [1, 1.5, 2, 3], gain = 0.05, air = 0.016,
  tremolo = 0.25, pulse = null, pulseGain = 0.16, seed = 7, brightness = 1 } = {}) {
  const n = sec(loop), out = new Float32Array(n);
  const snap = (f) => Math.round(f * loop) / loop; // integer cycles per loop -> seamless
  const partials = chord.map((m) => snap(root * m));
  const trem = snap(tremolo), airF = snap(root * 8 * brightness), airLfo = snap(tremolo / 2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const tr = 0.7 + 0.3 * Math.sin(TAU * trem * t);
    let v = 0;
    for (const f of partials) v += Math.sin(TAU * f * t);
    out[i] = (v / partials.length) * gain * tr + Math.sin(TAU * airF * t) * air * (0.6 + 0.4 * Math.sin(TAU * airLfo * t));
  }
  if (pulse) {
    const p = renderCue({ masterGain: pulseGain, layers: [{ kind: 'tone', waveform: 'sine', frequency: root * 0.53, attack: 0.004, decay: 0.1, peak: 0.6 }] }, seed);
    for (let b = 0; b * pulse < loop; b++) {
      const off = sec(b * pulse);
      for (let i = 0; i < p.length && off + i < n; i++) out[off + i] += p[i] * (b % 2 === 0 ? 1 : 0.7);
    }
  }
  return out;
}
