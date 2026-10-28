import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { keepReason, parseWorktrees, planPrune, removeWorktree } from '../../harness/lib/worktree-prune.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

test('keepReason names the first reason a worktree stays and is empty for a removable one', () => {
  const fine = { branch: 'b', merged: true };
  assert.equal(keepReason(fine), '');
  assert.equal(keepReason({ ...fine, isMain: true }), 'main checkout');
  assert.equal(keepReason({ ...fine, isCurrent: true }), 'current worktree');
  assert.equal(keepReason({ ...fine, locked: true }), 'locked');
  assert.match(keepReason({ ...fine, branch: null }), /detached/);
  assert.match(keepReason({ ...fine, merged: false }), /not merged/);
  assert.equal(keepReason({ ...fine, trackedEdits: true }), 'tracked edits');
  assert.equal(keepReason({ ...fine, untracked: true }), 'untracked files');
});

test('parseWorktrees reads path, branch and lock', () => {
  const out = 'worktree /a\nHEAD 1\nbranch refs/heads/main\n\nworktree /b\nHEAD 2\ndetached\nlocked reason\n';
  assert.deepEqual(parseWorktrees(out), [
    { path: '/a', branch: 'main', locked: false },
    { path: '/b', branch: null, locked: true },
  ]);
});

test('prune removes a merged clean worktree and keeps locked, dirty, untracked and unmerged ones', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-prune-')));
  try {
    const origin = path.join(dir, 'origin.git');
    const main = path.join(dir, 'main');
    git(dir, 'init', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', origin, main);
    git(main, 'config', 'user.email', 't@t'); git(main, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(main, 'f.txt'), '1');
    git(main, 'add', 'f.txt'); git(main, 'commit', '-qm', 'one'); git(main, 'push', '-q', 'origin', 'HEAD:main');
    const add = (name) => { git(main, 'worktree', 'add', '-q', '-b', name, path.join(dir, name)); return path.join(dir, name); };
    const merged = add('merged');
    const locked = add('locked'); git(main, 'worktree', 'lock', locked);
    const dirty = add('dirty'); fs.writeFileSync(path.join(dirty, 'f.txt'), 'edited');
    const untracked = add('untracked'); fs.writeFileSync(path.join(untracked, 'new.txt'), 'x');
    const unmerged = add('unmerged');
    git(unmerged, 'config', 'user.email', 't@t'); git(unmerged, 'config', 'user.name', 't');
    git(unmerged, 'commit', '-q', '--allow-empty', '-m', 'ahead');

    const plan = planPrune(main);
    const keep = Object.fromEntries(plan.map((w) => [path.basename(w.path), w.keep]));
    assert.equal(keep.merged, '');
    assert.equal(keep.main, 'main checkout');
    assert.equal(keep.locked, 'locked');
    assert.equal(keep.dirty, 'tracked edits');
    assert.equal(keep.untracked, 'untracked files');
    assert.match(keep.unmerged, /not merged/);

    const fromLinked = planPrune(merged);
    assert.equal(fromLinked.find((w) => w.path === main).keep, 'main checkout');
    assert.equal(fromLinked.find((w) => w.path === merged).keep, 'current worktree');

    removeWorktree(main, plan.find((w) => w.path === merged));
    assert.equal(fs.existsSync(merged), false);
    assert.doesNotMatch(git(main, 'branch', '--list', 'merged'), /merged/);
    assert.match(git(main, 'branch', '--list', 'unmerged'), /unmerged/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
