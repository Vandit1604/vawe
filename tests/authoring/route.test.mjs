// harness/author/route.test.mjs: does route() send a real request to the deliverable a human would
// pick? Each case is drawn from AGENTS.md's own ambiguity examples or engine-doctrine/CRAFT/ROUTING.md's table,
// so a change here means the table drifted, not that the test is wrong.
//   node harness/author/route.test.mjs
import assert from 'node:assert/strict';
import { route } from '../../harness/author/route.mjs';

const cases = [
  ['market our launch from hinge.co', 'launch-video'],
  ['explain how RAG works', 'explainer'],
  ['a 6 second logo sting', 'motion-graphic'],
  ['recreate this ad', 'recreation'],
  ['show me this effect works, quick test render', 'demo'],
];

for (const [request, expected] of cases) {
  const matched = route(request);
  assert.equal(matched.name, expected, `"${request}" should route to ${expected}, got ${matched.name}`);
}

console.log(`✓ route.test.mjs: ${cases.length} requests routed to the expected deliverable`);
