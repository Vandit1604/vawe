// scripts/gates/storyboard-check.mjs — the STORYBOARD-AS-PROPOSAL gate (another engine Step 3, adapted).
// A great video is planned on paper and approved BEFORE the JSON. This gate enforces that the plan is a
// real proposal, not a vibe: a one-sentence MESSAGE + audience + arc up front, and per beat a type, the
// on-screen cues, and a WHY (its narrative role / persuasion). A beat with no "why" is decoration; a video
// with no one-sentence message has no spine. It does not judge taste — it enforces that the decisions that
// make a video good were actually made and written down.
//
// Under ~15s it also asks the plan to NAME WHAT HOLDS THE FILM, because a short film planned as
// independent beats is a slideshow on paper and the scene gate can only find that out after the JSON
// exists. It takes either answer: `threads:` names devices from docs/CRAFT/FILM-STRUCTURE.md (a match
// cut, a camera travel, a motif, a bookend, a metric cut rate, an unfinished sentence), and `object:`
// names the one device the scene-side gate can also see. It used to demand `object:` and nothing else,
// which enforced the register Murch ranks last and made every other way of holding a film unwritable.
//
//   node scripts/gates/storyboard-check.mjs path/to/STORYBOARD.md   ·   make storyboard-check SB=<file>
//   Template: docs/CRAFT/STORYBOARD-TEMPLATE.md
import fs from 'node:fs';
// ONE reader for the storyboard contract, shared with the animatic that PLAYS it. Two parsers would
// drift, and the drift would be invisible in the worst way: this gate passing a beat the animatic drops.
import { fieldIn, blocksOf, durSec as parseDur, RANGE as SB_RANGE } from '../author/storyboard-parse.mjs';

const f = process.argv[2];
if (!f || !fs.existsSync(f)) { console.error('usage: storyboard-check <STORYBOARD.md>  (template: docs/CRAFT/STORYBOARD-TEMPLATE.md)'); process.exit(2); }
const src = fs.readFileSync(f, 'utf8');

