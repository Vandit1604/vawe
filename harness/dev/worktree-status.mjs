#!/usr/bin/env node
// harness/dev/worktree-status.mjs: what is running, on what, since when.
//   node harness/dev/worktree-status.mjs
//
// THE FAILURES THIS ANSWERS (all from one real session, see the harness-observability plan):
//   * an agent's final message claimed a report "already delivered above" that never arrived. Only
//     reading its branch showed the work was real.
//   * an agent ended its turn waiting on a monitor and never resumed. Nothing surfaced that it sat.
//   * two agents nearly collided in harness/media/ and engine-doctrine/RESEARCH/, saved only because
//     the briefs happened to name opposite files.
// None of those is visible from an agent's own report, because the agent is the unreliable narrator
// (SUBAGENT-BUDGET.md's own "wait on the artifact, never the notification" rule says the same thing
// about a finished report). Everything below is read off git and the filesystem, never off a claim.
//
// NOT A DAEMON. One process, one pass, exits. Run it by hand, or from a loop the person drives.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { liveWorktrees, landedStatus, dirtyFiles } from '../lib/worktree-landed.mjs';
import { readClaims } from '../lib/worktree-claims.mjs';

// ponytail: one fixed idle threshold for "stalled", not a per-agent budget read from the brief. Good
// enough to surface today's failures; make it a flag if a slower task legitimately needs longer gaps
// between commits.
const STALE_MINUTES = 30;

const git = (args, opts = {}) => {
  try { return execFileSync('git', args, { encoding: 'utf8', ...opts }).trim(); }
  catch { return ''; }
};

// Newest mtime among a worktree's own uncommitted changes (git status, not a directory walk). A full
// recursive walk of every worktree was tried first and was the slow part of this script by a wide
// margin (dozens of worktrees x thousands of files each); `git status --porcelain` already gives the
// exact set of files an agent has actually touched, for free, as part of landedStatus's own query, so
// this reads mtimes off that short list instead of stat-ing the whole tree.
function newestMtime(dir, statusFiles) {
  let best = 0;
  for (const f of statusFiles) {
    try { const t = fs.statSync(path.join(dir, f)).mtimeMs; if (t > best) best = t; } catch { /* raced or deleted, skip */ }
  }
  return best;
}

function lastCommitMs(dir) {
  const ts = git(['log', '-1', '--format=%ct'], { cwd: dir });
  return ts ? Number(ts) * 1000 : 0;
}

function fmtAge(ms) {
  if (!ms) return '(no activity found)';
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

const root = git(['rev-parse', '--show-toplevel']);
if (!root) { console.error('not a git repo'); process.exit(1); }

const trees = liveWorktrees(root);
if (!trees.length) { console.log('✓ no agent worktrees running'); process.exit(0); }

const claims = readClaims();
const rows = trees.map((t) => {
  const name = path.basename(t.path);
  const claim = claims[name] || null;
  const activity = Math.max(lastCommitMs(t.path), newestMtime(t.path, dirtyFiles(t)));
  const staleMins = activity ? (Date.now() - activity) / 60000 : Infinity;
  const { commits, stranded, capped } = landedStatus(root, t);
  return {
    name,
    branch: t.branch || '(detached)',
    scopes: claim?.scopes || [],
    startedAt: claim?.startedAt || null,
    activity,
    stale: staleMins > STALE_MINUTES,
    commits,
    unlanded: stranded.length,
    capped,
  };
});

// Worst first: a worktree holding real unlanded work AND gone quiet is the one to look at. This is
// the census.mjs reasoning applied here: silence must not read as nothing happening.
rows.sort((a, b) => (b.unlanded > 0 || b.capped) - (a.unlanded > 0 || a.capped) || a.activity - b.activity);

console.log(`${rows.length} worktree(s):\n`);
for (const r of rows) {
  const flags = [];
  if (r.stale) flags.push('STALE');
  if (r.unlanded) flags.push(`${r.unlanded} unlanded file(s)`);
  if (r.capped) flags.push('unverified: too many commits to check byte-for-byte');
  const flagStr = flags.length ? `  [${flags.join(', ')}]` : '';
  console.log(`  ${r.name}  (${r.branch})${flagStr}`);
  console.log(`    since: ${r.startedAt ? r.startedAt : '(no claim recorded, legacy worktree)'}`);
  console.log(`    last activity: ${fmtAge(r.activity)}`);
  console.log(`    scope: ${r.scopes.length ? r.scopes.join(', ') : '(none declared)'}`);
  console.log(`    commits ahead of main: ${r.commits}${r.unlanded ? `, ${r.unlanded} file(s) not yet proven in main` : ''}`);
  console.log('');
}

const flagged = rows.filter((r) => r.stale || r.unlanded || r.capped);
if (flagged.length) {
  console.log(`⚠ ${flagged.length} of ${rows.length} need a look: gone quiet, still holding work not in main, or diverged too far to check.`);
} else {
  console.log('✓ nothing stale, nothing holding unlanded work.');
}
