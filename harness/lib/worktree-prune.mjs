import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { worktreeActivity } from './worktree-landed.mjs';

const ACTIVE_MS = 2 * 60 * 60 * 1000;
const REBUILDABLE = /(^|\/)node_modules\/?$/;

const run = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const ok = (cwd, args) => { try { run(cwd, args); return true; } catch { return false; } };

const minutes = (ms) => `${Math.max(1, Math.round(ms / 60000))} min`;

/** Why a worktree must stay, or '' when it may go. `w` carries facts only: no git runs here. */
export function keepReason(w) {
  if (w.isMain) return 'main checkout';
  if (w.isCurrent) return 'current worktree';
  if (w.locked) return 'locked';
  if (!w.branch) return 'detached HEAD, no branch to delete';
  if (!w.merged) return `branch ${w.branch} is not merged into origin/main`;
  if (w.idleMs < ACTIVE_MS) return `active ${minutes(w.idleMs)} ago`;
  if (w.trackedEdits) return 'tracked edits';
  if (w.untracked) return 'untracked files';
  const ignored = (w.ignored || []).filter((f) => !REBUILDABLE.test(f));
  if (ignored.length) return `ignored files would be deleted: ${ignored.slice(0, 3).join(', ')}${ignored.length > 3 ? ` (${ignored.length} in all)` : ''}`;
  return '';
}

export function parseWorktrees(porcelain) {
  return porcelain.split('\n\n').filter((b) => b.trim()).map((block) => ({
    path: /^worktree (.+)$/m.exec(block)[1],
    branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] || null,
    locked: /^locked/m.test(block),
  }));
}

const inside = (cwd, dir) => cwd === dir || cwd.startsWith(dir + path.sep);
const real = (p) => { try { return fs.realpathSync(p); } catch { return p; } };

/** One entry per worktree: its facts and `keep`, the reason it stays ('' when it can be removed). */
export function planPrune(cwd, now = Date.now()) {
  const here = real(cwd);
  return parseWorktrees(run(cwd, ['worktree', 'list', '--porcelain'])).map((w, i) => {
    const present = fs.existsSync(w.path);
    const status = present ? run(w.path, ['status', '--porcelain', '--ignored']).split('\n').filter(Boolean) : [];
    const facts = {
      ...w,
      isMain: i === 0,
      isCurrent: inside(here, real(w.path)),
      merged: w.branch ? ok(cwd, ['merge-base', '--is-ancestor', w.branch, 'origin/main']) : false,
      idleMs: present ? now - Math.max(worktreeActivity(w), fs.statSync(w.path).mtimeMs) : Infinity,
      untracked: status.some((l) => l.startsWith('??')),
      trackedEdits: status.some((l) => !/^(\?\?|!!)/.test(l)),
      ignored: status.filter((l) => l.startsWith('!!')).map((l) => l.slice(3)),
    };
    return { ...facts, keep: keepReason(facts) };
  });
}

/** Removes the worktree, then its branch; returns '' or why the branch stayed. Throws when the worktree stays. */
export function removeWorktree(cwd, w) {
  run(cwd, ['worktree', 'remove', w.path]);
  // -D: -d tests against the current HEAD, and planPrune already proved the tip is in origin/main.
  try { run(cwd, ['branch', '-D', w.branch]); return ''; }
  catch (e) { return String(e.stderr || e.message).trim().split('\n')[0]; }
}
