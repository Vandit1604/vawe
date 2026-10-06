// The one table of which draft check runs in which tier. A check earns a place in every draft only when it
// is fast and changes the next edit; the rest runs at `bin/vawe dev --full` or at ship.
//   fast    every draft: read from the page's declared animations, its text samples and the encoded video
//   settled every draft, but only at settled frames (contrast, layout) or near the spec times (the Words rows)
//   ship    `dev --full` and ship: per-frame box tracks, object tracks, loudness and peak
export const CHECK_TIER = {
  motion: 'fast',
  text: 'fast',
  worlds: 'fast',
  video: 'fast',
  contrast: 'settled',
  layout: 'settled',
  spec: 'settled',
  'box-motion': 'ship',
  objects: 'ship',
  sound: 'ship',
};

const ORDER = ['fast', 'settled', 'ship'];
const TOP_TIER = { fast: 'fast', draft: 'settled', full: 'ship' };

export const MODES = Object.keys(TOP_TIER);

export const runsIn = (check, mode) => ORDER.indexOf(CHECK_TIER[check]) <= ORDER.indexOf(TOP_TIER[mode]);

// The check behind each acceptance row; a row with no entry is read from a file or from the check that always runs.
export const ROW_CHECK = {
  'text contrast': 'contrast',
  'word cap height and position vs spec': 'spec',
  loudness: 'sound',
  peak: 'sound',
};

/** For an acceptance row not run in `mode`: why it is not measured, else null. */
export function unrunReason(metric, mode) {
  const check = ROW_CHECK[metric];
  if (!check || runsIn(check, mode)) return null;
  return `${CHECK_TIER[check]} tier: run bin/vawe dev --full`;
}