const errs = [], warns = [];
// ── frontmatter: the video's spine ──────────────────────────────────────────────────────────────
const fm = /^---\n([\s\S]*?)\n---/.exec(src);
const head = fm ? fm[1] : '';
const field = (k) => { const m = new RegExp(`^${k}\\s*:\\s*(.+)$`, 'mi').exec(head); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
if (!fm) errs.push('no frontmatter block — the spine (message · audience · arc · format · duration) goes in a leading --- … --- block');
const message = field('message');
if (!message) errs.push('missing `message:` — the ONE sentence this video communicates. Without it the video has no spine.');
else if (message.split(/\s+/).length > 20) warns.push(`message is ${message.split(/\s+/).length} words — a proposal message should be ONE tight sentence (≤ ~18 words).`);
for (const k of ['audience', 'arc', 'format', 'duration']) if (!field(k)) warns.push(`missing \`${k}:\` in frontmatter`);

// ── WHAT HOLDS THE FILM: required on short films ──────────────────────────────────────────────────
// A film under ~15s has no room for chapters, so something has to carry the viewer across the cuts, and
// the plan is where that gets decided. TWO ANSWERS ARE ACCEPTED and they are not ranked. `threads:` names
// devices from docs/CRAFT/FILM-STRUCTURE.md; `object:` names a continuous object, the one device the
// scene-side gate can measure, and the one Murch's Rule of Six ranks last of six. Demanding `object:`
// alone made a manifesto, an anthology, a comparison and a metric-cut film unplannable here.
//
// The object spine keeps its own shape when it IS the answer — object_t0 · object_states · object_last in
// the frontmatter (anything under a `##` heading is parsed as a beat), plus an `object:` line per beat —
// because a declared spine that no beat locates is a claim nobody kept.
const SPINE_MAX_S = 15;
const durRaw = field('duration');
const durSec = parseDur(durRaw);
const shortFilm = durSec != null && durSec < SPINE_MAX_S;
const hasObject = !!field('object');
const hasThreads = !!field('threads');
if (shortFilm && !hasObject && !hasThreads) {
  errs.push(`this is a ${durRaw} film and the frontmatter names neither \`threads:\` nor \`object:\` — NAME WHAT HOLDS THIS FILM. Under ${SPINE_MAX_S}s there is no room for chapters, so a film whose beats are islands is a slideshow. Write \`threads:\` naming two devices from docs/CRAFT/FILM-STRUCTURE.md (a match cut · a camera travel · a motif · a bookend · a metric cut rate · an unfinished sentence · an open question · a transforming object). If one of them is a continuous object, name it as \`object:\` too and the scene-side gate can check it.`);
}
if (shortFilm && !hasThreads && hasObject) {
  warns.push('one thread only — `object:` names a continuous object and nothing else. A single thread has to be literal and obvious to work, which is how a film ends up as a resizing box. Add `threads:` with a second device (docs/CRAFT/FILM-STRUCTURE.md).');
}
if (shortFilm && hasObject) for (const k of ['object_t0', 'object_states', 'object_last']) {
  if (!field(k)) warns.push(`missing \`${k}:\` — a declared object spine needs the object's state at t=0, at each cut, and at the last frame (the payoff, or the moment before it).`);
}

// ── beats: each must state its job ────────────────────────────────────────────────────────────────
const beats = [...src.matchAll(/^##\s+(?:Beat\s+)?(\d+|[A-Za-z].*?)\s*[—:-].*$/gmi)];
const blocks = blocksOf(src);
if (blocks.length < 2) errs.push('fewer than 2 beats — a video is a sequence of beats; storyboard each one as `## Beat N — title`.');
const REQ = ['type', 'onscreen', 'why'];

// ── the vocabulary that separates a MECHANISM from a TRANSFORMATION ──────────────────────────────
// `mechanism:` answers how the frame moves; `becomes:` answers what the thing turned into. They read
// alike and are not the same question, and the cheap answer to the second is the first one again.
// A beat whose change is "fade, then slide up" has planned a move and no change at all.
const ANIM_VOCAB = /\b(fades?|slides?|wipes?|cuts?|dissolves?|zooms?|blurs?|scales?|rises?|drops?|pans?|pushe?s?|spins?|pops?|staggers?|reveals?|fade|slide|wipe|cut|dissolve|zoom|blur|scale|rise|drop|pan|push|spin|pop|stagger|reveal)\b/i;
// Bare `is` is deliberately NOT a change verb. "the card is faded out" would otherwise read as a
// transformation and suppress the very warning it should trip, and it would inflate the change count
// that held-state-too-long reads, so a 4s beat saying "the card is blurred" would escape both tells.
// A change verb has to name a thing on the far side of it.
const CHANGE_VERB = /(becomes?|turns? into|opens? into|collapses?|morphs?|splits?|unfolds?|folds?|resolves? into|hardens? into|→)/gi;

// The time range the beat headings already carry — the SAME shape intent-from-storyboard reads.
const RANGE = SB_RANGE;
const spans = [];

let n = 0;
for (const b of blocks) {
  n++;
  const title = b.split('\n')[0].trim();
  const has = (k) => new RegExp(`(^|\\n)\\s*[-*]?\\s*${k}\\s*:`, 'i').test(b);
  const r = RANGE.exec(title);
  spans.push({ title, start: r ? parseFloat(r[1]) : null, end: r ? parseFloat(r[2]) : null });
  // A DECLARED object spine must be located in every beat. Only when the film declared one: a plan held
  // by a motif or a metric cut rate has no object to place, and asking for one anyway is what turned a
  // catalogue of devices into a single mandatory device.
  if (shortFilm && hasObject && !has('object')) errs.push(`beat "${title}" is missing \`object:\` — this film declares \`object: "${field('object')}"\`, so say what it has become in this beat (or where it is, if it is not born yet). Every cut must read "the X becomes the Y". If the object is not really what holds this film, drop it and name the real devices in \`threads:\`.`);
  const missing = REQ.filter((k) => !has(k));
  if (missing.length) errs.push(`beat "${title}" is missing: ${missing.map((m) => `\`${m}\``).join(', ')} (every beat needs a type, its on-screen cues, and a WHY).`);
  if (!/(^|\n)\s*[-*]?\s*(blueprint|mechanism)\s*:/i.test(b)) warns.push(`beat "${title}": no \`blueprint:\` or \`mechanism:\` — name the shot shape / motion so the JSON transcribes it (make blueprints · docs/EFFECTS.md).`);

  // The transformation, as a field of its own. `object:` says where the thing IS; `becomes:` says what
  // it TURNED INTO here. Measured against the reference film, our recreations landed state-changes at
  // half its rate — every one of them planned by beats that never wrote the change down.
  const becomes = fieldIn(b, 'becomes');
  const teach = `beat "${title}" is missing \`becomes:\` — write the change at this junction as "the X becomes the Y". \`mechanism:\` is the preset (how it moves); \`becomes:\` is the change (what it turned into). They are different questions and the second is the one the viewer sees.`;
  if (!becomes) (shortFilm ? errs : warns).push(teach);
  else {
    const changes = becomes.match(CHANGE_VERB) || [];
    if (!changes.length && ANIM_VOCAB.test(becomes)) {
      warns.push(`beat "${title}": becomes-is-a-preset — "${becomes}". That is the mechanism, not the transformation: \`mechanism:\` already answers how it moves; \`becomes:\` answers what it turned into.`);
    }
    // A beat is a hold for as long as nothing in it changes. The reference film never sat on one state
    // for more than ~1.5s; a 3s beat carrying a single change is two seconds of watching it not happen.
    const span = spans[n - 1];
    if (span.start != null && span.end - span.start >= 3.0 && changes.length <= 1) {
      warns.push(`beat "${title}": held-state-too-long — ${(span.end - span.start).toFixed(2)}s spent on one change. The reference film never holds a single state longer than about 1.5 seconds, so a 3s+ beat with one change is a 3s hold. Either name the second change or split the beat.`);
    }
    // ends-on-a-claim. The last beat puts a sentence on screen and nothing changes under it, so the
    // film's final act is a line of copy appearing. Three of our recreations closed exactly this way:
    // the closing line named a capability, the reference spent the same seconds performing it, and
    // ours stopped at the sentence. Deliberately inside the `else`: a final beat with NO `becomes:` is
    // already a blocker above, and one mistake should not collect two near-identical blockers.
    const onscreen = fieldIn(b, 'onscreen') || '';
    const quoted = /"[^"]+"/.test(onscreen);
    if (n === blocks.length && quoted && !changes.length) {
      (shortFilm ? errs : warns).push(`beat "${title}": ends-on-a-claim — the last thing that happens in this film is a sentence appearing. Its \`onscreen:\` puts copy up and its \`becomes:\` ("${becomes}") names no change, so the film closes on a statement it never demonstrates. If the last line says the product does X, the last beat has to show X happening: the toggle flipping, the card submitting, the state that proves the sentence. Name those changes in \`becomes:\` and the film ends on the thing instead of the promise.`);
    }
  }

  // A why that says "hook" restates the beat's category. The category is already in `type:`.
  const why = fieldIn(b, 'why');
  if (why && (why.split(/\s+/).length < 5 || /^(the\s+)?(hook|payoff|cta|because|setup|intro|outro)\b[\s.·—-]*$/i.test(why))) {
    warns.push(`beat "${title}": stub-why — "${why}". A why states what the viewer learns or feels HERE and why it belongs at this point in the film, not the beat's category.`);
  }
}

