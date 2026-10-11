// The size budget of a move clip: the first CRF, from the render's own, whose file fits.
export const CLIP_BUDGET_BYTES = 2 * 1024 * 1024;
export const RENDER_CRF = 16;
export const CRF_STEP = 3;
export const CRF_CAP = 31;

/** sizeAt(crf) -> bytes of the clip encoded at that crf. Returns { crf, bytes, fits }; the last crf tried is the cap when nothing fits. */
export function chooseCrf(sizeAt, { budget = CLIP_BUDGET_BYTES, from = RENDER_CRF, step = CRF_STEP, cap = CRF_CAP } = {}) {
  for (let crf = from; ; crf = Math.min(cap, crf + step)) {
    const bytes = sizeAt(crf);
    if (bytes <= budget) return { crf, bytes, fits: true };
    if (crf >= cap) return { crf, bytes, fits: false };
  }
}
