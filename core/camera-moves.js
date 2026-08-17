// core/camera-moves.js — CAMERA CHOREOGRAPHY generators: pure (params) → camera-keyframe array, the same
// shape core/sequence.js `cameraAt` interpolates ([{t,s,x,y,rx,ry,ease}], t in absolute seconds). A move
// is smooth and CALCULATED instead of hand-typed, and the multi-keyframe ones emit interior `ease:"linear"`
// automatically so a chained push is velocity-CONTINUOUS (docs/MISTAKES.md #125: a chained ease-in-out
// pulses because it zeroes velocity at every keyframe — the "shaking zoom"). Only the final settle eases
// out. All pure → renderFrame(n) stays seek-safe; assert the endpoints with `make lib-test`.
//
// Pan math: the camera transform is `scale(s) translate(x,y)` about the stage centre, so translating by
// (W/2 - tx, H/2 - ty) brings a target point (tx,ty) to centre at ANY scale — diveIn uses exactly this.
//
// Author sugar: `"cameraMove": { "move":"diveIn", ... }` at the scene root expands (make expand) to
// `data.camera`. Compose legs by hand for anything these don't cover.

const CENTER = { w: 1920, h: 1080 };

// slowPush — a gentle, continuous zoom in (the default "the frame is alive" move). One segment, ease-out.
export function slowPush({ start = 0, dur = 6, from = 1, to = 1.12, ease = 'easeOutCubic' } = {}) {
  return [{ t: start, s: from, x: 0, y: 0 }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}

// diveIn — zoom INTO a target point (a UI element, a face), which travels to centre as the scale grows.
// power4.out feel (fast in, long settle) via easeOutQuart. tx/ty in stage coords.
export function diveIn({ start = 0, dur = 1.6, tx, ty, to = 1.6, canvasW = CENTER.w, canvasH = CENTER.h,
  ease = 'easeOutQuart' } = {}) {
  // tx/ty have no default and cannot have one: the whole move is "go to THIS point". Omit either and the
  // keyframe carried NaN, cameraAt lerped NaN, and the camera pose was NaN for the entire segment with
  // nothing said — the silent-substitution class this repo logs most. dollyZ already refuses a bad `s`
  // for the same reason, and this is the same refusal one field over.
  for (const [k, v] of [['tx', tx], ['ty', ty]]) {
    if (!Number.isFinite(v)) throw new Error(`diveIn needs a finite "${k}" (the stage coordinate to centre on); got ${JSON.stringify(v)}`);
  }
  return [
    { t: start, s: 1, x: 0, y: 0 },
    { t: start + dur, s: to, x: canvasW / 2 - tx, y: canvasH / 2 - ty, ease },
  ];
}

// panFollow — the camera TRANSLATES to keep pace with content that grows downward (the "terminal types
// while the camera pans down" move). Linear so the pan tracks the typing at constant speed, no easing lurch.
export function panFollow({ start = 0, dur = 5, dx = 0, dy = -300, s = 1, ease = 'linear' } = {}) {
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: dy, ease }];
}

// workspaceZoomOut — start pushed IN on a detail, then pull back to reveal the whole workspace (the
// opposite of diveIn). Ends on a slow settle.
export function workspaceZoomOut({ start = 0, dur = 3, from = 1.4, to = 1, tx, ty, canvasW = CENTER.w,
  canvasH = CENTER.h, ease = 'easeOutCubic' } = {}) {
  const fx = tx != null ? canvasW / 2 - tx : 0, fy = ty != null ? canvasH / 2 - ty : 0;
  return [{ t: start, s: from, x: fx, y: fy }, { t: start + dur, s: to, x: 0, y: 0, ease }];
}

// orbit — a gentle 3D swing around the frame (ry sweeps through 0), giving depth to a dimensional beat.
// 3 keyframes → interior gets ease:"linear" so the swing is one continuous arc, not two eased halves.
export function orbit({ start = 0, dur = 6, deg = 12, s = 1.05, ease = 'easeInOutSine' } = {}) {
  const mid = start + dur / 2;
  return [
    { t: start, s, x: 0, y: 0, ry: -deg },
    { t: mid, s, x: 0, y: 0, ry: 0, ease: 'linear' },   // interior: linear keeps velocity continuous (#125)
    { t: start + dur, s, x: 0, y: 0, ry: deg, ease },
  ];
}

