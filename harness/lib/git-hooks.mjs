// Turns on the repo's git hooks (.githooks) the first time any verb runs in a clone, so no one has to run make install-hooks.
import { spawnSync } from 'node:child_process';

export const HOOKS_DIR = '.githooks';

export const LOCK_DRIVER = 'node harness/dev/merge-lock.mjs %O %A %B';

/** Registers the merge driver .gitattributes names for clips.lock.json. A driver someone set is kept. */
function ensureMergeDriver(git) {
  try { if (git(['config', '--get', 'merge.vawe-lock.driver']).trim()) return; } catch (e) { if (e.status !== 1) return; }
  try {
    git(['config', 'merge.vawe-lock.name', 'vawe clips.lock.json: merge the keys']);
    git(['config', 'merge.vawe-lock.driver', LOCK_DRIVER]);
  } catch { /* not a git checkout */ }
}

/** The line to print after setting hooksPath, or '' when nothing changed. A hooksPath someone set on purpose is never replaced. */
export function ensureHooks(git) {
  ensureMergeDriver(git);
  let current;
  try { current = git(['config', '--get', 'core.hooksPath']).trim(); } catch (e) {
    if (e.status !== 1) return '';
    current = '';
  }
  if (current) return '';
  try { git(['config', 'core.hooksPath', HOOKS_DIR]); } catch { return ''; }   // not a git checkout (a tarball)
  return `vawe: git hooks on (core.hooksPath ${HOOKS_DIR}): pre-commit checks em dashes, syntax and code shape; pre-push runs the tests the changed paths need`;
}

/** A git runner for `root` that throws with the exit status, as ensureHooks expects. */
export function gitAt(root) {
  return (args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw Object.assign(new Error(r.stderr || `git ${args[0]} failed`), { status: r.status });
    return r.stdout;
  };
}
