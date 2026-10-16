// Text that changes by itself is element motion for live-hold, but a few glyphs are far under the 2% of pixels that scene-stats
// reads as a change, so a prompt box that types for 3 s counts as a still run. The page's text samples name those seconds.
import { STILL_SEC } from './still-limit.mjs';

const CARET_ONLY = /^[\s|▌▍▎▏█_]*$/;
const TRAILING_CARET = /[\s|▌▍▎▏█_]+$/;
const MIN_CHANGES = 3;

const shown = (sample) => sample.lines
  .filter((l) => !CARET_ONLY.test(l.text))
  .map((l) => l.text.replace(TRAILING_CARET, ''))
  .join('\n');

/**
 * The [a, b] seconds where the visible text keeps changing: at least MIN_CHANGES changes, each within the still limit of the one before.
 * A caret glyph is no text, so a blinking caret changes nothing; a text that returns to one it showed earlier in the run is a blink, not a new change;
 * a lone change is an arrival, not a hold kept alive.
 * `samples` are the dense text samples, [{ t, lines: [{ text }] }].
 */
export function typingSpans(samples) {
  const runs = [];
  for (let i = 1; i < samples.length; i++) {
    const now = shown(samples[i]);
    if (now === shown(samples[i - 1])) continue;
    let last = runs.at(-1);
    if (!last || samples[i].t - last.to > STILL_SEC + 1e-9) {
      last = { from: samples[i - 1].t, to: samples[i - 1].t, changes: 0, seen: new Set([shown(samples[i - 1])]) };
      runs.push(last);
    }
    if (last.seen.has(now)) continue;
    last.seen.add(now);
    last.to = samples[i].t;
    last.changes += 1;
  }
  return runs.filter((r) => r.changes >= MIN_CHANGES).map((r) => [+r.from.toFixed(3), +r.to.toFixed(3)]);
}
