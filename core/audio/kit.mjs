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
// Used by harness/media/gen-audio.mjs (`make audio`) to bake assets/sfx/*.wav + assets/music/*.wav,
// which the Go mixer (internal/audio/audio.go) beds under the render.

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

// `triangle` IS AN ALIAS FOR `tri`, AND AN UNKNOWN NAME NOW THROWS. Both halves matter. Several specs
// said `triangle`, which was not a name this function knew, and the final `return Math.sin(ph)` turned
// every one of them into a SINE without a word: silent substitution, which this repo names as its worst
// bug class. It could not be fixed while `pluck` depended on the accident, because aliasing the name
// would have re-voiced a cue a person had approved. Round 5 replaced that pluck with one that asks for
// a sine outright, so nothing is standing on the bug any more and it goes.
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

// ---------------------------------------------------------------- biquad (RBJ cookbook)
// Cuelume shapes its noise layers with BiquadFilterNode (lowpass/bandpass/highpass). A one-pole
// filter is not close enough. The bandpass Q is what makes `tick` a click and not a thud.
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

// ---------------------------------------------------------------- envelope
// Linear attack to `peak`, then exponential decay, Web Audio's setTargetAtTime shape.
const env = (t, attack, decay, peak) => (t < attack ? (attack ? (t / attack) * peak : peak)
  : peak * Math.exp(-(t - attack) / Math.max(1e-4, decay)));

/**
 * Render one cue spec to mono samples.
 *   { masterGain, layers: [ {kind:'tone'|'noise', ...} ], shimmer?: {delay,feedback,wet,lowpass} }
 * tone  : waveform, frequency, glideTo, glideTime, detune (cents), offset, attack, decay, peak
 * noise : filterType, filterFrequency, filterQ, filterGlideTo, filterGlideTime, attack, decay, peak
 *
 * The two filter-glide fields sweep the cutoff, and the sweep is EXPONENTIAL in frequency
 * (a constant ratio per second), not linear in Hz like a tone's `glideTo`. That is the
 * difference between a whoosh and a siren: the ear hears frequency ratios, so a linear Hz
 * sweep crosses the low octaves too fast and the high ones too slowly.
 */
// Re-tune in blocks of 32 samples (0.7ms at 44.1k). Per-sample costs 8 trig calls each and
// buys nothing: no sweep in any recipe here moves audibly inside a millisecond.
function noiseSample(filt, noiseGen, L, f0Filt, i, t) {
  if (L.filterGlideTo != null && (i & 31) === 0) {
    const g = clamp(t / Math.max(1e-4, L.filterGlideTime ?? 0.1), 0, 1);
    filt.tune(f0Filt * Math.pow(L.filterGlideTo / f0Filt, g));
  }
  return filt(noiseGen());
}

// glide + detune are frequency-domain; integrate phase so a sweep stays continuous.
// `?? ` not `|| `: a glideTime of 0 means SNAP to the target, and `|| 0.1` turned that into a
// 100ms slide. Same falsy-zero class as the opacity bug (engine-doctrine/MISTAKES.md #193), and the very
// next line already had it right for `peak`.
function toneSample(L, phase, t) {
  let f = L.frequency || 440;
  if (L.glideTo != null) { const g = clamp(t / Math.max(1e-4, L.glideTime ?? 0.1), 0, 1); f = f + (L.glideTo - f) * g; }
  if (L.detune) f *= Math.pow(2, L.detune / 1200);
  const nextPhase = phase + TAU * f / SR;
  return { value: osc(L.waveform || 'sine', 0, 0, nextPhase), phase: nextPhase };
}

function renderLayer(out, L, li, seed, n) {
  const off = sec(L.offset || 0);
  const noiseGen = rng((seed * 2654435761 + li * 40503) >>> 0);
  const f0Filt = L.filterFrequency || 1000;
  const filt = L.kind === 'noise' ? biquad(L.filterType || 'lowpass', f0Filt, L.filterQ ?? 0.7) : null;
  const life = (L.attack || 0) + (L.decay || 0) * 5;
  const nn = Math.min(n - off, sec(life));
  let phase = 0;
  for (let i = 0; i < nn; i++) {
    const t = i / SR;
    let v;
    if (L.kind === 'noise') {
      v = noiseSample(filt, noiseGen, L, f0Filt, i, t);
    } else {
      const s = toneSample(L, phase, t);
      v = s.value;
      phase = s.phase;
    }
    out[off + i] += v * env(t, L.attack ?? 0, L.decay ?? 0.1, L.peak ?? 0.1);
  }
}

