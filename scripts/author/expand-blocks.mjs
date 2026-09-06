// scripts/author/expand-blocks.mjs: DEBUGGING command only. `{type:"block"}`, `{type:"beat"}` and
// `{type:"comp"}` sugar now expands at LOAD time (core/engine/expand.js `expandScene`, called from
// core/transitions/lower.js `loadScene`), so `./bin/vawe scene.json` and every gate already read the
// one file an author wrote. This script exists only so an author can eyeball what a beat/block resolves
// to: it prints the expanded JSON to stdout and nothing else.
//
// Usage: node scripts/author/expand-blocks.mjs <scene.json>   (make expand D=<scene.json>)
import fs from 'node:fs';
import { expandScene } from '../../core/engine/expand.js';

const inp = process.argv[2];
if (!inp) { console.error('usage: node scripts/author/expand-blocks.mjs <scene.json>'); process.exit(2); }
const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
console.log(JSON.stringify(expandScene(d), null, 2));
