// harness/lib/judge-consensus.mjs: the ONE owner for "have two independent fresh judges cleared this
// cut". A single vision judge repeats its own rating on the same clip only ~two times in three
// (Video-Bench, engine-doctrine/JUDGE.md), so `make ship` asks for both of the two structured runs
// (`quality/gates/judge.mjs --verdict-json ... --run A|B`), each carrying its OWN `overall` 1-10 score,
// never averaged between them (JUDGE.md: "no score in this file is aggregated anywhere").
//
// FRESH means the same thing `ledger.mjs`'s isJudged/checkOne already mean it: the receipt's own scene
// hash still matches the file on disk (readReceipt's `stale`), AND its renderHash still matches a fresh
// sha256 of the mp4 sitting in `out/` right now (a re-render, same name, different bytes, must not read
// as still-judged). Reuses hashFile from ledger.mjs rather than a second copy of the same sha256 call.
import { readReceipt } from './receipt.mjs';
import { hashFile } from '../../quality/gates/ledger.mjs';
import { renderOf } from '../../quality/gates/tile.mjs';

export const JUDGE_RUNS = ['A', 'B'];
export const OVERALL_THRESHOLD = 7;

/** The fresh structured receipt for one run, or null (missing/stale/render moved on). */
export function freshStructReceipt(scenePath, run, mp4 = renderOf(scenePath)) {
  const r = readReceipt(`judge-struct-${run}`, scenePath);
  if (!r.exists || r.stale || !r.receipt) return null;
  const renderHash = hashFile(mp4);
  if (!renderHash || r.receipt.renderHash !== renderHash) return null;
  return r.receipt;
}

/**
 * twoJudgesStatus(scenePath) -> { ok, reason, scores }. `ok` only when every run in JUDGE_RUNS has a
 * fresh receipt AND every one's `overall` is >= OVERALL_THRESHOLD. `reason` names exactly which run is
 * missing or which run(s) scored low, so the caller never has to guess which condition failed.
 */
export function twoJudgesStatus(scenePath, mp4 = renderOf(scenePath)) {
  const rows = JUDGE_RUNS.map((run) => ({ run, receipt: freshStructReceipt(scenePath, run, mp4) }));
  const missing = rows.filter((r) => !r.receipt).map((r) => r.run);
  if (missing.length) {
    return { ok: false, reason: `no fresh structured judge receipt for run(s) ${missing.join(', ')}`, scores: [] };
  }
  const scores = rows.map((r) => ({ run: r.run, overall: r.receipt.overall }));
  const failing = scores.filter((s) => typeof s.overall !== 'number' || s.overall < OVERALL_THRESHOLD);
  if (failing.length) {
    return { ok: false,
      reason: `run(s) ${failing.map((s) => `${s.run}=${s.overall ?? 'n/a'}/10`).join(', ')} below ${OVERALL_THRESHOLD}/10`,
      scores };
  }
  return { ok: true, reason: null, scores };
}
