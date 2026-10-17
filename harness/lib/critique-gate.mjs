// The ship gate on a critique: a final render needs a `vawe critique` of the page as it is now, run by a session or VAWE_AGENT other
// than the one that rendered the draft. The critique verb logs the page digest (verbEvent pageHash); this reads it back.
// Why a gate: traces of 44 film agents showed 21 of 23 shipped past the warnings and 2 of 23 ran a critique first.
import { readRuns } from './runlog.mjs';
import { pageDigest } from './approval.mjs';
import { sameIdentity, lastAuthorRun } from './judge-self-record.mjs';

const ranCritique = (r, digest) => r.cmd === 'verb' && r.verb === 'critique' && r.exitCode === 0 && r.pageHash === digest;

/** The command that records a critique the ship gate accepts: run it in a session that did not write the page. */
export const critiqueCommand = (pagePath) => `VAWE_AGENT=critic bin/vawe critique ${pagePath}`;

/** The reason a final render may not start for want of a fresh critique, or null. VAWE_UNATTENDED=1 needs none. Every reason ends with the command to run. */
export function critiqueProblem(pagePath, { root = '.', env = process.env, runs = readRuns(pagePath, root), digest = pageDigest(pagePath) } = {}) {
  if (env.VAWE_UNATTENDED === '1') return null;
  const critiques = runs.filter((r) => ranCritique(r, digest));
  const run = critiqueCommand(pagePath);
  if (!critiques.length) return `no critique of the current page (it never ran, or the page changed after it): in a session that did not write the page, run ${run}`;
  const author = lastAuthorRun(runs);
  if (author && critiques.every((c) => sameIdentity(c, author))) return `the critique of the current page ran in the session that rendered the draft: in another session, run ${run}`;
  return null;
}
