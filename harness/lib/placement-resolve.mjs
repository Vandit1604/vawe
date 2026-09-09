// placement-resolve.mjs: turn a contract edge ({placement,w,h}) into real px, by calling the ENGINE'S
// OWN resolveCoords (core/engine/boot.js), never a second copy of its keyword math. resolveCoords is
// pure JS with no DOM touched at call time (only at module scope of sibling files it imports, none of
// which run anything on import), so it loads and runs fine under plain node.
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
