// The four events of out/<film>.runs.jsonl, one per step of the loop. Pure: each builder returns the
// fields that harness/lib/runlog.mjs appendRun adds after the common ones (at, film, agent, model, git).
import { acceptanceCounts } from './acceptance.mjs';

const tenths = (s) => Math.round(s * 10) / 10;

/** `vawe new`: which details the ask answered and which the brief guessed. */
export const newEvent = ({ template, length, answered, guessed }) => ({
  cmd: 'new', template: template ?? null, length: length ?? null, answered: [...answered], guessed: [...guessed],
});

/** `vawe dev`: seconds, the check seconds by name, the tier and cache use, and the acceptance rows (null for a window). */
export const devEvent = ({ tier, wallS, captureS, checks, cache, rows }) => ({
  cmd: 'dev', tier, wallS: tenths(wallS), captureS: tenths(captureS),
  checksS: Object.fromEntries(checks.map(([name, s]) => [name, tenths(s)])),
  cache, acceptance: rows ? acceptanceCounts(rows) : null,
});

/** A judge run: `stage` is stills, draft, final, manual or struct; `ledger` is mergeLedger counts. */
export const judgeEvent = ({ stage, verdict, scores = null, anchor = null, ledger = null, seconds = null }) => ({
  cmd: 'judge', stage, verdict, scores,
  anchorYes: anchor ? anchor.filter((a) => a.yes).length : null,
  anchorTotal: anchor ? anchor.length : null,
  ledger, seconds,
});

/** A final render: `verdict` PASS, FIX, failed, or null when no judge ran; `acceptance` as acceptanceCounts. A failed one also records `failedAt` (percent of subframes captured), `reason` and `page`. */
export const shipEvent = ({ verdict, renderS, acceptance, failure = null }) => ({
  cmd: 'ship', verdict: verdict ?? null, renderS: tenths(renderS), acceptance: acceptance ?? null,
  ...(failure ? { failedAt: failure.pct, reason: failure.reason, page: failure.page } : {}),
});
