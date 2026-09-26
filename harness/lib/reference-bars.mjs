import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
