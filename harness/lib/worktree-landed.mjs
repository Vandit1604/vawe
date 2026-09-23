// harness/lib/worktree-landed.mjs: is a worktree's work already present in main, byte for byte?
//
// Extracted out of harness/dev/worktree-prune.mjs so worktree-status.mjs can ask the same question
// (Task 3: a branch sitting on unmerged commits, never reported, is exactly the "agent stalled and
// nobody noticed" case) without a second implementation of "landed" drifting from the one prune already
// trusts. Same rule, same caveats: `git diff main..branch` is the wrong question (it also reports
// every file main itself moved on), so this compares each commit's OWN files, and each dirty/untracked
// file, against the main working tree, content-first, never by commit graph.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const gitRaw = (args, opts = {}) => {
  try { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts }); }
  catch { return ''; }
};
const git = (args, opts = {}) => gitRaw(args, opts).trim();

/** Every linked worktree except the one at `root` (the main checkout), as `{ path, branch }`. */
export function liveWorktrees(root) {
  return git(['worktree', 'list', '--porcelain'], { cwd: root }).split('\n\n')
    .map((block) => {
      const p = /^worktree (.+)$/m.exec(block)?.[1];
      const b = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] || null;
      return p && p !== root ? { path: p, branch: b } : null;
    }).filter(Boolean);
}

function ignoredInMain(root, files) {
  if (!files.length) return new Set();
  const out = git(['check-ignore', '--stdin'], { cwd: root, input: files.join('\n') });
  return new Set(out ? out.split('\n') : []);
}

function sameInMain(root, wt, rev, file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return false;
  let blob;
  try { blob = execFileSync('git', ['show', `${rev}:${file}`], { cwd: wt, maxBuffer: 1 << 28 }); }
  catch { return false; }
  try { return Buffer.compare(blob, fs.readFileSync(target)) === 0; } catch { return false; }
}
function sameFileInMain(root, wt, file) {
  const a = path.join(wt, file), b = path.join(root, file);
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  try { return Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0; } catch { return false; }
}

/** Dirty + untracked file paths in one worktree, per `git status --porcelain`. See the comment inline:
 *  a porcelain line's 3-char prefix must be dropped by position, never by trim, or a leading space
 *  silently eats the path's first character. Exported so a caller wanting "what did this worktree
 *  actually touch" (worktree-status.mjs's activity check) does not run a second, drifting parse. */
export function dirtyFiles(t) {
  return gitRaw(['status', '--porcelain'], { cwd: t.path }).split('\n').filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, '')).filter((f) => f && !f.endsWith('/'));
}

// ponytail: a worktree hundreds of commits ahead of main is almost never "149 real edits nobody
// landed"; measured here, it is a worktree whose `main` moved on underneath it or that was branched
// from something else entirely (one on this machine sat at 2206). Diffing every one of those commits
// file-by-file, each file re-checked with its own `git show`, is the byte-for-byte guarantee this
// module exists for, but past this cap it turns a status check into a multi-minute git subprocess
// storm for a number nobody would act on differently. Above the cap this reports the commit count and
// SKIPS the per-commit byte check (still runs the cheap dirty-file check below); the caller sees a
// real, large number and a note, never a silent hang. Raise it if a legitimate long-lived branch needs
// the full check; drop CAP_COMMITS to 0 to always skip it.
const CAP_COMMITS = 200;

/** `{ commits, stranded, capped }` for one worktree: commit count ahead of main, the list of files
 *  (with the reason each one is unlanded) that are NOT proven present in main yet, and whether the
 *  commit-by-commit check was skipped because there were too many to check quickly (see CAP_COMMITS).
 *  `stranded` empty and `capped` false together mean every byte this worktree touched already lives in
 *  main, whatever the commit graph says. */
export function landedStatus(root, t) {
  const wt = { cwd: t.path };
  const stranded = [];

  const commits = git(['rev-list', 'main..HEAD'], wt).split('\n').filter(Boolean);
  const capped = commits.length > CAP_COMMITS;
  if (!capped) {
    for (const c of commits) {
      for (const f of git(['diff', '--name-only', `${c}^`, c], wt).split('\n').filter(Boolean)) {
        if (!sameInMain(root, t.path, c, f)) stranded.push(`${f}  (commit ${c.slice(0, 7)})`);
      }
    }
  }

  const status = dirtyFiles(t);
  const noise = ignoredInMain(root, status);
  for (const f of status) {
    if (noise.has(f)) continue;
    if (!sameFileInMain(root, t.path, f)) stranded.push(`${f}  (uncommitted)`);
  }

  return { commits: commits.length, stranded, capped };
}
