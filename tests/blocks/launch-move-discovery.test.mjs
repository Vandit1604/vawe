// tests/blocks/launch-move-discovery.test.mjs: a plain-English query for each of the five
// launch-move devices (3D-tilt, cursor demo, masked reveal, camera push-in) must resolve
// CONFIDENTLY to the mechanism that already does it (engine-doctrine/CRAFT/ROUTING.md,
// no invented second way to say the same thing). "cut on the beat" is covered by
// `make beatsync` (a workflow tool, not a searchable primitive) so it is not in this fixture.
//
//   node tests/blocks/launch-move-discovery.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect, rankQuery } from '../../harness/author/arsenal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const queries = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/launch-move-queries.json'), 'utf8'));

test('every launch-move query resolves confidently to its owning mechanism', async () => {
  const all = await collect();
  for (const { q, name } of queries) {
    const { answers } = rankQuery(all, q);
    const hit = answers.find((m) => m.name === name);
    assert.ok(hit, `"${q}" did not confidently answer "${name}" (answers: ${answers.map((a) => a.name).join(', ') || 'none'})`);
  }
});