export function renderCue(spec, seed = 1) {
  const layers = spec.layers || [];
  const tail = (spec.shimmer ? spec.shimmer.delay * 6 : 0) + 0.08;
  const dur = Math.max(...layers.map((l) => (l.offset || 0) + (l.attack || 0) + (l.decay || 0) * 5), 0.05) + tail;
  const n = sec(dur), out = new Float32Array(n);

  layers.forEach((L, li) => renderLayer(out, L, li, seed, n));

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
// Pure encode, no I/O: core/ is fetched and evaluated by a browser, so nothing here may import
// node:fs. The caller (a CLI script, which already has fs) writes the returned Buffer to disk.
export function encodeWav(samples, { stereo = false } = {}) {
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
  return buf;
}

// samples.length / SR, named so a caller doesn't need to import SR just to compute a duration.
export function wavDuration(samples) { return samples.length / SR; }

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
// (engine-doctrine/MISTAKES.md #58). Do not hand-edit these; re-extract from the library if it versions up.
// TEN CUES WERE REMOVED AFTER A LISTENING PASS, and the reason is measurable rather than a matter of
// taste. All twenty were baked and judged by ear (quality/baselines/sound-verdicts.json, via
// `node harness/dev/sound-lab.mjs`), and sorting the verdicts against their own specs found one clean
// rule: EVERY cue that was kept has ZERO noise layers, and the chance of rejection rises with the
// noise-layer count (keep 0.00, weak 1.00, reject 1.40). Attack and peak barely differ between the
// groups, so the recurring note "too sharp and loud" was describing a symptom. Filtered white noise is
// what reads as cheap, whatever envelope you put on it.
//
// The ten removed were the interface clicks and noise textures ported from a UI library, which a film
// has no use for: nobody is clicking anything. What remains is the pitched set, which is what a film
// actually scores with.
export const CUES = {
  // ---- ACCENTS: something small lands ------------------------------------------------------------
  // Punctuation. A small element, a counter digit. Quiet on purpose: this is the one that becomes a
  // machine gun if it is loud, and the density rules exist because of it.
  // PROMOTED FROM A VARIANT, round 5 (`compose('pluck', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  pluck: {"masterGain": 0.3, "layers": [{"kind": "tone", "waveform": "sine", "frequency": 876.7927313027903, "attack": 0.002, "decay": 0.14, "peak": 0.15, "offset": 0}]},

  chime: {"masterGain":0.5, "layers":[{"kind":"tone","waveform":"sine","frequency":1046.5, "attack":0.006, "decay":0.22, "peak":0.09}, {"kind":"tone","waveform":"sine","frequency":1568, "offset":0.09, "attack":0.006, "decay":0.26, "peak":0.08}], "shimmer":{"delay":0.12, "feedback":0.25, "wet":0.18, "lowpass":4000.0}},
  sparkle: {"masterGain":0.5, "layers":[{"kind":"tone","waveform":"sine","frequency":1760, "offset":0, "attack":0.003, "decay":0.09, "peak":0.045}, {"kind":"tone","waveform":"sine","frequency":2217, "offset":0.045, "attack":0.003, "decay":0.09, "peak":0.04}, {"kind":"tone","waveform":"sine","frequency":2637, "offset":0.09, "attack":0.003, "decay":0.1, "peak":0.038}, {"kind":"tone","waveform":"sine","frequency":3520, "offset":0.135, "attack":0.003, "decay":0.12, "peak":0.032}], "shimmer":{"delay":0.07, "feedback":0.35, "wet":0.22, "lowpass":6000.0}},
  // PROMOTED FROM A VARIANT. The shipped voicing was rejected by ear and this one kept
  // (quality/baselines/sound-verdicts.json round 3). Numbers look arbitrary because they are a measured
  // preference rather than a designed one: `compose('droplet', 3)` in harness/dev/sound-vary.mjs
  // reproduces them exactly.
  droplet: {"masterGain": 0.55, "layers": [{"kind": "tone", "waveform": "sine", "frequency": 1319.452355839312, "attack": 0.006, "decay": 0.26, "peak": 0.09374999999999999, "offset": 0}, {"kind": "tone", "waveform": "sine", "frequency": 1662.5099683575331, "attack": 0.0084, "decay": 0.2028, "peak": 0.05769230769230769, "offset": 0.008726843487471343}]},
  // PROMOTED FROM A VARIANT. The shipped voicing was rejected by ear and this one kept
  // (quality/baselines/sound-verdicts.json round 2). Numbers look arbitrary because they are a measured
  // preference rather than a designed one: `vary('bloom', 3)` in harness/dev/sound-vary.mjs
  // reproduces them exactly.
  bloom: {"masterGain": 0.5, "layers": [{"kind": "tone", "waveform": "sine", "frequency": 597.135335543789, "attack": 0.06768921516090631, "decay": 0.14823116605728864, "peak": 0.07345559132331983}, {"kind": "tone", "waveform": "sine", "frequency": 426.59458829540756, "detune": 12, "attack": 0.14212638809904457, "decay": 0.48715202256059276, "peak": 0.05493165752501228}], "shimmer": {"delay": 0.15, "feedback": 0.2, "wet": 0.12, "lowpass": 2500}},
  success: {"masterGain":0.5, "layers":[{"kind":"tone","waveform":"sine","frequency":880, "attack":0.004, "decay":0.09, "peak":0.06}, {"kind":"tone","waveform":"sine","frequency":1108.73, "offset":0.06, "attack":0.004, "decay":0.1, "peak":0.06}, {"kind":"tone","waveform":"sine","frequency":1318.51, "offset":0.12, "attack":0.004, "decay":0.18, "peak":0.07}], "shimmer":{"delay":0.1, "feedback":0.22, "wet":0.16, "lowpass":4500}},
  // PROMOTED FROM A VARIANT. The shipped voicing was rejected by ear and this one kept
  // (quality/baselines/sound-verdicts.json round 2). Numbers look arbitrary because they are a measured
  // preference rather than a designed one: `vary('ready', 7)` in harness/dev/sound-vary.mjs
  // reproduces them exactly.
  // PROMOTED FROM A VARIANT, round 5 (`compose('ready', 3)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  ready: {"masterGain": 0.45, "layers": [{"kind": "tone", "waveform": "sine", "frequency": 917.5537402621779, "attack": 0.02, "decay": 0.2, "peak": 0.11249999999999999, "offset": 0}, {"kind": "tone", "waveform": "sine", "frequency": 1376.3306103932669, "attack": 0.02, "decay": 0.15600000000000003, "peak": 0.06923076923076922, "offset": 0.0017744631562381984}]},
  // ---- MOVEMENT and WEIGHT: built here, not ported ------------------------------------------------
  // Everything below is designed for this engine rather than taken from Cuelume, which is a UI library
  // and has no vocabulary for a cut. Each one is a moving spectral band or a moving fundamental, and
  // none of them carries a noise layer, for the reason written above `swarm`.

  // Whoosh. An object passes the camera, so the sound has to pass too: the band sweeps UP while the
  // level swells, and then a second band sweeps DOWN as it leaves. The departure starts before the
  // approach has finished, which is what stops the join reading as two sounds.
  //
  // The naive build is one band sweeping one way, and it is why a cheap whoosh sounds like a jet that
  // never arrives: with no fall after the peak there is no pass point, only a rise. The INFLECTION at
  // the loudest moment is the event, and it is the step that gets left out.
  //
  // TWO NUMBERS THAT ARE NOT WHAT THEY LOOK LIKE. The band travels a factor of 6.8, about 33 semitones,
  // and that is the aeroacoustic tone tracking speed (f = 0.2*u/d, so a 3mm edge going 5 to 40 m/s
  // sweeps 333Hz to 2667Hz), NOT Doppler. Real Doppler is small: (c+v)/(c-v) at 343 m/s gives 2.0
  // semitones at 20 m/s and 3.0 at 30 m/s, so the 12 semitones the tutorials ask for is a stylised
  // amount and the drama belongs in the filter and the level. And a real pass-by envelope is a
  // Lorentzian, 1/(d^2 + v^2 t^2), whose half-power width is 2d/v: 0.33s for a 30 m/s pass at 5 metres,
  // 0.13s at 2 metres. A near miss is a SPIKE on a long approach, not a symmetric swell, which is why
  // the approach here is a slow attack and the departure is a fast one.
  // PROMOTED FROM A VARIANT, round 5 (`composeMovement('whoosh', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  whoosh: {"masterGain": 0.55, "layers": [{"kind": "noise", "filterType": "bandpass", "filterFrequency": 149.0597651153803, "filterGlideTo": 1192.378900758922, "filterGlideTime": 0.31445293996017426, "filterQ": 2.251940276939422, "attack": 0.26445293996017427, "decay": 0.05, "peak": 0.5, "offset": 0}, {"kind": "noise", "filterType": "bandpass", "filterFrequency": 1192.378900758922, "filterGlideTo": 223.58964767307043, "filterGlideTime": 0.2729367252625525, "filterQ": 2.251940276939422, "attack": 0.03, "decay": 0.2429367252625525, "peak": 0.44, "offset": 0.23800764596415686}, {"kind": "tone", "waveform": "sine", "frequency": 66.72627971391194, "attack": 0.21156235196813944, "decay": 0.12, "peak": 0.16}]},

  // Riser. A build INTO a moment, so it must END where the moment is: place it by hand, led by the
  // beat it feeds. One band, climbing, with the level still rising as the pitch arrives.
  //
  // Narrower than the whoosh (1.6 octaves against 2.2) on purpose. A riser is allowed to be nearly
  // pitched, because the tension comes from knowing where it is going; a whoosh is not, because an
  // object passing has no key.
  //
  // THE STEP THAT IS NOT OBVIOUS is the last layer: a sub that bends DOWN while everything else climbs.
  // Every hybrid-riser recipe carries it and none explains it, so here is the reason. A riser leaves the
  // bass register as it rises, and the low end goes with it, so the build gets thinner exactly where it
  // should get heavier. The counter-moving sub is what stops that.
  // (https://www.musicradar.com/tuition/tech/how-to-create-your-own-dramatic-hybrid-risers-641799,
  // which also gives the shape: a 4-octave climb over 8 bars, exponential, so it ACCELERATES.)
  //
  // WHAT THIS ENGINE CANNOT DO, and it is the other half of every recipe: the -3 to -6dB CUT at the
  // riser's own peak, immediately before the moment lands. The drop hits because of the hole in front
  // of it, not because the riser got loud. That is a mixer decision, not a cue parameter, so place the
  // riser to END on the beat and leave the frame before it quiet.
  // PROMOTED FROM A VARIANT, round 5 (`composeMovement('riser', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  riser: {"masterGain": 0.5, "layers": [{"kind": "noise", "filterType": "bandpass", "filterFrequency": 195.73031682521105, "filterGlideTo": 1544.9892224743962, "filterGlideTime": 1.2672377136303112, "filterQ": 2.2324799145571887, "attack": 1.1672377136303111, "decay": 0.1, "peak": 0.5, "offset": 0}, {"kind": "tone", "waveform": "sine", "frequency": 87.19948236714117, "glideTo": 45.71554599236697, "glideTime": 1.1672377136303111, "attack": 0.52525697113364, "decay": 0.16, "peak": 0.26}]},

  // Sub drop. The downlifter that lands ON a cut rather than before it: a fundamental falling from
  // just above the speech range to the bottom of the spectrum, with its own second harmonic so it is
  // still audible on a phone, where nothing under about 150Hz plays at all.
  //
  // THE NUMBER THAT MATTERS IS THE END, not the start. Landing at 30Hz reads as a room-sized drop;
  // stopping at 60Hz reads as a bass note, which is a different event. renderCue glides LINEARLY in
  // Hz, and every recipe calls for an exponential fall, so this lands lower earlier than a synth would.
  // That is a real difference and it is the missing primitive: a glide curve.
  //
  // This is the CINEMATIC sub-down, half a second long, not the 808 knock, which drops 24 semitones in
  // 40 to 60ms and is a different event entirely (https://vadisound.com/cinematic-sound-design-series-
  // how-to-create-sub-downs-low-booms-and-whooshes/). If you want the knock, shorten glideTime to 0.05.
  // PROMOTED FROM A VARIANT, round 5 (`composeMovement('drop', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  drop: {"masterGain": 0.6, "layers": [{"kind": "tone", "waveform": "sine", "frequency": 153.7799136294052, "glideTo": 28.852913435082883, "glideTime": 1.1724788748426362, "attack": 0.01, "decay": 0.8207352123898454, "peak": 0.5}, {"kind": "noise", "filterType": "bandpass", "filterFrequency": 637.1601055376232, "filterGlideTo": 75.12447983492166, "filterGlideTime": 0.8407352123898454, "filterQ": 2.3792260268703105, "attack": 0.02, "decay": 0.8207352123898454, "peak": 0.22, "offset": 0}]},

  // Impact. Three parts, and every write-up of the family names the same three: a TRANSIENT that gives
  // the hit its edge, a BODY that gives it mass, and a TAIL that gives it a room. The mistake is to
  // build only the body, which lands like a thump behind a curtain, or only the transient, which is a
  // click. The transient is milliseconds, the body is a tenth of a second, the tail is most of a second.
  //
  // The body falls in pitch because a falling fundamental is what the ear reads as mass. The tail is a
  // swarm rather than a reverb because the engine has no reverb: a wide, quiet, slowly sinking band
  // decays like a room without one.
  //
  // THE NUMBERS COME FROM 808 PRACTICE, which is the only place the family is written down with any:
  // the transient is high-passed above 1kHz and trimmed under 40ms, the body's sine core sits at 45 to
  // 55Hz, a third layer fills 1 to 3kHz, and every layer's LOUDEST PEAK is aligned to the same sample
  // so three sounds read as one event (https://sfxengine.com/blog/impact-sound-effect,
  // https://pixflow.net/blog/sound-effects-layering/). The body lands at 46Hz for that reason and the
  // three offsets are within 10ms. The 1-3kHz layer is the one a naive build leaves out, and without it
  // an impact is a click stapled to a thump with a hole between them.
  // PROMOTED FROM A VARIANT, round 5 (`composeMovement('impact', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  impact: {"masterGain": 0.55, "layers": [{"kind": "noise", "filterType": "bandpass", "filterFrequency": 3650.2522726543248, "filterGlideTo": 2301.765531376004, "filterGlideTime": 0.013000000000000001, "filterQ": 0.9149462981149554, "attack": 0.001, "decay": 0.012, "peak": 0.42, "offset": 0}, {"kind": "tone", "waveform": "sine", "frequency": 65.33652698271908, "glideTo": 39.50297371437773, "glideTime": 0.14, "attack": 0.004, "decay": 0.15, "peak": 0.5}, {"kind": "noise", "filterType": "bandpass", "filterFrequency": 954.8293723957613, "filterGlideTo": 515.7418805547059, "filterGlideTime": 0.136, "filterQ": 0.9149462981149554, "attack": 0.006, "decay": 0.13, "peak": 0.2, "offset": 0.008}]},

  // Swell. The reverse-cymbal move: a sound that accelerates INTO a cut and stops dead on it, which is
  // what makes an edit feel inevitable rather than sudden.
  //
  // THE RECIPE, and it is two lines long. "Set the envelope attack shape to EXPONENTIAL, use a LONG
  // attack, and set the decay to IMMEDIATE" (https://www.perfectcircuit.com/signal/filter-sweeps). The
  // second half is the one that gets dropped, and it is the effect: the perceived hit is the
  // DISCONTINUITY, so the swell and the thing it introduces overlap by zero samples. A fade of even
  // 20ms reads as a fade-out rather than as an arrival.
  //
  // `env` offers a LINEAR attack and no immediate decay, so both halves are built rather than set. The
  // curve comes from ARRIVALS: eighteen partials staggered across 600ms, so the level accrues as each
  // one joins, and the tilt is inverted so the late arrivals are the loud bright ones and the spectrum
  // opens as the level climbs. The cut comes from a decay of 22ms on every partial, which is short
  // enough that the stack collapses within about 90ms of the last one landing. Measured: the level
  // peaks at 70% of the cue's length and the brightness climbs 637Hz to 4.4kHz across it.
  // PROMOTED FROM A VARIANT, round 5 (`composeMovement('swell', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  swell: {"masterGain": 0.5, "layers": [{"kind": "noise", "filterType": "bandpass", "filterFrequency": 274.12175975739956, "filterGlideTo": 961.1819964135066, "filterGlideTime": 0.7306436157366262, "filterQ": 2.2556555460207166, "attack": 0.7106436157366262, "decay": 0.02, "peak": 0.5, "offset": 0}]},

  // Braam. The Inception horn: a stack of detuned saws an octave and a fifth apart, low enough to feel.
  // The detune is what makes one sustained note sound like a section rather than a synth, because two
  // saws a few cents apart beat at the difference frequency. THE BEAT RATE IS THE NUMBER TO SET, not
  // the cents, and it is the one nobody computes: 14 cents is a ratio of 1.00811, so at 55Hz it beats
  // at 0.45Hz, slow enough to read as a swell inside the note. The SAME 14 cents an octave up beats
  // twice as fast, which is why one detune value cannot serve a whole stack. The small downward glide
  // is the player running out of air, and it is what stops the note sounding held by a machine.
  //
  // WHAT THIS IS NOT, said plainly because it would otherwise read as a full recipe. No source I could
  // reach gives a braam's detune in cents or its intervals, so the cents here are chosen to hit beat
  // rates and are not quoted from anyone. And the two published methods both say the identity is
  // RESONANCE AND DISTORTION rather than the note: about twenty detuned saws, one per brass player you
  // are imagining, spread across the stereo field with real brass on top and heavy distortion
  // (https://professionalcomposers.com/sound-design-how-to-make-trailer-braaam-fx/); or Zimmer's
  // original, brass players playing INTO the resonance of an open piano in a church
  // (https://richardpryn.com/braaams/). This engine has five voices, no distortion, no stereo and no
  // resonator, so this is the shape of a braam at a fraction of its density. Treat it as the low
  // sustained weight in the library, not as the trailer horn.
  // PROMOTED FROM A VARIANT, round 5 (`composeMovement('braam', 1)` in
  // harness/dev/sound-vary.mjs reproduces it, and out/sound-vary/specs-r5.json records it). The
  // shipped voicing was REJECTED by ear and this one kept. The numbers are a measured preference.
  braam: {"masterGain": 0.42, "layers": [{"kind": "tone", "waveform": "tri", "frequency": 74.52258396847174, "detune": -22.92972768098116, "attack": 0.3493133140960708, "decay": 0.9, "peak": 0.2142857142857143}, {"kind": "tone", "waveform": "saw", "frequency": 111.7838759527076, "detune": 29.808645985275508, "attack": 0.37931331409607083, "decay": 0.9, "peak": 0.125}, {"kind": "tone", "waveform": "tri", "frequency": 149.04516793694347, "detune": -36.687564289569856, "attack": 0.4093133140960708, "decay": 0.9, "peak": 0.08823529411764706}, {"kind": "tone", "waveform": "saw", "frequency": 223.5677519054152, "detune": 43.5664825938642, "attack": 0.4393133140960708, "decay": 0.9, "peak": 0.06818181818181818}, {"kind": "noise", "filterType": "bandpass", "filterFrequency": 857.5214679539204, "filterGlideTo": 2744.068697452545, "filterGlideTime": 1.1093133140960707, "filterQ": 1.0484928160905838, "attack": 0.4093133140960708, "decay": 0.7, "peak": 0.2838631074968726, "offset": 0}]},
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
