// core/validate/camera.mjs: `cameraMove` params are picky per move (`orbit` wants `deg`, not
// `degrees`; `slowPush`/`punchIn` want `dur`, not `duration`; `travel` wants `stations`, not `dolly`),
// and until now the check for that lived only in core/camera-moves/index.js buildCameraMove, reached
// the first time the scene actually RENDERED. A typo'd param is a real error, correctly named, just
// three renders late. Same check, same message, run here at `make validate` time instead of waiting
// for boot() to call buildCameraMove for real.
//
// `target`/`cursor`/`beats` are consumed by core/engine/produce.js's own resolution pass BEFORE
// buildCameraMove ever sees the spec (resolveTargetSpecs, bindCursorCamera, and the `beats` strip in
// bakeCameraMove), so they are never unknown params here even though buildCameraMove's own signature
// scan does not know about them.
import { isObj, nearest } from './util.mjs';
import { cameraMoveParams } from '../camera-moves/index.js';
import { resolveCameraMove } from '../registry/vocab.js';

const RESOLVED_ELSEWHERE = new Set(['target', 'cursor', 'beats', 'canvasW', 'canvasH']);

export function cameraMoveErrors(cfg) {
  const out = [];
  if (!cfg || cfg.cameraMove == null) return out;
  const specs = Array.isArray(cfg.cameraMove) ? cfg.cameraMove : [cfg.cameraMove];
  specs.forEach((spec, i) => {
    const at = `cameraMove${specs.length > 1 ? `[${i}]` : ''}`;
    if (!isObj(spec)) { out.push(`${at} must be an object`); return; }
    if (!spec.move) { out.push(`${at} needs a "move" name`); return; }
    let move;
    try { move = resolveCameraMove(spec.move); } catch (e) { out.push(`${at}: ${e.message}`); return; }
    const known = cameraMoveParams(move);
    if (!known) return; // not a plain destructured (params) => keyframes generator; nothing to check
    for (const k of Object.keys(spec)) {
      if (k === 'move' || RESOLVED_ELSEWHERE.has(k) || known.has(k)) continue;
      out.push(`${at} "${move}" does not read "${k}".${nearest(k, [...known])} It accepts: ${[...known].join(', ')}.`);
    }
  });
  return out;
}
