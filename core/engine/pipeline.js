// core/engine/pipeline.js: the ONE ordered pass a scene goes through after its transitions[] are
// lowered, on BOTH the Node/gate path (core/engine/expand.js loadScene) and the browser render path
// (core/engine/boot.js resolveThemeAndBake), so a gate checks exactly the scene that renders.
//
// Before this file existed, produceBaseline (core/engine/produce.js) ran AFTER lowerScene in the
// browser but was never called at all on the Node path (engine-doctrine/MISTAKES.md #157: wiring it
// into loadScene used to mask the exact conditions a gate tests). That both hid produceBaseline's
// cut/sceneUnits decisions from every gate AND let a transitions-only scene get a second, undeduped
// cut injected on top of its own (lower.js appends the lowered cuts onto whatever `data.cuts` already
// held). This file is the fix: `runProducePass` runs the SAME steps, in the SAME order, wherever a
// scene is read, needing only `theme`/`frame`/`look`, none of them DOM.
//
// LAYOUT STAYS OUT. `resolveCoords` (core/engine/boot.js) turns %/center/edge/pin into pixels and
// needs a real frame size; it is browser-only and runs AFTER this pass, not before it, on both paths
// now (Node never resolved coordinates either). A cut-style rule that reads layer geometry
// (core/timeline/junctions.js layerBox) degrades gracefully on an unresolved coordinate (returns no
// box, so no overlap is found), it does not throw: this pass runs consistently, at the cost of
// slightly less precise overlap detection for a layer using a relative x/y instead of `pin`.
import { bakeTextSizeRoles, produceBaseline } from './produce.js';
import { resolveFinishLayers } from './finish.js';

/**
 * runProducePass(data, theme, frame, look) -> data, mutated in place. Bakes text size roles, expands
 * `finish` sugar into real layers, then runs the additive produced baseline (inferred cuts, scene-unit
 * transitions, anticipate). Call only after `lowerScene` and `resolveTokenRefs` have already run on
 * `data`, so `data.cuts`/`data.seams` (not raw `data.transitions`) are what this pass sees.
 */
export function runProducePass(data, theme, frame, look) {
  bakeTextSizeRoles(data, look);
  resolveFinishLayers(data, frame.W, frame.H);
  produceBaseline(data, theme, frame, look);
  return data;
}
