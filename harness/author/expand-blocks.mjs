// harness/author/expand-blocks.mjs: `{type:"block"}` and `{type:"comp"}` sugar expands at LOAD time
// (core/engine/expand.js `expandScene`, called from core/transitions/lower.js `loadScene`), so
// `./bin/vawe scene.json` and every gate already read the one file an author wrote. `{type:"beat"}`
// is retired: `expandScene` now refuses it (`expandBeat` throws), pointing the author at `recipes/`
// instead. Run stand-alone, this script exists only so an author can eyeball what a block/comp
// resolves to: it prints the expanded JSON to stdout and nothing else.
//
// It is ALSO the render path's own expander: internal/render/expand.go shells out to this exact
// command whenever a scene needs Node-side work before the browser sees it (block/comp sugar, or now
// a `voice` cue), and writes stdout to a scratch file it renders instead of the original. A `voice`
// cue is baked here too, not in the browser (assets/sfx/ is Node-only reachable) and not in Go (one
// synthesiser, core/audio/kit.mjs; a second was retired, engine-doctrine/MISTAKES.md #492): every
// `{voice, params}` cue becomes an ordinary `{name}` cue backed by a cached .wav before this prints.
//
// Usage: node harness/author/expand-blocks.mjs <scene.json> [aspectKey]   (make expand D=<scene.json>)
// aspectKey (optional, e.g. "9:16") is the render's resolved --aspect: internal/render/expand.go passes
// its own o.Aspect here so a cameraMove bake and a flow-seam's travel resolve against the canvas the Go
// render actually targets. Omitted (or "") keeps the scene's own declared aspect, same as `make expand`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandScene } from '../../core/engine/expand.js';
import { bakeVoiceCues } from '../../generators/media/voice-cue.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const inp = process.argv[2];
if (!inp) { console.error('usage: node harness/author/expand-blocks.mjs <scene.json> [aspectKey]'); process.exit(2); }
const aspectKey = process.argv[3] || '';
const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
const out = expandScene(d, aspectKey);
bakeVoiceCues(out, path.join(root, 'assets/sfx'));
console.log(JSON.stringify(out, null, 2));
