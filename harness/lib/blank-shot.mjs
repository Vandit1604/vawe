// A screenshot the browser hands back all black while the page is fine. Seen on a lens page, and always on the first frame of a worker's slice
// (frames 174, 232, 290, 348, 406 of a 522 frame draft cut in slices of 58), so that first frame is always taken twice.
// An all-black frame compresses to a few KB: one under a seventh of the last real picture of its worker is taken again, after a wait.

export const BLANK_RETRIES = 3;
export const BLANK_RETRY_WAIT_MS = 200;
const REAL_PICTURE_BYTES = 12000;
const COLLAPSE = 1 / 7;

/** Whether a capture of `size` bytes, after one of `previousSize` bytes (the last real picture; undefined for the first of a slice), is a blank one. Pure. */
export const isBlankShot = (size, previousSize) => previousSize !== undefined && previousSize >= REAL_PICTURE_BYTES && size < previousSize * COLLAPSE;

/** Whether the capture just taken (the `taken`th retake so far) must be taken again: the first of a slice once, any later one while it is blank. Pure. */
export const shouldRetake = (size, previousSize, taken) => taken < BLANK_RETRIES && (previousSize === undefined ? taken === 0 : isBlankShot(size, previousSize));
