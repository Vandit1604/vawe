import { span, hold } from './units.js';
import { motionAt } from '../sequence.js';   // followCursor samples the cursor's OWN path evaluator

// followCursor. THE CAMERA DERIVED FROM THE POINTER: the `cursor` layer's own `path` and `clicks` are
// the single owner of where the camera goes. Nothing else in this package reads a layer, and this one
// does not either: the sugar resolver (core/produce.js bindCursorCamera) hands the path, the click list
// and the layer's base offset over, so the generator stays a pure (params) -> keyframes function like
// its neighbours and lib-test can drive it with no scene at all.
//
// WHY IT EXISTS. An author who wrote `path` and `clicks` had already stated exactly where the pointer
// goes and when it presses. Reaching for `diveIn` after that means typing the same coordinates a second
// time and keeping the two copies in step by eye, which is the one-fact-two-owners defect this repo
// logs more than any other (docs/MISTAKES.md #423).
//
// THE SHOT. Push toward the point the pointer is ABOUT to press, arrive `lead` seconds BEFORE the
// press, hold across it, then release to the wide frame. Arriving after the press is worthless: the
// viewer has already been shown the result at the wrong size. `lead` is small on purpose, 0.18s, about
// five frames: enough that the frame has settled when the ripple fires, short enough that the camera
// still reads as chasing the pointer rather than as knowing the future.
//
// RESTRAINT, AND WHY IT NEEDS NO KNOB. Six clicks must not be six crash zooms. Two rules, both derived:
//   TIME   the camera releases only if it has time to release AND push again before the next press.
//          That window is exactly `dwell + release + dur + lead`, so it is computed, never authored:
//          a second knob would be a second opinion about the same arithmetic and would drift from it.
//   SPACE  two presses closer together than `regroup` px share ONE framing. The camera holds and the
//          pointer moves inside the frame, which is what a person watching a demo actually does.
// Clicks that fail both merge into one continuous flight: hold, travel, hold, one release at the end.
export function followCursor({ path, clicks, base = [0, 0], start = 0, to = 1.35, lead = 0.18,
  dur = 0.9, dwell = 0.6, release = 0.8, regroup = 160, canvasW = 1920, canvasH = 1080,
  ease = 'easeOutQuart', reframeEase = 'easeInOutCubic' } = {}) {
  if (!Array.isArray(path) || !path.length)
    throw new Error('followCursor needs the cursor layer\'s "path" ([{t,x,y}]); it is the only thing that'
      + ' says where the camera goes. Give the cursor a path, or hand-key `diveIn` at a fixed point.');
  path.forEach((k, i) => {
    for (const f of ['t', 'x', 'y']) {
      if (!Number.isFinite(k && k[f]))
        throw new Error(`followCursor: cursor path key ${i} has a non-numeric "${f}" (${JSON.stringify(k && k[f])}).`
          + ' A cursor path is absolute stage px on a real clock; a relative coordinate cannot be aimed at.');
    }
  });
  if (!Array.isArray(clicks) || !clicks.length)
    throw new Error('followCursor needs the cursor layer\'s "clicks" ([t...]): the move IS the arrival at a'
      + ' press, so with none there is no moment to arrive at. Add a click, or use `travel`/`panFollow`'
      + ' to follow the pointer without one.');
  for (const c of clicks) {
    if (!Number.isFinite(c) || c < 0)
      throw new Error(`followCursor: every "clicks" entry is a time in seconds from the cursor layer's own start; got ${JSON.stringify(c)}`);
  }
  span('followCursor', 'dur', dur);
  span('followCursor', 'release', release);
  hold('followCursor', 'lead', lead);
  hold('followCursor', 'dwell', dwell);
  hold('followCursor', 'regroup', regroup);
  if (!(Number.isFinite(to) && to >= 1))
    throw new Error(`followCursor: "to" is the magnification held over the press and must be >= 1; got ${JSON.stringify(to)}`);
  if (!Array.isArray(base) || base.length !== 2 || !base.every(Number.isFinite))
    throw new Error(`followCursor: "base" is the cursor layer's own [x, y] in stage px; got ${JSON.stringify(base)}`);

  // The pointer's ABSOLUTE stage position at a layer-local time. `path` x/y are offsets from the layer's
  // base (core/layers/cursor.js), and motionAt is the same evaluator the pointer itself is drawn with,
  // so the camera cannot aim anywhere the cursor is not. One fact, one owner.
  const pointAt = (lt) => { const m = motionAt(path, lt); return [base[0] + m.dx, base[1] + m.dy]; };
  const poseAt = (pt) => ({ s: to, x: canvasW / 2 - pt[0], y: canvasH / 2 - pt[1] });

  // The window inside which releasing would be undone before it finished. Derived, not authored.
  const settle = dwell + release + dur + lead;
  const shots = [];
  for (const c of [...clicks].sort((a, b) => a - b)) {
    const at = start + c, pt = pointAt(c), cur = shots[shots.length - 1];
    if (cur && at - cur.end <= settle) {
      const last = cur.stops[cur.stops.length - 1].pt;
      if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) > regroup) cur.stops.push({ arrive: at - lead, pt });
      cur.end = at;
    } else shots.push({ stops: [{ arrive: at - lead, pt }], end: at });
  }

  const kf = [];
  // KEYFRAME TIMES MUST ASCEND, or cameraAt locks onto the last key and the whole move is deleted (the
  // reason `span` exists in units.js). Two shapes reach the writer below and they are NOT the same
  // shape, which the first cut of this got wrong: it dropped the PREDECESSOR whenever a key was not
  // later, so with the shot spacing broken it quietly emitted a DESCENDING array instead of failing. A
  // key carrying a new pose therefore refuses; only a HOLD, which by definition has nothing to hold when
  // no time is left, is dropped.
  const holdKey = (k) => { if (!kf.length || k.t > kf[kf.length - 1].t) kf.push(k); };
  const poseKey = (k) => {
    if (kf.length && k.t <= kf[kf.length - 1].t)
      throw new Error(`followCursor: a key at ${k.t.toFixed(3)}s would land on or before the one at `
        + `${kf[kf.length - 1].t.toFixed(3)}s, and a jumbled array deletes the whole move. The spacing `
        + 'between shots is derived from dur/lead/dwell/release, so one of those has been pushed past '
        + 'what the click times leave room for.');
    kf.push(k);
  };
  for (const shot of shots) {
    const first = shot.stops[0];
    if (first.arrive <= start)
      throw new Error(`followCursor: the click at ${(first.arrive + lead - start).toFixed(2)}s lands before the`
        + ` camera can lead it (it needs ${lead}s of lead). Move the click later, lower "lead", or start the`
        + ' cursor layer earlier.');
    // Open wide, and hold there until the push begins. The push is CLIPPED, never rewound, when a click
    // sits closer to the cursor's own start than `dur`: a shorter push is still a shot, a negative one
    // is a jumbled keyframe array.
    const open = Math.max(start, first.arrive - dur, kf.length ? kf[kf.length - 1].t : start);
    holdKey({ t: open, s: 1, x: 0, y: 0, ...(kf.length ? { ease: 'linear' } : {}) });
    poseKey({ t: first.arrive, ...poseAt(first.pt), ease });
    let prevPress = first.arrive + lead;
    for (const st of shot.stops.slice(1)) {
      // A reframe inside one shot is a TRAVEL between two framings, not a second push: hold the current
      // pose until the move has to begin, then ease across. The hold key is dropped by `push` when the
      // two presses are so close that there is nothing left to hold.
      const prev = kf[kf.length - 1];
      // IT MAY NOT LEAVE THE PRESS IT IS HOLDING. `st.arrive - dur` alone put the departure 0.03s
      // BEFORE the first click of the demo probe: the camera was already sliding away as the ripple
      // fired, which is this move's own failure (arrive late) reached from the other side. So the
      // hold runs PAST the press, by `dwell` where there is room and by half the gap where there is
      // not, and the reframe takes what is left. Half, never all: a reframe with no time is a whip.
      const leave = Math.max(prev.t, st.arrive - dur,
        Math.min(prevPress + dwell, (prevPress + st.arrive) / 2));
      holdKey({ t: leave, s: prev.s, x: prev.x, y: prev.y, ease: 'linear' });
      poseKey({ t: st.arrive, ...poseAt(st.pt), ease: reframeEase });
      prevPress = st.arrive + lead;
    }
    if (dwell > 0) { const p = kf[kf.length - 1]; holdKey({ t: shot.end + dwell, s: p.s, x: p.x, y: p.y, ease: 'linear' }); }
    poseKey({ t: kf[kf.length - 1].t + release, s: 1, x: 0, y: 0, ease: reframeEase });
  }
  return kf;
}
