#!/usr/bin/env node
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
