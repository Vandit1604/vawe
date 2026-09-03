// core/audio-kit.mjs: the framework's OWN audio synthesis engine.
//
// Every sound a video uses is SYNTHESIZED here from parameters, never downloaded. That buys three
// things a sample library cannot:
//   • determinism: a cue is a pure function of its spec + seed, so the same JSON always scores the
//     same mix, byte for byte. (Math.random is banned; noise runs off a seeded PRNG.)
//   • licensing. Nothing to attribute, nothing to re-license, nothing that 404s on a fresh clone.
//   • control: a brand's sound is a set of numbers, so it can be tuned per video the way the
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

// THE WAVEFORM NAME IS `tri`, NOT `triangle`, and several shipped specs say `triangle`. An unknown
// name falls through to sine rather than throwing, so `waveform: "triangle"` has always rendered a SINE.
// Not corrected here on purpose: `pluck` was judged by ear and kept in that state
// (verify/sound-verdicts.json), so aliasing the name now would silently re-voice a cue a person
// approved. Write `tri` when you mean a triangle, and know that the old specs do not.
export function osc(type, f, t, phase = 0) {
  const ph = TAU * f * t + phase;
  if (type === 'tri') return (2 / Math.PI) * Math.asin(Math.sin(ph));
  if (type === 'saw') return 2 * (((f * t) % 1) + phase / TAU % 1) - 1;
  if (type === 'square') return Math.sin(ph) >= 0 ? 1 : -1;
  return Math.sin(ph);
}

// ---------------------------------------------------------------- biquad (RBJ cookbook)
// Cuelume shapes its noise layers with BiquadFilterNode (lowpass/bandpass/highpass). A one-pole
// filter is not close enough. The bandpass Q is what makes `tick` a click and not a thud.
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
// Linear attack to `peak`, then exponential decay, Web Audio's setTargetAtTime shape.
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
        // `?? ` not `|| `: a glideTime of 0 means SNAP to the target, and `|| 0.1` turned that into a
        // 100ms slide. Same falsy-zero class as the opacity bug (docs/MISTAKES.md #193), and the very
        // next line already had it right for `peak`.
        if (L.glideTo != null) { const g = clamp(t / Math.max(1e-4, L.glideTime ?? 0.1), 0, 1); f = f + (L.glideTo - f) * g; }
        if (L.detune) f *= Math.pow(2, L.detune / 1200);
        phase += TAU * f / SR;
        v = osc(L.waveform || 'sine', 0, 0, phase);
      }
      out[off + i] += v * env(t, L.attack ?? 0, L.decay ?? 0.1, L.peak ?? 0.1);
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
 * alone at system volume: they bake out at -25..-40 dBFS, which is inaudible under a music bed.
 * Normalizing preserves timbre and envelope (the shape that makes a tick a tick) and moves the
 * loudness decision to the mixer's per-cue gain, which is where balance belongs.
 */
