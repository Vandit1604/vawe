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

function stem(glob) {
  const i = glob.search(/[*?[]/);
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
