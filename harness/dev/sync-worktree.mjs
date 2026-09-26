#!/usr/bin/env node
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
  const first = out.split('\n\n')[0];
  const line = first.split('\n').find((l) => l.startsWith('worktree '));
  return line.slice('worktree '.length);
}

const MAIN = path.resolve(gitWorktreeList(WT));

function hash(p) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
  catch { return null; }
}

function listFiles(p) {
  let st;
  try { st = fs.statSync(p); } catch { return []; }
  if (st.isFile()) return [p];
  if (!st.isDirectory()) return [];
  const out = [];
  for (const entry of fs.readdirSync(p)) out.push(...listFiles(path.join(p, entry)));
  return out;
}

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
  const rel = path.isAbsolute(verifyPath) ? path.relative(WT, verifyPath) : verifyPath;
  const dst = path.join(WT, rel);
  const src = path.join(MAIN, rel);
  const dstHash = hash(dst);
  const srcHash = hash(src);

  if (dstHash === null && srcHash === null) {
    process.exit(0);
  }
  if (dstHash === null) {
    die(`${rel}: exists in the main checkout but never reached this worktree.\n`
      + `  node harness/dev/sync-worktree.mjs ${WT}`);
  }
  if (srcHash === null) {
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
    process.exit(0);
  }
  die(`${rel}: CONFLICT. Both the main checkout and this worktree changed since the last sync,\n`
    + `  so which one is "newer" cannot be proven. Resolve by hand, then:\n`
    + `  node harness/dev/sync-worktree.mjs ${WT}`);
}

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
