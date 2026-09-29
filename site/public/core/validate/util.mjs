// Shared, dependency-free helpers used by every validate/*.mjs module.

export const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

export const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

// nearest(val, options) → " Did you mean 'x'?" for the closest valid value (edit distance), else ''.
// Kills the "guessed a wrong preset/cut/fx name" trap: the error tells you the right one immediately.
export function nearest(val, opts) {
  const ed = (a, b) => {
    const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0];
      d[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const t = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = t;
      }
    }
    return d[b.length];
  };
  const s = String(val).toLowerCase();
  let best = null, bd = Infinity;
  for (const o of opts) { const d = ed(s, String(o).toLowerCase()); if (d < bd) { bd = d; best = o; } }
  return best && bd <= Math.max(2, Math.ceil(best.length / 3)) ? ` Did you mean '${best}'?` : '';
}