// multiPhase — chain several legs into one journey (push → hold-with-drift → settle). Each leg is
// { dur, s?, x?, y? }; interior keyframes get ease:"linear" so the whole path is velocity-continuous and
// a "hold" leg still creeps (never a dead freeze). Only the last leg eases out.
export function multiPhase({ start = 0, legs = [], settleEase = 'easeOutCubic' } = {}) {
  const kf = [{ t: start, s: 1, x: 0, y: 0 }];
  let t = start;
  legs.forEach((leg, i) => {
    t += leg.dur ?? 1;
    const last = i === legs.length - 1;
    // Every axis a leg does not mention CARRIES FORWARD. `s` always did; x and y defaulted to 0 on the
    // same line, so the documented "hold" leg (`{dur: 2}` between a push and a settle) was not a hold at
    // all — it panned the camera the whole way back to centre, 180px over 2s in the docstring's own
    // example, a move as large as the push it was supposed to be holding after. The right idiom was
    // known and applied to one of three axes (docs/MISTAKES.md #197).
    const prev = kf[kf.length - 1];
    kf.push({ t, s: leg.s ?? prev.s, x: leg.x ?? prev.x, y: leg.y ?? prev.y, ease: last ? settleEase : 'linear' });
  });
  return kf;
}

// travel — the station-to-station journey: one continuous flight that visits several points in STAGE
// coords (in on element A, across to element B, out to the whole board). Two films in the library spell
// this out with 12 and 20 hand-typed keyframes; the arithmetic they were re-deriving is the pan math at
// the top of this file, which is why multiPhase (raw x/y deltas) is not a substitute.
// Each station is { tx, ty, s?, dwell?, dur? }: `dur` is the flight INTO the station, `dwell` a hold AT
// it once arrived. Station 0 is where the flight BEGINS, so nothing flies into it and its `dur` is unused
// — author the wide shot as station 0 when the film should open full-frame and fly in.
// Interiors are linear on purpose: an eased curve at every station zeroes velocity on each arrival, so
// the journey lands as N separate hops instead of one move (docs/MISTAKES.md #125). Only the last
// arrival settles.
export function travel({ stations, start = 0, ease = 'easeOutCubic', canvasW = CENTER.w,
  canvasH = CENTER.h } = {}) {
  if (!Array.isArray(stations) || !stations.length)
    throw new Error(`travel needs a non-empty "stations" array; got ${JSON.stringify(stations ?? null)}`);
  const kf = [];
  let prev = { s: 1, x: 0, y: 0 }, t = start, lastArrival = 0;
  stations.forEach((st, i) => {
    // A station may legitimately OMIT tx/ty (that is the carry-forward, a zoom in place). A station that
    // SUPPLIES one non-finite is a typo, and it would poison every later keyframe through prev — one bad
    // station silently NaNs the rest of the journey, not just its own stop.
    for (const k of ['tx', 'ty', 's', 'dur', 'dwell']) {
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
    if (i > 0) t += st.dur ?? 0.8;
    const arrive = { t, ...pose };
    if (i > 0) arrive.ease = 'linear';
    lastArrival = kf.push(arrive) - 1;
    // A dwell is a second keyframe at the SAME pose, so the hold is a real hold rather than the tail of
    // the incoming tween creeping on.
    if (st.dwell) { t += st.dwell; kf.push({ t, ...pose, ease: 'linear' }); }
    prev = pose;
  });
  // The settle belongs to the ARRIVAL at the final station, never to a dwell keyframe behind it: a hold
  // has no motion left to ease, and easing into it would brake the flight twice.
  if (lastArrival > 0) kf[lastArrival].ease = ease;
  return kf;
}

// truck — the plain lateral travel (the camera runs along a wall of cards). panFollow's defaults are
// VERTICAL (dy: -300), so a sideways move had no name and got hand-typed each time. Linear because a
// constant-speed side move reads as the camera tracking; an eased one reads as a lurch.
export function truck({ start = 0, dur = 3, dx = -1920, s = 1, ease = 'linear' } = {}) {
  return [{ t: start, s, x: 0, y: 0 }, { t: start + dur, s, x: dx, y: 0, ease }];
}

// name → generator, so the scene sugar and any catalog derive the vocabulary from the code.
export const CAMERA_MOVES = { slowPush, diveIn, panFollow, workspaceZoomOut, orbit, multiPhase, travel, truck };
export const CAMERA_MOVE_NAMES = Object.keys(CAMERA_MOVES);

// The params a move accepts, READ OFF ITS OWN SIGNATURE rather than declared in a table beside it. A
// table is a second source of truth that drifts the first time somebody adds a param, and this file's
// whole contract is that the vocabulary derives from the code (CAMERA_MOVES above does the same).
// Nothing minifies here: core/*.js is served raw to the browser and imported raw by the gates.
const paramsOf = (f) => {
  const src = String(f);
  const open = src.indexOf('{', src.indexOf('('));
  if (open < 0) return null;                       // not a destructuring signature: cannot say, so don't
  let depth = 0, close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { close = i; break; }
  }
  if (close < 0) return null;
  const names = [];
  let d = 0, cur = '';
  for (const ch of src.slice(open + 1, close)) {
    if ('{[('.includes(ch)) d++;
    else if ('}])'.includes(ch)) d--;
    if (ch === ',' && d === 0) { names.push(cur); cur = ''; } else cur += ch;
  }
  names.push(cur);
  return new Set(names.map((n) => n.split('=')[0].trim()).filter(Boolean));
};

