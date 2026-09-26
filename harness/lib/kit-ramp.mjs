// The kit is a foundation of tokens an author MAY use, never a whitelist; fragment authors may write any literal CSS for size, shadow, radius, spacing (engine-doctrine/MISTAKES.md #621).
export function fragmentFontSizes(css) {
  const sizes = [...css.matchAll(/font(?:-size)?\s*:\s*(?:[^;{}]*?\s)?(\d{2,3})px/g)].map((m) => +m[1]);
  return [...new Set(sizes)].filter((n) => n >= 20);
}
