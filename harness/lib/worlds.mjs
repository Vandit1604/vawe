// A world is one beat of the page: an element with data-world="<id>". Pure span math over the samples that
// harness/media/world-sample.mjs reads. A sample is { t, worlds: [{ id, visible, ground }] }.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { insideHold } from './still-limit.mjs';
import { waiverHint } from './waivers.mjs';

export const TURN_SECONDS_MAX = LIMITS['world-turns'].turn_seconds_max;
// A span is measured on the draft's 30 fps frame grid and a cut shows its world a frame or two early (the starter's does), so a world of exactly the limit measures up to about 0.1 s longer.
export const SPAN_SLACK_S = 0.1;

const round = (n) => +n.toFixed(3);

/** Every world id in page order. Pure. */
export const worldIds = (samples) => [...new Set(samples.flatMap((s) => s.worlds.map((w) => w.id)))];

/**
 * [{ id, start, end, ground }] per world in page order: the span covers the first to the last sample where the world was visible,
 * widened by half a sample step and kept inside [0, dur]. `ground` is read at the middle visible sample. A world never visible has null start, end and ground. Pure.
 */
export function worldSpans(samples, { step, dur }) {
  return worldIds(samples).map((id) => {
    const seen = samples.filter((s) => s.worlds.some((w) => w.id === id && w.visible));
    if (!seen.length) return { id, start: null, end: null, ground: null };
    const mid = seen[Math.floor((seen.length - 1) / 2)];
    return {
      id,
      start: round(Math.max(0, seen[0].t - step / 2)),
      end: round(Math.min(dur, seen.at(-1).t + step / 2)),
      ground: mid.worlds.find((w) => w.id === id).ground ?? null,
    };
  });
}

/** The second to take the still of one world: the middle of its visible span, or 0 when the page never shows it. Pure. */
export const stillTime = (span) => (span && span.start != null ? round((span.start + span.end) / 2) : 0);

/** The world-held problems of measured spans: one { len, text } per world visible longer than `max` seconds, outside a declared hold. Each world is a turn, even next to a world of the same ground. Pure. */
export function heldWorlds(spans, max = TURN_SECONDS_MAX, authoring = {}) {
  const held = insideHold(authoring);
  return spans
    .filter((s) => s.start != null && s.end - s.start > max + SPAN_SLACK_S && !held({ a: s.start, b: s.end }))
    .map((s) => ({ len: s.end - s.start, text: `world held ${s.id} ${s.start}-${s.end} s (${round(s.end - s.start)} s); ${waiverHint(`dead-air@${s.start}-${s.end}`)}` }));
}

/** The starter's beats: equal lengths, none longer than the world-turns limit, at least 2: [{ id, start, end }]. Pure. */
export function starterBeats(length) {
  const n = Math.max(2, Math.ceil(length / TURN_SECONDS_MAX - 1e-9));
  const at = (i) => +((length * i) / n).toFixed(2);
  return Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, start: at(i), end: at(i + 1) }));
}
