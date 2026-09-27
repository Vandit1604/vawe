// tests/docs/recreation-route.test.mjs: follows the docs an agent reads for "recreate the motion of
// this reference clip", starting at AGENTS.md, and proves every path it can reach names the ONE route
// (the starter, then `make next PAGE= REF=`), never `make ship`/`./bin/vawe` as a way to get there.
// Grep-level on purpose (engine-doctrine/CRAFT/ROUTING.md's own routing table is what an agent
// actually reads, not prose about it): the failure this guards was a real one, an agent that read
// AGENTS.md, followed the recreation type skill, never found the starter, and rendered with
// `./bin/vawe` directly when `make ship` refused it.
//   node --test tests/docs/recreation-route.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const STARTER = /make dev-tool X=new TYPE=recreation/;
const NEXT_LOOP = /make next PAGE=/;
const NEGATION = /\b(never|Never|don't|Don't|refuse[sd]?)\b/;

// The chain an agent actually walks: AGENTS.md -> ROUTING.md -> its matched route file -> the type
// skill's reference page -> the doctrine page those two point at for the raw-page loop.
const RECREATION_DOCS = [
  'AGENTS.md',
  'engine-doctrine/CRAFT/ROUTING.md',
  'engine-doctrine/CRAFT/routes/recreation.md',
  'skills/vawe-type/reference/recreation.md',
  'engine-doctrine/CRAFT/RECREATION.md',
];

// Docs that route TO the recreation type but never author it (no starter/loop expected there); they
// still must never point at make ship/bin/vawe as this type's own render path.
const NO_ROUTE_DOCS = ['engine-doctrine/CRAFT/ROUTING.md', 'engine-doctrine/CRAFT/routes/recreation.md'];

const DIRECT_RENDER = /(make ship|\.\/bin\/vawe|\bbin\/vawe\b)/g;

test('AGENTS.md names the starter and the make-next loop for a raw-page recreation', () => {
  const body = read('AGENTS.md');
  assert.match(body, STARTER, 'AGENTS.md must name the recreation starter');
  assert.match(body, NEXT_LOOP, 'AGENTS.md must name the make next PAGE= loop');
});

test('the type skill reference and RECREATION.md both name the starter and the loop', () => {
  for (const rel of ['skills/vawe-type/reference/recreation.md', 'engine-doctrine/CRAFT/RECREATION.md']) {
    const body = read(rel);
    assert.match(body, STARTER, `${rel} must name the recreation starter`);
    assert.match(body, NEXT_LOOP, `${rel} must name the make next PAGE= loop`);
  }
});

test('no recreation doc in the chain offers make ship / bin/vawe as the route', () => {
  // AGENTS.md documents `make ship` as stage 6 of the GENERAL scene-JSON pipeline (every non-recreation
  // film uses it); only its own recreation paragraph is checked here, not the whole seven-stage table.
  const agentsRecreation = read('AGENTS.md').split('\n\n').find((p) => /Recreating a reference/.test(p));
  assert.ok(agentsRecreation, 'AGENTS.md must carry a recreation paragraph to check');
  const docs = { ...Object.fromEntries(RECREATION_DOCS.filter((r) => r !== 'AGENTS.md').map((r) => [r, read(r)])),
    'AGENTS.md (recreation paragraph)': agentsRecreation };
  for (const [rel, body] of Object.entries(docs)) {
    const lines = body.split('\n');
    for (const line of lines) {
      const hits = line.match(DIRECT_RENDER);
      if (!hits) continue;
      assert.match(line, NEGATION,
        `${rel}: "${line.trim()}" mentions a direct render with no refusal/negation nearby`);
    }
  }
});

test('the pure routing docs (no authoring) never mention make ship / bin/vawe at all', () => {
  for (const rel of NO_ROUTE_DOCS) {
    const body = read(rel);
    assert.doesNotMatch(body, DIRECT_RENDER, `${rel} should not mention make ship or bin/vawe`);
  }
});

test('the recreation starter script itself never suggests make ship / bin/vawe', () => {
  const body = read('harness/dev/recreation-new.mjs');
  assert.doesNotMatch(body, DIRECT_RENDER, 'the starter must point only at make next, never a direct render');
  assert.match(body, /make next PAGE=/, 'the starter must print the make next follow-up command');
});
