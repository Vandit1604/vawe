// harness/dev/clean-state.mjs: after a run, is the working tree clean, and if it is not, which
// generator made it so? `make regen` then `make e2e` should leave nothing to commit; when it does not,
// this names the ONE command that fixes each dirty path instead of a person re-deriving it from a
// diff. Reads harness/lib/generated-owners.mjs, the same table quality/gates/generated-check.mjs runs
// off, so there is one place a path's owner is declared, not two.
//
// Advisory only: it never fails and is wired as a closing note on `make e2e`, not a gate (see the
// Makefile). A run legitimately touches quality/runs/e2e/ and out/ (already gitignored) and this is
// about tracked files a person did not mean to change.
//
//   node harness/dev/clean-state.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../lib/generated-owners.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const porcelain = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout || '';
const dirty = porcelain.split('\n').map((l) => l.slice(3).trim()).filter(Boolean);

if (!dirty.length) {
  console.log('clean-state: ✓ working tree is clean');
  process.exit(0);
}

const ownerOf = (file) => GENERATORS.find(([, , paths]) => paths.some((owned) =>
  file === owned || file.startsWith(owned.endsWith('/') ? owned : `${owned}/`))) || null;

const claimed = new Map();   // label -> { cmd, files }
const unclaimed = [];
for (const file of dirty) {
  const hit = ownerOf(file);
  if (!hit) { unclaimed.push(file); continue; }
  const [label, argv] = hit;
  if (!claimed.has(label)) claimed.set(label, { cmd: `node ${argv.join(' ')}`, files: [] });
  claimed.get(label).files.push(file);
}

console.log(`clean-state: ✗ ${dirty.length} tracked file(s) changed`);
for (const [label, { cmd, files }] of claimed) {
  const shown = files.length > 3 ? `${files.slice(0, 3).join(' ')} …(${files.length})` : files.join(' ');
  console.log(`  ~ ${label}: ${shown}`);
  console.log(`    fix: ${cmd}`);
}
if (unclaimed.length) {
  const shown = unclaimed.length > 5 ? `${unclaimed.slice(0, 5).join(' ')} …(${unclaimed.length})` : unclaimed.join(' ');
  console.log(`  ~ not owned by a known generator: ${shown}`);
}
