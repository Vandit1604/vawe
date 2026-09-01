// core/velocity-cut.js: WHERE a cut goes, read off the picture's own speed.
//
// THE TECHNIQUE. Ease a move across a seam, open the speed graph, and put the cut on the frame where
// that graph is steepest. The eye cannot resolve a join buried inside peak velocity, so a cut placed
// there is felt as continuous motion. The usual habit is the opposite: ease the move, then cut on the
// beat or on a round second, which puts the seam exactly where the picture is SLOWEST and most
// visible (docs/CRAFT/AE-TECHNIQUES.md #1).
//
// ADVISORY, NEVER AUTOMATIC, and that is a decision rather than a shortcut. A scene that writes
// `cuts: [{ t: 4.2 }]` has stated a time, and an engine that quietly rendered the cut at 4.55 would
// make the file disagree with the film. So this reports and the author moves the number, the same
// trade `make direct` already makes for every cut it suggests.
//
// ONE VELOCITY READ, and it is not this file's. `velocityAt` (core/sequence.js) is the engine's
// single owner of "how fast is this layer going": the automatic motion blur, the ghost trail and
// squash all read it, and a second implementation here would be the fact-with-two-owners drift this
// codebase logs more than any other. What this file adds is the SUM over the layers on screen, and
// the search for the peak.
import { velocityAt } from './sequence.js';

// A scale change moves pixels too, and the technique's own demonstration is a scale from 100 to 200
// per cent, so a reader that saw only translation would score that seam at zero. SCALE_REACH is how
// far an edge travels when scale changes by 1: half the height of the 1080 canvas, because a layer
// centred in frame grows by half its size in each direction. Approximate on purpose. This is a
// ranking of moments against each other, not a measurement of anything.
const SCALE_REACH = 540;

// AND ROTATION MOVES PIXELS, which this file missed and its own source technique proves. The recipe
// in docs/CRAFT/AE-TECHNIQUES.md #1 hands a fast ROTATION from one element to another across the
// seam, and a reader that saw only translation and scale scored that exact seam at ZERO px/s and
// reported it as a velocity trough: the advisory called the technique's own worked example the
// mistake it exists to catch. ROT_REACH is the radius the turning edge is assumed to sit at, a
// quarter of the 1080 canvas, so a degree per second becomes ROT_REACH * pi/180 px per second at
// that edge. Approximate on purpose, exactly as SCALE_REACH is: this ranks moments against each
// other and measures nothing.
const ROT_REACH = 270;
const DEG_TO_PX = (ROT_REACH * Math.PI) / 180;

/**
 * layerSpeedAt(L, t, fps): one layer's picture speed at SCENE time t, in px per second, or 0 when the
 * layer is off screen or carries no motion track. Translation, plus the edge travel implied by its
 * scale rate, plus the edge travel implied by its rotation rate.
 */
export function layerSpeedAt(L, t, fps = 30) {
  if (!L || !Array.isArray(L.motion) || !L.motion.length) return 0;
  const start = L.start ?? 0;
  const end = start + (L.duration ?? 2);
  if (t < start || t > end) return 0;
  const dt = 1 / fps;
  const v = velocityAt(L.motion, t - start, dt);
  return v.speed + (Math.abs(v.now.scale - v.prev.scale) / dt) * SCALE_REACH
    + (Math.abs(v.now.rot - v.prev.rot) / dt) * DEG_TO_PX;
}

/** pictureSpeedAt(layers, t, fps): the whole frame's speed, summed over whatever is on screen. */
export function pictureSpeedAt(layers, t, fps = 30) {
  let sum = 0;
  for (const L of layers) sum += layerSpeedAt(L, t, fps);
  return sum;
}

/**
 * cutVelocityAdvice(cuts, layers, opts): one row per cut, saying whether it sits in a velocity trough
 * and where the nearest peak is.
 *
 *   [{ t, speed, peak: { t, speed }, trough }]
 *
 * `trough` is true when the peak inside the search window is meaningfully faster than the cut's own
 * frame. `ratio` (default 2) is how much faster it has to be before this is worth saying: a picture
 * that is already near its local maximum needs no advice, and a report that fires on every cut is a
 * report nobody reads.
 *
 * `window` is how far either side of the cut to look, in seconds. Half a second by default, because a
 * suggestion that moves a cut by more than that is not placing a seam any more, it is re-timing the
 * film, and the author meant the beat they wrote.
 *
 * SEARCHED PER FRAME, on the film's own grid, so the answer is a frame the render can actually land
 * on. A finer search would return a time no frame exists at.
 */
export function cutVelocityAdvice(cuts, layers, { fps = 30, window = 0.5, ratio = 2, floor = 200, duration = Infinity } = {}) {
  const out = [];
  for (const c of cuts) {
    const t = c && typeof c.t === 'number' ? c.t : null;
    if (t === null) continue;
    const speed = pictureSpeedAt(layers, t, fps);
    let peak = { t, speed };
    const lo = Math.max(0, t - window), hi = Math.min(duration, t + window);
    for (let f = Math.ceil(lo * fps); f <= Math.floor(hi * fps); f++) {
      const s = pictureSpeedAt(layers, f / fps, fps);
      if (s > peak.speed) peak = { t: f / fps, speed: s };
    }
    // A frame with NO motion at all is not a trough, it is a film with nothing moving across that
    // seam, and telling its author to move the cut 8 frames would be noise. The technique needs a
    // move to HIDE INSIDE, and `floor` is how fast that move has to be before it can hide anything:
    // 200 px/s is under 7 pixels a frame at 30fps, and a seam is perfectly legible across that. Two
    // shipped films peak at 4 px/s beside a cut, which is a drift, not a move.
    const trough = peak.t !== t && peak.speed >= Math.max(speed * ratio, floor);
    out.push({ t, speed, peak, trough });
  }
  return out;
}