// A move that centres a POINT needs to know the frame it is centring in. Landscape is only the default
// because this module cannot see the scene; the sugar path can, so it must pass it.
const TARGETING = new Set(['diveIn', 'workspaceZoomOut', 'travel']);
const targetsAPoint = (name, params) => TARGETING.has(name)
  && (params.tx != null || params.ty != null
    || (Array.isArray(params.stations) && params.stations.some((s) => s && (s.tx != null || s.ty != null))));

// buildCameraMove(spec, canvas) — the sugar resolver: { move, ...params } → a camera-keyframe array.
// `canvas` is [W, H] from the scene's own aspect (scripts/author/expand-blocks.mjs passes sceneDims(d)).
export function buildCameraMove(spec, canvas = null) {
  if (!spec || !spec.move) throw new Error('cameraMove needs a "move" name');
  const f = CAMERA_MOVES[spec.move];
  if (!f) throw new Error(`unknown cameraMove "${spec.move}". one of: ${CAMERA_MOVE_NAMES.join(', ')}`);
  const { move, ...params } = spec;
  // A KEY THIS MOVE DOES NOT READ IS A TYPO, and a silently dropped param is the worst failure class in
  // this engine: `station:` for `stations:` reached travel as an ignored extra and threw about a missing
  // array; `too:` for `to:` on slowPush would have rendered a move nobody asked for and said nothing.
  const known = paramsOf(f);
  if (known) {
    const unknown = Object.keys(params).filter((k) => !known.has(k));
    if (unknown.length) throw new Error(`cameraMove "${move}" does not read ${unknown.map((k) => `"${k}"`).join(', ')}`
      + ` — it accepts: ${[...known].join(', ')}. A dropped param renders a move you did not author.`);
  }
  // The pan math is `canvasW/2 - tx`, so a landscape default under a 1080x1920 portrait scene mis-centres
  // every target by 420px on each axis, silently. No scene in the library hits this today, because every
  // one that names a target also spells out canvasW/canvasH by hand — which is the workaround that says
  // the default was wrong. Resolve it from the scene, and refuse to guess when nobody can supply it.
  if (targetsAPoint(move, params)) {
    if (canvas) { params.canvasW = params.canvasW ?? canvas[0]; params.canvasH = params.canvasH ?? canvas[1]; }
    if (params.canvasW == null || params.canvasH == null)
      throw new Error(`cameraMove "${move}" centres a point (tx/ty), so it needs the frame it centres in.`
        + ` Pass the scene canvas as buildCameraMove(spec, sceneDims(data)), or set canvasW/canvasH on the spec.`);
  }
  return f(params);
}
