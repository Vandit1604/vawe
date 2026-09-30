// Pure decisions for the draft check that `bin/vawe dev` prints after a full-length draft: text size
// (taste card rule 9), sound level, and the merge with the ship problems. No I/O, no clock.
// harness/media/draft-check.mjs feeds it.

export const RULES = { capFrac: 0.06, capOfFont: 0.7, holdSec: 0.5, maxProblems: 4, lufsLow: -24, lufsHigh: -16 };

/** Sample times spread over the film: one every 0.5 s, between 10 and 40 samples, each at the middle of its slot. */
export function sampleTimes(dur) {
  const n = Math.min(40, Math.max(10, Math.round(dur / 0.5)));
  const step = dur / n;
  return { step, times: Array.from({ length: n }, (_, i) => +((i + 0.5) * step).toFixed(3)) };
}

const keyOf = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 40);

function keep(kept, run, step, rules) {
  if (run.n * step < rules.holdSec - 1e-9) return;
  const old = kept.get(run.key);
  if (!old || run.cap < old.cap) kept.set(run.key, run);
}

/**
 * Text lines that stay on screen at least `holdSec` and are smaller than `capFrac` of the frame height.
 * `samples` is [{ t, lines: [{ text, fontPx }] }] in time order, `step` the seconds between samples,
 * `frameH` the frame height in the same px as fontPx. Smallest first; one entry per text.
 */
export function textProblems(samples, { step, frameH }, rules = RULES) {
  const kept = new Map();
  const open = new Map();
  for (const s of samples) {
    const seen = new Set();
    for (const l of s.lines) {
      const key = keyOf(l.text);
      if (!key) continue;
      const cap = (rules.capOfFont * l.fontPx) / frameH;
      const run = open.get(key) || { key, n: 0, t: s.t, cap };
      if (!seen.has(key)) run.n += 1;
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
  return [...kept.values()]
    .filter((r) => r.cap < rules.capFrac)
    .sort((a, b) => a.cap - b.cap)
    .map((r) => `text "${r.key}" at ${r.t.toFixed(1)} s: cap height ${(r.cap * 100).toFixed(1)}% of frame (rule 9 asks ${rules.capFrac * 100}%)`);
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

export const isTemplateBrief = (text) => (text.match(/\[unanswered/g) || []).length >= 3;

/** The printed lines. `problems` are strings; `sound` and `brief` may be null. */
export function draftCheckLines(problems, sound, brief = null) {
  const extra = [sound, brief].filter(Boolean);
  const lines = problems.length === 0 && !extra.length ? ['draft check: no problems found'] : ['draft check:', ...problems.map((p) => `  ${p}`)];
  for (const l of extra) lines.push(`  ${l}`);
  if (problems.length || extra.length) lines.push('fix the draft check first');
  return lines;
}
