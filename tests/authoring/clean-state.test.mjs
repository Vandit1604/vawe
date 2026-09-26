// tests/authoring/clean-state.test.mjs: harness/dev/clean-state.mjs names the generator that owns a
// tracked file a run left dirty (harness/lib/generated-owners.mjs), and says nothing else about a file
// no generator claims. Run against the real repo tree (a tracked generated file is dirtied, then
// restored; never committed).
//   node tests/authoring/clean-state.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const run = () => execFileSync(process.execPath, [path.join(ROOT, 'harness/dev/clean-state.mjs')], { cwd: ROOT, encoding: 'utf8' });

const clean = run();
assert(/working tree is clean/.test(clean), `expected a clean tree to report clean, got:\n${clean}`);

// A generated file, dirtied without regenerating it: clean-state must name its owner, never run it.
const GENERATED = path.join(ROOT, 'site/lib/arsenal.json');
const original = fs.readFileSync(GENERATED, 'utf8');
fs.writeFileSync(GENERATED, `${original}\n`);

try {
  const out = run();
  assert(/site\/lib\/arsenal\.json/.test(out), `expected the dirtied path to be named, got:\n${out}`);
  assert(/arsenal index/.test(out), `expected the owning generator's label, got:\n${out}`);
  assert(/node scripts\/site\/arsenal-json\.mjs/.test(out), `expected the fix command, got:\n${out}`);
  assert(fs.readFileSync(GENERATED, 'utf8') !== original, 'sanity: the file should still be dirtied (clean-state must never write)');
  console.log('OK: clean-state names the generator that owns a dirtied tracked file');
} finally {
  fs.writeFileSync(GENERATED, original);
}
