// Cue levels read against each other. A loudness number alone is moved by one uniform data-gain shift; the balance of the cues is not.
// A cue is { name, at, peakDb, gain, gainSet } (gainSet: the page wrote data-gain; defaultGain: the voice's default).
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

const LEVEL = LIMITS['sound-level'];

const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];

/** The cues more than the limit above or below the median cue, each with its distance in dB. [] for fewer than 2 cues. */
export function outlierCues(cues) {
  if (cues.length < 2) return [];
  const mid = median(cues.map((c) => c.peakDb));
  return cues.map((c) => ({ ...c, delta: c.peakDb - mid })).filter((c) => Math.abs(c.delta) > LEVEL.cue_peak_over_median_db);
}

/** The shift in dB, when 2 or more cues all carry data-gain and sit the same distance from their voice defaults, else null. */
export function uniformShift(cues) {
  const set = cues.filter((c) => c.gainSet);
  if (set.length < 2 || set.length < cues.length) return null;
  const offsets = set.map((c) => c.gain - c.defaultGain);
  const mid = median(offsets);
  const same = offsets.every((o) => Math.abs(o - mid) <= LEVEL.cue_shift_tol_db);
  return same && Math.abs(mid) >= LEVEL.cue_shift_min_db ? Math.round(mid) : null;
}

/** The advice lines for the balance of a mix: the outliers, and a uniform shift. */
export function balanceLines(cues) {
  const lines = outlierCues(cues).map((c) => {
    const db = Math.round(Math.abs(c.delta));
    return `cue "${c.name}" at ${c.at} s peaks ${db} dB ${c.delta > 0 ? 'above' : 'below'} the rest (${Math.round(c.peakDb)} vs ${Math.round(c.peakDb - c.delta)} dB): ${c.delta > 0 ? 'lower' : 'raise'} its data-gain by ${db}`;
  });
  const shift = uniformShift(cues);
  if (shift !== null) lines.push(`all ${cues.length} cues carry data-gain ${shift > 0 ? '+' : '-'}${Math.abs(shift)} dB from their voice defaults: a shift on every cue moves the loudness and leaves the balance as it was. Remove the data-gain; change one cue only when it is out of balance with the others`);
  return lines;
}
