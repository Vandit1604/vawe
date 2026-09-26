// tests/dev/trace.test.mjs: harness/dev/trace.mjs parses a transcript into typed spans and scores
// them into a route scorecard (minutes/calls/tokens per step, stills-before-motion, docs routed vs
// direct, arsenal/render/judge/error counts, repeated failing commands, wait time).
//   node --test tests/dev/trace.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseSpans, scorecard } from '../../harness/dev/trace.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = path.join(repoRoot, 'tests/fixtures/trace-sample.jsonl');

test('parseSpans classifies each tool call and pairs it with its result', async () => {
  const spans = await parseSpans(fixture);
  assert.equal(spans.length, 8, 'one span per tool_use/tool_result pair in the fixture');
  assert.equal(spans[0].kind, 'read-doc');
  assert.equal(spans[0].target, 'skill:vawe-scene-authoring');
  assert.equal(spans[1].kind, 'search');
  assert.equal(spans[2].kind, 'render');
  assert.equal(spans[4].kind, 'error', 'the failed ship attempt is an error span, not a render');
});

test('scorecard reports the route-level facts a scorecard.md would', async () => {
  const spans = await parseSpans(fixture);
  const sc = scorecard(spans);

  assert.equal(sc.spanCount, 8);
  assert.equal(sc.stillsBeforeMotion, true, 'LOOKS=1 ran before the first plain render');
  assert.equal(sc.docsRouted, 1, 'the Skill call routes as a doc read');
  assert.equal(sc.docsDirect, 0);
  assert.equal(sc.arsenalSearches, 1);
  assert.equal(sc.renders, 3, 'look + dev + the successful ship');
  assert.equal(sc.judges, 1);
  assert.equal(sc.errorCount, 2, 'two failed ship attempts');
  assert.equal(sc.repeatedFailures.length, 1);
  assert.equal(sc.repeatedFailures[0].n, 2);
  assert.match(sc.repeatedFailures[0].target, /make ship/);
  assert.ok(sc.waitMinutes >= 7, 'the ~7min gap before the third ship attempt counts as waiting');
  assert.ok(sc.byKind.some((r) => r.kind === 'render'));
});
