// Every Makefile target must carry a `## [phase]` tag, or `make list` silently drops it and nobody
// notices. Moved out of the old `make lib-test` target (harness/lib/make-help.mjs --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('every Makefile target carries a [phase] tag', () => {
  const r = spawnSync('node', [path.join(ROOT, 'harness/lib/make-help.mjs'), '--check'], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, (r.stderr || r.stdout || '').trim());
});
