// harness/lib/ref-measure/audio-attack.mjs: where a sound STARTS. The onset detector reports the loudest
// change (a peak, some milliseconds into the sound); a cue placed on that peak lands on the body of the
// hit. This walks back from the peak along a 1 ms amplitude envelope to the point where the sound first
// rises out of the floor before it. A pure function of samples.

const HOP_S = 0.001;
const WIN_S = 0.003;
const LOOK_BACK_S = 0.12;
const PEAK_REACH_S = 0.04;
const RISE = 0.1;

function envelope(mono, sr) {
  const hop = Math.max(1, Math.round(HOP_S * sr)), win = Math.max(2, Math.round(WIN_S * sr)), n = Math.floor((mono.length - win) / hop);
  const env = new Float64Array(Math.max(0, n));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < win; k++) { const v = mono[i * hop + k]; s += v * v; }
    env[i] = Math.sqrt(s / win);
  }
  return { env, hopS: hop / sr, winS: win / sr };
}

const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];

/**
 * mono: Float32Array samples, sr: Hz, peaks: peak times in seconds from the onset detector.
 * Returns one { attack, errMs } per peak: attack in seconds (the envelope leaves the floor: it passes
 * floor + 10% of the way to the peak level), errMs the time the envelope takes to climb from 5% to 15%
 * plus one hop. A high errMs means a soft or crowded attack: look at the waveform.
 */
export function attackTimes(mono, sr, peaks) {
  const { env, hopS, winS } = envelope(mono, sr);
  return peaks.map((tPeak) => {
    const iPeak = Math.round((tPeak - winS / 2) / hopS);
    let top = Math.max(0, iPeak - Math.round(PEAK_REACH_S / hopS));
    for (let i = top; i <= Math.min(env.length - 1, iPeak + Math.round(PEAK_REACH_S / hopS)); i++) if (env[i] > env[top]) top = i;
    const lo = Math.max(0, top - Math.round(LOOK_BACK_S / hopS));
    const floor = median(Array.from(env.subarray(lo, Math.max(lo + 1, top - Math.round(0.03 / hopS)))));
    const level = (share) => floor + share * (env[top] - floor);
    const crossing = (share) => {
      let i = top;
      while (i > lo && env[i] > level(share)) i--;
      return i + 1;
    };
    const iAttack = crossing(RISE);
    return { attack: Math.round(((iAttack * hopS) + winS / 2) * 10000) / 10000, errMs: Math.round(((crossing(0.15) - crossing(0.05)) * hopS + hopS) * 10000) / 10 };
  });
}
