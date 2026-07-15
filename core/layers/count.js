// core/layers/count.js — a number that counts from→to over local time (stats, timers). Build is the
// text build (styleText renders count content); this adds the per-frame value.
export { build } from './text.js';

export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cs = L.countStart ?? 0.2, cd = L.countDur ?? 1.6;
  const v = kit.interpolate(t - start, [cs, cs + cd], [L.from ?? 0, L.to ?? 100], { easing: kit.resolveEasing(L.ease || 'easeOutCubic') });
  el.textContent = (L.prefix || '') + fmtCount(v, L) + (L.unit || L.suffix || '');
}

// fmtCount: number formatting that reads RIGHT. With a `unit` (%/k/$B) the author owns scale, so just apply
// smart decimals (1 for a non-integer target < 100 → "0.4%", not "0"). Without a unit, auto-compact big raw
// numbers (2.5e9 → "2.5B", documented in CLAUDE.md) so a stat never renders a wall of digits.
function fmtCount(v, L) {
  if (L.unit || L.suffix || L.decimals != null) {
    const dec = L.decimals ?? ((L.to ?? 0) % 1 !== 0 && Math.abs(L.to ?? 0) < 100 ? 1 : 0);
    return v.toFixed(dec);
  }
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return v.toFixed((L.to ?? 0) % 1 !== 0 && a < 100 ? 1 : 0);
}
