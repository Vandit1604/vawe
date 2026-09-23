// harness/lib/worktree-claims.mjs: a worktree's own claim of what it owns, so a second worktree can
// be told about it instead of finding out by collision.
//
// THE GAP THIS CLOSES (see engine-doctrine/CRAFT/SUBAGENTS.md and harness/author/critics.mjs's
// DECIDERS table). A decider already carries an exclusive write scope, checked by construction because
// only one decider runs against one field. An AD-HOC worktree carries no such thing: the scope lives
// only in the brief's prose, in whichever agent's context happened to read it. Two agents nearly
// collided today in harness/media/ and engine-doctrine/RESEARCH/, and were saved only because the
// briefs happened to name opposite files. This makes the same idea machine-readable for that case,
// without inventing a second scope language: a claim is the same glob prose a brief already carries,
// just written down where the NEXT worktree can read it before it starts.
//
// STORAGE: .vawe-data/worktree-claims.json. `.vawe-data` is the one directory `worktree.sh` already
// symlinks into every worktree back to the main checkout's copy (see worktree.sh's "shared, read-only"
// block), so every worktree and the main checkout read and write the SAME file with no new plumbing.
//
// A claim is a hint, not a lock: `worktree.sh rm` clears it, but a worktree deleted by hand (`git
// worktree remove` run directly) leaves a stale entry. addClaim() prunes any claim whose worktree no
// longer appears in `git worktree list` before comparing scopes, so a dead entry never causes a false
// warning; it can still under-warn for one call if a worktree vanished and was pruned by something
// else in the same instant, which is fine, this is a warning, not a lock (see overlap()'s own note).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = path.join(ROOT, '.vawe-data', 'worktree-claims.json');

function readAll() {
  try { return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')); } catch { return {}; }
}
function writeAll(claims) {
  fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
  fs.writeFileSync(REGISTRY, JSON.stringify(claims, null, 2) + '\n');
}

/** Worktree directory names (`.claude/worktrees/<name>`) that `git worktree list` still knows about. */
export function liveNames() {
  let out;
  try { out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }); }
  catch { return new Set(); }
  return new Set([...out.matchAll(/^worktree (.+)$/gm)].map((m) => path.basename(m[1])));
}

/** Every claim whose worktree is still live. Dead entries are dropped, never returned. */
export function readClaims() {
  const claims = readAll();
  const live = liveNames();
  let dirty = false;
  for (const name of Object.keys(claims)) {
    if (!live.has(name)) { delete claims[name]; dirty = true; }
  }
  if (dirty) writeAll(claims);
  return claims;
}

// A glob's fixed prefix: everything before its first wildcard. `harness/dev/**` -> `harness/dev/`,
// `engine-doctrine/CRAFT/SUBAGENTS.md` -> itself (no wildcard). Deliberately this crude: this module's
// whole point is NOT inventing a real glob-intersection algorithm for a warning that is advisory
// either way, and a prefix relationship is the same read a person gives two briefs' "you touch X"
// lines by eye.
function stem(glob) {
  const i = glob.search(/[*?[]/);
  // NOT trimmed of a trailing slash: that slash is what stops "harness/dev/" from matching a sibling
  // directory that merely shares its name as a prefix (a hypothetical "harness/devtools/..."). Trimming
  // it was tried and broke exactly that case (worktree-claims.test.mjs).
  return i < 0 ? glob : glob.slice(0, i);
}

/** Do two globs plausibly name overlapping paths? One prefix containing the other is a yes; anything
 *  else is a no. False negatives exist (two named subtrees that share a deep child neither glob's
 *  prefix reaches) and are the accepted cost of staying a warning, not a lock: see the module comment. */
function oneOverlap(a, b) {
  const sa = stem(a), sb = stem(b);
  if (!sa || !sb) return true; // an empty stem is a glob with no fixed path at all ("*"): can't rule it out
  return sa === sb || sa.startsWith(sb) || sb.startsWith(sa);
}

/** Pure: `[{ glob, theirGlob }]` for every pair between two scope lists that overlap. Split out from
 *  findOverlaps so it is testable with no git or filesystem, and so worktree-claims.test.mjs is
 *  checking the actual comparison rule rather than a mock of it. */
export function scopesOverlap(scopesA, scopesB) {
  const found = [];
  for (const ga of scopesA) for (const gb of scopesB) {
    if (oneOverlap(ga, gb)) found.push({ glob: ga, theirGlob: gb });
  }
  return found;
}

/** `[{ glob, against, theirGlob }]` for every pair in `scopesA` x every other live claim's scopes that
 *  overlap. `theirName`/`theirGlob` let the caller print WHO and WHAT, not just that something matched. */
export function findOverlaps(scopesA, excludeName) {
  const found = [];
  const claims = readClaims();
  for (const [name, claim] of Object.entries(claims)) {
    if (name === excludeName) continue;
    for (const hit of scopesOverlap(scopesA, claim.scopes || [])) {
      found.push({ ...hit, against: name, branch: claim.branch });
    }
  }
  return found;
}

/** Record a claim, pruning dead ones first so a warning never fires against a worktree that is already
 *  gone. Returns the overlaps found against what remains live, for the caller to print (warn, never
 *  block: see Task 2 in the observability plan, and yesterday's false-positive guard it cites). */
export function addClaim(name, { branch, scopes = [] }) {
  const overlaps = findOverlaps(scopes, name);
  const claims = readClaims();
  claims[name] = { branch, scopes, startedAt: new Date().toISOString() };
  writeAll(claims);
  return overlaps;
}

export function removeClaim(name) {
  const claims = readAll();
  if (!(name in claims)) return;
  delete claims[name];
  writeAll(claims);
}
