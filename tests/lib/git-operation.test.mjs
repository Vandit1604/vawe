import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { operationInProgress } from '../../harness/lib/git-operation.mjs';

const gitDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'git-op-'));

test('operationInProgress: a rebase or merge is named with its continue and abort commands', () => {
  assert.equal(operationInProgress(gitDir()), '');
  for (const [marker, verb] of [['rebase-merge', 'rebase'], ['rebase-apply', 'rebase'], ['MERGE_HEAD', 'merge']]) {
    const dir = gitDir();
    fs.mkdirSync(path.join(dir, marker));
    assert.match(operationInProgress(dir), new RegExp(`a ${verb} is in progress.*git ${verb} --continue.*git ${verb} --abort`));
  }
});

test('pre-push.mjs refuses to run its checks while a rebase is in progress', () => {
  const git = spawnSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8' }).stdout.trim();
  const marker = path.join(path.resolve(git), 'rebase-merge');
  fs.mkdirSync(marker);
  try {
    const r = spawnSync(process.execPath, ['harness/dev/pre-push.mjs', '--files', 'README.md'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /git rebase --continue.*git rebase --abort/);
  } finally {
    fs.rmdirSync(marker);
  }
});
