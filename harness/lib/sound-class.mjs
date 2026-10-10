// What a hit sounds like: click, pop, swish, impact or sustained, from the samples after its attack. Pure.
// The two readings are the decay (how long the envelope takes to fall to a fifth of its peak) and the brightness
// (zero crossings per second, about twice the dominant frequency of a tone and a high figure for noise).

const WIN_S = 0.016;
const HOP_S = 0.004;
const SPAN_S = 0.7;
const PEAK_REACH_S = 0.1;
const BRIGHT_SPAN_S = 0.04;
const FALL = 0.2;
export const SLOW_RISE_MS = 25;
export const SUSTAINED_DECAY_S = 0.6;
export const BRIGHT_HZ = 2500;
export const DULL_HZ = 700;
export const CLICK_DECAY_S = 0.09;
export const IMPACT_DECAY_S = 0.25;

export const SOUND_CLASSES = ['click', 'pop', 'swish', 'impact', 'sustained'];

const r3 = (v) => Math.round(v * 1000) / 1000;

function envelopeAt(mono, sr, from, span) {
  const win = Math.round(WIN_S * sr), hop = Math.round(HOP_S * sr), start = Math.max(0, Math.round(from * sr)), end = Math.min(mono.length, start + Math.round(span * sr));
  const env = [];
  for (let o = start; o + win <= end; o += hop) {
    let s = 0;
    for (let k = 0; k < win; k++) s += mono[o + k] * mono[o + k];
    env.push(Math.sqrt(s / win));
  }
  return env;
}

/** Half the zero crossings per second of the first BRIGHT_SPAN_S from `from`: the frequency of a tone, and a high figure for noise. */
function crossingsPerSecond(mono, sr, from) {
  const a = Math.max(0, Math.round(from * sr)), b = Math.min(mono.length, a + Math.round(BRIGHT_SPAN_S * sr));
  let n = 0;
  for (let i = a + 1; i < b; i++) if ((mono[i - 1] < 0) !== (mono[i] < 0)) n++;
  return b > a + 1 ? n / ((b - a) / sr) : 0;
}

/**
 * { cls, decayS, hz }: the class of the hit that starts at `attack` seconds. `riseMs` is the attack rise time of the hit
 * (audio-attack.mjs errMs): a slow rise or a long decay is `sustained`; bright and short is a `click`; bright and longer is a `swish`;
 * dull and long is an `impact`; the rest is a `pop`.
 */
export function classifyHit(mono, sr, attack, riseMs) {
  const env = envelopeAt(mono, sr, attack, SPAN_S);
  if (!env.length) return { cls: 'pop', decayS: 0, hz: 0 };
  const reach = Math.min(env.length - 1, Math.round(PEAK_REACH_S / HOP_S));
  let top = 0;
  for (let i = 0; i <= reach; i++) if (env[i] > env[top]) top = i;
  let end = top;
  while (end + 1 < env.length && env[end + 1] > FALL * env[top]) end++;
  const decayS = (end - top + 1) * HOP_S;
  const hz = crossingsPerSecond(mono, sr, attack + top * HOP_S) / 2;
  const cls = riseMs > SLOW_RISE_MS || decayS >= SUSTAINED_DECAY_S ? 'sustained'
    : hz >= BRIGHT_HZ ? (decayS < CLICK_DECAY_S ? 'click' : 'swish')
      : hz < DULL_HZ && decayS >= IMPACT_DECAY_S ? 'impact' : 'pop';
  return { cls, decayS: r3(decayS), hz: Math.round(hz) };
}