export function normalize(samples, ceiling = 0.8) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  if (peak < 1e-6) return samples; // silence in, silence out, never divide by ~0
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
// THE CUE LIBRARY: ported VERBATIM from Cuelume v0.1.2 (MIT, (c) 2026 Daniel Belyi),
// https://github.com/Danilaa1/cuelume · https://cuelume-site.pages.dev
//
// Cuelume ships no audio files: every cue is a synthesis spec played live through Web Audio. So
// "using Cuelume's sounds" means using its PARAMETERS, which is what these are, the same schema
// renderCue() already consumed, copied exactly rather than approximated.
//
// They were previously hand-ported and had DRIFTED: 7 of the 14 differed from the real library
// (success was a whole different interval) and `page` and `loading` were missing entirely. That drift
// is why they were described as sounding bad. They were an impression of Cuelume, not Cuelume
// (docs/MISTAKES.md #58). Do not hand-edit these; re-extract from the library if it versions up.
// TEN CUES WERE REMOVED AFTER A LISTENING PASS, and the reason is measurable rather than a matter of
// taste. All twenty were baked and judged by ear (verify/sound-verdicts.json, via
// `node scripts/dev/sound-lab.mjs`), and sorting the verdicts against their own specs found one clean
// rule: EVERY cue that was kept has ZERO noise layers, and the chance of rejection rises with the
// noise-layer count (keep 0.00, weak 1.00, reject 1.40). Attack and peak barely differ between the
// groups, so the recurring note "too sharp and loud" was describing a symptom. Filtered white noise is
// what reads as cheap, whatever envelope you put on it.
//
// The ten removed were the interface clicks and noise textures ported from a UI library, which a film
// has no use for: nobody is clicking anything. What remains is the pitched set, which is what a film
// actually scores with.
// ---------------------------------------------------------------- swarm: a moving spectral band
// WHAT A WHOOSH ACTUALLY IS, and the reason the engine could not make one. Every write-up of the
// family agrees on the mechanism: a whoosh is a BAND OF ENERGY THAT MOVES THROUGH THE SPECTRUM while
// its level swells and falls. The usual construction is white noise through a band-pass filter whose
// centre frequency is automated across the sound, with a Doppler-style pitch fall at the pass point.
//
// `renderCue` cannot do that half of it. `biquad(type, f0, Q)` builds its coefficients ONCE, at layer
// construction, so a noise layer's filter frequency is fixed for the layer's whole life. The two cues
// that were deleted for sounding cheap, `travel` and `sweep`, were each two STATIC bands with an
// offset between them, which is a two-step staircase and not a sweep. So round 1's finding ("every cue
// kept had zero noise layers") is real about this engine's noise but is not a fact about noise: the
// noise here never had the one thing that makes the family work.
//
// THE STEP THAT IS NOT OBVIOUS. A moving spectral band does not have to be a filter. Take twelve to
// twenty partials, place them at IRREGULAR spacings across two octaves so no integer relationship
// survives, and the ear stops hearing a chord and starts hearing a band: it is additive noise, the
// same trick as a Risset glissando, and the density is what buys the fusion. Then glide every partial
// to the same RATIO of its own frequency. Because renderCue's glide is linear in Hz, gliding each
// f_k to f_k*R over one glideTime makes every partial share the multiplier (1 + (R-1)*t/T), so the
// whole band translates rigidly in log-frequency and keeps its shape. That is a filter sweep, built
// out of the one primitive the engine does own.
//
// Sources for the family and its numbers: Sound on Sound, "Synth Secrets" (additive/noise-band
// synthesis); the standard trailer-whoosh recipe of band-passed noise with an automated centre
// frequency plus Doppler pitch; Risset/Shepard glissando for the fused inharmonic stack.
//
//   f0        where the band starts, in Hz (its lowest partial)
//   to        where that lowest partial ends. The ratio to/f0 is what the whole band travels.
//   octaves   how wide the band is. Under ~1.5 it reads as a pitch, over ~2.5 it reads as air.
//   n         partial count. Twelve is about the floor for fusion; below it you hear the parts.
//   tilt      how much quieter each partial is than the one below it, so the band has a direction.
//   stagger   how far apart in time the partials start. A few ms breaks the onset click; a few
//             hundred ms turns the same stack into a swell, because the level accrues as they arrive.
function swarm({ f0, to, octaves = 2, n = 14, attack, decay, peak, offset = 0, tilt = 0.55, wave = 'sine', stagger = 0.008 }) {
  const R = to / f0;
  return Array.from({ length: n }, (_, k) => {
    // A low-discrepancy jitter (the golden-ratio sequence) rather than an even split. Evenly spaced
    // partials in log frequency are a harmonic-ish comb and the ear finds a pitch in it; the irregular
    // spacing is what keeps the stack reading as a band. Deterministic, so the cue is reproducible.
    const u = (k + ((k * 0.6180339887) % 1)) / n;
    const f = f0 * Math.pow(2, u * octaves);
    return {
      kind: 'tone', waveform: wave, frequency: f, glideTo: f * R, glideTime: decay * 0.9 + attack,
      attack: attack * (1 + u * 0.5), decay: decay * (1 - u * 0.25),
      peak: peak * Math.pow(1 - tilt, u * octaves) / Math.sqrt(n),
      offset: offset + u * stagger,   // stagger, so the partials do not all start in phase
    };
  });
}

