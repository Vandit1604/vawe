#!/usr/bin/env node
// harness/dev/worktree-prune.mjs: retire agent worktrees once their work has landed.
//   make worktrees            report only (default; touches nothing)
//   make worktrees PRUNE=1    remove the SAFE ones + their branches
//
// WHY THIS EXISTS. Agent worktrees accumulate: 35 of them reached 9.1G here, and the harness only
// auto-removes the ones that were never changed, precisely the cheap half. The ones that DID change
// something are the ones that pile up, and they are also the only ones that can lose work.
//
// The hazard is not the disk, it is deleting the one worktree that still holds something. Auditing 35
// by hand took eight passes and came within one command of destroying five storyboard files that
// existed nowhere else. So the rule here is inverted from the usual cleanup script: a worktree is
// removed only when every file it touches is PROVEN present and identical in the main tree. Anything
// unproven is reported with the exact command to rescue it, and left alone.
//
// "Landed" itself (content-first, never by commit graph) is harness/lib/worktree-landed.mjs, shared
// with worktree-status.mjs's Task 3 check: one implementation of "is this stranded", not two drifting.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { liveWorktrees, landedStatus } from '../lib/worktree-landed.mjs';

const PRUNE = process.argv.includes('--prune');
const git = (args, opts = {}) => {
  try { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts }).trim(); }
  catch { return ''; }
};
const root = git(['rev-parse', '--show-toplevel']);
if (!root) { console.error('not a git repo'); process.exit(1); }

const trees = liveWorktrees(root);
if (!trees.length) { console.log('✓ no agent worktrees: nothing to retire'); process.exit(0); }

const safe = [], unsafe = [];
for (const t of trees) {
  const { commits, stranded, capped } = landedStatus(root, t);
  // capped: too many commits ahead of main to prove byte-for-byte quickly. Unproven is unsafe, same as
  // a real stranded file: this tool only removes what it has actually checked.
  (stranded.length || capped ? unsafe : safe).push({ ...t, stranded, commits, capped });
}

const name = (t) => path.basename(t.path);
if (safe.length) {
  console.log(`\n✓ ${safe.length} worktree(s) fully landed in main${PRUNE ? ', removing' : ''}:`);
  for (const t of safe) console.log(`  ${name(t)}${t.commits ? `  (${t.commits} commit(s), all content present in main)` : ''}`);
}
if (unsafe.length) {
  console.log(`\n⚠ ${unsafe.length} worktree(s) STILL HOLD WORK, not touched:`);
  for (const t of unsafe) {
    console.log(`\n  ${name(t)}`);
    if (t.capped) console.log(`      ${t.commits} commits ahead of main, too many to verify byte-for-byte; not checked, not removed`);
    for (const s of t.stranded.slice(0, 12)) console.log(`      ${s}`);
    if (t.stranded.length > 12) console.log(`      … +${t.stranded.length - 12} more`);
    console.log(`    rescue:  cp -r ${t.path}/<file> <same path here>   then re-run`);
  }
}
if (!PRUNE) {
  console.log(`\n(report only: nothing removed. \`make worktrees PRUNE=1\` retires the ${safe.length} landed one(s).)`);
  process.exit(0);
}
let n = 0;
for (const t of safe) {
  if (!git(['worktree', 'remove', '--force', t.path]) && fs.existsSync(t.path)) { console.log(`  could not remove ${name(t)}`); continue; }
  if (t.branch && t.branch !== 'main') git(['branch', '-D', t.branch]);
  n++;
}
git(['worktree', 'prune']);
console.log(`\n✓ retired ${n} worktree(s) and their branches. ${unsafe.length} left holding work.`);
