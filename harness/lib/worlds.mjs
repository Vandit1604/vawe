// A world is one beat of the page: an element with data-world="<id>". Pure span math over the samples that
// harness/media/world-sample.mjs reads. A sample is { t, worlds: [{ id, visible, ground }] }.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { insideHold } from './still-limit.mjs';
import { waiverHint } from './waivers.mjs';
import { lineNeed, rowsNeed } from './read-hold.mjs';

export const TURN_SECONDS_MAX = LIMITS['world-turns'].turn_seconds_max;
// A span is measured on the draft's 30 fps frame grid and a cut shows its world a frame or two early (the starter's does), so a world of exactly the limit measures up to about 0.1 s longer.
export const SPAN_SLACK_S = 0.1;

// A world must outlast its text's read time by an entrance settling and an exit clearing (each about 0.4 s in the house presets).
export const READ_MARGIN_S = 0.8;

const WORDLESS_EVERY = 4;

const round = (n) => +n.toFixed(3);
const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

/** Seconds to read the texts one world shows (rows read together: harness/lib/read-hold.mjs rowsNeed), 0 for none. Pure. */
export const readNeed = (texts) => (texts.length ? round(rowsNeed(texts.map((t) => lineNeed(wordCount(t))))) : 0);

/** The longest a world may stay: the world-turns limit, or longer when its own text needs more time to read. Pure. */
export const worldLimit = (span, max = TURN_SECONDS_MAX) => Math.max(max, (span.readNeed ?? 0) + READ_MARGIN_S);

/** Every world id in page order. Pure. */
export const worldIds = (samples) => [...new Set(samples.flatMap((s) => s.worlds.map((w) => w.id)))];

/**
 * [{ id, start, end, ground, readNeed }] per world in page order: the span covers the first to the last sample where the world was visible,
 * widened by half a sample step and kept inside [0, dur]. `ground` is read at the middle visible sample; `readNeed` is the read time of every
 * text the world showed. A world never visible has null start, end and ground. Pure.
 */
export function worldSpans(samples, { step, dur }) {
  return worldIds(samples).map((id) => {
    const seen = samples.filter((s) => s.worlds.some((w) => w.id === id && w.visible));
    if (!seen.length) return { id, start: null, end: null, ground: null, readNeed: 0 };
    const mid = seen[Math.floor((seen.length - 1) / 2)];
    const texts = [...new Set(seen.flatMap((x) => x.worlds.find((w) => w.id === id).texts ?? []))];
    return {
      id,
      start: round(Math.max(0, seen[0].t - step / 2)),
      end: round(Math.min(dur, seen.at(-1).t + step / 2)),
      ground: mid.worlds.find((w) => w.id === id).ground ?? null,
      readNeed: readNeed(texts),
    };
  });
}

/** The second to take the still of one world: the middle of its visible span, or 0 when the page never shows it. Pure. */
export const stillTime = (span) => (span && span.start != null ? round((span.start + span.end) / 2) : 0);

/** True when the run { a, b } lies inside worlds that show text: a flat ground with words on it is a frame to read, not a blank. Pure. */
export function insideTextWorlds(spans, run) {
  const covering = spans.filter((s) => s.start != null && s.readNeed > 0).sort((x, y) => x.start - y.start);
  let reached = run.a;
  for (const s of covering) {
    if (s.start > reached + SPAN_SLACK_S) break;
    reached = Math.max(reached, s.end);
  }
  return reached >= run.b - SPAN_SLACK_S;
}

/** The world-held problems of measured spans: one { len, text } per world visible longer than `max` seconds, outside a declared hold. Each world is a turn, even next to a world of the same ground. Pure. */
export function heldWorlds(spans, max = TURN_SECONDS_MAX, authoring = {}) {
  const held = insideHold(authoring);
  return spans
    .filter((s) => s.start != null && s.end - s.start > worldLimit(s, max) + SPAN_SLACK_S && !held({ a: s.start, b: s.end }))
    .map((s) => ({ len: s.end - s.start, text: `world held ${s.id} ${s.start}-${s.end} s (${round(s.end - s.start)} s, limit ${round(worldLimit(s, max))} s${s.readNeed + READ_MARGIN_S > max ? ': its text needs that long' : ''}); ${waiverHint(`dead-air@${s.start}-${s.end}`)}` }));
}

/**
 * The starter's beats: the first world lasts as long as its texts need to be read (at least the world-turns limit, at most half the film),
 * the rest split equally with none longer than the limit; at least 2 worlds: [{ id, start, end, wordless }]. Every fourth world after the
 * first three, never the last, shows no words and lasts the full limit, so the eye rests (rule text-breathing). Pure.
 */
export function starterBeats(length, firstTexts = []) {
  const first = Math.min(length / 2, Math.max(TURN_SECONDS_MAX, readNeed(firstTexts) + READ_MARGIN_S));
  const n = Math.max(1, Math.ceil((length - first) / TURN_SECONDS_MAX - 1e-9));
  const wordless = (i) => i % WORDLESS_EVERY === WORDLESS_EVERY - 1 && i < n;
  const quiet = Math.floor(n / WORDLESS_EVERY);
  const shared = (length - first - quiet * TURN_SECONDS_MAX) / (n - quiet);
  const lasts = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? first : wordless(i) ? TURN_SECONDS_MAX : shared));
  const ends = lasts.map((_, i) => (i === n ? length : +lasts.slice(0, i + 1).reduce((a, b) => a + b, 0).toFixed(2)));
  return ends.map((end, i) => ({ id: `s${i + 1}`, start: i === 0 ? 0 : ends[i - 1], end, wordless: wordless(i) }));
}
