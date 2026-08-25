#!/usr/bin/env node
// scripts/dev/worktree-prune.mjs — retire agent worktrees once their work has landed.
//   make worktrees            report only (default; touches nothing)
//   make worktrees PRUNE=1    remove the SAFE ones + their branches
//
// WHY THIS EXISTS. Agent worktrees accumulate: 35 of them reached 9.1G here, and the harness only
// auto-removes the ones that were never changed — precisely the cheap half. The ones that DID change
// something are the ones that pile up, and they are also the only ones that can lose work.
//
// The hazard is not the disk, it is deleting the one worktree that still holds something. Auditing 35
// by hand took eight passes and came within one command of destroying five storyboard files that
// existed nowhere else. So the rule here is inverted from the usual cleanup script: a worktree is
// removed only when every file it touches is PROVEN present and identical in the main tree. Anything
// unproven is reported with the exact command to rescue it, and left alone.
//
// WHAT "LANDED" MEANS, and why the obvious check is wrong. `git diff main..branch` is NOT the
// question: it also reports every file main itself moved forward since the branch point, so on a
// long-lived branch it flags the whole repo. Two narrower questions are the right ones:
//   * for each commit the branch carries, compare THAT COMMIT'S OWN files (HEAD^..HEAD) against the
//     main working tree, byte for byte;
//   * for each dirty or untracked file, compare it against the main working tree the same way.
// Content is the authority, never the commit graph. Agent work here is routinely copied out rather
// than merged (films are gitignored, docs/MISTAKES.md #377), so a branch whose commit never merged
// can still have every byte of its work in main. Judging by the graph would hoard those forever.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PRUNE = process.argv.includes('--prune');
const gitRaw = (args, opts = {}) => {
  try { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts }); }
  catch { return ''; }
};
// Trimmed, for the callers that want one value. Anything reading COLUMN-POSITIONED output (porcelain
// status) must use gitRaw: a leading space there is data, not whitespace.
const git = (args, opts = {}) => gitRaw(args, opts).trim();
const root = git(['rev-parse', '--show-toplevel']);
if (!root) { console.error('not a git repo'); process.exit(1); }

// Worktrees, excluding the checkout we are standing in.
const trees = git(['worktree', 'list', '--porcelain']).split('\n\n')
  .map((block) => {
    const p = /^worktree (.+)$/m.exec(block)?.[1];
    const b = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] || null;
    return p && p !== root ? { path: p, branch: b } : null;
  }).filter(Boolean);

if (!trees.length) { console.log('✓ no agent worktrees — nothing to retire'); process.exit(0); }

// A file gitignored in the MAIN tree is build noise (node_modules, out/*.png, .vawe-data), never work.
// Asked in one batch: one `git check-ignore` beats one per file across thousands of paths.
function ignoredInMain(files) {
  if (!files.length) return new Set();
  const out = git(['check-ignore', '--stdin'], { input: files.join('\n') });
  return new Set(out ? out.split('\n') : []);
}

// Is `file` present in the main tree with exactly the bytes `rev:file` has?
function sameInMain(wt, rev, file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return false;
  let blob;
  try { blob = execFileSync('git', ['show', `${rev}:${file}`], { cwd: wt, maxBuffer: 1 << 28 }); }
  catch { return false; }
  try { return Buffer.compare(blob, fs.readFileSync(target)) === 0; } catch { return false; }
}
function sameFileInMain(wt, file) {
  const a = path.join(wt, file), b = path.join(root, file);
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  try { return Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0; } catch { return false; }
}

const safe = [], unsafe = [];
for (const t of trees) {
  const wt = { cwd: t.path };
  const stranded = [];

  // 1. Committed work: each commit's OWN files, against the main tree.
  const commits = git(['rev-list', 'main..HEAD'], wt).split('\n').filter(Boolean);
  for (const c of commits) {
    for (const f of git(['diff', '--name-only', `${c}^`, c], wt).split('\n').filter(Boolean)) {
      if (!sameInMain(t.path, c, f)) stranded.push(`${f}  (commit ${c.slice(0, 7)})`);
    }
  }

  // 2. Dirty + untracked work, ignoring anything main would ignore anyway.
  // `git()` trims, and a porcelain line for a MODIFIED file starts with a space (" M Makefile"). The
  // trim ate it, so slice(3) then ate the path's first character too: "akefile", "ore/icons.js". The
  // mangled path never matched anything in main, so every worktree holding a modified file reported as
  // unlanded FOREVER and the tool retired nothing. Untracked lines ("?? path") have no leading space,
  // which is why only some names came out short and the bug read as random.
  //
  // Parsed off the raw output, and the 3-char status field is dropped by position rather than by trim.
  const status = gitRaw(['status', '--porcelain'], wt).split('\n').filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, '')).filter((f) => f && !f.endsWith('/'));
  const noise = ignoredInMain(status);
  for (const f of status) {
    if (noise.has(f)) continue;
    if (!sameFileInMain(t.path, f)) stranded.push(`${f}  (uncommitted)`);
  }

  (stranded.length ? unsafe : safe).push({ ...t, stranded, commits: commits.length });
}

const name = (t) => path.basename(t.path);
if (safe.length) {
  console.log(`\n✓ ${safe.length} worktree(s) fully landed in main${PRUNE ? ' — removing' : ''}:`);
  for (const t of safe) console.log(`  ${name(t)}${t.commits ? `  (${t.commits} commit(s), all content present in main)` : ''}`);
}
if (unsafe.length) {
  console.log(`\n⚠ ${unsafe.length} worktree(s) STILL HOLD WORK — not touched:`);
  for (const t of unsafe) {
    console.log(`\n  ${name(t)}`);
    for (const s of t.stranded.slice(0, 12)) console.log(`      ${s}`);
    if (t.stranded.length > 12) console.log(`      … +${t.stranded.length - 12} more`);
    console.log(`    rescue:  cp -r ${t.path}/<file> <same path here>   then re-run`);
  }
}
if (!PRUNE) {
  console.log(`\n(report only — nothing removed. \`make worktrees PRUNE=1\` retires the ${safe.length} landed one(s).)`);
  process.exit(0);
}
let n = 0;
for (const t of safe) {
  if (!git(['worktree', 'remove', '--force', t.path]) && fs.existsSync(t.path)) { console.log(`  could not remove ${name(t)}`); continue; }
  // The branch is only deleted alongside its worktree, and only after the content check above passed.
  if (t.branch && t.branch !== 'main') git(['branch', '-D', t.branch]);
  n++;
}
git(['worktree', 'prune']);
console.log(`\n✓ retired ${n} worktree(s) and their branches. ${unsafe.length} left holding work.`);
