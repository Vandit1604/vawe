// Pure decisions for the draft check that `bin/vawe dev` prints after a full-length draft: text size
// (taste rule readable-text-size), sound level, and the merge with the ship problems. No I/O, no clock.
// harness/media/draft-check.mjs feeds it.
import { adviceBlock } from './advice.mjs';

export const RULES = { capFrac: 0.06, chromeCapFrac: 0.025, capOfFont: 0.7, holdSec: 0.5, maxProblems: 4, lufsLow: -24, lufsHigh: -16 };

// Text inside these is not copy to read: aria-hidden is texture, data-chrome is the label of a product shown as texture.
export const DECORATIVE = '[aria-hidden="true"]';
export const CHROME = '[data-chrome]';

const FONT_TINY_SHARE = 0.002;

/** Sample times spread over the film: one every 0.5 s, between 10 and 40 samples, each at the middle of its slot. */
export function sampleTimes(dur) {
  const n = Math.min(40, Math.max(10, Math.round(dur / 0.5)));
  const step = dur / n;
  return { step, times: Array.from({ length: n }, (_, i) => +((i + 0.5) * step).toFixed(3)) };
}

const STILL_PX = 2;
const SETTLED_MAX = 8;
const stateOf = (s) => s.lines.map((l) => `${l.text}|${l.box.map((v) => Math.round(v / STILL_PX)).join(',')}|${Math.round((l.opacity ?? 1) * 10)}`).join(';');

/**
 * The samples to read pixels at: the last sample of each run where the visible text held still (same text, boxes
 * within STILL_PX, same opacity to a tenth) for two or more samples, at most SETTLED_MAX spread over the film.
 * A film whose text never holds still gives its busiest sample. Pure.
 */
export function settledSamples(samples, max = SETTLED_MAX) {
  const withText = samples.filter((s) => s.lines.length);
  const last = withText.filter((s, i) => {
    const next = withText[i + 1];
    return i > 0 && stateOf(withText[i - 1]) === stateOf(s) && !(next && stateOf(next) === stateOf(s));
  });
  const picked = last.length ? last : withText.slice().sort((a, b) => b.lines.length - a.lines.length).slice(0, 1);
  const stride = Math.max(1, Math.ceil(picked.length / max));
  return picked.filter((_, i) => i % stride === 0);
}

const PLACE_PX = 4;

/** One text at one place: its text (60 characters) and its box rounded to PLACE_PX. */
export const placeKey = (text, box) => `${String(text).slice(0, 60)}|${box.map((v) => Math.round(v / PLACE_PX)).join(',')}`;

/** The texts that hold one place for at least `holdSec` of the samples: a Set of placeKey. Text in motion is not in it. Pure. */
export function heldPlaces(samples, { step }, rules = RULES) {
  const seen = new Map();
  for (const s of samples) for (const key of new Set(s.lines.map((l) => placeKey(l.text, l.box)))) seen.set(key, (seen.get(key) ?? 0) + 1);
  return new Set([...seen].filter(([, n]) => n * step >= rules.holdSec - 1e-9).map(([key]) => key));
}

/** The film seconds to read the layout at: the settled text samples, else a quarter, a half and three quarters of the way through. Pure. */
export function layoutTimes(samples, { dur, from = 0 }) {
  const settled = settledSamples(samples).map((s) => s.t);
  return settled.length ? settled : [0.25, 0.5, 0.75].map((f) => +(from + f * dur).toFixed(3));
}

const keyOf = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 40);

function keep(kept, run, step, rules) {
  if (run.n * step < rules.holdSec - 1e-9) return;
  const old = kept.get(run.key);
  if (!old || run.cap < old.cap) kept.set(run.key, run);
}

/**
 * Text lines that stay on screen at least `holdSec`, each with its smallest cap height (share of the frame
 * height) and the sample time of that. `samples` is [{ t, lines: [{ text, fontPx }] }] in time order, `step`
 * the seconds between samples, `frameH` the frame height in the same px as fontPx. One entry per text.
 */
