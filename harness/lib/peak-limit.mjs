// The mix's true peak against the taste limit (taste/rules/sound-level.md).
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

export const PEAK_DBFS = LIMITS['sound-level'].peak_dbfs;

/** The advice line when the as-written mix peaks over PEAK_DBFS, else null. Pure. */
export function peakLine(tp) {
  if (tp === null || !(tp > PEAK_DBFS)) return null;
  return `sound: true peak ${tp.toFixed(1)} dBFS (limit ${PEAK_DBFS} dBFS); lower data-gain on the loudest cue by ${Math.ceil(tp - PEAK_DBFS)} dB`;
}
