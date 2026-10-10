// A film whose picture is a canvas (the lens, a three.js scene) shows its DOM only as a texture or not at all,
// so the DOM passes that read text and worlds off it cannot describe the frames and cost one canvas paint per seek.

/** Runs in the page: true when a visible canvas covers at least this share of the frame. */
export const canvasCoversFrame = (share) => [...document.querySelectorAll('canvas')].some((c) => {
  const r = c.getBoundingClientRect();
  const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
  const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  return getComputedStyle(c).visibility !== 'hidden' && Math.max(0, w) * Math.max(0, h) >= share * innerWidth * innerHeight;
});

export const CANVAS_SHARE = 0.6;

// The probes whose seeks read the DOM as if it were the picture.
export const DOM_PICTURE_CHECKS = new Set(['text-motion', 'worlds', 'spec']);

/** One line for the dev notes: which probes did not run and why. */
export const canvasFilmNote = () => `checks skipped: ${[...DOM_PICTURE_CHECKS].join(', ')} (a canvas covers the frame, so the DOM text and worlds are not the picture)`;
