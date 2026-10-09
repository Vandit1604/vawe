// The four events of out/<film>.runs.jsonl, one per step of the loop. Pure: each builder returns the
// fields that harness/lib/runlog.mjs appendRun adds after the common ones (at, film, agent, model, git).
import { acceptanceCounts } from './acceptance.mjs';

const tenths = (s) => Math.round(s * 10) / 10;

/** `vawe new`: which details the ask answered and which the brief guessed, and the signature dial ranges offered ({ dial, range }) with any chosen values. */
export const newEvent = ({ template, length, answered, guessed, ranges = [], chosen = {} }) => ({
  cmd: 'new', template: template ?? null, length: length ?? null, answered: [...answered], guessed: [...guessed],
  signature: { offered: Object.fromEntries(ranges.map((d) => [d.dial, d.range])), chosen },
});

/** `vawe dev`: seconds, the check seconds by name, the tier and cache use, the acceptance rows (null for a window), the chosen signature dials, what the moves measured for them, and the rules the draft fired ({ id, value, t }). */
export const devEvent = ({ tier, wallS, captureS, checks, cache, rows, signature = {}, measured = {}, fired = [], worlds = null }) => ({
  cmd: 'dev', tier, wallS: tenths(wallS), captureS: tenths(captureS),
  checksS: Object.fromEntries(checks.map(([name, s]) => [name, tenths(s)])),
  cache, acceptance: rows ? acceptanceCounts(rows) : null,
  signature, measured, rules_fired: fired, worlds: worlds?.length ? worlds : null,
});

/** A `vawe dev` that failed or was killed: `reason` is the first error line or the signal; no checks ran. */
export const devFailedEvent = ({ reason, wallS }) => ({ cmd: 'dev', failed: true, reason, wallS: tenths(wallS) });

/** A judge run: `stage` is stills, draft, final, manual or struct; `ledger` is mergeLedger counts; `bar` is the side-by-side answers as [{ ref, dial, winner }] (judge-bar.mjs barEvent); `findings` is { notes: [{ rule, t, verdict }], waivers: [{ code, earned }], sameness, template } (judge-findings.mjs findingsEvent). */
export const judgeEvent = ({ stage, verdict, scores = null, anchor = null, bar = null, ledger = null, seconds = null, findings = null }) => ({
  cmd: 'judge', stage, verdict, scores,
  anchorYes: anchor ? anchor.filter((a) => a.yes).length : null,
  anchorTotal: anchor ? anchor.length : null,
  bar, ledger, seconds,
  notes: findings?.notes ?? null, waivers: findings?.waivers ?? null, sameness: findings?.sameness ?? null, template: findings?.template ?? null,
});

/** A final render: `verdict` PASS, FIX, failed, or null when no judge ran; `acceptance` as acceptanceCounts. A failed one also records `failedAt` (percent of subframes captured), `reason` and `page`. */
export const shipEvent = ({ verdict, renderS, acceptance, failure = null }) => ({
  cmd: 'ship', verdict: verdict ?? null, renderS: tenths(renderS), acceptance: acceptance ?? null,
  ...(failure ? { failedAt: failure.pct, reason: failure.reason, page: failure.page } : {}),
});
