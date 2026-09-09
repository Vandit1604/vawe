// kit-ramp: ONE definition of "does this fragment's CSS trace to the stage kit".
//
// Two things ask it and they must never disagree: scripts/live/craft-live.mjs says it at the keystroke,
// and scripts/gates/frame-check.mjs blocks on it in review. They HAD two copies, and the copies drifted
// the moment the double bezel arrived: the gate learned that a hairline ring may ride along with a kit
// elevation and the hook did not, so the same file was clean in one and wrong in the other. That is the
// second-definition failure this repo warns about, caught in its own tooling.
export const KIT_ROLE = /\.kit-(display|hook|headline|body|caption|eyebrow|stat)\b/;

/** Type sizes written as literals where a role exists. Under 20px is a caption-scale detail, not a role. */
export function offRampSizes(css) {
  const sizes = [...css.matchAll(/font(?:-size)?\s*:\s*(?:[^;{}]*?\s)?(\d{2,3})px/g)].map((m) => +m[1]);
  return [...new Set(sizes)].filter((n) => n >= 20);
}

/**
 * Shadows that name no kit elevation. A shadow is ON the ramp if it references `--kit-elev` ANYWHERE
 * in its value, because a hairline ring plus an elevation is one composite surface, not two decisions.
 * An inset-only shadow is exempt for a different reason: it is not elevation at all, it is where the
 * light hits the top edge, and refusing it rejects the double bezel outright.
 */
export function offRampShadows(css) {
  return [...css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)].map((m) => m[1])
    .filter((v) => !v.includes('var(--kit-elev') && !/^\s*inset\b/.test(v));
}
