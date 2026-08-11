// storyboard-parse — ONE reader for the storyboard contract (docs/CRAFT/STORYBOARD-TEMPLATE.md).
//
// It exists because two things now read a storyboard: the gate that grades it, and the animatic that
// PLAYS it. Two parsers would drift, and the drift would be invisible in the worst way — the gate
// passing a beat the animatic silently drops. The regexes below are lifted verbatim from
// storyboard-check.mjs so the reader is unchanged, only shared.
export const RANGE = /\(([\d.]+)\s*s\s*[–—-]\s*([\d.]+)\s*s\)/;

export function frontmatter(src) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(src);
  const head = fm ? fm[1] : '';
  const field = (k) => {
    const m = new RegExp(`^${k}\\s*:\\s*(.+)$`, 'mi').exec(head);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  };
  return { present: !!fm, head, field };
}

export const fieldIn = (block, k) => {
  const m = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${k}\\s*:\\s*(.+)`, 'i').exec(block);
  return m ? m[1].trim() : null;
};

export const blocksOf = (src) => src.split(/^##\s+/m).slice(1);

// seconds from a `duration:` value that may say "29s", "1.5 min", or a bare number
export function durSec(raw) {
  if (!raw) return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds|m|min|mins|minutes)?\s*$/i.exec(raw);
  if (!m) return null;
  return /^m/i.test(m[2] || 's') ? parseFloat(m[1]) * 60 : parseFloat(m[1]);
}

// `onscreen: "first line" / "second cue"` → ['first line', 'second cue']. Quoted segments win; a bare
// value splits on ` / ` so the template's own examples parse. Empty strings are dropped rather than
// rendered, because an empty text layer is a hole the animatic would show as real dead air.
export function onscreenLines(v) {
  if (!v) return [];
  const quoted = [...v.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1].trim());
  // Split on ` | ` as well as ` / `. A pipe never appears inside real on-screen copy, where a slash
  // does ("24/7", "and/or"), so the pipe is the safer separator to reach for and an author who reaches
  // for it should not get one line with a stray glyph in the middle of it.
  const parts = quoted.length ? quoted : v.split(/\s+[/|]\s+/).map((s) => s.trim().replace(/^["']|["']$/g, ''));
  return parts.filter(Boolean);
}

// One beat, everything the animatic and the gate both care about.
export function parseStoryboard(src) {
  const { present, field } = frontmatter(src);
  const total = durSec(field('duration'));
  const beats = blocksOf(src).map((b, i) => {
    const title = b.split('\n')[0].trim();
    const r = RANGE.exec(title);
    const f = (k) => fieldIn(b, k);
    const declared = f('duration');
    return {
      i, title,
      name: title.replace(RANGE, '').replace(/^(?:Beat\s+)?\d+\s*[—:-]\s*/i, '').trim() || `Beat ${i + 1}`,
      start: r ? parseFloat(r[1]) : null,
      end: r ? parseFloat(r[2]) : null,
      duration: durSec(declared),
      type: f('type'), object: f('object'), blueprint: f('blueprint'),
      onscreen: onscreenLines(f('onscreen')), mechanism: f('mechanism'),
      becomes: f('becomes'), why: f('why'), emotion: f('emotion'),
      transition_in: f('transition_in'),
      // the shot vocabulary — see docs/CRAFT/STORYBOARD-TEMPLATE.md. Optional so existing storyboards
      // keep parsing; the gate is what asks for them.
      shot: f('shot'), camera: f('camera'), picture: f('picture'),
      // WHERE things sit. Its own field, not a placement word buried in `picture`, because that is
      // what a reviewer is being asked to approve when they look at a panel. It was not parsed at
      // all: a storyboard stating a HUD corner on every beat still drew centred boxes labelled
      // "placement not stated", which is a declaration accepted and ignored.
      placement: f('placement'),
      // narration: what is SPOKEN over this beat. Optional, and separate from `onscreen` because the
      // two are different channels: a line can be said and not shown, or shown and not said. The
      // animatic reads this when present and falls back to the on-screen copy as a reading-time proxy.
      narration: f('narration'),
    };
  });
  return {
    hasFrontmatter: present, field, duration: total,
    message: field('message'), audience: field('audience'), arc: field('arc'),
    framework: field('framework'), theme: field('theme'), format: field('format'),
    object: field('object'), beats,
  };
}

// Fill in the clock. A beat may state a range in its heading, a `duration:`, or neither; the animatic
// needs a real span for every beat or it cannot be played at all. Missing spans are inferred by
// dividing whatever time is left equally, and the caller is told which ones were guessed — a guessed
// span is a fine thing to watch and a terrible thing to trust.
export function timeline(sb) {
  const out = [], guessed = [];
  let cursor = 0;
  const total = sb.duration || null;
  const known = sb.beats.filter((b) => b.start != null && b.end != null).length;
  for (const b of sb.beats) {
    let start = b.start, end = b.end;
    if (start == null || end == null) {
      start = cursor;
      end = b.duration != null ? start + b.duration : null;
      guessed.push(b.name);
    }
    out.push({ ...b, start, end });
    if (end != null) cursor = end;
  }
  // any beat still without an end: share out the remainder
  const open = out.filter((b) => b.end == null);
  if (open.length) {
    const last = out.filter((b) => b.end != null).reduce((m, b) => Math.max(m, b.end), 0);
    const room = Math.max(1, (total || last + open.length * 3) - last);
    const each = room / open.length;
    let t = last;
    for (const b of out) if (b.end == null) { b.start = t; b.end = t + each; t += each; }
  }
  return { beats: out, guessed, known };
}