// ── the clock: the storyboard already carries times, so read them ─────────────────────────────────
// The beat headings have carried "(0s-1.53s)" all along and nothing ever parsed them, so a plan could
// stop three seconds short of its own duration and every gate reported green. The last seconds are
// where the payoff lands; a plan that runs out early ships a film that ends on an unmade claim.
const timed = spans.filter((s) => s.start != null);
if (timed.length && timed.length < spans.length) {
  warns.push(`partial-timeline — ${timed.length}/${spans.length} beats carry a (start s-end s) range. Without one on every beat the plan cannot be checked against the clock. Missing: ${spans.filter((s) => s.start == null).map((s) => `"${s.title}"`).join(', ')}.`);
} else if (timed.length === spans.length && spans.length) {
  for (let i = 1; i < spans.length; i++) {
    const prev = spans[i - 1], cur = spans[i];
    const d = cur.start - prev.end;
    if (d >= 0.5) errs.push(`timeline-hole — "${prev.title}" ends at ${prev.end}s and "${cur.title}" starts at ${cur.start}s: ${d.toFixed(2)}s of the film is unplanned. Nothing is storyboarded to be on screen there.`);
    else if (-d >= 0.5) errs.push(`timeline-hole — "${prev.title}" runs to ${prev.end}s while "${cur.title}" starts at ${cur.start}s: they overlap by ${(-d).toFixed(2)}s. Two beats claiming the same seconds means one of them is not planned.`);
  }
  const last = spans[spans.length - 1];
  if (durSec != null && durSec - last.end > 0.5) {
    errs.push(`timeline-hole — your beats stop at ${last.end}s of a ${durSec}s film: ${(durSec - last.end).toFixed(2)}s of the film is unplanned. The last seconds are where the payoff lands; a storyboard that runs out early ships a film that ends on a claim it never demonstrated.`);
  }
}

// ── report ────────────────────────────────────────────────────────────────────────────────────────
console.log(`  storyboard-check · ${f} · ${blocks.length} beat(s)`);
if (message) console.log(`  message: "${message}"`);
for (const e of errs) console.error(`    ✗ ${e}`);
for (const w of warns) console.log(`    ~ ${w}`);
if (errs.length) { console.error(`\n✗ storyboard incomplete — ${errs.length} blocker(s). Fill them, then present the proposal for approval before authoring JSON.`); process.exit(1); }
console.log(`\n✓ storyboard is a complete proposal — present it ("This video tells <audience> that <message>") and get sign-off before the JSON.`);
