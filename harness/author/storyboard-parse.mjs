// storyboard-parse: ONE reader for the storyboard contract (engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md).
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
// and a decision that lives in a transcript cannot be checked tomorrow (engine-doctrine/MISTAKES.md #599).
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

// `use:` is the one field a beat may write more than once (harness/lib/contract.mjs parseUseLine): a
// beat can pull several arsenal entries onto itself in one plan. Every other field above stays
// single-valued (fieldIn's first match), so this is a second, list-returning reader rather than a
// change to fieldIn that would silently make every field multi-valued.
export const fieldAllIn = (block, k) => {
  const re = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${k}\\s*:\\s*(.+)`, 'gi');
  const out = [];
  let m; while ((m = re.exec(block))) out.push(m[1].trim());
  return out;
};

export const blocksOf = (src) => src.split(/^##\s+/m).slice(1);

// The film-level `object:` line names the noun ("the input bar"), same as always, and MAY carry a
// source after an arrow ("the input bar -> films/scene/_together.bar.html"): the real layer to draw
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
      becomes: f('becomes'), why: f('why'),
      transition_in: f('transition_in'),
      // THE REASON (harness/lib/contract.mjs parseTransitionWhy): "<relationship> · <feeling> ·
      // <invisible|expressive>", the decision procedure's own four questions (engine-doctrine/CRAFT/
      // TRANSITIONS.md), written down rather than only answered in an author's head. Optional; a beat
      // may carry `transition_in` with no `transition_why` and only warns, never blocks.
      transition_why: f('transition_why'),
      // THE SEAM'S VALUE (harness/lib/contract.mjs parseTransitionValueLine): what this boundary does
      // to ground VALUE, `dark->light` · `light->dark` · `held`, comparable against what
      // quality/gates/ground-arc.mjs measures on the built film. Optional, presence-only when declared.
      transition_value: f('transition_value'),
      // the shot vocabulary: see engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md. Optional so existing storyboards
      // keep parsing; the gate is what asks for them.
      shot: f('shot'), camera: f('camera'), picture: f('picture'),
      // WHERE things sit. Its own field, not a placement word buried in `picture`, because that is
      // what a reviewer is being asked to approve when they look at a panel. It was not parsed at
      // all: a storyboard stating a HUD corner on every beat still drew centred boxes labelled
      // "placement not stated", which is a declaration accepted and ignored.
      placement: f('placement'),
      // THE PER-SCENE CONTRACT (harness/lib/contract.mjs): the continuous object's state at this
      // beat's two edges, "<placement>@<w>x<h>" (a safe-area PLACEMENT name, never a raw pixel). Only
      // meaningful once a beat names one; harness/lib/contract.mjs chainErrors refuses a broken handoff.
      object_in: f('object_in'), object_out: f('object_out'),
      // THE MOTION PLAN (harness/lib/contract.mjs parseMotion, an alias of parseMoveEntry): what else
      // moves in this beat, beyond the one continuous object above. "<selector>@<kind>:<inBand>[/<outBand>]",
      // `;`-separated for more than one moving element. Only meaningful once a beat names one.
      motion: f('motion'),
      // THE MOVE (harness/lib/contract.mjs parseMoveEntries): one grammar, scope read from the entry.
      // "<shape>:<band>" keys a sustained track on this beat's OWN layer, spanning the whole beat, so
      // the beat never goes still after an entrance lands (a core/motion/shapes.js SHAPES key and a
      // SPEED_BAND name). "<selector>@<kind>:<band>" is the same grammar `motion:` takes, on this field
      // instead. "hold:<idle>" sets this beat's layer `idle` (core/engine/idle.js), the ambient hold
      // `rest:` below could only narrate. `;`-separated for more than one entry. Only meaningful once a
      // beat names one.
      move: f('move'),
      // style · layout · rest: the three slots their beat formula has (Element · Motion · Layout ·
      // Style · Timing) and ours did not. Parsed here for the same reason `placement` above is: a slot
      // an author is told to fill and nothing reads is worse than no slot, because the storyboard looks
      // complete and the film is unchanged. `rest` is what MOVES during the hold, which is the half of
      // pacing this repo had no word for: `dead-air` blocks a held frame and nothing on the other side
      // ever asked a held frame to be alive.
      //
      // STILL NOT BUILT, DELIBERATELY. `rest:` stays free-text: its existing lines are narration
      // ("the arm never stops"), not a grammar, and guessing a `hold:` out of prose risks changing a
      // render. Use `move: hold:<idle>` on the beat when you want this hold to actually breathe or drift.
      style: f('style'), layout: f('layout'), rest: f('rest'),
      // narration: what is SPOKEN over this beat. Optional, and separate from `onscreen` because the
      // two are different channels: a line can be said and not shown, or shown and not said. The
      // animatic reads this when present and falls back to the on-screen copy as a reading-time proxy.
      narration: f('narration'),
      // THE CAUSE (harness/lib/contract.mjs isCausedTrigger, storyboard-check.mjs's causal chain):
      // WHAT MADE THIS BEAT HAPPEN, read here so assemble.mjs can stage a caused junction instead of
      // firing it at the exact same instant as the cut, the way every OTHER field on this beat already
      // reaches assemble through this one parser.
      trigger: f('trigger'),
      // THE EYE (harness/lib/contract.mjs parseEyeLine): where attention starts, what pulls it (naming
      // the device), and where it lands. Read here the same raw-string way as every field above it.
      eye: f('eye'),
      // THE PICTURE'S OWN DECISIONS, from CLOSED vocabularies so a gate can compare them rather than
      // admire them. `picture:` and `style:` are prose and always were: an author can describe the
      // wrong object in fluent English and pass every check (engine-doctrine/MISTAKES.md #596). These three cannot
      // be written vaguely.
      //   archetype: the composition, so "no archetype twice in a row" is checkable
      //   weight:    peak | strong | quiet, so exactly one beat is the loudest and it is measurable
      //   borrows:   "<reference device> -> <our object>", so a borrowed SHAPE must name its ROLE here
      archetype: f('archetype'), weight: f('weight'), borrows: f('borrows'),
      // THE DECISIONS FROM A CLOSED, ENGINE-OWNED SET (harness/lib/contract.mjs groundErrors/
      // kineticErrors/elementsErrors): the background preset this beat sits on, the kinetic preset
      // (+ split mode) its type uses, and the layer types it puts on screen. Each name is validated
      // against the engine's own registry, never restated here. Optional, presence-only when declared.
      ground: f('ground'), kinetic: f('kinetic'), elements: f('elements'),
      // WHICH FILE, AND WHERE. Optional; assemble.mjs's own convention (`<base>.scene<N>.html`) is
      // unchanged when this is unset. `harness/lib/contract.mjs parseFragmentSpec` reads the raw
      // string, so this parser stays a raw-field reader like every field above it.
      fragment: f('fragment'),
      // A RECIPE: structure measured off a real film (recipes/recipes.json), applied to layers the
      // author already named by `id`. "<name> <slot>=<value> ...", e.g. "flow-seam out=window
      // in=tagline axis=x". `harness/lib/contract.mjs parseRecipeLine` reads the raw string; this
      // parser stays a raw-field reader like every field above it.
      recipe: f('recipe'),
      // THE GENERAL DOOR (harness/lib/contract.mjs parseUseLine/resolvedUses): "use: <name> [on=<layer
      // id>] [key=value …]" or "use: <kind>:<name> …", one line per arsenal entry a beat pulls onto
      // itself. A beat may write several, so this is `fieldAllIn`, not `f`, the one field on this
      // object that is a list rather than a single string.
      uses: fieldAllIn(b, 'use'),
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
    // THE DEVICES CARRYING THE FILM: a cursor, a caret, a bookend, a ground that takes its colour, an
    // exit axis. Free prose (engine-doctrine/MISTAKES.md-adjacent measurement: 34/44 storyboards carry
    // this field, none of them as a list), so this is read here for `plan-vs-render.mjs` to grep a small
    // closed set of literal, structurally-checkable nouns out of, never to parse as a grammar.
    threads: field('threads'),
    // THE ATTENTION PATH: one sentence naming where the eye travels across the WHOLE film, the
    // film-level twin of each beat's own `eye:` line above.
    attention: field('attention'),
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
