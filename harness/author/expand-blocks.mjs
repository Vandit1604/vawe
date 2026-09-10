// harness/author/expand-blocks.mjs: DEBUGGING command only. `{type:"block"}` and `{type:"comp"}` sugar
// expands at LOAD time (core/engine/expand.js `expandScene`, called from core/transitions/lower.js
// `loadScene`), so `./bin/vawe scene.json` and every gate already read the one file an author wrote.
// `{type:"beat"}` is retired: `expandScene` now refuses it (`expandBeat` throws), pointing the author
// at `recipes/` instead. This script exists only so an author can eyeball what a block/comp resolves
// to: it prints the expanded JSON to stdout and nothing else.
//
// Usage: node harness/author/expand-blocks.mjs <scene.json> [aspectKey]   (make expand D=<scene.json>)
// aspectKey (optional, e.g. "9:16") is the render's resolved --aspect: internal/render/expand.go passes
// its own o.Aspect here so a cameraMove bake and a flow-seam's travel resolve against the canvas the Go
// render actually targets. Omitted (or "") keeps the scene's own declared aspect, same as `make expand`.
import fs from 'node:fs';
import { expandScene } from '../../core/engine/expand.js';

const inp = process.argv[2];
if (!inp) { console.error('usage: node harness/author/expand-blocks.mjs <scene.json> [aspectKey]'); process.exit(2); }
const aspectKey = process.argv[3] || '';
const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
console.log(JSON.stringify(expandScene(d, aspectKey), null, 2));
