import { resolveCoords } from '../../core/engine/boot.js';
import { sceneDims, safeArea } from '../../core/layout/safe.js';

/** resolvePx(edge, {aspect, destination}) → {x,y,w,h} top-left px of the edge's box on this canvas. */
export function resolvePx(edge, { aspect = '16:9', destination = 'web' } = {}) {
  const [W, H] = sceneDims({ aspect });
  const safe = safeArea(W, H, destination);
  const L = { pin: edge.placement, w: edge.w, h: edge.h };
  resolveCoords({ layers: [L] }, W, H, safe);
  return { x: L.x, y: L.y, w: edge.w, h: edge.h, W, H };
}
