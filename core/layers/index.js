// core/layers/index.js — the layer registry. Each primitive is a file exporting build(kit,el,L) and
// optionally frame(kit,el,L,t). `createRenderer(ctx)` binds the shared kit and dispatches by L.type, so
// scene.html stays a thin orchestrator (bg/camera/stings/timing) and adding a primitive = adding a file.
import { createKit } from './util.js';
import * as text from './text.js';
import * as count from './count.js';
import * as image from './image.js';
import * as group from './group.js';
import * as rect from './rect.js';
import * as glow from './glow.js';
import * as cursor from './cursor.js';
import * as clip from './clip.js';
import * as html from './html.js';
import * as component from './component.js';
import * as board from './board.js';
import * as doc from './doc.js';
import * as shader from './shader.js';
import * as lottie from './lottie.js';
import * as paint from './paint.js';

const REGISTRY = { text, count, image, group, rect, glow, cursor, clip, html, component, board, doc, shader, lottie, paint };

// Exported so gates DERIVE the layer vocabulary instead of restating it. `make coverage` kept its own
// hand-typed list and silently reported 14/14 while a 15th type existed — the same failure as the
// schema advertising an anim that never existed (docs/MISTAKES.md #21, #65).
export const LAYER_TYPES = Object.keys(REGISTRY);

export function createRenderer(ctx) {
  const kit = createKit(ctx);
  // Injected AFTER the kit exists (util.js cannot import this file — that would be circular). This is
  // what lets a group child run the same builder as a top-level layer instead of a re-implemented
  // subset of it (docs/MISTAKES.md #70).
  kit.buildLeaf = (el, L) => (REGISTRY[L.type] || text).build(kit, el, L);
  return {
    kit,
    // construct a layer's DOM (default primitive = text; count reuses the text build)
    build(el, L) { (REGISTRY[L.type] || text).build(kit, el, L); },
    // per-TYPE frame update (typing/count/cursor/clip/ken). Cross-cutting effects (cut, kinetic units,
    // motion track) stay in scene.html's loop; those compose around this call.
    frame(el, L, t) { const m = REGISTRY[L.type] || text; if (m.frame) m.frame(kit, el, L, t); },
  };
}
