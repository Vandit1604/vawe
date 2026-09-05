// scripts/author/llms-txt.test.mjs: the runnable self-check for llms-txt.mjs.
// Regenerates formats/llms.txt in memory and asserts it stays in sync with the live registries, so a
// layer type added to core/layers/index.js and never mentioned here fails a run instead of drifting
// silently, the exact failure this generator exists to end (see llms-txt.mjs's header).
//   node scripts/author/llms-txt.test.mjs   ·   make llms-txt-test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYER_REGISTRY } from '../../core/layers/index.js';
import { buildLlmsTxt, OUT } from './llms-txt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const text = await buildLlmsTxt();

// Every layer type the engine knows must be named, by its own `type` key, not just mentioned in prose.
for (const name of LAYER_REGISTRY.names) {
  assert.match(text, new RegExp('`' + name + '`'), `formats/llms.txt is missing the layer type "${name}"`);
}

// The committed file (what an agent with no repo access actually reads) must be the SAME text this
// script just generated, or the doc has drifted from what a fresh run would produce.
const committed = fs.readFileSync(OUT, 'utf8');
assert.equal(committed, text, 'formats/llms.txt is stale: run `node scripts/author/llms-txt.mjs` and commit the result');

// No em-dash, ever (AGENTS.md hard rule, applies to every file this repo writes, not only scene copy).
// Written as an escape, not the literal character, so this check file itself carries none.
assert.ok(!text.includes('\u2014'), 'formats/llms.txt contains an em-dash (U+2014)');

// Sanity on the live count actually printed, so a hand-edited count cannot silently detach from the count()
const countLine = text.match(/is one of these (\d+) \(pulled live/);
assert.ok(countLine, 'formats/llms.txt lost its live layer-type count line');
assert.equal(Number(countLine[1]), LAYER_REGISTRY.names.length, 'the printed layer-type count does not match the registry');

console.log(`ok - formats/llms.txt: ${LAYER_REGISTRY.names.length} layer types, ${text.split('\n').length} lines, in sync with the registry`);
