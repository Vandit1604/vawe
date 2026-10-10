// The moving-tail rule (taste/rules/moving-tail.md) read from the page: a tail is moving when an animation on a visible part
// runs at every sample of the last tail_seconds, whatever the pixels of the judge's sheet say. A camera move, a whole-frame
// element and a decorative (aria-hidden) layer are not a part: camera-moves.mjs owns what a camera move is. Pure.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { isCameraMove } from './camera-moves.mjs';

const TAIL_SECONDS = LIMITS['moving-tail'].tail_seconds;
const TAIL_AT = [0.9, 0.5, 0.1];

/** The seconds to sample the tail at: inside the last tail_seconds, the last one a tenth of it before the end. */
export const tailTimes = (dur) => TAIL_AT.map((f) => +Math.max(0, dur - f * TAIL_SECONDS).toFixed(3));

const isPartMove = (a) => !a.decorative && !a.fullFrame && !isCameraMove(a);

/** True when every tail sample holds a running animation on a visible part. `samples` is a list of animation lists, empty or null when the page was not sampled. */
export const tailMoving = (samples) => Boolean(samples?.length) && samples.every((anims) => Array.isArray(anims) && anims.some(isPartMove));