export const CUES = {
  // ---- ACCENTS: something small lands ------------------------------------------------------------
  // Punctuation. A small element, a counter digit. Quiet on purpose: this is the one that becomes a
  // machine gun if it is loud, and the density rules exist because of it.
  pluck: { masterGain: 0.30, layers: [
    { kind: 'tone', waveform: 'triangle', frequency: 920, glideTo: 780, glideTime: 0.05, attack: 0.001, decay: 0.045, peak: 0.34 },
    { kind: 'tone', waveform: 'sine', frequency: 1840, attack: 0.001, decay: 0.020, peak: 0.09 },
  ] },

  chime: {"masterGain":0.5, "layers":[{"kind":"tone","waveform":"sine","frequency":1046.5, "attack":0.006, "decay":0.22, "peak":0.09}, {"kind":"tone","waveform":"sine","frequency":1568, "offset":0.09, "attack":0.006, "decay":0.26, "peak":0.08}], "shimmer":{"delay":0.12, "feedback":0.25, "wet":0.18, "lowpass":4000.0}},
  sparkle: {"masterGain":0.5, "layers":[{"kind":"tone","waveform":"sine","frequency":1760, "offset":0, "attack":0.003, "decay":0.09, "peak":0.045}, {"kind":"tone","waveform":"sine","frequency":2217, "offset":0.045, "attack":0.003, "decay":0.09, "peak":0.04}, {"kind":"tone","waveform":"sine","frequency":2637, "offset":0.09, "attack":0.003, "decay":0.1, "peak":0.038}, {"kind":"tone","waveform":"sine","frequency":3520, "offset":0.135, "attack":0.003, "decay":0.12, "peak":0.032}], "shimmer":{"delay":0.07, "feedback":0.35, "wet":0.22, "lowpass":6000.0}},
  droplet: {"masterGain":0.55, "layers":[{"kind":"tone","waveform":"sine","frequency":1200, "glideTo":550, "glideTime":0.14, "attack":0.004, "decay":0.2, "peak":0.075}], "shimmer":{"delay":0.09, "feedback":0.2, "wet":0.15, "lowpass":3000.0}},
  // PROMOTED FROM A VARIANT. The shipped voicing was rejected by ear and this one kept
  // (verify/sound-verdicts.json round 2). Numbers look arbitrary because they are a measured
  // preference rather than a designed one: `vary('bloom', 3)` in scripts/dev/sound-vary.mjs
  // reproduces them exactly.
  bloom: {"masterGain": 0.5, "layers": [{"kind": "tone", "waveform": "sine", "frequency": 597.135335543789, "attack": 0.06768921516090631, "decay": 0.14823116605728864, "peak": 0.07345559132331983}, {"kind": "tone", "waveform": "sine", "frequency": 426.59458829540756, "detune": 12, "attack": 0.14212638809904457, "decay": 0.48715202256059276, "peak": 0.05493165752501228}], "shimmer": {"delay": 0.15, "feedback": 0.2, "wet": 0.12, "lowpass": 2500}},
  success: {"masterGain":0.5, "layers":[{"kind":"tone","waveform":"sine","frequency":880, "attack":0.004, "decay":0.09, "peak":0.06}, {"kind":"tone","waveform":"sine","frequency":1108.73, "offset":0.06, "attack":0.004, "decay":0.1, "peak":0.06}, {"kind":"tone","waveform":"sine","frequency":1318.51, "offset":0.12, "attack":0.004, "decay":0.18, "peak":0.07}], "shimmer":{"delay":0.1, "feedback":0.22, "wet":0.16, "lowpass":4500}},
  // PROMOTED FROM A VARIANT. The shipped voicing was rejected by ear and this one kept
  // (verify/sound-verdicts.json round 2). Numbers look arbitrary because they are a measured
  // preference rather than a designed one: `vary('ready', 7)` in scripts/dev/sound-vary.mjs
  // reproduces them exactly.
  ready: {"masterGain": 0.45, "layers": [{"kind": "noise", "filterType": "bandpass", "filterFrequency": 3200, "filterQ": 1.7, "attack": 0.001, "decay": 0.012098159216344356, "peak": 0.06180915778153576}, {"kind": "tone", "waveform": "sine", "frequency": 767.2653575001948, "offset": 0.025, "attack": 0.012457696743495762, "decay": 0.2870990530587733, "peak": 0.0528644083958352}, {"kind": "tone", "waveform": "sine", "frequency": 1330.0283611932584, "offset": 0.025, "attack": 0.023373052605427803, "decay": 0.4109534594230354, "peak": 0.045950954629282934}], "shimmer": {"delay": 0.13, "feedback": 0.2, "wet": 0.13, "lowpass": 3600}},
  // ---- MOVEMENT and WEIGHT: built here, not ported ------------------------------------------------
  // Everything below is designed for this engine rather than taken from Cuelume, which is a UI library
  // and has no vocabulary for a cut. Each one is a moving spectral band or a moving fundamental, and
  // none of them carries a noise layer, for the reason written above `swarm`.

  // Whoosh. An object passes the camera, so the sound has to pass too: the band sweeps UP while the
  // level swells, and then a second band sweeps DOWN as it leaves. The departure starts before the
  // approach has finished, which is what stops the join reading as two sounds.
  //
  // The naive build is one band sweeping one way, and it is why a cheap whoosh sounds like a jet that
  // never arrives: with no fall after the peak there is no pass point, only a rise. The Doppler drop
  // IS the event.
  whoosh: { masterGain: 0.55, layers: [
    ...swarm({ f0: 220, to: 1500, octaves: 2.2, n: 16, attack: 0.26, decay: 0.055, peak: 0.55 }),
    ...swarm({ f0: 1500, to: 380, octaves: 2.2, n: 16, attack: 0.03, decay: 0.13, peak: 0.46, offset: 0.28, tilt: 0.62 }),
  ] },

  // Riser. A build INTO a moment, so it must END where the moment is: place it by hand, led by the
  // beat it feeds. One band, climbing, with the level still rising as the pitch arrives.
  //
  // Narrower than the whoosh (1.6 octaves against 2.2) on purpose. A riser is allowed to be nearly
  // pitched, because the tension comes from knowing where it is going; a whoosh is not, because an
  // object passing has no key.
  riser: { masterGain: 0.5, layers: [
    ...swarm({ f0: 165, to: 1320, octaves: 1.6, n: 13, attack: 0.72, decay: 0.10, peak: 0.5, tilt: 0.4 }),
  ] },

  // Sub drop. The downlifter that lands ON a cut rather than before it: a fundamental falling from
  // just above the speech range to the bottom of the spectrum, with its own second harmonic so it is
  // still audible on a phone, where nothing under about 150Hz plays at all.
  //
  // THE NUMBER THAT MATTERS IS THE END, not the start. Landing at 30Hz reads as a room-sized drop;
  // stopping at 60Hz reads as a bass note, which is a different event. renderCue glides LINEARLY in
  // Hz, and the recipes call for an exponential fall, so this lands lower earlier than a synth would.
  // That is a real difference and it is the missing primitive: a glide curve.
  drop: { masterGain: 0.6, layers: [
    { kind: 'tone', waveform: 'sine', frequency: 96, glideTo: 30, glideTime: 0.5, attack: 0.006, decay: 0.30, peak: 0.62 },
    { kind: 'tone', waveform: 'sine', frequency: 192, glideTo: 60, glideTime: 0.5, attack: 0.004, decay: 0.16, peak: 0.20 },
  ] },

  // Impact. Three parts, and every write-up of the family names the same three: a TRANSIENT that gives
  // the hit its edge, a BODY that gives it mass, and a TAIL that gives it a room. The mistake is to
  // build only the body, which lands like a thump behind a curtain, or only the transient, which is a
  // click. The transient is milliseconds, the body is a tenth of a second, the tail is most of a second.
  //
  // The body falls in pitch because a falling fundamental is what the ear reads as mass. The tail is a
  // swarm rather than a reverb because the engine has no reverb: a wide, quiet, slowly sinking band
  // decays like a room without one.
  impact: { masterGain: 0.55, layers: [
    { kind: 'tone', waveform: 'sine', frequency: 2400, glideTo: 900, glideTime: 0.012, attack: 0.0008, decay: 0.010, peak: 0.34 },
    { kind: 'tone', waveform: 'sine', frequency: 120, glideTo: 46, glideTime: 0.10, attack: 0.003, decay: 0.14, peak: 0.62 },
    ...swarm({ f0: 200, to: 130, octaves: 2.6, n: 14, attack: 0.02, decay: 0.30, peak: 0.16, offset: 0.01, tilt: 0.5 }),
  ] },

  // Swell. The reverse-cymbal move: a sound that accelerates INTO a cut and stops dead on it, which is
  // what makes an edit feel inevitable rather than sudden.
  //
  // THE STEP THAT IS NOT OBVIOUS, and it is a workaround for a missing primitive. A reverse swell needs
  // an EXPONENTIAL-IN amplitude envelope, and `env` only offers a linear attack. So the curve is built
  // from arrivals instead of from a shape: the partials are staggered across 340ms, so the level accrues
  // as each one joins, and because the stack is tilted the late arrivals are the bright ones. The
  // spectrum therefore opens as the level rises, which is the half of a reverse cymbal that people
  // actually hear.
  swell: { masterGain: 0.5, layers: [
    ...swarm({ f0: 300, to: 900, octaves: 2.4, n: 18, attack: 0.05, decay: 0.075, peak: 0.42, tilt: -0.55, stagger: 0.52 }),
  ] },

  // Braam. The Inception horn: not one instrument but a stack of detuned saws an octave and a fifth
  // apart, low enough to feel. The detune is the whole effect. Two saws a few cents apart beat against
  // each other at the difference frequency, and a few of those at different rates is what makes one
  // sustained note sound like a section rather than a synth.
  //
  // 14 cents at 55Hz beats at about 0.4Hz, which is slow enough to read as a swell inside the note.
  // Tighter than about 5 cents and the stack sounds like one oscillator; wider than about 25 and it
  // sounds out of tune rather than large. The small downward glide is the brass player running out of
  // air, and it is what stops the note sounding held by a machine.
  braam: { masterGain: 0.42, layers: [
    { kind: 'tone', waveform: 'saw', frequency: 55, glideTo: 52, glideTime: 1.4, attack: 0.11, decay: 0.62, peak: 0.30 },
    { kind: 'tone', waveform: 'saw', frequency: 55, detune: 14, attack: 0.14, decay: 0.66, peak: 0.28 },
    { kind: 'tone', waveform: 'saw', frequency: 82.5, detune: -9, attack: 0.18, decay: 0.58, peak: 0.20 },
    { kind: 'tone', waveform: 'saw', frequency: 110, detune: 7, attack: 0.22, decay: 0.50, peak: 0.14 },
    { kind: 'tone', waveform: 'sine', frequency: 27.5, attack: 0.09, decay: 0.60, peak: 0.34 },
  ] },
};

/**
 * Music bed: a seamless ambient loop built from a chord, a slow tremolo and an optional pulse.
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
