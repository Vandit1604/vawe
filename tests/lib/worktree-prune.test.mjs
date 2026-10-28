import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { keepReason, parseWorktrees, planPrune, removeWorktree } from '../../harness/lib/worktree-prune.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const HOUR = 3600_000;
const LATER = () => Date.now() + 5 * HOUR;

function fixture(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-prune-')));
  try {
    const origin = path.join(dir, 'origin.git');
    const main = path.join(dir, 'main');
    git(dir, 'init', '--bare', '-b', 'main', origin);
    git(dir, 'clone', '-q', origin, main);
    git(main, 'config', 'user.email', 't@t'); git(main, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(main, 'f.txt'), '1');
    fs.writeFileSync(path.join(main, '.gitignore'), 'out/\nnode_modules\n');
    git(main, 'add', '.'); git(main, 'commit', '-qm', 'one'); git(main, 'push', '-q', 'origin', 'HEAD:main');
    const add = (name) => { git(main, 'worktree', 'add', '-q', '-b', name, path.join(dir, name)); return path.join(dir, name); };
    fn({ dir, main, add });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('keepReason names the first reason a worktree stays and is empty for a removable one', () => {
  const fine = { branch: 'b', merged: true, idleMs: 3 * HOUR };
  assert.equal(keepReason(fine), '');
  assert.equal(keepReason({ ...fine, isMain: true }), 'main checkout');
  assert.equal(keepReason({ ...fine, isCurrent: true }), 'current worktree');
  assert.equal(keepReason({ ...fine, locked: true }), 'locked');
  assert.match(keepReason({ ...fine, branch: null }), /detached/);
  assert.match(keepReason({ ...fine, merged: false }), /not merged/);
  assert.equal(keepReason({ ...fine, idleMs: 14 * 60000 }), 'active 14 min ago');
  assert.equal(keepReason({ ...fine, trackedEdits: true }), 'tracked edits');
  assert.equal(keepReason({ ...fine, untracked: true }), 'untracked files');
  assert.equal(keepReason({ ...fine, ignored: ['node_modules/', 'site/node_modules'] }), '');
  assert.equal(keepReason({ ...fine, ignored: ['out/', 'a/b.mp4', '.vawe-data/', 'assets/brands/', 'node_modules/'] }),
    'ignored files would be deleted: out/, a/b.mp4, .vawe-data/ (4 in all)');
});

test('parseWorktrees reads path, branch and lock', () => {
  const out = 'worktree /a\nHEAD 1\nbranch refs/heads/main\n\nworktree /b\nHEAD 2\ndetached\nlocked reason\n';
  assert.deepEqual(parseWorktrees(out), [
    { path: '/a', branch: 'main', locked: false },
    { path: '/b', branch: null, locked: true },
  ]);
});

test('prune removes a merged clean worktree and keeps locked, dirty, untracked and unmerged ones', () => {
  fixture(({ main, add }) => {
    const merged = add('merged');
    const locked = add('locked'); git(main, 'worktree', 'lock', locked);
    const dirty = add('dirty'); fs.writeFileSync(path.join(dirty, 'f.txt'), 'edited');
    const untracked = add('untracked'); fs.writeFileSync(path.join(untracked, 'new.txt'), 'x');
    const unmerged = add('unmerged');
    git(unmerged, 'config', 'user.email', 't@t'); git(unmerged, 'config', 'user.name', 't');
    git(unmerged, 'commit', '-q', '--allow-empty', '-m', 'ahead');

    const plan = planPrune(main, LATER());
    const keep = Object.fromEntries(plan.map((w) => [path.basename(w.path), w.keep]));
    assert.equal(keep.merged, '');
    assert.equal(keep.main, 'main checkout');
    assert.equal(keep.locked, 'locked');
    assert.equal(keep.dirty, 'tracked edits');
    assert.equal(keep.untracked, 'untracked files');
    assert.match(keep.unmerged, /not merged/);

    removeWorktree(main, plan.find((w) => w.path === merged));
    assert.equal(fs.existsSync(merged), false);
    assert.doesNotMatch(git(main, 'branch', '--list', 'merged'), /merged/);
    assert.match(git(main, 'branch', '--list', 'unmerged'), /unmerged/);
  });
});

test('a worktree holding ignored files stays, naming them; node_modules alone does not block', () => {
  fixture(({ main, add }) => {
    const renders = add('renders');
    fs.mkdirSync(path.join(renders, 'out')); fs.writeFileSync(path.join(renders, 'out', 'a.mp4'), 'x');
    const deps = add('deps');
    fs.mkdirSync(path.join(deps, 'node_modules')); fs.writeFileSync(path.join(deps, 'node_modules', 'p.js'), 'x');
    const keep = Object.fromEntries(planPrune(main, LATER()).map((w) => [path.basename(w.path), w.keep]));
    assert.equal(keep.renders, 'ignored files would be deleted: out/');
    assert.equal(keep.deps, '');
  });
});

test('a worktree active in the last 2 hours stays', () => {
  fixture(({ main, add }) => {
    add('fresh');
    const fresh = planPrune(main).find((w) => w.branch === 'fresh');
    assert.match(fresh.keep, /^active \d+ min ago$/);
    assert.equal(planPrune(main, LATER()).find((w) => w.branch === 'fresh').keep, '');
  });
});

test('a directory inside a worktree counts as that worktree being current', () => {
  fixture(({ main, add }) => {
    const wt = add('inner');
    fs.mkdirSync(path.join(wt, 'sub'));
    const plan = planPrune(path.join(wt, 'sub'), LATER());
    assert.equal(plan.find((w) => w.path === wt).keep, 'current worktree');
  });
});

test('the branch goes even when the checked-out HEAD of main lacks its commits', () => {
  fixture(({ main, add }) => {
    const wt = add('shipped');
    git(wt, 'config', 'user.email', 't@t'); git(wt, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(wt, 'g.txt'), '2');
    git(wt, 'add', 'g.txt'); git(wt, 'commit', '-qm', 'two'); git(wt, 'push', '-q', 'origin', 'HEAD:main');
    git(main, 'fetch', '-q', 'origin');
    const entry = planPrune(main, LATER()).find((w) => w.branch === 'shipped');
    assert.equal(entry.keep, '');
    assert.equal(removeWorktree(main, entry), '');
    assert.doesNotMatch(git(main, 'branch', '--list', 'shipped'), /shipped/);
  });
});
