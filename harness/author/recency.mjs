import { spawnSync } from 'node:child_process';

/**
 * Where the names `make arsenal` ranks are DEFINED. It must cover every corpus the arsenal collects
 * from, because a name defined outside this list is absent from every historical tree and is therefore
 * reported new forever. That was true of all 100 block families until this line was widened: `blocks/`
 * was never here, and the bug below hid it by making the whole read fail anyway.
 */
export const REGISTRY_PATHS = ['core', 'blocks', 'recipes', 'engine-doctrine/CRAFT/rules', 'skills'];

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
  const paths = REGISTRY_PATHS.filter((p) => git(['ls-tree', commit, '--', p], cwd).stdout.trim());
  if (!paths.length) return new Set(want);
  const r = git(['archive', '--format=tar', commit, '--', ...paths], cwd, 'latin1');
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
