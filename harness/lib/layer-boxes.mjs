import { resolveCoords } from '../../core/engine/boot.js';
import { sceneDims } from '../../core/layout/safe.js';
import { flattenLayers } from './layers.mjs';

/**
 * layerBoxes(data) → [{ type, start, end, box }] for every layer, `data` already through `loadScene`.
 * `box` is `{x,y,w,h}` in canvas px, or null when the layer declares no usable extent (no `x`/`y`, or a
 * text layer with neither `w` nor `size` to estimate one): a real blind spot, not a guess papered over:
 * a layer this can't box is a layer neither seam-forensics check can look inside, only pass over quietly.
 * `start`/`end` are null the same way when `start`/`duration` aren't plain numbers (a relative or
 * word-valued window; the checks that need a number skip the layer rather than mis-time it).
 */
export function layerBoxes(data) {
  const [W, H] = sceneDims(data, data.aspect);
  const clone = structuredClone(data);
  resolveCoords(clone, W, H);
  return flattenLayers(clone.layers).map((l, i) => {
    const start = typeof l.start === 'number' ? l.start : null;
    const duration = typeof l.duration === 'number' ? l.duration : null;
    const end = (start != null && duration != null) ? start + duration : null;
    let h = typeof l.h === 'number' ? l.h : null;
    if (h == null && l.type === 'text' && typeof l.size === 'number') h = Math.round(l.size * 1.2);
    const box = (typeof l.x === 'number' && typeof l.y === 'number' && typeof l.w === 'number' && h != null)
      ? { x: l.x, y: l.y, w: l.w, h } : null;
    const label = l.text ? String(l.text).slice(0, 30) : `${l.type}#${i}`;
    return { i, type: l.type, label, start, end, box };
  });
}

export { sceneDims };
