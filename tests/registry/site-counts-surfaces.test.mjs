import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// tests/registry/site-counts-surfaces.test.mjs: quality/gates/site-counts.mjs FILES was widened to
// walk skills/*/reference/*.md and every README.md, the two surfaces a hand-typed registry count
// still went stale on (see AGENTS-facing docs: "24 layer types", "27 gates", "914 named things").
// Kept out of tests/registry/lib-test.registry.test.mjs, which already fails harness/live/code-quality.mjs's
// per-function line and complexity limits before this file touches it: a new assertion belongs in a
// new function, not another line inside one already over both ceilings.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const gate = path.join(repoRoot, 'quality/gates/site-counts.mjs');

test('site-counts FILES reaches skills/*/reference and excludes vendored skills/impeccable', () => {
  const files = spawnSync('node', [gate, '--files'], { encoding: 'utf8', cwd: repoRoot })
    .stdout.split('\n').filter(Boolean);
  assert.ok(files.includes('skills/vawe-continuous-action/reference/output-format.md'));
  assert.ok(!files.some((f) => f.startsWith('skills/impeccable/')));
});

test('site-counts FILES reaches every README.md, at any depth', () => {
  const files = spawnSync('node', [gate, '--files'], { encoding: 'utf8', cwd: repoRoot })
    .stdout.split('\n').filter(Boolean);
  assert.ok(files.includes('core/README.md'));
  assert.ok(files.includes('engine-doctrine/CRAFT/README.md'));
});

test('site-counts catches a stale hand-typed count planted in a skill reference doc', () => {
  const rel = 'skills/vawe-continuous-action/reference/_lib-test-count.md';
  const abs = path.join(repoRoot, rel);
  try {
    fs.writeFileSync(abs, '# probe\n\nThere are 3 layer types.\n');
    const r = spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes(rel), r.stderr);
  } finally {
    fs.rmSync(abs, { force: true });
  }
});

test('site-counts catches a stale hand-typed count planted in a README', () => {
  const rel = 'tests/fixtures/_lib-test-count-dir/README.md';
  const abs = path.join(repoRoot, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  try {
    fs.writeFileSync(abs, '# probe\n\nThe engine ships 3 kinetic presets.\n');
    const r = spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes(rel), r.stderr);
  } finally {
    fs.rmSync(path.dirname(abs), { recursive: true, force: true });
  }
});
