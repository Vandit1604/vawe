#!/usr/bin/env node
// harness/dev/sync-worktree.mjs: keep a worktree's untracked films/themes/assets caught up with the
// main checkout, without ever clobbering a local edit.
//
// THE BUG THIS CLOSES. `.worktreeinclude` files are copied into a worktree once, at
// `harness/dev/worktree.sh add` time. Nothing re-copies them afterward, and nothing notices when the
// main checkout moves on: a film's cue times change in main, the worktree's copy sits there
// unchanged, and every gate and render in that worktree reads it as if it were current. Measured cost:
// three wrong renders of vawe-flow-2 (cue 2.9435/4.6629 instead of 3.8935/5.3129), because a stale copy
// is byte-identical to a correct one until something diffs it.
//
// TWO MODES.
//   apply (default)   full pass: copy anything missing, refresh anything unchanged since the last
//                      sync, leave a local edit alone, and REFUSE (loud, nonzero exit) anything that
//                      changed on both sides since the last sync rather than guess which one wins.
//                      Used by `worktree.sh add` to populate a fresh worktree, and safe to re-run by
//                      hand any time later.
//   --verify <path>    read-only: is this ONE path safe to render right now? Used by
//                      `render-lock.sh` before every render. Never writes anything, so a render can
//                      never be blamed for mutating the tree it was asked to read.
//
// THE ONLY GROUND TRUTH FOR "NEWER": `.vawe-data/worktree-sync.json`, one sha256 per path, written
// the moment this script last copied that path in. A file whose on-disk hash still matches that
// recorded hash has not been touched locally since; anything else is either an in-progress edit (main
// hash still matches the record: leave it) or a real conflict (neither side matches the record: refuse
// and say so, per the "never overwrite a newer local file" rule this task is built around).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const verifyIdx = argv.indexOf('--verify');
const verifyPath = verifyIdx >= 0 ? argv[verifyIdx + 1] : null;
const wtArg = argv.filter((a, i) => !(verifyIdx >= 0 && (i === verifyIdx || i === verifyIdx + 1)))[0];
const WT = path.resolve(wtArg || process.cwd());

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function gitWorktreeList(cwd) {
  let out;
  try {
    out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8' });
  } catch (e) {
    die(`could not list worktrees from ${cwd}: ${e.message}`);
  }
  // First stanza is always the main (non-linked) checkout, per git's own definition.
  const first = out.split('\n\n')[0];
  const line = first.split('\n').find((l) => l.startsWith('worktree '));
  return line.slice('worktree '.length);
}

const MAIN = path.resolve(gitWorktreeList(WT));

function hash(p) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
  catch { return null; }
}

// Recursively list files under a matched path. `.worktreeinclude` patterns like `assets/brands/**`
// expand (one level, no bash globstar) to per-brand directories; each is copied whole, so each is
// synced whole, file by file, rather than as one opaque directory hash.
function listFiles(p) {
  let st;
  try { st = fs.statSync(p); } catch { return []; }
  if (st.isFile()) return [p];
  if (!st.isDirectory()) return [];
  const out = [];
  for (const entry of fs.readdirSync(p)) out.push(...listFiles(path.join(p, entry)));
  return out;
}

// Expand a `.worktreeinclude` pattern the same way `worktree.sh` does: a real shell glob against the
// main checkout, so the two copy paths can never disagree about what a pattern matches. Not a second
// glob implementation, the same one, called from the other language.
function expand(pattern, base) {
  let out;
  try {
    out = execFileSync('bash', ['-c', `cd ${JSON.stringify(base)} && eval ls -d ${pattern} 2>/dev/null`], { encoding: 'utf8' });
  } catch { return []; }
  return out.split('\n').filter(Boolean);
}

function loadInclude() {
  const p = path.join(MAIN, '.worktreeinclude');
  if (!fs.existsSync(p)) die(`${p} missing, refusing to sync blind`);
  return fs.readFileSync(p, 'utf8').split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

const MANIFEST_PATH = path.join(WT, '.vawe-data', 'worktree-sync.json');
function loadManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch { return {}; }
}

if (path.resolve(MAIN) === WT) {
  console.log(`✓ ${WT} is the main checkout, nothing to sync`);
  process.exit(0);
}

if (verifyPath) {
  // READ-ONLY. One path, three questions: does it exist here, is it stale, is it a genuine conflict.
  const rel = path.isAbsolute(verifyPath) ? path.relative(WT, verifyPath) : verifyPath;
  const dst = path.join(WT, rel);
  const src = path.join(MAIN, rel);
  const dstHash = hash(dst);
  const srcHash = hash(src);

  if (dstHash === null && srcHash === null) {
    // Not a sync problem: this path does not exist anywhere. Let the renderer's own
    // file-not-found error say so; this script has nothing to add.
    process.exit(0);
  }
  if (dstHash === null) {
    die(`${rel}: exists in the main checkout but never reached this worktree.\n`
      + `  node harness/dev/sync-worktree.mjs ${WT}`);
  }
  if (srcHash === null) {
    // Authored fresh in this worktree, main never had it. Nothing to compare against, safe.
    process.exit(0);
  }
  if (dstHash === srcHash) process.exit(0); // in sync

  const manifest = loadManifest();
  const lastSynced = manifest[rel];
  if (dstHash === lastSynced) {
    die(`${rel}: STALE. Main has moved on since this worktree's copy was made and this copy was\n`
      + `  never edited locally, so it is silently wrong, not a conflict.\n`
      + `  node harness/dev/sync-worktree.mjs ${WT}`);
  }
  if (srcHash === lastSynced) {
    // Only this worktree changed since the last sync: a local edit in progress. Render it.
    process.exit(0);
  }
  die(`${rel}: CONFLICT. Both the main checkout and this worktree changed since the last sync,\n`
    + `  so which one is "newer" cannot be proven. Resolve by hand, then:\n`
    + `  node harness/dev/sync-worktree.mjs ${WT}`);
}

