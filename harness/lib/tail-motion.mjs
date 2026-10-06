// The moving-tail rule (taste/rules/moving-tail.md) read from the page: a tail is moving when an animation runs on a
// visible element at every sample of the last tail_seconds, whatever the pixels of the judge's sheet say. Pure.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

const TAIL_SECONDS = LIMITS['moving-tail'].tail_seconds;
const TAIL_AT = [0.9, 0.5, 0.1];

/** The seconds to sample the tail at: inside the last tail_seconds, the last one a tenth of it before the end. */
export const tailTimes = (dur) => TAIL_AT.map((f) => +Math.max(0, dur - f * TAIL_SECONDS).toFixed(3));

/** True when every tail sample counted a running animation on a visible element. `counts` is empty or null when the page was not sampled. */
export const tailMoving = (counts) => Boolean(counts?.length) && counts.every((n) => n > 0);
