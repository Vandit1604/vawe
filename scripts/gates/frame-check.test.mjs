// node --test scripts/gates/frame-check.test.mjs
//
// The arithmetic first, then the gate against a real film. The arithmetic case is not decoration: this
// repo deleted a gate for squaring a 590x18 rule into 590x590 and crediting a hairline with a tenth of
// the frame, and every measurement here is one careless line away from the same bug.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const GATE = join(here, 'frame-check.mjs');
const run = (args) => spawnSync('node', [GATE, ...args], { cwd: ROOT, encoding: 'utf8' });

test('area is width times height, and a hairline stays a hairline', () => {
  const r = run(['--self-test']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('vawe-oblique passes: its peak is declared AND measured', () => {
  const r = run(['formats/scene/vawe-oblique.json']);
  assert.equal(r.status, 0, r.stdout);
  // The report is the evidence. A pass with no measured beats would be vacuously green.
  assert.match(r.stdout, /peak\s+Get/);
  assert.match(r.stdout, /every frame matches what its beat planned/);
});

test('the peak leads by a margin a viewer does not have to measure', () => {
  const rows = [...run(['formats/scene/vawe-oblique.json']).stdout.matchAll(/^\s*(\w+)\s+(\S+)\s+([\d.]+)% of frame/gm)]
    .map((m) => ({ weight: m[1], name: m[2], share: +m[3] }));
  assert.ok(rows.length >= 5, 'the gate measured almost nothing, so it proved almost nothing');
  const peak = rows.find((r) => r.weight === 'peak');
  const next = rows.filter((r) => r !== peak).reduce((m, r) => (r.share > m.share ? r : m), { share: 0 });
  assert.ok(peak, 'the film declares a peak');
  assert.ok(peak.share / next.share >= 1.25,
    `peak ${peak.share}% vs next ${next.share}%: a peak a viewer has to measure is not a peak`);
});
