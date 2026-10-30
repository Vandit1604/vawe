import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lastCommitDate } from '../../scripts/site/last-commit.mjs';

test('the date comes from the repo that holds the file, not the caller repo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lastcommit-'));
  const day = '2024-03-05T10:00:00Z';
  const run = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, env: { ...process.env, GIT_COMMITTER_DATE: day, GIT_AUTHOR_DATE: day } });
  run('init', '-q');
  fs.writeFileSync(path.join(dir, 'a.mdx'), 'x');
  run('add', 'a.mdx');
  run('commit', '-q', '-m', 'a');
  assert.equal(lastCommitDate(path.join(dir, 'a.mdx')), '2024-03-05');
  assert.equal(lastCommitDate(path.join(dir, 'missing.mdx')), null);
});
