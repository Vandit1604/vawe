// (engine-doctrine/MISTAKES.md #621). This module only measures whether a FILM, across all its fragments,
export function fragmentFontSizes(css) {
  const sizes = [...css.matchAll(/font(?:-size)?\s*:\s*(?:[^;{}]*?\s)?(\d{2,3})px/g)].map((m) => +m[1]);
  return [...new Set(sizes)].filter((n) => n >= 20);
}