export function heldTextRuns(samples, { step, frameH }, rules = RULES) {
  const kept = new Map();
  const open = new Map();
  for (const s of samples) {
    const seen = new Set();
    for (const l of s.lines) {
      const key = keyOf(l.text);
      if (!key) continue;
      const cap = (rules.capOfFont * l.fontPx) / frameH;
      const run = open.get(key) || { key, n: 0, t: s.t, cap, first: s.t, chrome: Boolean(l.chrome) };
      if (!seen.has(key)) { run.n += 1; run.last = s.t; }
      seen.add(key);
      if (cap < run.cap) { run.cap = cap; run.t = s.t; }
      open.set(key, run);
    }
    for (const [key, run] of open) {
      if (seen.has(key)) continue;
      open.delete(key);
      keep(kept, run, step, rules);
    }
  }
  for (const run of open.values()) keep(kept, run, step, rules);
  return [...kept.values()];
}

const floorOf = (run, rules) => (run.chrome ? rules.chromeCapFrac : rules.capFrac);

/** The held text lines under their cap floor (`capFrac`, or `chromeCapFrac` inside data-chrome), smallest first, each as a problem line. */
export function textProblems(samples, ctx, rules = RULES) {
  return heldTextRuns(samples, ctx, rules)
    .filter((r) => r.cap < floorOf(r, rules))
    .sort((a, b) => a.cap - b.cap)
    .map((r) => `text "${r.key}" at ${r.t.toFixed(1)} s: cap height ${(r.cap * 100).toFixed(1)}% of frame (rule readable-text-size asks ${+(floorOf(r, rules) * 100).toFixed(1)}%)`);
}

/** One line when a text is taller than the frame or under 0.2% of it: the sign of --vh read as 1vh. Pure. */
export function frameUnitLines(samples, { frameH }) {
  const off = samples.flatMap((s) => s.lines).filter((l) => l.fontPx > frameH || l.fontPx < FONT_TINY_SHARE * frameH);
  if (!off.length) return [];
  const worst = off.reduce((a, l) => (Math.abs(Math.log(l.fontPx / frameH)) > Math.abs(Math.log(a.fontPx / frameH)) ? l : a));
  return [`text "${worst.text.slice(0, 30)}" is ${worst.fontPx.toFixed(1)} px in a frame ${frameH} px tall (${new Set(off.map((l) => l.text)).size} such texts): --vh is the frame height in px; use calc(var(--vh) * 0.08) for 8%`];
}

/** The sound line when the mix is outside the band, else null. */
export function soundLine(lufs, rules = RULES) {
  if (lufs === null || (lufs >= rules.lufsLow && lufs <= rules.lufsHigh)) return null;
  const fix = lufs < rules.lufsLow ? 'raise data-gain on the quiet cues' : 'lower data-gain on the loud cues';
  return `sound: ${Math.round(lufs)} LUFS integrated (subtle target about -20; ${fix})`;
}

/** Alternate two ranked lists (video problems, text problems) and keep the first `max`. */
export function mergeProblems(video, text, max = RULES.maxProblems) {
  const out = [];
  for (let i = 0; i < Math.max(video.length, text.length); i++) {
    for (const list of [video, text]) if (i < list.length) out.push(list[i]);
  }
  return out.slice(0, max);
}

/** The brief line when the judge would score against no brief or the template's defaults, else null. */
export function briefLine(text) {
  if (text === null) return 'brief: no brief.md next to the page; write the request there so the judge scores what was asked';
  if (isTemplateBrief(text)) return 'brief: brief.md still holds the template defaults; write the request in it so the judge scores what was asked';
  return null;
}

// A brief is still the template when no input line was answered; a few kept defaults (music, voices) are answers too.
export function isTemplateBrief(text) {
  const inputs = (text.split(/^## /m).find((sec) => /^Inputs\b/.test(sec)) || '').split('\n').filter((l) => /^\s*-\s/.test(l));
  if (!inputs.length) return (text.match(/\[unanswered/g) || []).length >= 3;
  return inputs.every((l) => l.includes('[unanswered'));
}

/** The advice a draft check gives: its problems, then the sound and brief lines when present. */
export function draftAdvice(problems, sound = null, brief = null) {
  return [...problems, sound, brief].filter(Boolean);
}

/** The printed block for every advice line of a draft: a clean line, or each line as advice and the end line. */
export function draftCheckLines(advice) {
  return advice.length ? ['draft check:', ...adviceBlock(advice)] : ['draft check: no problems found'];
}
