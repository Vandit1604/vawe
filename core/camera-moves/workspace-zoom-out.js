import { span } from './units.js';

// workspaceZoomOut: start pushed IN on a detail, then pull back to reveal the whole workspace (the
// opposite of diveIn). Ends on a slow settle.
export function workspaceZoomOut({ start = 0, dur = 3, from = 1.4, to = 1, tx, ty, canvasW = 1920,
  canvasH = 1080, ease = 'easeOutCubic' } = {}) {
  span('workspaceZoomOut', 'dur', dur);
  const fx = tx != null ? canvasW / 2 - tx : 0, fy = ty != null ? canvasH / 2 - ty : 0;
  return [{ t: start, s: from, x: fx, y: fy }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}
