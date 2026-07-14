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

const REGISTRY = { text, count, image, group, rect, glow, cursor, clip, html, component, board, doc, shader, lottie };

export function createRenderer(ctx) {
  const kit = createKit(ctx);
  return {
    kit,
    // construct a layer's DOM (default primitive = text; count reuses the text build)
    build(el, L) { (REGISTRY[L.type] || text).build(kit, el, L); },
    // per-TYPE frame update (typing/count/cursor/clip/ken). Cross-cutting effects (cut, kinetic units,
    // motion track) stay in scene.html's loop; those compose around this call.
    frame(el, L, t) { const m = REGISTRY[L.type] || text; if (m.frame) m.frame(kit, el, L, t); },
  };
}
