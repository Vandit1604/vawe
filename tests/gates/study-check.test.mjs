// tests/gates/study-check.test.mjs: a checkout with no refs/<name>/ (gitignored, never fetched by
// `make study` here) must not let study-check read that ABSENCE as "incomplete" and downgrade a
// grammar someone already marked complete. One case: complete + missing pages stays complete on disk,
// and the command reports cannot-verify rather than a verdict.
//   node tests/gates/study-check.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAME = '_selftest-study-check-missing-pages';
const grammarFile = path.join(ROOT, 'grammar', `${NAME}.json`);
const refDir = path.join(ROOT, 'refs', NAME);

assert.ok(!fs.existsSync(refDir), `fixture collision: refs/${NAME} already exists, pick a different NAME`);

const before = JSON.stringify({
  coverage: { frames: 10, unique: 8, pages: 2, ledger: 'complete' },
  shots: [{ i: 0, onScreen: 'x', moves: 'y', trigger: 'z' }],
}, null, 1) + '\n';

try {
  fs.writeFileSync(grammarFile, before);
  let status = 0, stdout = '';
  try {
    stdout = execFileSync('node', ['quality/gates/study-check.mjs', NAME], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    status = e.status;
    stdout = e.stdout || '';
  }
  assert.equal(status, 2, 'no pages on disk must exit non-zero, not 0 (silently fine) and not 1 (a real verdict)');
  assert.match(stdout, /cannot verify/i, 'must say it could not verify, not report a pass/fail verdict');
  const after = fs.readFileSync(grammarFile, 'utf8');
  assert.equal(after, before, 'a grammar already marked complete must be left byte-identical when there is nothing to check it against');
} finally {
  fs.rmSync(grammarFile, { force: true });
  fs.rmSync(refDir, { recursive: true, force: true });
}

console.log('✓ study-check.test.mjs: complete grammar + missing pages stays complete on disk, reports cannot-verify');