// IS "MAIN" STILL WHERE THE LIBRARY LIVES? Everything a worktree copies is GITIGNORED, so git's own
// definition of the main checkout (the first `worktree list` stanza, resolved above) says nothing
// about which checkout actually holds the films. The two can drift apart, and on this machine they
// did: the main checkout sat detached on a 220-commit-old HEAD holding 58 scenes while the working
// checkout held 197, so every new worktree was synced a third of the library and every gate run
// inside one reported a confident green over a population it could not see.
//
// census.mjs already refuses a sweep whose ANCHOR holds more than it does. This is the same check in
// the other direction and at the other end: a linked worktree holding MORE than main proves main is
// not the source any more. Counting only, no hashing, and only the patterns actually copied.
function linkedWorktrees() {
  let out;
  try { out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: MAIN, encoding: 'utf8' }); }
  catch { return []; }
  return out.split('\n\n').slice(1)
    .map((st) => (st.split('\n').find((l) => l.startsWith('worktree ')) || '').slice('worktree '.length))
    .filter(Boolean)
    .map((d) => path.resolve(d))
    .filter((d) => d !== path.resolve(MAIN));
}

// SCRATCH DOES NOT COUNT. A `_`-prefixed file is this repo's existing convention for a probe or a
// fixture that belongs to whoever made it (census.mjs's `unused` already drops them for the same
// reason), so it is authored IN a worktree and never comes from main. Counting them made this guard
// refuse a legitimate sync the day after it shipped: five `_shader-*.json` probes in one worktree put
// it at 202 against main's 197, and an agent was told to go fix a main checkout that was not broken.
// A guard that cries wolf gets bypassed, which would put back the exact blindness it exists to catch.
const countable = (dir, pat) =>
  expand(pat, dir).reduce((n, m) => n + listFiles(path.join(dir, m))
    .filter((f) => !path.basename(f).startsWith('_')).length, 0);

function refuseIfMainIsNotTheSource(patterns) {
  const others = linkedWorktrees();
  if (!others.length) return;
  for (const pat of patterns) {
    const mine = countable(MAIN, pat);
    for (const other of others) {
      const theirs = countable(other, pat);
      if (theirs > mine) {
        die(`"${pat}": the main checkout holds ${mine} file(s), but ${other} holds ${theirs}.\n`
          + `  Everything synced here is gitignored, so git's "main checkout" is not proof of where the\n`
          + `  library lives, and syncing from it would install the SMALLER copy over this worktree.\n`
          + `  Fix the main checkout first (copy the missing files into ${MAIN}), then re-run.`);
      }
    }
  }
}

// APPLY MODE: full pass, writes files and the manifest.
const patterns = loadInclude();
refuseIfMainIsNotTheSource(patterns);
const manifest = loadManifest();
let copied = 0, keptLocal = 0;
const conflicts = [];

for (const pat of patterns) {
  for (const matched of expand(pat, MAIN)) {
    for (const srcFile of listFiles(path.join(MAIN, matched))) {
      const rel = path.relative(MAIN, srcFile);
      const dstFile = path.join(WT, rel);
      const srcHash = hash(srcFile);
      const dstHash = hash(dstFile);

      if (dstHash === srcHash) {
        if (manifest[rel] !== srcHash) manifest[rel] = srcHash;
        continue;
      }
      if (dstHash === null) {
        fs.mkdirSync(path.dirname(dstFile), { recursive: true });
        fs.copyFileSync(srcFile, dstFile);
        manifest[rel] = srcHash;
        copied++;
        continue;
      }
      const lastSynced = manifest[rel];
      if (dstHash === lastSynced) {
        fs.copyFileSync(srcFile, dstFile);
        manifest[rel] = srcHash;
        copied++;
        continue;
      }
      if (srcHash === lastSynced) {
        keptLocal++; // local edit in progress, leave it
        continue;
      }
      conflicts.push(rel); // both sides moved since the last sync: refuse, do not guess
    }
  }
}

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`✓ synced ${WT}  (${copied} updated · ${keptLocal} local edits kept · ${conflicts.length} conflicts)`);
if (conflicts.length) {
  console.error('  left untouched, both sides changed since the last sync:');
  for (const c of conflicts) console.error(`    ${c}`);
  process.exit(1);
}
