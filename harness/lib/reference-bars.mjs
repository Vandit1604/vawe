// harness/lib/reference-bars.mjs: what the studied EXTERNAL references say, read off refs/*/study.json.
//
// A quality bar should measure this engine against the outside world, not against the films we have
// already made (that is variety pressure, `library-top5-only`'s job, and stays relative on purpose).
// Two of the numbers a bar needs used to live only as PROSE, hand-quoted from a study nobody could
// re-check: films/scene/pin-recreation.storyboard.md ("median frame delta ~0.23") and
// films/scene/latch-recreation.prompt.md ("median frame delta 0.08, a fully held final 2.5s"). No
// gate can read a sentence, so a bar could not cite either figure. `make study` already writes the
// machine-readable form, refs/<name>/study.json (harness/media/study.mjs); this is the one reader
// that turns every such file on disk into one external bar, so a gate imports THIS, never a second
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

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * readReferenceBars(refsDir = ROOT/refs) -> the external bar, or a stated empty-bank fallback.
 *
 * On a bank with at least one study: { n, names, medianShotS, longestHoldS, medianFrameDelta }.
 *   medianShotS      median of each reference's own median shot length (`measured.medianShot`).
 *   longestHoldS     the single LONGEST measured hold seen in any reference (`measured.longestHoldS`,
 *                    harness/media/study.mjs, derived from its own per-shot motion measure,
 *                    harness/media/shot-detect.mjs's motionDeltaSeries): the hold-length bar wants the
 *                    longest a real reference has shown to be a deliberate choice, not an average.
 *   medianFrameDelta median of each reference's own median frame delta (`measured.medianFrameDelta`).
 * A field is null, not omitted, when no study on disk carries that number (an old study.json predating
 * Task 2's fields still counts toward `n` and toward whichever fields it does carry).
 *
 * On an empty bank: { n: 0, reason }.
 */
export function readReferenceBars(refsDir = path.join(ROOT, 'refs')) {
  if (!fs.existsSync(refsDir)) {
    return { n: 0, reason: `${path.relative(ROOT, refsDir)} does not exist (refs/ is gitignored; empty on CI and a fresh clone, by design)` };
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
    return { n: 0, reason: `${path.relative(ROOT, refsDir)} exists but carries no refs/*/study.json (run \`make study VIDEO=<clip> NAME=<name>\` first)` };
  }
  return {
    n: names.length,
    names,
    medianShotS: median(shotLens),
    longestHoldS: holds.length ? Math.max(...holds) : null,
    medianFrameDelta: median(deltas),
  };
}
