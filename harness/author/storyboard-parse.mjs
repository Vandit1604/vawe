// storyboard-parse: ONE reader for the storyboard contract (docs/CRAFT/STORYBOARD-TEMPLATE.md).
//
// It exists because two things now read a storyboard: the gate that grades it, and the animatic that
// PLAYS it. Two parsers would drift, and the drift would be invisible in the worst way, the gate
// passing a beat the animatic silently drops. The regexes below are lifted verbatim from
// storyboard-check.mjs so the reader is unchanged, only shared.
// The closed vocabularies. Exported so storyboard-check, frame-check and the template all read ONE
// list: three copies of a vocabulary is three vocabularies as soon as anyone adds to one of them.
export const ARCHETYPES = ['centred', 'split', 'hero-object', 'asymmetric-baseline', 'full-bleed-row',
  'symmetric-pair', 'lockup'];
export const WEIGHTS = ['peak', 'strong', 'quiet'];
/** `other (a reason)` is legal, the same waiver shape every rule here has. */
export const isArchetype = (v) => !v || ARCHETYPES.includes(String(v).trim().split(/\s+\(/)[0])
  || /^other\s*\(.+\)/.test(String(v).trim());

export const RANGE = /\(([\d.]+)\s*s\s*[–: -]\s*([\d.]+)\s*s\)/;

// THE REFERENCE, DECODED INTO ITS PARTS. A `### Reference devices` table, kept out of `blocksOf`'s way
// by its heading level. It exists because the first pass at this film took three of the reference's
// twelve moves and nobody could see which nine were missing: the catalogue lived in a chat message,
// and a decision that lives in a transcript cannot be checked tomorrow (docs/MISTAKES.md #599).
export function referenceDevices(src) {
  const m = /^###\s+Reference devices\s*$([\s\S]*?)(?=^##\s|\Z)/m.exec(src || '');
  if (!m) return [];
  return [...m[1].matchAll(/^\|\s*(D\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm)]
    .map(([, id, device, use]) => ({ id, device, use,
      dropped: /\bdropped\b/i.test(use) }));
}

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

// The film-level `object:` line names the noun ("the input bar"), same as always, and MAY carry a
// source after an arrow ("the input bar -> formats/scene/_together.bar.html"): the real layer to draw
// it as, instead of assemble.mjs's placeholder rect. Splitting it here, once, keeps `object` itself
// unchanged for the many readers (docs, panels, the animatic) that only ever wanted the name.
export function parseObjectLine(raw) {
  if (!raw) return { name: raw, src: null };
  const m = /^(.*?)\s*->\s*(\S+)\s*$/.exec(raw);
  return m ? { name: m[1].trim(), src: m[2] } : { name: raw, src: null };
}

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
      name: title.replace(RANGE, '').replace(/^(?:Beat\s+)?\d+\s*[, :-]\s*/i, '').trim() || `Beat ${i + 1}`,
      start: r ? parseFloat(r[1]) : null,
      end: r ? parseFloat(r[2]) : null,
      duration: durSec(declared),
      type: f('type'), object: f('object'), blueprint: f('blueprint'),
      onscreen: onscreenLines(f('onscreen')), mechanism: f('mechanism'),
      becomes: f('becomes'), why: f('why'), emotion: f('emotion'),
      transition_in: f('transition_in'),
      // the shot vocabulary: see docs/CRAFT/STORYBOARD-TEMPLATE.md. Optional so existing storyboards
      // keep parsing; the gate is what asks for them.
      shot: f('shot'), camera: f('camera'), picture: f('picture'),
      // WHERE things sit. Its own field, not a placement word buried in `picture`, because that is
      // what a reviewer is being asked to approve when they look at a panel. It was not parsed at
      // all: a storyboard stating a HUD corner on every beat still drew centred boxes labelled
      // "placement not stated", which is a declaration accepted and ignored.
      placement: f('placement'),
      // THE PER-SCENE CONTRACT (scripts/lib/contract.mjs): the continuous object's state at this
      // beat's two edges, "<placement>@<w>x<h>" (a safe-area PLACEMENT name, never a raw pixel). Only
      // meaningful once a beat names one; scripts/lib/contract.mjs chainErrors refuses a broken handoff.
      object_in: f('object_in'), object_out: f('object_out'),
      // THE MOTION PLAN (scripts/lib/contract.mjs parseMotion): what else moves in this beat, beyond
      // the one continuous object above. "<selector>@<kind>:<inBand>[/<outBand>]", `;`-separated for
      // more than one moving element. Only meaningful once a beat names one.
      motion: f('motion'),
      // SUSTAINED MOTION (scripts/lib/contract.mjs parseMove): a hand-keyed track on this beat's OWN
      // layer, spanning the whole beat, so the beat never goes still after an entrance lands.
      // "<shape>:<band>", a scripts/author/track.mjs SHAPES key and a SPEED_BAND name. Only meaningful
      // once a beat names one.
      move: f('move'),
      // style · layout · rest: the three slots their beat formula has (Element · Motion · Layout ·
      // Style · Timing) and ours did not. Parsed here for the same reason `placement` above is: a slot
      // an author is told to fill and nothing reads is worse than no slot, because the storyboard looks
      // complete and the film is unchanged. `rest` is what MOVES during the hold, which is the half of
      // pacing this repo had no word for: `dead-air` blocks a held frame and nothing on the other side
      // ever asked a held frame to be alive.
      style: f('style'), layout: f('layout'), rest: f('rest'),
      // narration: what is SPOKEN over this beat. Optional, and separate from `onscreen` because the
      // two are different channels: a line can be said and not shown, or shown and not said. The
      // animatic reads this when present and falls back to the on-screen copy as a reading-time proxy.
      narration: f('narration'),
      // THE CAUSE (scripts/lib/contract.mjs isCausedTrigger, storyboard-check.mjs's causal chain):
      // WHAT MADE THIS BEAT HAPPEN, read here so assemble.mjs can stage a caused junction instead of
      // firing it at the exact same instant as the cut, the way every OTHER field on this beat already
      // reaches assemble through this one parser.
      trigger: f('trigger'),
      // THE PICTURE'S OWN DECISIONS, from CLOSED vocabularies so a gate can compare them rather than
      // admire them. `picture:` and `style:` are prose and always were: an author can describe the
      // wrong object in fluent English and pass every check (docs/MISTAKES.md #596). These three cannot
      // be written vaguely.
      //   archetype: the composition, so "no archetype twice in a row" is checkable
      //   weight:    peak | strong | quiet, so exactly one beat is the loudest and it is measurable
      //   borrows:   "<reference device> -> <our object>", so a borrowed SHAPE must name its ROLE here
      archetype: f('archetype'), weight: f('weight'), borrows: f('borrows'),
      // WHICH FILE, AND WHERE. Optional; assemble.mjs's own convention (`<base>.scene<N>.html`) is
      // unchanged when this is unset. `scripts/lib/contract.mjs parseFragmentSpec` reads the raw
      // string, so this parser stays a raw-field reader like every field above it.
      fragment: f('fragment'),
    };
  });
  const { name: objectName, src: objectSrc } = parseObjectLine(field('object'));
  return {
    hasFrontmatter: present, field, duration: total,
    message: field('message'), audience: field('audience'), arc: field('arc'),
    framework: field('framework'), theme: field('theme'), format: field('format'),
    object: objectName, objectSrc, beats,
    // pace is a GENRE decision, made before any beat is written rather than discovered while animating.
    // spectacle names the one exaggerated moment and is two-sided: naming it promises every other beat
    // stays restrained. not is the exclusion line, because most generic output is not a wrong decision,
    // it is an un-excluded default.
    pace: field('pace'), spectacle: field('spectacle'), not: field('not'),
    // The type ramp, decided ONCE for the film. Seven frames that each invent their own scale are
    // seven films, and the ramp was being decided eight times in seven files before this existed.
    ramp: field('ramp'),
  };
}

// Fill in the clock. A beat may state a range in its heading, a `duration:`, or neither; the animatic
// needs a real span for every beat or it cannot be played at all. Missing spans are inferred by
// dividing whatever time is left equally, and the caller is told which ones were guessed, a guessed
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
