import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { commitsBehind, fetchDue, staleLine, staleCheckoutLine } from '../../harness/lib/stale-checkout.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

test('staleLine is empty when level and names the count and one command when behind', () => {
  assert.equal(staleLine(0, false), '');
  assert.match(staleLine(1, false), /1 commit behind origin\/main.*git rebase origin\/main/);
  assert.match(staleLine(4, false), /4 commits behind/);
  assert.match(staleLine(4, true), /commit or stash the tracked edits, then run git rebase origin\/main/);
});

test('fetchDue allows one fetch per 10 minutes', () => {
  assert.equal(fetchDue(0, 1000), false);
  assert.equal(fetchDue(0, 599_000), false);
  assert.equal(fetchDue(0, 601_000), true);
  assert.equal(fetchDue(1000, 1000 + 601_000), true);
});

test('commitsBehind takes the larger ref count and survives a missing ref', () => {
  const counts = { 'HEAD..main': '3\n', 'HEAD..origin/main': '5\n' };
  assert.equal(commitsBehind((a) => counts[a[2]]), 5);
  assert.equal(commitsBehind((a) => counts[a[2]], ['main']), 3);
  assert.equal(commitsBehind(() => { throw new Error('no ref'); }), 0);
});

test('a worktree behind origin/main gets the line after one fetch, then the cache holds', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stale-'));
  try {
    const origin = path.join(dir, 'origin.git');
    const a = path.join(dir, 'a');
    const b = path.join(dir, 'b');
    git(dir, 'init', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', origin, a);
    for (const r of [a]) { git(r, 'config', 'user.email', 't@t'); git(r, 'config', 'user.name', 't'); }
    fs.writeFileSync(path.join(a, 'f.txt'), '1');
    git(a, 'add', 'f.txt'); git(a, 'commit', '-qm', 'one'); git(a, 'push', '-q', 'origin', 'HEAD:main');
    git(dir, 'clone', '-q', origin, b);
    assert.equal(staleCheckoutLine(b, { now: 1_000_000 }), '');
    fs.writeFileSync(path.join(a, 'f.txt'), '2');
    git(a, 'commit', '-qam', 'two'); git(a, 'push', '-q', 'origin', 'HEAD:main');
    assert.equal(staleCheckoutLine(b, { now: 1_000_000 + 1000 }), '', 'inside the 10 minutes no fetch runs');
    const line = staleCheckoutLine(b, { now: 1_000_000 + 700_000 });
    assert.match(line, /1 commit behind origin\/main.*git rebase origin\/main/);
    fs.writeFileSync(path.join(b, 'untracked.txt'), 'x');
    assert.doesNotMatch(staleCheckoutLine(b, { now: 1_000_000 + 700_001 }), /stash/, 'untracked files are not tracked edits');
    fs.writeFileSync(path.join(b, 'f.txt'), 'edited');
    assert.match(staleCheckoutLine(b, { now: 1_000_000 + 700_002 }), /commit or stash/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
