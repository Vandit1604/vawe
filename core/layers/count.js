// core/layers/count.js — a number that counts from→to over local time (stats, timers). Build is the
// text build (styleText renders count content); this adds the per-frame value.
export { build } from './text.js';

export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cs = L.countStart ?? 0.2, cd = L.countDur ?? 1.6;
  const v = kit.interpolate(t - start, [cs, cs + cd], [L.from ?? 0, L.to ?? 100], { easing: kit.resolveEasing(L.ease || 'easeOutCubic') });
  el.textContent = (L.prefix || '') + v.toFixed(L.decimals ?? 0) + (L.suffix || '');
}
