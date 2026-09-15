// kit-ramp: literal font sizes used in a fragment's own CSS, the kit block already stripped out.
//
// The kit is a foundation of tokens an author MAY use, never a whitelist that refuses a literal
// value: fragment authors are free to write any CSS for size, shadow, radius and spacing
// (engine-doctrine/MISTAKES.md #621). This module only measures whether a FILM, across all its fragments,
// drifts onto many different scales, for `frame-check`'s report-only `scale-drift` finding.
export function fragmentFontSizes(css) {
  const sizes = [...css.matchAll(/font(?:-size)?\s*:\s*(?:[^;{}]*?\s)?(\d{2,3})px/g)].map((m) => +m[1]);
  // Under 20px is a caption-scale detail, not a scale decision worth tracking for drift.
  return [...new Set(sizes)].filter((n) => n >= 20);
}
