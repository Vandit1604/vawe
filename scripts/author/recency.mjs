// recency.mjs: which named things are NEW? Read out of git, never out of a list.
//
// WHY. The census says which entries have zero users, and its own output states the problem: nothing
// distinguishes "undiscoverable" from "genuinely unwanted", so both look the same. Age separates them.
// A capability that landed this week and has no users has not been rejected by anybody, it has not been
// SEEN, and the one moment that fact is worth anything is while an author is still choosing, which is
// `make preflight`.
//
// WHY GIT AND NOT A CHANGELOG. A hand-kept "what's new" list goes stale the first time somebody forgets
// a line, and is then worse than nothing, because it reads as complete. `git log` cannot forget. Same
// principle as `paramsOf` in core/camera-moves.js, which refuses an unknown parameter by reading the
// generator's OWN signature so that nobody maintains a list of parameters.
//
// HOW, AND WHY NOT THE OBVIOUS WAY. The obvious derivation is `git log -S<name>` per entry: 397
// processes, unusable. The second-obvious one is a single `git log -p` over the window, marking any
// name added on a `+` line. That was built and thrown away, because it LIES: adding a new map keyed by
// existing names (the `REQUESTS` table did exactly this) re-writes every name as a key on a `+` line,
// and eleven blueprint beats that have existed for months were reported as twelve days old.
//
// So newness is asked as a question about STATE, not about diffs: was this name in the registry sources
// at all, `days` ago? Two cheap processes, no heuristic, and it cannot be fooled by a line that moved.
// The cost is granularity: the answer is "newer than the window", never "three days old". An author
// choosing an effect does not need the date, only "you have probably not seen this".
import { spawnSync } from 'node:child_process';

/** Where vocabularies are defined. Every `*_REGISTRY` lives under core/; beats live in blueprints. */
export const REGISTRY_PATHS = ['core', 'blueprints/index.mjs'];

/** A FIXED window, not "the 10 most recent". A rank always reports ten new things, including in a month
 *  when nothing landed, and that is a lie told confidently. Two weeks is a fact about the calendar, and
 *  it is allowed to come back empty. */
export const WINDOW_DAYS = 14;

const git = (args, cwd, encoding = 'utf8') => spawnSync('git', args, { cwd, encoding, maxBuffer: 1 << 26 });

/** The commit that was HEAD `days` ago, or '' when git cannot say (no repo, or a clone shallower than
 *  the window). Unknown history is not an error; it means nothing gets called new. */
export function baseCommit(days = WINDOW_DAYS, cwd) {
  const r = git(['log', '-1', '--format=%H', `--before=${days}.days`], cwd);
  return r.status === 0 ? (r.stdout || '').trim() : '';
}

/** Pure: does this tree text contain each name? Split out so the join is testable without a repo. */
export function presentIn(text, names) {
  const out = new Set();
  for (const n of names) if (text.includes(n)) out.add(n);
  return out;
}

/**
 * Which of `names` were present in the registry sources at `commit`.
 *
 * The sources arrive as ONE `git archive` tar, searched as text. `git grep -F -e <name>` per entry is
 * the tidier-looking call and it is 10 seconds for 397 patterns, because git builds one alternation and
 * walks every blob with it. A presence check does not need git's matcher: the tar's own 512-byte headers
 * are just more text that no registry name occurs in.
 */
export function existingAt(commit, names, cwd) {
  const want = [...names];
  if (!commit || !want.length) return new Set();
  const r = git(['archive', '--format=tar', commit, '--', ...REGISTRY_PATHS], cwd, 'latin1');
  // A failure must not report "nothing existed", which would call the whole arsenal new.
  if (r.status !== 0 || !r.stdout) return new Set(want);
  return presentIn(r.stdout, want);
}

/**
 * Which of `names` did not exist `days` ago.
 * @returns {Set<string>} empty when git cannot answer, which is the honest answer, not a claim.
 */
export function newSince(names, { days = WINDOW_DAYS, cwd } = {}) {
  const want = [...names];
  if (!want.length) return new Set();
  const base = baseCommit(days, cwd);
  if (!base) return new Set();
  const existed = existingAt(base, want, cwd);
  return new Set(want.filter((n) => !existed.has(n)));
}
