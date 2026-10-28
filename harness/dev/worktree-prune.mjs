#!/usr/bin/env node
import { planPrune, removeWorktree } from '../lib/worktree-prune.mjs';

const yes = process.argv.includes('--yes');
const plan = planPrune(process.cwd());
const gone = plan.filter((w) => !w.keep);
let removed = 0;

for (const w of plan) {
  if (w.keep) { console.log(`  keep    ${w.path}  (${w.branch || 'detached'}): ${w.keep}`); continue; }
  if (!yes) { console.log(`  remove  ${w.path}  (${w.branch}): merged, clean, unlocked`); continue; }
  try { removeWorktree(process.cwd(), w); removed++; console.log(`  removed ${w.path}  (${w.branch})`); }
  catch (e) { console.log(`  keep    ${w.path}  (${w.branch}): git refused: ${String(e.stderr || e.message).trim().split('\n')[0]}`); }
}

console.log(yes
  ? `${removed} of ${plan.length} worktree(s) removed, ${plan.length - removed} kept`
  : `${gone.length} of ${plan.length} worktree(s) would be removed, ${plan.length - gone.length} kept (dry run)`);
console.log(yes ? 'next: bin/vawe-dev worktrees' : gone.length ? 'next: bin/vawe-dev worktrees --prune --yes' : 'next: nothing to prune');
