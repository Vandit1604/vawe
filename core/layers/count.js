// core/layers/count.js — a number that counts from→to over local time (stats, timers). Build is the
// text build (styleText renders count content); this adds the per-frame value.
import { mergeProps } from '../props.js';
import { PROPS as TEXT_PROPS } from './text.js';
export { build } from './text.js';

// The count's own vocabulary, on top of the text build it reuses — the same shape as `export { build }`.
export const PROPS = mergeProps(TEXT_PROPS, {
  from: {}, to: {}, countStart: {}, countDur: {}, ease: {},
  unit: {}, suffix: {}, prefix: {}, decimals: {},
});

export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const cs = L.countStart ?? 0.2, cd = L.countDur ?? 1.6;
  const v = kit.interpolate(t - start, [cs, cs + cd], [L.from ?? 0, L.to ?? 100], { easing: kit.resolveEasing(L.ease || 'easeOutCubic') });
  // A leading currency symbol in `unit` is hoisted to the front: `unit:"$B"` reads "$880B", which is
  // what CLAUDE.md documents and what the catalog's own statBig.currency assumed. Appending it
  // verbatim produced "880$B" — the doc, the manifest and the engine each said something different
  // (docs/MISTAKES.md #76). Plain units (%/k/ms) are untouched.
  const rawUnit = L.unit || L.suffix || '';
  const cur = /^([$€£¥])(.*)$/.exec(rawUnit);
  el.textContent = (L.prefix || '') + (cur ? cur[1] : '') + fmtCount(v, L) + (cur ? cur[2] : rawUnit);
}

// fmtCount: number formatting that reads RIGHT. With a `unit` (%/k/$B) the author owns scale, so just apply
// smart decimals (1 for a non-integer target < 100 → "0.4%", not "0"). Without a unit, auto-compact big raw
// numbers (2.5e9 → "2.5B", documented in CLAUDE.md) so a stat never renders a wall of digits.
function fmtCount(v, L) {
  if (L.unit || L.suffix || L.decimals != null) {
    const dec = L.decimals ?? ((L.to ?? 0) % 1 !== 0 && Math.abs(L.to ?? 0) < 100 ? 1 : 0);
    return v.toFixed(dec);
  }
  // The scale comes from the TARGET, not from the value on screen this frame. Picking it per-frame made a
  // count to 2.5M spend most of its run as a churning 6-digit wall ("486887") and then snap to "2.4M": the
  // format, the digit count and the layer's width all changed mid-animation, which reads as a glitch. The
  // target is fixed for the whole run, so the unit is stable and only the digits move. Settled frames were
  // always right, which is exactly why nothing caught it.
  const scale = Math.abs(L.to ?? 0);
  if (scale >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (scale >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return v.toFixed((L.to ?? 0) % 1 !== 0 && Math.abs(v) < 100 ? 1 : 0);
}
