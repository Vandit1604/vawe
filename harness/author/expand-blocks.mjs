// synthesiser, core/audio/kit.mjs; a second was retired, engine-doctrine/MISTAKES.md #492): every
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
