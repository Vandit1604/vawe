// The ffmpeg audio filter that trims, pitches, fades and levels one sound effect. Pure.
const RATE = 44100;

/** The playback rate of a pitch shift in semitones: +12 is twice as fast and an octave up. */
export const pitchRate = (semitones) => 2 ** (semitones / 12);

/** The seconds a clip of `dur` takes after a trim `[from, to]` (to may be null for the end) and a pitch shift. */
export function lengthAfter(dur, { from = 0, to = null, pitch = 0 }) {
  const kept = Math.max(0, (to ?? dur) - from);
  return kept / pitchRate(pitch);
}

/** The audio filter chain, or an Error naming the option: { from, to, pitch, fadeIn, fadeOut, gain } with unset ones left out. */
export function sfxFilter(opts, dur) {
  const { from = 0, to = null, pitch = 0, fadeIn = 0, fadeOut = 0, gain = 0 } = opts;
  if (to !== null && !(to > from)) throw new Error(`--trim ends at ${to} s, not after its start ${from} s`);
  if (from >= dur) throw new Error(`--trim starts at ${from} s, but the file is ${dur.toFixed(2)} s long`);
  const out = lengthAfter(dur, opts);
  if (fadeIn + fadeOut > out) throw new Error(`the fades (${fadeIn + fadeOut} s) are longer than the clip (${out.toFixed(2)} s)`);
  const chain = [];
  if (from > 0 || to !== null) chain.push(`atrim=start=${from}${to !== null ? `:end=${to}` : ''}`, 'asetpts=PTS-STARTPTS');
  if (pitch !== 0) chain.push(`asetrate=${Math.round(RATE * pitchRate(pitch))}`, `aresample=${RATE}`);
  if (fadeIn > 0) chain.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0) chain.push(`afade=t=out:st=${+(out - fadeOut).toFixed(4)}:d=${fadeOut}`);
  if (gain !== 0) chain.push(`volume=${gain}dB`);
  return chain.length ? chain.join(',') : 'anull';
}
