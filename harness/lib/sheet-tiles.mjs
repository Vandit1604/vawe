// The judge's contact sheet, counted the way the judge counts it: taste rule world-turns allows at most 8
// near-identical adjacent tiles in a row and at most 4 at the tail. harness/media/judge-fresh.mjs builds
// the sheet from these constants, and the draft and final checks read the same tiles, so dev and the
// judge see one number. A run inside a declared hold ("dead-air" waiver) is not counted.
import { declaredHolds } from './still-limit.mjs';

export const SHEET_FPS = 5;
export const SHEET_MAX_FRAMES = 150;
export const TILE_W = 288;
export const RUN_TILES = 8;
export const TAIL_TILES = 4;

// Mean absolute grey difference (0-255) between adjacent 288 px tiles. Measured on the exp-h4o draft: the
// tail tiles 4.0-4.8 s the judge called "5 static tiles" differ by 3.4 to 3.6; the next larger pair on that sheet, by 5.2.
export const NEAR_IDENTICAL = 4.5;

export const sheetFps = (dur) => Math.min(SHEET_FPS, SHEET_MAX_FRAMES / dur);

/** Runs of near-identical adjacent tiles: [{ a, b, tiles }] in seconds, from the adjacent-tile differences. Pure. */
export function tileRuns(diffs, fps) {
  const runs = [];
  let start = null;
  for (let i = 0; i <= diffs.length; i++) {
    if (i < diffs.length && diffs[i] < NEAR_IDENTICAL) { if (start === null) start = i; continue; }
    if (start !== null) runs.push({ a: +(start / fps).toFixed(2), b: +(i / fps).toFixed(2), tiles: i - start + 1 });
    start = null;
  }
  return runs;
}

const heldBy = (authoring) => {
  const holds = declaredHolds(authoring);
  return (r) => holds.some(([a, b]) => a <= r.a + 1e-9 && r.b <= b + 1e-9);
};

/** The tiles in the near-identical run that reaches the end of the sheet, 0 for none or a declared hold. Pure. */
export function tailTiles(diffs, fps, authoring = {}) {
  const held = heldBy(authoring);
  const lastTile = +(diffs.length / fps).toFixed(2);
  const run = tileRuns(diffs, fps).find((r) => r.b === lastTile && !held(r));
  return run ? run.tiles : 0;
}

/** The problem lines for the sheet's runs: over RUN_TILES anywhere, over TAIL_TILES at the end. Pure. */
export function tileProblems(diffs, fps, authoring = {}) {
  const held = heldBy(authoring);
  const lastTile = +(diffs.length / fps).toFixed(2);
  const lines = [];
  for (const r of tileRuns(diffs, fps)) {
    if (held(r)) continue;
    const tail = r.b === lastTile;
    const limit = tail ? TAIL_TILES : RUN_TILES;
    if (r.tiles <= limit) continue;
    lines.push(`${r.tiles} near-identical ${tail ? 'tail ' : ''}tiles ${r.a}-${r.b} s on the judge's sheet (limit ${limit}): add a move there or make the push larger, or declare the hold with "dead-air@${r.a}-${r.b}" in authoring.allow and a _why`);
  }
  return lines;
}
