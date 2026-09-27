// quality/gates/post-draft.mjs: THE POST-DRAFT LOOP, one step per call, same shape as `make stage`/
// `make next` (state read from files on disk, never stored): draft render -> full-res still sheet ->
// conform (brief claims) -> verify (hard numbers) -> two fresh structured judges -> ship.
//
// Built because a film passed every conformance claim while two fresh judges scored it 4/10 the same
// day, and agents kept losing time not knowing which of these five checks came next. `quality/gates/
// stage.mjs` already answers "which of the seven AGENTS.md stages is this film in"; once a film reaches
// `render`/`judge` (the two stages after `direct`, where a draft exists or is perpetually re-judged),
// THIS is the finer loop inside them. `quality/gates/next.mjs` calls it for exactly those two stages.
//
//   node quality/gates/post-draft.mjs films/scene/<film>.json
import fs from 'node:fs';
import path from 'node:path';
import { gradeable, renderOf } from './tile.mjs';
import { readReceipt } from '../../harness/lib/receipt.mjs';
import { twoJudgesStatus } from '../../harness/lib/judge-consensus.mjs';
import { isWaivedBy } from '../../harness/lib/waivers.mjs';

/** The exact text to hand a fresh judge subagent: what the sheet is, how to read it, and how to record
 *  without being refused as self-recorded. Printed verbatim, never summarized, same discipline
 *  verify.mjs's own block already asks for. */
export function judgeBrief(filmArg, run) {
  return [
    `  --- hand this to a FRESH agent (VAWE_AGENT=judge-${run || '<n>'}, never the one that authored this film) ---`,
    `  Read /tmp/judge/<name>/sheet.png against /tmp/judge/<name>/rubric.md (from \`make judge D=${filmArg} STRUCT=1\`),`,
    `  and the full-res still sheet index from \`node harness/dev/still-sheet.mjs D=${filmArg}\`.`,
    '  Each grid tile is a SEPARATE frame, never the same frame moving: read a motion claim off the',
    '  sequence of tiles at the same scale, or get the exact number from `harness/dev/probe-frame.mjs`,',
    '  never from eyeballing a single downscaled thumbnail.',
    '  Score every criterion, then your OWN overall 1-10 (never averaged with the other judge\'s), then record:',
    `  VAWE_AGENT=judge-${run || '<n>'} node quality/gates/judge.mjs ${filmArg} --verdict-json <file> --run ${run || 'A|B'}`,
    '  --- end brief ---',
  ].join('\n');
}

// `scene.reference`: the reference video this film was built to match (a plain path, the same
// free-form convention `scene.authoring` already uses). A film that declares one gets its draft's
// motion checked against it before verify/judges: a rendered cut that "looks right" in a single still
// can still read as stalled net motion once played against the thing it was built to match. Returns
// null when the film names no reference (nothing to check) or the check already passed.
function motionStep(scene, filmPath, filmArg, mp4, allow) {
  if (!scene.reference) return null;
  const motion = readReceipt('motion-compare', filmPath);
  if (!motion.exists || motion.stale) {
    return { step: 'motion', done: false,
      next: `make study REF=${scene.reference} COMPARE=${mp4} D=${filmArg}`,
      why: `this film declares a reference (${scene.reference}) but its draft has not been checked against it yet.` };
  }
  if (motion.receipt.ok === false && !isWaivedBy(allow, 'motion-still')) {
    return { step: 'motion', done: false,
      next: `make study REF=${scene.reference} COMPARE=${mp4} D=${filmArg}`,
      why: `${motion.receipt.tooStillCount} window(s) read "too still" against the reference last run `
        + `(${(motion.receipt.tooStillWindows || []).map((w) => `${w.t0}-${w.t1}s`).join(', ')}). Fix the `
        + 'motion and re-run, or waive with {"authoring":{"allow":["motion-still"],"_why":{"motion-still":"…"}}}.' };
  }
  return null;
}

/**
 * postDraftStep(filmArg) -> { step, done, next, why, brief? }. `next` is always ONE runnable command
 * (`quality/gates/next.mjs`'s own contract: run it, stop, re-derive on the next call). `done: true` only
 * at the final `ship` step, once every earlier one is fresh (and, for conform/judges, passing or waived
 * via the existing `authoring.allow` + `_why` mechanism - no second waiver channel).
 */
export function postDraftStep(filmArg) {
  const filmPath = path.resolve(filmArg);
  const scene = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const allow = (scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : [];
  const mp4 = renderOf(filmPath);

  const render = gradeable(filmPath, mp4);
  if (!render.ok) {
    return { step: 'render', done: false, next: `make dev D=${filmArg}`, why: `${render.why}.` };
  }

  const stills = readReceipt('still-sheet', filmPath);
  if (!stills.exists || stills.stale) {
    return { step: 'still-sheet', done: false, next: `node harness/dev/still-sheet.mjs D=${filmArg}`,
      why: 'no full-res still sheet on record for this cut: every 0.25s, native resolution.' };
  }

  const conform = readReceipt('conform', filmPath);
  if (!conform.exists || conform.stale) {
    return { step: 'conform', done: false, next: `node harness/dev/conform.mjs D=${filmArg}`,
      why: 'brief conformance has not been checked against this cut yet.' };
  }
  if (conform.receipt.ok === false && !isWaivedBy(allow, 'conform-fail')) {
    return { step: 'conform', done: false, next: `node harness/dev/conform.mjs D=${filmArg}`,
      why: `${conform.receipt.failedCount} brief claim(s) failed last run (see the fix: lines it printed). `
        + `Fix them and re-run, or waive with {"authoring":{"allow":["conform-fail"],"_why":{"conform-fail":"…"}}}.` };
  }

  const motionFail = motionStep(scene, filmPath, filmArg, mp4, allow);
  if (motionFail) return motionFail;

  const verify = readReceipt('verify', filmPath);
  if (!verify.exists || verify.stale) {
    return { step: 'verify', done: false, next: `node harness/dev/verify.mjs D=${filmArg}`,
      why: 'hard numbers have not been pulled for this cut yet.' };
  }
  if (verify.receipt.ok === false) {
    return { step: 'verify', done: false, next: `node harness/dev/verify.mjs D=${filmArg}`,
      why: `an objective failure last run: ${(verify.receipt.hardFail || []).join('; ') || 'see the printed block'}. Fix it and re-run.` };
  }

  const judges = twoJudgesStatus(filmPath, mp4);
  if (!judges.ok && !isWaivedBy(allow, 'judge-score')) {
    return { step: 'judges', done: false, next: `make judge D=${filmArg} STRUCT=1`,
      why: `${judges.reason}. Prep the sheet, then hand it to two FRESH agents.`,
      brief: judgeBrief(filmArg) };
  }

  return { step: 'ship', done: true, next: `make ship D=${filmArg}`,
    why: 'draft, still sheet, conform and verify are fresh, and two independent judges both cleared this cut at 7/10 or above.' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) { console.error('usage: node quality/gates/post-draft.mjs films/scene/<film>.json'); process.exit(2); }
  const r = postDraftStep(arg);
  console.log(`\n  post-draft step: ${r.step.toUpperCase()}${r.done ? ' (ready)' : ''}`);
  console.log(`  why: ${r.why}`);
  console.log(`  do:  ${r.next}\n`);
  if (r.brief) console.log(`${r.brief}\n`);
  process.exit(0);
}
