
/**
 * flattenLayers(list) → every layer OBJECT in the tree, parents before their children (pre-order,
 * which is the order all five call sites already produced). Non-objects are skipped, not thrown on.
 */
export function flattenLayers(list, out = []) {
  for (const l of Array.isArray(list) ? list : []) {
    if (!l || typeof l !== 'object') continue;
    out.push(l);
    if (Array.isArray(l.children)) flattenLayers(l.children, out);
  }
  return out;
}

/** flattenLayer(layer) → that one layer plus its descendants. The single-layer signature inspect.mjs
 *  needs, expressed in terms of the same walk rather than as a second one. */
export const flattenLayer = (l) => flattenLayers([l]);

/**
 * nearestBeats(flat, tSec) → { out, inn }, the id of the beat ENDING closest before `tSec` and the id
 * of the beat STARTING closest at-or-after it (track 0 is background, never the beat itself). Nearest
 * by start/end, not an exact frame match, because a beat rarely starts on the sampled frame. seams.mjs
 * named this `beatsAround`; plan-vs-render.mjs needs the same answer to name the outgoing/incoming
 * layers at the ONE join its transformation-at-the-end check reads, so it moved here rather than
 * growing a second copy.
 */
export function nearestBeats(flat, tSec) {
  const content = flat.filter((l) => (l.track ?? 1) !== 0 && typeof l.start === 'number');
  let out = null, outEnd = -Infinity, inn = null, inStart = Infinity;
  for (const l of content) {
    const end = l.start + (l.duration ?? 0);
    if (end <= tSec + 0.05 && end > outEnd) { outEnd = end; out = l.id; }
    if (l.start >= tSec - 0.05 && l.start < inStart) { inStart = l.start; inn = l.id; }
  }
  return { out: out || '(nothing)', inn: inn || '(nothing)' };
}
