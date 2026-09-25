// tests/gates/doc-refs.test.mjs: pins the hole this gate used to have, that a cited path existing on
// disk is not the same claim as a fresh clone having it. Two fixture docs, both untracked so `docs()`
// still finds them (it scans `--cached --others --exclude-standard`): one cites a path git tracks, one
// cites a path nothing tracks. Removed in after() whether the run passes or fails, same convention as
// tests/gates/doc-refs.test.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../../quality/gates/doc-refs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURES = path.join(ROOT, 'quality/fixtures');
const written = [];
function write(name, body) {
  const rel = `doc-refs-test-${name}.md`;
  fs.writeFileSync(path.join(FIXTURES, rel), body);
  written.push(rel);
  return `quality/fixtures/${rel}`;
}
after(() => { for (const f of written) { try { fs.unlinkSync(path.join(FIXTURES, f)); } catch { /* already gone */ } } });

test('a doc citing a tracked path passes', () => {
  write('tracked', 'See `quality/gates/doc-refs.mjs` for the gate itself.\n');
  const r = run();
  const hit = r.badPaths.find((b) => b.rel === 'quality/fixtures/doc-refs-test-tracked.md');
  assert.equal(hit, undefined, `a tracked citation must not be reported, got: ${JSON.stringify(hit)}`);
});

test('a doc citing an untracked path fails, naming the doc, the line and the path', () => {
  const rel = write('untracked', 'first line\nSee `films/scene/doc-refs-test-nonexistent.json` for the film.\n');
  const r = run();
  const hit = r.badPaths.find((b) => b.rel === rel);
  assert.ok(hit, `expected a finding for ${rel}, got badPaths: ${JSON.stringify(r.badPaths)}`);
  assert.equal(hit.line, 2, `expected the citation's own line, got ${hit.line}`);
  assert.equal(hit.ref, 'films/scene/doc-refs-test-nonexistent.json');
});

test('a path git ignores on purpose is reported as known-untracked, not a failure', () => {
  const rel = write('known', 'A brand recreation: `themes/stripe.json`.\n');
  const r = run();
  const bad = r.badPaths.find((b) => b.rel === rel);
  assert.equal(bad, undefined, 'a known-untracked path must not fail the gate');
  const known = r.untracked.find((u) => u.rel === rel && u.ref === 'themes/stripe.json');
  assert.ok(known, `expected a known-untracked entry, got: ${JSON.stringify(r.untracked)}`);
});
