#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { liveWorktrees, landedStatus, dirtyFiles } from '../lib/worktree-landed.mjs';
import { readClaims } from '../lib/worktree-claims.mjs';

const STALE_MINUTES = 30;

const git = (args, opts = {}) => {
  try { return execFileSync('git', args, { encoding: 'utf8', ...opts }).trim(); }
  catch { return ''; }
};

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
