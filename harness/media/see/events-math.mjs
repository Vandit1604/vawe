// Pure parts of the in-shot events of `vawe see`: what happens inside a shot (a part appearing, a burst of motion) at which second,
// set against the nearest sound, so "the action has its sound within one frame" is a number. No I/O.

export const APPEAR_MIN_FRAMES = 2;
export const SAME_FRAMES = 2;
export const WITHIN_FRAMES = 1;
export const NEAR_FRAMES = 3;
export const REACH_S = 0.3;

const round = (n, d = 3) => +n.toFixed(d);

/** The events of one shot, by second: a tracked part that first shows two frames or more after the shot opened, and each burst of frame energy (a burst that opens within two frames of an appearance is that appearance). Pure. */
export function shotEvents(shot, fps) {
  const appear = shot.moves.filter((m) => m.appears).map((m) => ({ t: m.firstSeen, what: `${m.id} appears`, kind: 'appears' }));
  const bursts = (shot.energy?.bursts ?? [])
    .filter((b) => !appear.some((a) => Math.abs(a.t - b.t0) * fps <= SAME_FRAMES + 1e-6))
    .map((b) => ({ t: b.t0, what: `burst of motion (peak ${b.peak}, until ${b.t1.toFixed(2)} s)`, kind: 'burst' }));
  return [...appear, ...bursts].sort((a, b) => a.t - b.t).map((e) => ({ ...e, t: round(e.t) }));
}

const verdictOf = (frames) => (frames == null ? 'no sound' : Math.abs(frames) <= WITHIN_FRAMES + 1e-6 ? 'sound on the frame' : frames < 0 ? 'sound before its action' : frames <= NEAR_FRAMES + 1e-6 ? 'sound near' : 'sound off');

/**
 * Each event with the nearest sound mark `{ t, label }` within REACH_S: `frames` is the sound minus the event (positive: the sound comes after
 * the action), `verdict` is `sound on the frame` within 1 frame, `sound before its action` when the sound comes more than a frame early (the cause-first rule), `sound near` within 3 frames after, `sound off` beyond, `no sound` when no mark is in reach. Pure.
 */
export function pairEvents(events, marks, fps) {
  return events.map((e) => {
    const near = marks.reduce((b, m) => (Math.abs(m.t - e.t) <= REACH_S + 1e-6 && (b == null || Math.abs(m.t - e.t) < Math.abs(b.t - e.t)) ? m : b), null);
    const frames = near ? round((near.t - e.t) * fps, 1) : null;
    return { ...e, sound: near ? { t: round(near.t), label: near.label, frames } : null, verdict: verdictOf(frames) };
  });
}

/** The sound marks no event of the film is within NEAR_FRAMES of: a sound with no action in the picture. Pure. */
export function soundsWithoutAction(marks, events, fps) {
  return marks.filter((m) => !events.some((e) => Math.abs(m.t - e.t) * fps <= NEAR_FRAMES + 1e-6)).map((m) => ({ t: round(m.t), label: m.label }));
}

/** { events, onFrame, share }: how many events have their sound on the frame. Pure. */
export function matchOf(shots) {
  const events = shots.flatMap((s) => s.events ?? []);
  const onFrame = events.filter((e) => e.verdict === 'sound on the frame').length;
  return { events: events.length, onFrame, share: events.length ? round(onFrame / events.length, 2) : null };
}

/** The printed lines of one shot's events. Pure. */
export function eventLines(events) {
  if (!events?.length) return [];
  return ['Events inside (second, what, nearest sound):', ...events.map((e) => `- ${e.t.toFixed(2)} s ${e.what}: ${e.sound ? `${e.sound.label} at ${e.sound.t.toFixed(2)} s (${e.sound.frames > 0 ? '+' : ''}${e.sound.frames} f), ${e.verdict}` : e.verdict}`)];
}

/**
 * What changes in the frame between two gray planes of w x h: { share (of the pixels that changed), box { x, y, w, h } as fractions, where, words }. Pure.
 * A change over 60% of the frame is a cut or a camera move; under 0.2% nothing moves.
 */
export function changeRegion(a, b, w, h, step = 24) {
  const xs = [], ys = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(a[y * w + x] - b[y * w + x]) > step) { xs.push(x); ys.push(y); }
  const share = xs.length / (w * h);
  if (share < 0.002) return { share: round(share, 4), box: null, where: null, words: 'nothing moves' };
  const span = (v) => { const s = [...v].sort((p, q) => p - q); return [s[Math.floor(0.05 * (s.length - 1))], s[Math.ceil(0.95 * (s.length - 1))]]; };
  const [x0, x1] = span(xs), [y0, y1] = span(ys);
  const box = { x: round(x0 / w, 2), y: round(y0 / h, 2), w: round((x1 - x0 + 1) / w, 2), h: round((y1 - y0 + 1) / h, 2) };
  const pct = share < 0.1 ? +(share * 100).toFixed(1) : Math.round(share * 100);
  if (share > 0.6) return { share: round(share, 3), box, where: 'whole frame', words: `the whole frame changes (${pct}%): a cut or a camera move` };
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const where = `${cy < 0.34 ? 'upper' : cy > 0.66 ? 'lower' : 'middle'} ${cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : 'centre'}`.replace('middle centre', 'centre');
  return { share: round(share, 3), box, where, words: `a part changes in the ${where} (${pct}% of the pixels, spread ${Math.round(box.w * 100)}% x ${Math.round(box.h * 100)}% of the frame)` };
}
