// The site's motion-numbers catalog blocks must stay current with the registry they quote. Moved
// out of the old `make lib-test` target (scripts/site/motion-numbers-catalog.mjs --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('scripts/site/motion-numbers-catalog.mjs blocks are current', () => {
  const r = spawnSync('node', [path.join(ROOT, 'scripts/site/motion-numbers-catalog.mjs'), '--check'], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, (r.stderr || r.stdout || '').trim());
});
