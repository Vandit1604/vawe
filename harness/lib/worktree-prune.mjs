import { execFileSync } from 'node:child_process';

const run = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const ok = (cwd, args) => { try { run(cwd, args); return true; } catch { return false; } };

/** Why a worktree must stay, or '' when it may go. `w` carries facts only: no git runs here. */
export function keepReason(w) {
  if (w.isMain) return 'main checkout';
  if (w.isCurrent) return 'current worktree';
  if (w.locked) return 'locked';
  if (!w.branch) return 'detached HEAD, no branch to delete';
  if (!w.merged) return `branch ${w.branch} is not merged into origin/main`;
  if (w.trackedEdits) return 'tracked edits';
  if (w.untracked) return 'untracked files';
  return '';
}

export function parseWorktrees(porcelain) {
  return porcelain.split('\n\n').filter((b) => b.trim()).map((block) => ({
    path: /^worktree (.+)$/m.exec(block)[1],
    branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] || null,
    locked: /^locked/m.test(block),
  }));
}

/** One entry per worktree: its facts and `keep`, the reason it stays ('' when it can be removed). */
export function planPrune(cwd) {
  const current = run(cwd, ['rev-parse', '--show-toplevel']).trim();
  return parseWorktrees(run(cwd, ['worktree', 'list', '--porcelain'])).map((w, i) => {
    const status = ok(w.path, ['rev-parse', '--git-dir']) ? run(w.path, ['status', '--porcelain']).split('\n').filter(Boolean) : [];
    const facts = {
      ...w,
      isMain: i === 0,
      isCurrent: w.path === current,
      merged: w.branch ? ok(cwd, ['merge-base', '--is-ancestor', w.branch, 'origin/main']) : false,
      untracked: status.some((l) => l.startsWith('??')),
      trackedEdits: status.some((l) => !l.startsWith('??')),
    };
    return { ...facts, keep: keepReason(facts) };
  });
}

/** Removes the worktree, then deletes its branch with the safe `-d`; throws when git refuses. */
export function removeWorktree(cwd, w) {
  run(cwd, ['worktree', 'remove', w.path]);
  run(cwd, ['branch', '-d', w.branch]);
}
