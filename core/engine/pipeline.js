// core/engine/pipeline.js: the ONE ordered fill pass a scene goes through after its transitions[] are
// lowered, on BOTH the Node/gate path (core/engine/expand.js loadScene) and the browser render path
// (core/engine/boot.js resolveThemeAndBake), so a gate checks exactly the scene that renders.
//
// Before this file existed, core/engine/produce.js ran AFTER lowerScene in the browser but was never
// called at all on the Node path, so a gate could approve a scene the renderer read differently. This
// file is the fix: `runProducePass` runs the SAME steps, in the SAME order, wherever a scene is read.
//
// FILLS ONLY, NEVER STRUCTURE. bakeTextSizeRoles/resolveFinishLayers/produceBaseline each fill a value
// the author left blank (a text layer's size role, the default grade, an authored cameraMove's real
// keyframes); none of them invent a cut, a boundary or a motion the author did not write.
//
// LAYOUT STAYS OUT. `resolveCoords` (core/engine/boot.js) turns %/center/edge/pin into pixels and
// needs a real frame size; it is browser-only and runs AFTER this pass, not before it, on both paths
// now (Node never resolved coordinates either).
import { bakeTextSizeRoles, produceBaseline } from './produce.js';
import { resolveFinishLayers } from './finish.js';

/**
 * runProducePass(data, theme, frame, look) -> data, mutated in place. Bakes text size roles, fills the
 * default finish grade, then bakes any authored `cameraMove` into real keyframes. Call only after
 * `lowerScene` and `resolveTokenRefs` have already run on `data`.
 */
export function runProducePass(data, theme, frame, look) {
  bakeTextSizeRoles(data, look);
  resolveFinishLayers(data, frame.W, frame.H);
  produceBaseline(data, theme, frame, look);
  return data;
}
