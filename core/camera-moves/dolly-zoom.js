import { span } from './units.js';

// dollyZoom. THE VERTIGO SHOT: the subject holds its exact size while the world behind it rushes in or
// falls away. Every other move in this package reframes; this one changes the RELATIONSHIP between
// planes, and it is the only move here that does not touch `s`.
//
// It is NOT an approximation, and it is not free either. The whole effect is one identity: under the
// camera rig (formats/scene/scene.js) a point at depth z is magnified by
//
//     m(z) = s * L / (L - s * z)          L = the lens (`p`), s = where the camera stands (dollyZ)
//
// At z = 0. The picture plane every layer sits on unless it says otherwise, that collapses to m = s,
// with no L in it at all. So holding `s` and ramping `p` moves the eye (the camera's own translateZ is
// L * (1 - 1/s), a function of the lens) while the subject's magnification cannot change. Behind it, a
// layer at z = -D is magnified by s*L / (L + s*D), which climbs with L. That difference IS the shot.
//
// WHAT IT CANNOT DO: nothing. There is no depth in a frame where every layer is on the picture plane,
// and this move renders as a still there, correctly, because m = s everywhere and there is no
// relationship left to change. The subject holds because it is on the plane; the field only moves if
// something STANDS somewhere, so give the backdrop layers `"modifiers": [{ "plane": -800 }]` and spread
// them. A scene that ramps the lens with nothing off the plane is refused by name at boot rather than
// rendered as a held frame.
//
// DIRECTION. `from` > `to` (the default) opens the lens as the eye comes in: the background SHRINKS AWAY
// and the space behind the subject stretches. The falling, ground-gives-way read Hitchcock shot it for.
// `from` < `to` closes the lens: the background swells up to the subject and the space compresses, which
// is the dread-arriving half of the same device.
export function dollyZoom({ start = 0, dur = 2.4, from = 2600, to = 900, s = 1, ease = 'easeInOutCubic' } = {}) {
  span('dollyZoom', 'dur', dur);
  // The lens is a DISTANCE from the eye to the picture plane, so zero or negative puts the eye on or
  // behind the plane it is looking at and CSS projects it anyway, mirrored, without a word.
  for (const [k, v] of [['from', from], ['to', to]]) {
    if (!(Number.isFinite(v) && v > 0))
      throw new Error(`dollyZoom: "${k}" is the lens distance in px and must be positive; got ${JSON.stringify(v)}`);
  }
  if (!(Number.isFinite(s) && s > 0))
    throw new Error(`dollyZoom: "s" is where the camera stands and must be a positive magnification; got ${JSON.stringify(s)}`);
  // Equal ends are the whole move deleted. It would render a held frame that looks like a deliberate
  // one, which is the silent-substitution shape this engine refuses everywhere else.
  if (from === to)
    throw new Error(`dollyZoom: "from" and "to" are both ${from}, so the lens never changes and nothing`
      + ` counter-scales. The move IS the lens ramp, give the two ends different distances.`);
  // `s` is stated on BOTH keys and never ramped: the subject holds because its magnification is exactly
  // `s`, and a second value would put it back on the scale ramp this move exists to cancel.
  return [
    { t: start, s, x: 0, y: 0, p: from },
    { t: start + dur, s, x: 0, y: 0, p: to, ease },
  ];
}
