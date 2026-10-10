// Intent then verify: what the Board says each cut does (its camera cell, its overshoots cell, its sound rows) against what the film measures.
// The Board is the plan, the measure is the page; a mismatch is advice with both values, never a refusal.
import { moveRows, parseBoard, boardFilled } from './board.mjs';
import { numberOf } from './brief-tables.mjs';

const NONE = /^\s*(none|no|-|n\/a)\b/i;
const MATCH_S = 0.1;
const LEAD_S = 0.3;

const s2 = (x) => +x.toFixed(2);
const inWindow = (t, [a, b]) => t >= a && t <= b;
const says = (cell) => (NONE.test(cell) || !cell.trim() ? 'none' : cell.trim());

/** The [from, to] seconds a cut row owns: its own range, else from just before the cut to the next cut (or `dur`). */
function windows(rows, dur) {
  return rows.map((r, i) => {
    const next = rows.slice(i + 1).find((n) => n.at !== null);
    return [Math.max(0, r.at - LEAD_S), r.end ?? (next ? next.at - LEAD_S : dur)];
  });
}

function cameraLines(rows, win, cameraSpans) {
  return rows.flatMap((r, i) => {
    if (r.at === null || !r.camera.trim()) return [];
    const seen = cameraSpans.filter(([a, b]) => b >= win[i][0] && a <= win[i][1]);
    const none = says(r.camera) === 'none';
    if (none && seen.length) return [`board: cut ${i + 1} (${r.label}) says camera "${says(r.camera)}" but the page runs a camera move at ${seen.map(([a, b]) => `${s2(a)}-${s2(b)} s`).join(', ')}`];
    if (!none && !seen.length) return [`board: cut ${i + 1} (${r.label}) says camera "${says(r.camera)}" but no camera move runs between ${s2(win[i][0])} and ${s2(win[i][1])} s`];
    return [];
  });
}

function overshootLines(rows, win, arrivals) {
  return rows.flatMap((r, i) => {
    if (r.at === null || !r.overshoots.trim()) return [];
    const inCut = arrivals.filter((a) => inWindow(a.at, win[i]));
    if (!inCut.length) return [];
    const over = inCut.filter((a) => a.over);
    const none = says(r.overshoots) === 'none';
    if (none && over.length) return [`board: cut ${i + 1} (${r.label}) says overshoots "none" but ${over.length} of ${inCut.length} arrivals overshoot, at ${over.slice(0, 3).map((a) => `${s2(a.at)} s`).join(', ')}`];
    if (!none && !over.length) return [`board: cut ${i + 1} (${r.label}) says overshoots "${says(r.overshoots)}" but none of its ${inCut.length} arrivals overshoot`];
    return [];
  });
}

function soundLines(brief, cues) {
  const rows = parseBoard(brief).sound;
  return rows.flatMap((row) => {
    const at = numberOf(row[0] ?? '');
    if (at === null || !cues.length) return [];
    const near = cues.reduce((best, c) => (Math.abs(c.at - at) < Math.abs(best.at - at) ? c : best));
    const lines = [];
    if (Math.abs(near.at - at) > MATCH_S) lines.push(`board: the sound row "${row[1] ?? 'voice'}" is at ${s2(at)} s but the nearest cue on the page is "${near.name}" at ${s2(near.at)} s: put the cue on the cut`);
    else if (!(row[2] ?? '').trim() && near.gainSet) lines.push(`board: the sound row at ${s2(at)} s leaves the gain empty (the voice default) but the page sets data-gain ${near.gain} dB on "${near.name}"`);
    return lines;
  });
}

/**
 * Advice lines where the Board and the measured film disagree. `measured`: { cameraSpans ([a, b] seconds, or null when not read), arrivals ([{ at, over }], may be empty),
 * cues ([{ name, at, gain, gainSet }], may be empty), dur }. A part that was not measured is not compared. [] for a brief with no filled Board.
 */
export function boardVerify(brief, { cameraSpans = null, arrivals = [], cues = [], dur = 0 } = {}) {
  if (boardFilled(brief ?? '') !== true) return [];
  const rows = moveRows(brief);
  const win = windows(rows, dur);
  return [
    ...(cameraSpans ? cameraLines(rows, win, cameraSpans) : []),
    ...(arrivals.length ? overshootLines(rows, win, arrivals) : []),
    ...soundLines(brief, cues),
  ];
}
