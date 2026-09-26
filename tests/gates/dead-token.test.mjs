// tests/gates/dead-token.test.mjs: the designspec-check token lock catches a var(--x) nothing defines.
// node --test tests/gates/dead-token.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const GATE = path.join(ROOT, 'quality/gates/designspec-check.mjs');
const fixture = path.join(here, '../fixtures/dead-token.fixture.json');
const run = (args) => spawnSync('node', [GATE, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });

test('var(--text2), which the theme never defines, fires dead-token and names var(--text-2)', () => {
  const r = run([fixture]);
  assert.match(r.stdout, /\[dead-token\]/, r.stdout + r.stderr);
  assert.match(r.stdout, /var\(--text2\)/);
  assert.match(r.stdout, /Did you mean var\(--text-2\)/);
});

test('the same layer, waived with authoring.allow, is silent', () => {
  const data = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  data.authoring = { allow: ['dead-token'], _why: { 'dead-token': 'kept for the fixture' } };
  const waived = fixture.replace('.json', '.waived.json');
  fs.writeFileSync(waived, JSON.stringify(data, null, 1));
  try {
    const r = run([waived]);
    assert.doesNotMatch(r.stdout, /\[dead-token\]/, r.stdout + r.stderr);
  } finally {
    fs.rmSync(waived, { force: true });
  }
});
