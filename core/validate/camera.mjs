// core/validate/camera.mjs: `cameraMove` params are picky per move (`orbit` wants `deg`, not
// `degrees`; `slowPush`/`punchIn` want `dur`, not `duration`; `travel` wants `stations`, not `dolly`),
// and until now the check for that lived only in core/camera-moves/index.js buildCameraMove, reached
// the first time the scene actually RENDERED. A typo'd param is a real error, correctly named, just
// three renders late. Same check, same message, run here at `make check GATE=validate` time instead of waiting
// for boot() to call buildCameraMove for real.
//
// `target`/`cursor`/`beats` are consumed by core/engine/produce.js's own resolution pass BEFORE
// buildCameraMove ever sees the spec (resolveTargetSpecs, bindCursorCamera, and the `beats` strip in
// bakeCameraMove), so they are never unknown params here even though buildCameraMove's own signature
// scan does not know about them.
import { isObj, nearest } from './util.mjs';
import { cameraMoveParams, buildCameraMove } from '../camera-moves/index.js';
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

// effective duration: explicit, else the last layer's end (+0.4 tail). Mirrors seamErrors
// (core/validate/junctions.mjs), the one other place this same estimate is needed.
function effectiveDuration(cfg) {
  let dur = typeof cfg.duration === 'number' ? cfg.duration : 0;
  if (!dur) for (const L of cfg.layers || []) {
    if (isObj(L) && typeof L.start !== 'string') dur = Math.max(dur, (L.start ?? 0) + (L.duration ?? 2));
  }
  return dur ? +(dur + (typeof cfg.duration === 'number' ? 0 : 0.4)).toFixed(2) : null;
}

// cameraTiltLeakErrors(cfg): core/timeline/sequence.js cameraAt HOLDS THE LAST FRAME PAST THE END, on
// purpose, and it is the right default for a camera's POSITION (a push should stay pushed in). An
// ANGLE is the one case that reads as a bug instead: `orbit`'s own last keyframe leaves `ry` non-zero,
// and every layer rendered after it inherits that tilt silently, film-wide, however far past the
// move's own start/dur that is (engine friction: a 3D `orbit` skewed unrelated HTML blocks and tripped
// an unrelated ancestor-kills error 24s later; the tilt, not that layer, was the actual cause). Named
// here so the author hears it before the render, not by tracing a symptom back through the timeline.
//
// Best-effort: only checked when every leg is a plain (params) => keyframes move with no `target`/
// `cursor` sugar left to resolve (those need core/engine/produce.js's own pass, which this file does
// not run); anything else is silently skipped rather than guessed at.
export function cameraTiltLeakErrors(cfg) {
  const out = [];
  if (!cfg) return out;
  let allKf = null;
  if (Array.isArray(cfg.camera) && cfg.camera.length) {
    allKf = cfg.camera.slice().sort((a, b) => (+a.t || 0) - (+b.t || 0));
  } else if (cfg.cameraMove != null) {
    const specs = Array.isArray(cfg.cameraMove) ? cfg.cameraMove : [cfg.cameraMove];
    const built = [];
    for (const spec of specs) {
      if (!isObj(spec) || !spec.move) return out; // cameraMoveErrors already names this problem
      try { built.push({ kf: buildCameraMove({ ...spec, move: resolveCameraMove(spec.move) }) }); }
      catch { return out; } // unresolved target/cursor sugar, or a param error cameraMoveErrors already names
    }
    built.sort((a, b) => (a.kf[0]?.t ?? 0) - (b.kf[0]?.t ?? 0));
    allKf = built.flatMap((b) => b.kf);
  }
  if (!allKf || !allKf.length) return out;
  const last = allKf[allKf.length - 1];
  const tilted = ['rx', 'ry', 'roll'].filter((k) => Math.abs(last[k] || 0) > 1e-3);
  if (!tilted.length) return out;
  const dur = effectiveDuration(cfg);
  if (dur == null || last.t >= dur - 0.05) return out; // the tilt IS the last shot; nothing after it to skew
  out.push(`the camera's last keyframe (t=${last.t}s) leaves ${tilted.map((k) => `${k}=${(+last[k]).toFixed(1)}deg`).join(', ')} `
    + `tilted, and this holds for the rest of the film (to ${dur}s, core/timeline/sequence.js cameraAt): `
    + `every layer rendered after t=${last.t}s inherits the tilt, not only the ones inside this move's own `
    + `window. Add a keyframe or another cameraMove leg that returns ${tilted.join('/')} to 0 before the `
    + `film ends, or, if the tilt is the intended final frame, ignore this.`);
  return out;
}
