// The whole-frame moves of a film (a camera push, pull or drift, a transform on a world or stage root, parallax on the whole ground),
// read from the motion records (harness/lib/motion-lint.mjs). They are not element motion: live-hold counts a hold as alive only through
// a part moving inside the frame, and constant-camera asks for a camera that holds still by default. Pure.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { CUT, moveProps } from './motion-records.mjs';

const CAM = LIMITS['constant-camera'];
const FRAME = /^(transform|translate|scale|rotate)$/;

/** A whole-frame transform: the camera() preset, or a scale/translate/rotate on an element that covers most of the frame, for at least move_min_s. */
export const isCameraMove = (r) => r.duration >= CAM.move_min_s && (r.id === 'camera' || r.fullFrame) && moveProps(r).some((p) => FRAME.test(p));

/** The seconds [a, b] covered by `spans`, overlapping spans merged. */
function unionOf(spans) {
  const out = [];
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    const last = out.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else out.push([a, b]);
  }
  return out;
}

const spanOf = (r) => [r.delay, r.delay + r.duration];

const minus = (spans, cut) => spans.flatMap(([a, b]) => {
  const parts = [[a, b]];
  for (const [c, d] of cut) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const [p, q] = parts[i];
      if (d <= p || c >= q) continue;
      parts.splice(i, 1, ...[[p, Math.min(q, c)], [Math.max(p, d), q]].filter(([x, y]) => y > x));
    }
  }
  return parts;
});

/** The camera moves of a film as [a, b] seconds, merged. */
export const cameraSpans = (records) => unionOf(records.filter(isCameraMove).map(spanOf));

/**
 * The seconds where the camera moves and no part of the frame moves by itself: [a, b] pairs. An element move is any other record on a part
 * that does not cover the frame. Pure.
 */
export function cameraOnlySpans(records) {
  const alive = records.filter((r) => !isCameraMove(r) && !r.fullFrame && r.duration > CUT && r.props.length);
  return minus(cameraSpans(records), unionOf(alive.map(spanOf)));
}

const round2 = (x) => +x.toFixed(2);

/** The still runs of scene-stats with the camera-only spans added: pixels change under a camera move, so the page's records name those seconds. A run built from them carries `camera: true`. Pure. */
export function withCameraStills(runs, cameraOnly) {
  const parts = [...runs.map((r) => ({ a: r.a, b: r.b, camera: false })), ...cameraOnly.map(([a, b]) => ({ a, b, camera: true }))].sort((x, y) => x.a - y.a);
  const out = [];
  for (const p of parts) {
    const last = out.at(-1);
    if (last && p.a <= last.b) { last.b = Math.max(last.b, p.b); last.camera ||= p.camera; } else out.push({ ...p });
  }
  return out.filter((r) => r.b - r.a >= CAM.still_min_s).map((r) => ({ a: round2(r.a), b: round2(r.b), len: round2(r.b - r.a), ...(r.camera ? { camera: true } : {}) }));
}

const covered = (spans, [a, b]) => spans.reduce((s, [c, d]) => s + Math.max(0, Math.min(b, d) - Math.max(a, c)), 0);

/**
 * How much of the film the camera moves: { share (of the duration), worlds (the longest run of consecutive worlds with a camera move),
 * first (second the first move starts) }. A move that holds the `spectacle` second is the one deliberate move and is left out. A world has a
 * move when the camera covers half of it. `worlds` is [{ start, end }] or null. Pure.
 */
export function cameraLoad(records, { dur, worlds = null, spectacle = null }) {
  const moves = records.filter(isCameraMove).map(spanOf).filter(([a, b]) => spectacle == null || !(a <= spectacle && spectacle <= b));
  const spans = unionOf(moves);
  let run = 0, longest = 0;
  for (const w of worlds ?? []) {
    run = covered(spans, [w.start, w.end]) >= 0.5 * (w.end - w.start) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { share: dur > 0 ? covered(spans, [0, dur]) / dur : 0, worlds: longest, first: spans[0]?.[0] ?? null };
}
