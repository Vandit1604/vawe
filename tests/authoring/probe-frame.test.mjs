// harness/dev/probe-frame.test.mjs: hermetic fixture for `make probe-frame`.
// node harness/dev/probe-frame.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, '../fixtures/probe-frame.fixture.json');
const script = path.join(here, '../../harness/dev/probe-frame.mjs');

// tempo: 0.5 in the fixture → pageTime = viewerT * tempo. --t 4 (viewer seconds) should land the page
// (authored) clock at 2s and frame 60 at the tool's fixed 30fps boot.
const out = execFileSync('node', [script, fixture, '--t', '4', '--id', 'back,front,aside-child', '--json'], { encoding: 'utf8' });
const r = JSON.parse(out);

assert.equal(r.tempo, 0.5);
assert.ok(Math.abs(r.pageT - 2) < 1e-9, `pageT should be viewerT*tempo = 2, got ${r.pageT}`);
assert.equal(r.frame, 60, `frame should be pageT*fps = 2*30 = 60, got ${r.frame}`);

// "front" is drawn after "back" in layers[] and both are full-frame: front covers back everywhere.
const back = r.samples.back;
assert.equal(back.liveAtT, true);
for (const c of back.dom.covers) {
  assert.equal(c.coveredBy, 'front (drawn later in layers[])', `back's ${c.at} should read covered by front`);
}

// "front" is the topmost full-frame layer: nothing covers it.
const front = r.samples.front;
for (const c of front.dom.covers) {
  assert.equal(c.note, 'nothing above it', `front's ${c.at} should be uncovered`);
}

// a group child at depth resolves by its own id, not its group's.
const child = r.samples['aside-child'];
assert.equal(child.authored.type, 'rect');
assert.ok(child.dom, 'group child should be found in the DOM by data-id');

console.log('probe-frame.test.mjs: ok');
