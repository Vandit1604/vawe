// The mix's true peak against the taste card's ceiling (engine-doctrine/TASTE-CARD.md rule 13).
export const PEAK_DBFS = -10;

/** The advice line when the as-written mix peaks over PEAK_DBFS, else null. Pure. */
export function peakLine(tp) {
  if (tp === null || !(tp > PEAK_DBFS)) return null;
  return `sound: true peak ${tp.toFixed(1)} dBFS (limit ${PEAK_DBFS} dBFS); lower data-gain on the loudest cue by ${Math.ceil(tp - PEAK_DBFS)} dB`;
}
