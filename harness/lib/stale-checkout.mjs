// Tells a session at the start of work that its checkout lags origin/main. Pure helpers plus one function that runs git.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { operationInProgress } from './git-operation.mjs';

const FETCH_EVERY_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;
const STAMP = path.join('.vawe-data', 'origin-fetch.json');

/** The most commits HEAD lacks from the given refs (no network); 0 when none exists. `git(args)` returns stdout or throws. */
export function commitsBehind(git, refs = ['main', 'origin/main']) {
  return Math.max(0, ...refs.map((ref) => {
    try { return Number.parseInt(git(['rev-list', '--count', `HEAD..${ref}`]), 10) || 0; } catch { return 0; }
  }));
}

export const fetchDue = (lastMs, now) => !(now - lastMs < FETCH_EVERY_MS);

/** The one line for a checkout `behind` commits back, or '' when it is level. A rebase also fast-forwards; it needs a tree without tracked edits. */
export function staleLine(behind, trackedEdits) {
  if (behind <= 0) return '';
  const lag = `this checkout is ${behind} commit${behind === 1 ? '' : 's'} behind origin/main: new guides, verbs and checks are missing`;
  return trackedEdits
    ? `${lag}; commit or stash the tracked edits, then run git rebase origin/main (untracked files stay)`
    : `${lag}; run git rebase origin/main (it fast-forwards when you have no commits of your own; untracked files stay)`;
}

/** A checkout moves forward on its own only when it holds nothing of its own: behind, no commits, no tracked edits, no rebase or merge running. */
export const canFastForward = ({ behind, ahead, trackedEdits, operation }) => behind > 0 && ahead === 0 && !trackedEdits && !operation;

const readStamp = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')).at ?? 0; } catch { return 0; } };

function gitIn(root) {
  return (args, timeout) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout });
    if (r.status !== 0) throw new Error(r.stderr || `git ${args[0]} failed`);
    return r.stdout;
  };
}

/** The stale line for `root`, fetching origin main at most once per 10 minutes; '' when level, offline or not a git checkout. */
export function staleCheckoutLine(root, { now = Date.now(), git = gitIn(root) } = {}) {
  const stamp = path.join(root, STAMP);
  try {
    if (fetchDue(readStamp(stamp), now)) {
      fs.mkdirSync(path.dirname(stamp), { recursive: true });
      fs.writeFileSync(stamp, JSON.stringify({ at: now }));
      git(['fetch', '--quiet', 'origin', 'main'], FETCH_TIMEOUT_MS);
    }
  } catch { /* offline: compare against the refs already here */ }
  const behind = commitsBehind(git, ['origin/main']);
  if (!behind) return '';
  const trackedEdits = git(['status', '--porcelain', '--untracked-files=no']).trim().length > 0;
  const ahead = Number.parseInt(git(['rev-list', '--count', 'origin/main..HEAD']), 10) || 0;
  const operation = operationInProgress(git(['rev-parse', '--absolute-git-dir']).trim());
  if (canFastForward({ behind, ahead, trackedEdits, operation }) && fastForward(git)) {
    return `this checkout moved forward ${behind} commit${behind === 1 ? '' : 's'} to origin/main`;
  }
  return staleLine(behind, trackedEdits);
}

function fastForward(git) {
  let onBranch = true;
  try { git(['symbolic-ref', '-q', 'HEAD']); } catch { onBranch = false; }
  try {
    git(onBranch ? ['merge', '--ff-only', 'origin/main'] : ['checkout', '--detach', 'origin/main']);
    return true;
  } catch { return false; }
}
