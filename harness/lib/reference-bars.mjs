// harness/lib/reference-bars.mjs: what the studied EXTERNAL references say, read off refs/*/study.json.
//
// NOT THE ROUTE TO AN ABSOLUTE QUALITY BAR. It reads as an outside measurement, not a corpus of our
// own films, but "measured a few real clips" and "cite a published standard" are still two different
// evidence classes (the four-category test in engine-doctrine's rules-from-sources plan): a bank of
// five clips is a better SAMPLE of the same weaker kind of evidence, not a stronger one. Concretely,
// harness/lib/genre-pacing.mjs's held-state cap used to read `longestHoldS` off this bank and swung
// 2.6s-3.6s, a 38% move, off the SAME two clips depending only on which delta metric read them. It
// tried quality/gates/read-check.mjs's already-sourced MAX_HOLD next, and that failed too, for a
// different reason: MAX_HOLD is sourced for TIME TO READ PROSE, and a held beat need carry no prose at
// all, so the citation does not reach the question (genre-pacing.mjs's header has the full argument).
// There is no held-state CAP left; the judgement moved to `make plan-judge`'s `beat-pacing` code, an
// agent looking at the plan. This file still runs, and a caller may still REPORT what it measured next
// to a finding as evidence an author can weigh, it just never gets to DECIDE a threshold on its own.
//
// Two of the numbers a bar needs used to live only as PROSE, hand-quoted from a study nobody could
// re-check: films/scene/pin-recreation.storyboard.md ("median frame delta ~0.23") and
// films/scene/latch-recreation.prompt.md ("median frame delta 0.08, a fully held final 2.5s"). No
// gate can read a sentence, so a bar could not cite either figure. `make study` already writes the
// machine-readable form, refs/<name>/study.json (harness/media/study.mjs); this is the one reader
// that turns every such file on disk into one external bar, so a caller imports THIS, never a second
// hand-rolled read of refs/.
//
// AN EMPTY BANK IS A STATED FALLBACK, NEVER A SILENT DEFAULT. refs/ is gitignored (CLAUDE.md, "Never
// embed copyrighted material" is the same reason the frames themselves cannot be committed), so CI and
// a fresh clone always see zero studies: that is the NORMAL path this function runs, not an edge case
// to special-case away. Returning a fabricated number here would put a confident green back exactly
// where the corpus-dependence this file exists to remove came from. Every return carries `n` (0 when
// the bank is empty) and, when `n` is 0, a `reason` naming why; a caller MUST check `n` before trusting
// any of the other fields and must say, out loud, that its own constant is uncalibrated when `n` is 0.
//
// TWO REFERENCES IS A THIN BASIS. `n` travels with every number this returns so a caller can print it
// wherever the bar is quoted, rather than let a bank of two clips read as if it were authoritative.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// MIN_REFERENCES IS MEASURED, NOT CHOSEN BY TASTE. The two references on disk when this file was
// written disagreed with each other by enough to swing genre-pacing.mjs's DEFAULT_MAX_S between 2.6s
// and 3.6s depending only on which delta metric measured them, a 1.0s (38%) swing off the SAME two
// clips with no new data at all, and that swing moved held-state-too-long findings across the corpus
// from 71 to 42. At n=2, one atypical reference is half the bank; the swing above is what "half the
// bank is one clip" costs in practice. Requiring 5 caps any single reference's share of the bank at a
// fifth, the same logic a percentile estimate uses to refuse to trust n<5: below it, `readReferenceBars`
// still measures and returns everything it can (a caller REPORTS the evidence), but `ready` says false
// and no caller may treat the bank's numbers as a bar to enforce. Raise this only when a wider swing
// test, run the same way, shows 5 references no longer move the cap by a margin nobody would accept.
export const MIN_REFERENCES = 5;

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * readReferenceBars(refsDir = ROOT/refs) -> the external bar, ALWAYS measured when there is anything
 * to measure, whether or not it clears MIN_REFERENCES.
 *
 * On a bank with at least one study: { n, ready, names, medianShotS, longestHoldS, medianFrameDelta }.
 *   ready            n >= MIN_REFERENCES. A caller may only ENFORCE the numbers below when this is
 *                    true; below it, the bank still REPORTS them (the evidence an author can read
 *                    next to the library number still in force), it just does not get to decide.
 *   medianShotS      median of each reference's own median shot length (`measured.medianShot`).
 *   longestHoldS     the single LONGEST measured hold seen in any reference (`measured.longestHoldS`,
 *                    harness/media/study.mjs, derived from its own per-shot motion measure,
 *                    harness/media/shot-detect.mjs's motionDeltaSeries): the hold-length bar wants the
 *                    longest a real reference has shown to be a deliberate choice, not an average.
 *   medianFrameDelta median of each reference's own median frame delta (`measured.medianFrameDelta`).
 * A field is null, not omitted, when no study on disk carries that number (an old study.json predating
 * Task 2's fields still counts toward `n` and toward whichever fields it does carry).
 *
 * On an empty bank: { n: 0, ready: false, reason }.
 */
export function readReferenceBars(refsDir = path.join(ROOT, 'refs')) {
  if (!fs.existsSync(refsDir)) {
    return { n: 0, ready: false, reason: `${path.relative(ROOT, refsDir)} does not exist (refs/ is gitignored; empty on CI and a fresh clone, by design)` };
  }
  const names = [];
  const shotLens = [];
  const holds = [];
  const deltas = [];
  for (const entry of fs.readdirSync(refsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const studyPath = path.join(refsDir, entry.name, 'study.json');
    if (!fs.existsSync(studyPath)) continue;
    let study;
    try { study = JSON.parse(fs.readFileSync(studyPath, 'utf8')); } catch { continue; }
    const m = study.measured || {};
    names.push(entry.name);
    if (typeof m.medianShot === 'number') shotLens.push(m.medianShot);
    if (typeof m.longestHoldS === 'number') holds.push(m.longestHoldS);
    if (typeof m.medianFrameDelta === 'number') deltas.push(m.medianFrameDelta);
  }
  if (!names.length) {
    return { n: 0, ready: false, reason: `${path.relative(ROOT, refsDir)} exists but carries no refs/*/study.json (run \`make study VIDEO=<clip> NAME=<name>\` first)` };
  }
  return {
    n: names.length,
    ready: names.length >= MIN_REFERENCES,
    names,
    medianShotS: median(shotLens),
    longestHoldS: holds.length ? Math.max(...holds) : null,
    medianFrameDelta: median(deltas),
  };
}
