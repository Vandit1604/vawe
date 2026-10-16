import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ensureHooks, gitAt, HOOKS_DIR } from '../../harness/lib/git-hooks.mjs';

const freshRepo = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
};
const hooksPath = (dir) => execFileSync('git', ['config', '--get', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' }).trim();

test('a fresh clone gets the repo hooks and one line that says so', () => {
  const dir = freshRepo();
  assert.match(ensureHooks(gitAt(dir)), /git hooks on/);
  assert.equal(hooksPath(dir), HOOKS_DIR);
  assert.equal(ensureHooks(gitAt(dir)), '');
});

test('a hooksPath someone set is kept', () => {
  const dir = freshRepo();
  execFileSync('git', ['config', 'core.hooksPath', '.husky'], { cwd: dir });
  assert.equal(ensureHooks(gitAt(dir)), '');
  assert.equal(hooksPath(dir), '.husky');
});

test('outside a git checkout nothing is set and nothing throws', () => {
  const git = (args) => {
    if (args[1] === '--get') throw Object.assign(new Error('unset'), { status: 1 });
    throw Object.assign(new Error('not a git repository'), { status: 128 });
  };
  assert.equal(ensureHooks(git), '');
});
