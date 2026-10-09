// The mix's true peak against the taste limit (taste/rules/sound-level.md).
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

export const PEAK_DBFS = LIMITS['sound-level'].peak_dbfs;

/** The cue with the highest peak, from [{ name, at, peakDb }], as `the loudest cue "name" at 2.4 s`; plain words without cues. Pure. */
export function loudestCue(cues) {
  if (!cues?.length) return 'the loudest cue';
  const c = cues.reduce((a, b) => (b.peakDb > a.peakDb ? b : a));
  return `the loudest cue "${c.name}" at ${c.at} s`;
}

/** The advice line when the as-written mix peaks over PEAK_DBFS, else null. Pure. */
export function peakLine(tp, cues = null) {
  if (tp === null || !(tp > PEAK_DBFS)) return null;
  return `sound: true peak ${tp.toFixed(1)} dBFS (limit ${PEAK_DBFS} dBFS); lower data-gain on ${loudestCue(cues)} by ${Math.ceil(tp - PEAK_DBFS)} dB`;
}
