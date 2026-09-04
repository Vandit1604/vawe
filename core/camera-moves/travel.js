import { span, hold } from './units.js';

// travel. The station-to-station journey: one continuous flight that visits several points in STAGE
// coords (in on element A, across to element B, out to the whole board). Two films in the library spell
// this out with 12 and 20 hand-typed keyframes; the arithmetic they were re-deriving is the pan math at
// the top of core/camera-moves.js, which is why multiPhase (raw x/y deltas) is not a substitute.
// Each station is { tx, ty, s?, dwell?, dur? }: `dur` is the flight INTO the station, `dwell` a hold AT
// it once arrived. Station 0 is where the flight BEGINS, so nothing flies into it and its `dur` is unused.
// Author the wide shot as station 0 when the film should open full-frame and fly in.
// Interiors are linear on purpose: an eased curve at every station zeroes velocity on each arrival, so
// the journey lands as N separate hops instead of one move (docs/MISTAKES.md #125). Only the last
// arrival settles.
export function travel({ stations, start = 0, ease = 'easeOutCubic', canvasW = 1920,
  canvasH = 1080 } = {}) {
  if (!Array.isArray(stations) || !stations.length)
    throw new Error(`travel needs a non-empty "stations" array; got ${JSON.stringify(stations ?? null)}`);
  const kf = [];
  let prev = { s: 1, x: 0, y: 0 }, t = start, lastArrival = 0;
  stations.forEach((st, i) => {
    // A station may legitimately OMIT tx/ty (that is the carry-forward, a zoom in place). A station that
    // SUPPLIES one non-finite is a typo, and it would poison every later keyframe through prev, one bad
    // station silently NaNs the rest of the journey, not just its own stop.
    for (const k of ['tx', 'ty', 's']) {
      if (st && st[k] != null && !Number.isFinite(st[k]))
        throw new Error(`travel station ${i}: "${k}" must be a finite number; got ${JSON.stringify(st[k])}`);
    }
    // Every axis a station does not mention CARRIES FORWARD, all three of them: a station with only `s`
    // is a zoom in place, one with only tx/ty pans at the scale it arrived with. multiPhase carried `s`
    // and reset x/y to 0 on the same line, which turned its documented hold into a pan home (#197).
    const pose = {
      s: st.s ?? prev.s,
      x: st.tx == null ? prev.x : canvasW / 2 - st.tx,
      y: st.ty == null ? prev.y : canvasH / 2 - st.ty,
    };
    if (i > 0) t += span('travel', `station ${i} "dur"`, st.dur ?? 0.8);
    const arrive = { t, ...pose };
    if (i > 0) arrive.ease = 'linear';
    lastArrival = kf.push(arrive) - 1;
    // A dwell is a second keyframe at the SAME pose, so the hold is a real hold rather than the tail of
    // the incoming tween creeping on.
    if (hold('travel', `station ${i} "dwell"`, st.dwell)) { t += st.dwell; kf.push({ t, ...pose, ease: 'linear' }); }
    prev = pose;
  });
  // The settle belongs to the ARRIVAL at the final station, never to a dwell keyframe behind it: a hold
  // has no motion left to ease, and easing into it would brake the flight twice.
  if (lastArrival > 0) kf[lastArrival].ease = ease;
  return kf;
}
