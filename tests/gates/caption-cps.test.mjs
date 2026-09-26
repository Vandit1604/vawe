// tests/gates/caption-cps.test.mjs: read-check's caption-track reading-speed rule.
// node --test tests/gates/caption-cps.test.mjs
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';
import { readFindings, CPS_WALL } from '../../quality/gates/read-check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const GATE = path.join(ROOT, 'quality/gates/read-check.mjs');
const fixture = path.join(here, '../fixtures/caption-cps.fixture.json');

test('a caption above 20 cps fires caption-cps and prints the measured rate', () => {
  const scene = { duration: 2, layers: [], captions: [{ t0: 0, t1: 1, text: 'this caption alone reads far too fast for anyone to follow' }] };
  const findings = readFindings(scene);
  const f = findings.find((x) => x.code === 'caption-cps');
  assert.ok(f, 'a 60-character line over 1s (60 cps) must fire');
  assert.match(f.msg, new RegExp(`${CPS_WALL} cps`));
  assert.match(f.msg, /58\.0 characters per second/);
});

test('a caption at or under the wall stays silent', () => {
  const scene = { duration: 2, layers: [], captions: [{ t0: 0, t1: 3, text: 'this caption alone reads far too fast for anyone to follow' }] };
  const findings = readFindings(scene);
  assert.deepEqual(findings.filter((x) => x.code === 'caption-cps'), []);
});

test('CLI on the fixture reports the finding and its CLI text names the source', () => {
  const r = spawnSync('node', [GATE, fixture], { cwd: ROOT, encoding: 'utf8' });
  assert.match(r.stdout, /\[caption-cps\]/, r.stdout + r.stderr);
  assert.match(r.stdout, /closedcaptioncreator\.com/);
});
