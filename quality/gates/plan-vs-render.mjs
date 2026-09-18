// quality/gates/plan-vs-render.mjs: DOES THE FILM DO WHAT THE PLAN SAID?
//
// storyboard-check reads the plan and grades it against ITSELF: are the beats timed, does each one name
// what it becomes, does the last one end on a change. Every one of those can pass on a plan for a film
// that was never built. inspect reads the scene, but only at one instant per beat, and only for copy and
// for "some layer here animates". Nothing compared the two documents. So a storyboard could promise a
// transformation at 5.8s, the JSON could put nothing at all there, and the whole ladder stayed green.
//
// That is not hypothetical. It is the result of the A/B test: the treatment film's storyboard named a
// change on every beat, correctly, and the render still sat perfectly still from 3.5s to 5.5s. The plan
// was right and the film was wrong and no gate said a word. This is the gate that says the word.
//
// WHAT IT CHECKS, and what it refuses to claim. It checks that SOMETHING HAPPENS WHERE THE PLAN SAYS
// SOMETHING HAPPENS. At a junction the plan marks with a `becomes:`, the render must put an event there:
// a content layer starting or ending, a declared cut/seam/sting, or a motion keyframe. Inside a beat the
// plan gave seconds to, the render must not hold perfectly still for most of them.
//
// It does NOT check that the change is the one named, and it must never be extended to pretend it does.
// "the semicolon string becomes a three-column row" is a claim about identity across two moments. A layer
// ending and another starting satisfies this gate and is also exactly what a slideshow looks like. The
// difference between a transformation and a cut between two unrelated shots is not in the JSON; it is in
// the pixels, and it belongs to `make judge` and to your eyes. A green run here means the film is not
// EMPTY where it promised to be full. It does not mean the promise was kept.
//
// THE PROSE FIELDS. The intent sidecar carries the beat spans and the `becomes:` lines, and both are
// themselves read off the storyboard's own `(0s-3s)` headings (scripts/brand/intent-from-storyboard.mjs):
// the sidecar is a cache of the storyboard, not a second source, so this gate reads it when present and
// falls back to the storyboard directly when it is not, rather than skipping every beat-span check on a
// film nobody ran `make intent` against. Two frontmatter decisions never reach the sidecar either way,
// and both are decisions ABOUT the render: `spectacle:` names the film's one loud moment, and `pace:`
// budgets its seconds per idea. So this gate reads the storyboard as a second input regardless of which
// source the beat spans came from, and joins those two lines to the film. Without that they are fields
// an author fills and no code reads, which is worse than no field at all, the plan looks complete and
// the film is unchanged (engine-doctrine/MISTAKES.md #219, #383, #387, #400).
//
//   node quality/gates/plan-vs-render.mjs <scene.json> [--intent p] [--sb storyboard.md] [--strict]
//   make plan-check D=<file>
// FAIL: plan-overruns-render · junction-is-static.
// WARN: held-through-the-change · beat-holds-still · unplanned-junction · plan-has-no-spans ·
//       spectacle-not-built · spectacle-in-wrong-beat · spectacle-beat-unnamed · pace-not-kept ·
//       pace-not-chosen · thread-not-built · transformation-not-continuous · ground-value-mismatch.
//
// THE THREADS PROMISE. `threads:` is measured prose (see below), so `thread-not-built` never parses
// it as a grammar. It greps a small closed set of literal nouns (a cursor, a caret, a ground that
// takes its colour) and, only when one appears verbatim, asks whether the structural fact a gate CAN
// see exists: a layer of that kind, or a colour that actually varies. Same restraint as the rest of
// this file: presence, never correctness, and it says nothing about a thread it does not recognise.
//       All block under --strict. `held-through-the-change` is the sharp one: it reads a hold the author
//       WROTE (two identical motion keys) rather than inferring one from an absence.
// ADVISORY, and never blocking, not even under --strict: no-spectacle-nominated. It is the one finding
//       here that needs NO plan, so it also runs on a film with no sidecar and no storyboard, which is
//       exactly the film most likely to have no peak. See "the peak, asked about even when there is no
//       plan" below for its trigger and the measured dose behind it.
// Waive a deliberate break with {"authoring":{"allow":["beat-holds-still", ...]}}.
import fs from 'node:fs';
import path from 'node:path';
import { sceneTiming, num } from './scene-timing.mjs';
import { parseStoryboard, timeline } from '../../harness/author/storyboard-parse.mjs';
import { measureGroundFlips, JOIN_TOLERANCE } from './ground-arc.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';
import { gradeable } from './tile.mjs';
import { emptinessAt, probeFps, probeTotalFrames } from '../../harness/lib/frame-forensics.mjs';
import { flattenLayers, nearestBeats } from '../../harness/lib/layers.mjs';
import { allBoundaries } from '../../core/timeline/junctions.js';

const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
const intentPath = (() => { const i = process.argv.indexOf('--intent'); return i >= 0 ? process.argv[i + 1] : String(file || '').replace(/\.json$/, '.intent.json'); })();
if (!file) { console.error('usage: node quality/gates/plan-vs-render.mjs <scene.json> [--intent p] [--strict]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (d.module !== 'scene') { console.log(`  plan vs render · ${file}: not a scene module, nothing to check.`); process.exit(0); }
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// ---------- the storyboard, for the fields the sidecar drops ----------
// An explicit `--sb` that does not exist is an error, never a silent skip: a flag the author typed and
// the gate ignored is the same defect the spectacle join exists to close.
const sbFlag = (() => { const i = process.argv.indexOf('--sb'); return i >= 0 ? process.argv[i + 1] : null; })();
if (sbFlag && !fs.existsSync(sbFlag)) { console.error(`✗ no such storyboard: ${sbFlag}`); process.exit(2); }
const sbPath = sbFlag || (() => {
  const dir = path.dirname(file), base = path.basename(file).replace(/\.json$/, '');
  return [path.join(dir, '_concepts', `${base}.storyboard.md`), path.join(dir, `${base}.storyboard.md`)]
    .find((p) => fs.existsSync(p)) || null;
})();
const sb = sbPath ? parseStoryboard(fs.readFileSync(sbPath, 'utf8')) : null;

const NEAR = 0.5;        // how far from a planned junction an event still counts as being AT it
const STILL = 2.5;       // a stretch inside one beat with no event that stops reading as a hold
const DRIFT = 0.6;       // how far a real cut may sit from any planned boundary before it is unplanned
const OVERRUN = 0.5;     // how far the plan's total may sit from the film's before the spans are fiction

// T.scene is this scene with the unified `transitions` surface already lowered to cuts/seams/stings, on
// a clone, so nothing below rewrites the object it is grading. Every boundary read in this file goes
// through it: reading raw `d.cuts` is how a film that declared four boundaries the documented way was
// graded as a film with none. engine-doctrine/MISTAKES.md #394, #407.
const T = sceneTiming(d);
const BOUNDARY_KEYS = ['cuts', 'seams', 'stings'];
const s = (n) => `${(+n).toFixed(2)}s`;
const walk = (L, fn) => { if (!L || typeof L !== 'object') return; fn(L); (L.children || []).forEach((c) => walk(c, fn)); };

// ---------- the peak, asked about even when there is no plan ----------
// THE GAP THIS CLOSES. Everything else in this file needs a sidecar, so the film most likely to have no
// peak (the one nobody storyboarded) was the one film never asked about it. Whether a scene NOMINATES
// its loud moment needs no plan at all: the `spectacle` block is either in the JSON or it is not.
//
// WHY THE QUESTION IS WORTH ASKING. `effect-soup` fails a film that shouts on every beat and
// `plain-slideshow` fails one that never shouts at all. Neither asks WHICH moment is the loudest, so a
// film can sit safely between the two bounds, pass both, and still be flat: evenly loud is not the same
// as shaped. Nominating a peak is also a promise the rest stays restrained, which is what core/spectacle.js
// enforces once the block exists.
//
// THE TRIGGER IS NARROW ON PURPOSE. Measured over the 110 scenes in films/scene, EVERY one of them
// lacks a `spectacle` block, so warning on all of them would be a report about the library rather than a
// gate, and a finding on every file teaches the reader to skip the section. It fires only where the
// author has already declared structure the peak could sit in: at least 2 declared boundaries and at
// least 12s of runtime, which is 24 of the 110 (18 distinct films, the rest .expanded.json siblings).
// The two dials were chosen against that measurement: boundaries>=2 with no length floor is 31 scenes,
// and boundaries>=3 is 19. 24 is the point where the finding still reads as a finding.
// A one-shot 6s hook does not need a nominated peak; a 20s film across six cuts that never says which
// instant is the loudest is shapeless, and no other gate here will say so.
const SPECTACLE_MIN_BOUNDARIES = 2, SPECTACLE_MIN_DUR = 12;
function nominationNote() {
  if (d.spectacle != null) return null;                    // nominated; core/spectacle.js takes it from here
  if (sb && sb.spectacle) return null;                     // the storyboard names one, so `spectacle-not-built` owns this
  // COUNT `transitions` TOO. It is the documented unified surface and it lowers to cuts/seams/stings
  // before the engine renders, so a film that declares its boundaries the documented way has structure
  // even though `d.cuts` is empty. brew-launch-act1 is exactly that film: four boundaries, none of them
  // in `d.cuts`. This was the one reader here that already saw them; the rest of the gate now sees them
  // too, through `T.scene`.
  //
  // IT STAYS ON THE AUTHORED SURFACE, deliberately. `T.scene.cuts` would carry the lowered transitions,
  // and adding seams and stings to it would read as the same tidy-up, but it is not one. A raw `stings`
  // block has never counted as structure here, and folding those in re-tunes a trigger #389 measured on
  // purpose (24 of 110 scenes; the seams/stings set adds 16 more). That is a decision about how loud this
  // advisory should be, not about lowering, and it does not get made in passing.
  const boundaries = new Set([
    ...(Array.isArray(d.cuts) ? d.cuts : []).filter((c) => c && typeof c === 'object' && num(c.t, null) !== null).map((c) => num(c.t, 0)),
    ...(Array.isArray(d.transitions) ? d.transitions : []).filter((c) => c && typeof c === 'object' && num(c.at, null) !== null).map((c) => num(c.at, 0)),
  ]);
  const cuts = boundaries.size;
  if (cuts < SPECTACLE_MIN_BOUNDARIES || T.duration < SPECTACLE_MIN_DUR) return null;
  // The waiver is read AFTER the trigger, so a scene that waives a rule it never trips stays silent
  // rather than announcing a waiver nobody needed.
  if (allow.has('no-spectacle-nominated')) return { waived: true };
  return { msg: `this film runs ${s(T.duration)} across ${cuts} declared boundaries and names no peak: there is no \`spectacle\` block in ${path.basename(file)} `
    + `and no plan naming one. Nothing else in the ladder asks this. \`effect-soup\` fails a film that shouts on every beat and \`plain-slideshow\` fails one `
    + `that never shouts, so a film can sit between them, pass both, and still be evenly loud, which is not the same as shaped. `
    + `Name the one moment the film is allowed to shout, and buy it by quietening the rest: `
    + `\`"spectacle": { "at": <seconds>, "of": "<layer id>", "device": "<device>", "why": "<what the moment is for>" }\` (core/spectacle.js). `
    + `If this film is deliberately flat, say so: {"authoring":{"allow":["no-spectacle-nominated"],"_why":{"no-spectacle-nominated":"..."}}}.` };
}
// It PRINTS, and it never counts. This finding is advisory in both directions: it is a question about
// the author's intent, and a question that can block is a question people answer with a waiver.
function printNomination() {
  const n = nominationNote();
  if (!n) return;
  const F = gateFindings({ scene: file, indent: '  ',
    line: (r, g) => `  ${g} [${r.code}] ${r.waived ? 'waived via authoring.allow' : r.summary}\n` });
  if (n.waived) F.finding({ code: 'no-spectacle-nominated', severity: 'warn', summary: n.msg, waived: true });
  else F.warn('no-spectacle-nominated', n.msg);
  F.emit();
  if (n.waived) return;
  console.log(`    (advisory, and it stays advisory under --strict.)\n`);
}

const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });

// ---------- the threads promise: a small, deliberately closed vocabulary ----------
// Needs no sidecar, only the storyboard: `threads:` is read off the film's own frontmatter, the same
// surface `spectacle:` and `pace:` already come from below. Measured 2026-09-17 across the 44
// storyboards in films/scene: 34 carry `threads:`, and every one of them is a sentence, not a list
// ("a cursor and a caret that cause every change + a ground that takes its colour from whatever is on
// screen"). That rules out parsing it as data. What it does not rule out is grepping for a small set of
// literal nouns this engine can check structurally, one layer-kind or one measured fact at a time.
//
// THIS IS THE GAP THE OWNER FOUND BY HAND. vawe-flow-2's threads promised "a cursor and a caret", and
// the caret existed while the cursor did not; nothing here read `threads:` back against the render, so
// nothing said so. That is the one defect this closes. It does NOT attempt "one exit axis per act": an
// axis-per-act check needs a definition of where one "act" ends and the next begins that the beat table
// does not carry (a beat is not an act), and guessing one is exactly the kind of invented number this
// file (see header) refuses to hand back as a finding.
function hasLayerType(type) {
  return T.layers.some((L) => { let found = false; walk(L, (x) => { if (x.type === type) found = true; }); return found; });
}
function hasCaretLayer() {
  return T.layers.some((L) => { let found = false; walk(L, (x) => { if (x.typing != null && x.caret !== false) found = true; }); return found; });
}
// A "ground" is read by id prefix, the convention every film that has one already uses (gnd-terminal-out,
// gnd-film-plinth, ...). More than one colour across the ground layers is the only fact a static reader
// can stand behind for "takes its colour from whatever is on screen"; it says nothing about WHICH colour
// or WHEN, the same way `hasLayerType` says nothing about where the cursor points.
function groundColorCount() {
  const colors = new Set();
  T.layers.forEach((L) => walk(L, (x) => {
    if (typeof x.id !== 'string' || !/^(gnd|ground|backdrop)\b/i.test(x.id)) return;
    for (const k of ['bg', 'color', 'fill', 'background']) if (typeof x[k] === 'string') colors.add(x[k]);
  }));
  return colors.size;
}
const THREAD_DEVICES = [
  { rx: /\bcursor\b/i, label: 'a cursor', ok: () => hasLayerType('cursor'),
    fix: 'add a layer with "type": "cursor" (core/layers/cursor.js)' },
  { rx: /\bcaret\b/i, label: 'a caret', ok: () => hasCaretLayer(),
    fix: 'give a text layer `typing` with `caret` left true (core/layers/text.js)' },
  { rx: /\bground\b[\s\S]{0,40}\bcolou?r/i, label: 'a ground that takes its colour', ok: () => groundColorCount() > 1,
    fix: 'give the gnd-/ground- layers more than one colour across the film (core/backgrounds)' },
];
if (sb && sb.threads) {
  // Corpus convention (see the `threads:` samples above): clauses are joined with ` + `. Splitting on
  // it lets a finding quote the one clause that broke a promise instead of the whole sentence.
  const clauses = sb.threads.split(/\s*\+\s*/).map((c) => c.trim()).filter(Boolean);
  for (const dev of THREAD_DEVICES) {
    const promised = clauses.find((c) => dev.rx.test(c)) || (dev.rx.test(sb.threads) ? sb.threads : null);
    if (!promised || dev.ok()) continue;
    warn('thread-not-built', `${sbPath} promises ${dev.label} in \`threads:\` ("${promised}"). Nothing in ${file} matches: `
      + `${dev.fix}, or drop this clause from \`threads:\` if the film no longer means to carry it. `
      + `This checks the device EXISTS, never that it is the one causing the change threads: describes. `
      + `If this is a deliberate change of direction, waive it here with a reason `
      + `({"authoring":{"allow":["thread-not-built"],"_why":{"thread-not-built":"..."}}}) `
      + `and copy that reason into \`threads:\` by hand so the plan a person approved still describes the film they get.`);
  }
}

// ---------- the transformation-at-the-end promise: continuity, never identity ----------
// THE OWNER'S ACTUAL ASK: "the harness should verify the things we have finalized in storyboard is
// true in the video, like the vawe video becoming the logo at the end". Be honest about the two halves
// of that. CHECKABLE: at a promised handoff, the stage never goes empty. NOT CHECKABLE: that the thing
// which arrives IS the thing that left, transformed. That is identity across two moments, it lives in
// the pixels, and it belongs to `make judge` and human eyes, the same restraint `thread-not-built`
// above already holds to.
//
// WHERE "the end" IS. `threads:` was measured across 44 storyboards and is always a sentence (see
// above); `arc:` and `spectacle:` read the same way, and every sample carrying a transformation names
// it AS PART OF A CHAIN in film order ("the name becomes the surface, the surface becomes the frame it
// rendered, ... the wall resolves to the claim"). Parsing WHICH BEAT a clause means would be a guess,
// exactly what `thread-not-built`'s own restraint refuses; which JOIN it means does not need one: take
// the render's own LAST boundary (core/timeline/junctions.js allBoundaries, the same declared-plus-
// inferred list quality/gates/seam-snap.mjs samples every one of), since a film's last boundary is its
// own answer to "what happens at the end" regardless of which noun the prose used for it.
//
// WHY NOT `T.handoffs`. It looked like the natural JSON-level proxy for "do the two ends share a
// place" (an exit near another's entrance, same screen region), but it is tuned for a near-simultaneous
// meet (its own HANDOFF_WINDOW is 0.25s) and this engine's own deliberate fix for the exemplar defect is
// a much WIDER overlap (the mark arrives 0.35s before the outgoing strip fully leaves), so `T.handoffs`
// found no join on the FIXED film either. A check that reads clean on both the broken film and the fix
// is not reading anything. `allBoundaries` has no such window to mistune, it is the same joint seam-snap
// already measures pixels at.
const TRANSFORM_WORDS = '(?:becomes|forms out of|resolves to|turns into|dissolves into)';
function lastTransformClause(text) {
  if (!text) return null;
  const rx = new RegExp(`\\b${TRANSFORM_WORDS}\\b`, 'gi');
  let m, last = null;
  while ((m = rx.exec(text))) last = m;
  if (!last) return null;
  const start = Math.max(text.lastIndexOf('.', last.index), text.lastIndexOf(',', last.index)) + 1;
  const dot = text.indexOf('.', last.index);
  return text.slice(start, dot === -1 ? text.length : dot).trim();
}
const endClause = sb && (lastTransformClause(sb.arc) || lastTransformClause(sb.spectacle));
if (endClause) {
  const flatAll = flattenLayers(T.scene.layers);
  const boundaries = allBoundaries(T.scene, flatAll);
  if (!boundaries.length) {
    warn('transformation-not-continuous', `${sbPath} names a transformation as its own through-line ("${endClause}"). `
      + `${file} declares no cut/seam/sting and its layer starts never cluster into an inferred one either `
      + `(core/timeline/junctions.js): there is no boundary in the render this check can hold the promise to.`);
  } else {
    const joinT = boundaries[boundaries.length - 1];
    const { out: fromId, inn: toId } = nearestBeats(flatAll, joinT);
    const ready = gradeable(file);
    if (!ready.ok) {
      console.log(`  ○ ${sbPath} promises a transformation at the film's end ("${endClause}"), its last boundary `
        + `lands at ${s(joinT)} as "${fromId}" -> "${toId}". Not checked: ${ready.why} (${ready.fix}).`);
    } else {
      const mp4 = ready.mp4;
      const realFps = probeFps(mp4), totalFrames = probeTotalFrames(mp4);
      if (realFps && totalFrames) {
        // same colour-blind emptiness test seam-snap.mjs runs at every boundary (harness/lib/
        // frame-forensics.mjs emptinessAt), scoped here to the ONE join the storyboard's own prose
        // named, so the finding reads as a broken PROMISE, not just a broken frame.
        const empty = emptinessAt(mp4, realFps, totalFrames, Math.round(joinT * realFps));
        if (empty) {
          warn('transformation-not-continuous', `${sbPath} promises a transformation at the film's end ("${endClause}"), `
            + `landing as "${fromId}" -> "${toId}" at ${s(joinT)}. The render goes empty there: spread drops `
            + `to ${empty.spread} vs ${empty.outsideSpread} just outside (32x18 grid, colour-blind), empty `
            + `${empty.emptySec.toFixed(2)}s before content reads. This proves continuity broke, never that the wrong `
            + `thing arrived: overlap "${fromId}"'s exit with "${toId}"'s entrance so the stage never empties `
            + `(TRANSITIONS.md: no transition-dip), then re-render.`);
        }
      }
    }
  }
}

// ---------- the plan names a fragment the film does not use ----------
//
// A DESIGNED FRAME CAN BE BUILT, NAMED IN THE PLAN, AND THEN QUIETLY ORPHANED. vawe-flow-2 is the
// exemplar: `vawe-flow-2.films.html` was authored over four commits (caption truncation, contrast
// fixes, a rebuild into a six-card wall), its `fragment-exemplars:` line promised it carried beat 7,
// and the scene referenced it ZERO times. The beat had been rewritten as raw video groups instead, so
// the owner saw an unfinished frame and the plan still claimed a designed one.
//
// Nothing could catch it. The film JSON is gitignored (.gitignore:84), so the edit that dropped the
// `src` left no commit, no diff and no reason. The fragment has history; the file that referenced it
// does not. The log receipts added elsewhere cannot help either: they record what the harness SAYS and
// REFUSES, and an author deleting a src is neither.
//
// This is not prose matching. A storyboard names fragments by FILENAME, so both directions are exact:
// a file the plan promises and the scene never loads, and a fragment sitting beside the film that
// nothing references. Both are the same orphan seen from two ends. WARN, not fail: an author may be
// mid-rewrite, and a plan is allowed to be ahead of the film for a while.
{
  const sceneText = JSON.stringify(d);
  const named = sbPath ? [...new Set((fs.readFileSync(sbPath, 'utf8').match(/[A-Za-z0-9._/-]+\.html/g) || []))] : [];
  for (const n of named) {
    const leaf = path.basename(n);
    if (!sceneText.includes(leaf)) {
      warn('fragment-orphaned', `${path.basename(sbPath)} names \`${leaf}\` as a fragment this film uses, and `
        + `${path.basename(file)} never loads it. Either point a layer at it (\`"type": "html", "src": "films/scene/${leaf}"\`), `
        + `or drop it from the plan, because a plan that promises a designed frame the film does not show is how an `
        + `abandoned fragment goes unnoticed.`);
    }
  }
  const base = file.replace(/\.json$/, '');
  for (const f of (fs.existsSync(path.dirname(file)) ? fs.readdirSync(path.dirname(file)) : [])) {
    const full = path.join(path.dirname(file), f);
    if (!f.endsWith('.html') || !full.startsWith(base + '.')) continue;
    if (!sceneText.includes(f)) {
      warn('fragment-unused', `${f} sits beside this film and nothing in ${path.basename(file)} loads it. `
        + `A fragment nobody references is either dead work to delete or a frame the film forgot to show: decide which.`);
    }
  }
}

// THE SIDECAR IS A CACHE, NOT A SECOND SOURCE. scripts/brand/intent-from-storyboard.mjs builds
// `.intent.json` from exactly two things the storyboard already carries: each beat's own
// `(0s-3s)` heading range, as `span`, and its `becomes:` line. So the sidecar is the storyboard's
// beat spans, written out once, and there is nothing beat-span checks below need that the
// storyboard itself does not already hold. Read the sidecar when it exists (an author may have
// hand-corrected it after generation, and that correction should win); otherwise read the same
// two fields straight off the storyboard, so a film gets checked before anyone runs `make intent`.
// This is the fix for the 38-of-44 films that had no sidecar and so never reached a single check
// below: reading storyboard-derived beats HERE, once, means every check downstream (junction-is-
// static, beat-holds-still, held-through-the-change, unplanned-junction, plan-overruns-render,
// spectacle-beat-unnamed, spectacle-in-wrong-beat, pace-not-kept) now runs off it too, with no
// change to what any of them measure.
//
// A storyboard beat with no timed heading cannot be trusted for a span (there is nothing to
// derive), so it is skipped individually and named, never guessed: guessing here is exactly the
// "declared value nobody decided" failure this file already refuses to manufacture for spectacle.
function planBeatsFromStoryboard(sbv) {
  const beats = [], skipped = [];
  for (const b of sbv.beats) {
    if (b.start == null || b.end == null) { skipped.push(b.name); continue; }
    beats.push({ name: b.name, span: [b.start, b.end], becomes: b.becomes || undefined });
  }
  return { beats, skipped };
}
let planSource = null;   // 'sidecar' | 'storyboard' | null (no plan at all)
let beats = [];
let skippedBeats = [];
if (fs.existsSync(intentPath)) {
  const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
  beats = (Array.isArray(intent.beats) ? intent.beats : []).filter((b) => b && typeof b === 'object');
  planSource = 'sidecar';
} else if (sb && sb.beats.length) {
  const derived = planBeatsFromStoryboard(sb);
  beats = derived.beats;
  skippedBeats = derived.skipped;
  planSource = 'storyboard';
}

// ---------- what the render actually does, as a list of moments ----------
// An EVENT is a moment the frame provably changes: a content layer arriving or leaving, a declared
// transition firing, a motion keyframe landing. This is everything a scene JSON can tell you about
// change without rendering it. It is a floor, not a census: a CSS-driven html layer that morphs on its
// own clock produces no event here, which is why `beat-holds-still` also asks whether anything on
// screen is continuously in motion before it complains.
const events = [];
const ev = (t, what) => { if (Number.isFinite(t)) events.push({ t: +(+t).toFixed(3), what }); };
for (const [a, b] of T.spans) { ev(a, 'layer in'); ev(b, 'layer out'); }
for (const key of BOUNDARY_KEYS) {
  for (const c of (Array.isArray(T.scene[key]) ? T.scene[key] : [])) {
    if (c && typeof c === 'object' && num(c.t, null) !== null) ev(num(c.t, 0), key.replace(/s$/, ''));
  }
}
for (const L of T.layers) walk(L, (x) => {
  const base = num(x.start, 0);
  if (Array.isArray(x.motion)) for (const k of x.motion) if (k && num(k.t, null) !== null) ev(base + num(k.t, 0), 'motion key');
});
events.sort((x, y) => x.t - y.t);

// a layer whose CONTENT changes every frame while it is on screen, so a stretch it covers is never still.
// A `motion` track is deliberately NOT in this list. A track is keyframes with HOLDS between them, and
// treating one as continuous motion is how the first draft of this gate passed the very film it was
// written for: both of that film's surfaces carry a 6-key track, and both sit frozen for 5.1s of a
// 12s film inside it. The keys are already events; the stretches between them are the subject below.
const CONTINUOUS = (L) => !!(L.type === 'count' || L.ken || L.shader || L.canvasFx || L.three || L.raymarch
  || L.type === 'paint'
  || (typeof L.html === 'string' && /var\(\s*--[tp]\b/.test(L.html))
  || (L.children || []).some(CONTINUOUS));

// AN AUTHORED HOLD: two consecutive motion keys carrying identical values. This is the strongest evidence
// a static gate can have that the frame stalls, because it is not inferred from an absence, it is written
// down. `{t:3.46, y:-82}` followed by `{t:8.6, y:-82}` says, in the author's own hand, that this object
// does not move for 5.14 seconds.
const KEYLESS = new Set(['t', 'ease']);
const holdsOf = (L, base) => {
  const ks = Array.isArray(L.motion) ? L.motion.filter((k) => k && num(k.t, null) !== null) : [];
  const val = (k) => JSON.stringify(Object.fromEntries(Object.entries(k).filter(([p]) => !KEYLESS.has(p)).sort()));
  const out = [];
  for (let i = 1; i < ks.length; i++) if (val(ks[i]) === val(ks[i - 1])) out.push([base + num(ks[i - 1].t, 0), base + num(ks[i].t, 0)]);
  return out;
};
const holds = [];
for (const L of T.layers) walk(L, (x) => { for (const h of holdsOf(x, num(x.start, 0))) holds.push({ span: h, layer: x.type || 'layer' }); });
// T.spans is sorted, so it cannot be indexed by position in T.content. Recompute each mover's window
// from the layer itself, applying the same scene-units correction the shared model uses.
const moverSpans = T.content.filter(CONTINUOUS).map((L) => {
  const a = num(L.start, 0); const u = T.unitEnd(L);
  return [a, u == null ? a + num(L.duration, num(L.dur, 2)) : u];
});

// ---------- the plan ----------
console.log(`\n  plan vs render · ${file}${planSource === 'sidecar' ? ` vs ${intentPath}` : ''}`);
console.log(`  ${beats.length} planned beat(s) · film runs ${s(T.duration)} · ${events.length} render event(s)`);
if (planSource === 'storyboard') {
  console.log(`  ○ no ${intentPath} sidecar: beat spans and \`becomes:\` read straight off ${sbPath} instead (same fields \`make intent\` would have cached).`);
  if (skippedBeats.length) console.log(`  ○ skipped ${skippedBeats.length} beat(s) with no (0s-3s) heading range, so no span could be read: ${skippedBeats.join(', ')}.`);
} else if (planSource === null) {
  console.log(`  ○ no plan to check against: no ${intentPath} sidecar and no storyboard beside this scene.`);
}
// Say out loud whether the prose half of the plan is in play. The sidecar drops `spectacle:` and `pace:`,
// so with no storyboard those two decisions go unchecked, and an unchecked decision should never look
// like a passed one.
if (sbPath) console.log(`  storyboard: ${sbPath} (spectacle + pace joined)`);
else console.log(`  ○ no storyboard found beside this scene, so \`spectacle:\` and \`pace:\` are not checked. Pass --sb <storyboard.md> to join them.`);
console.log('');

const spanned = beats.filter((b) => Array.isArray(b.span) && b.span.length === 2 && b.span.every((x) => Number.isFinite(x)));
if (planSource === null) {
  // Nothing to check the film against, and nothing was promised: this is not a broken plan, it is
  // an absent one, which is a different fact (doctrine already names the difference: a plan nobody
  // made is worse than no plan, never the same as one). Say so, but do not warn or fail on it; the
  // thread/transformation/fragment/spectacle-nomination checks above already ran with no plan at all.
} else if (!spanned.length) {
  warn('plan-has-no-spans', planSource === 'sidecar'
    ? `no beat in ${intentPath} carries a \`span\`, so there is nothing to line the film up against. `
      + `Spans come from the (0s-3s) ranges in the storyboard headings. Re-run \`make intent SB=<storyboard.md> D=${file}\` `
      + `against a storyboard whose headings are timed, and this gate starts working.`
    : `no beat heading in ${sbPath} carries a (0s-3s) time range, so there is nothing to line the film up against. `
      + `Time every beat's heading, and this gate starts working (no sidecar needed).`);
} else {
  // 1. does the plan describe THIS film, or a different-length one?
  const planEnd = Math.max(...spanned.map((b) => b.span[1]));
  const drift = Math.abs(planEnd - T.duration);
  if (drift > OVERRUN) {
    const msg = `the plan budgets ${s(planEnd)} and the film runs ${s(T.duration)}, a gap of ${s(drift)}. `
      + `Every beat span below is therefore pointing at the wrong part of the film, so nothing this gate says about them can be trusted. `
      + `Either the storyboard's times are stale (re-time it and re-run \`make intent\`) or the scene's \`duration\` is not what you planned.`;
    const fps = num(d.fps, 60);
    const adapted = adaptFinding({ kind: 'plan-overruns-render', driftFrames: drift * fps }, { fps }).adapted;
    if (adapted) { console.log(`  ${adapted.line}`); warn('plan-overruns-render', msg); }
    else fail('plan-overruns-render', msg);
  }

  // 2. at each junction the plan marks with a change, does the render put anything there?
  for (let i = 1; i < spanned.length; i++) {
    const b = spanned[i];
    const j = b.span[0];
    if (!b.becomes) continue;                       // no promise made here, nothing to keep
    const near = events.filter((e) => Math.abs(e.t - j) <= NEAR);
    if (!near.length) {
      fail('junction-is-static', `beat ${i + 1} "${b.name || ''}" opens at ${s(j)} promising: ${b.becomes}. `
        + `Nothing in the render happens within ${s(NEAR)} of it: no layer arrives or leaves, no cut or seam or sting fires, no motion key lands. `
        + `The plan names a transformation and the JSON builds no moment for it. Give the junction an event, or move the beat boundary to where the film actually turns.`);
    }
  }

  // 2b. TWO OWNERS OF BEAT TIMING (item 3, `beats[]`). The storyboard sidecar has always carried beat
  // spans; a scene that also carries its own `beats[]` (core/timeline/relative-time.js `beat:<id>.start`
  // targets) now has a SECOND place beat timing lives, and a second place can drift from the first.
  // Report-only, by design: this gate proves render behaviour and BLOCKS on it, but a stale `beats[]`
  // entry is a bookkeeping drift, not a broken render (nothing here reads `beats[]` to draw a frame), so
  // it prints and never fails, not even under --strict, the same as the spectacle nomination above.
  if (Array.isArray(d.beats)) {
    const BEAT_TOL = 0.05;
    const mismatches = [];
    spanned.forEach((b, i) => {
      const sb2 = d.beats[i];
      if (!sb2 || typeof sb2.start !== 'number' || typeof sb2.duration !== 'number') return;
      const [planStart, planEnd] = b.span;
      const sceneEnd = sb2.start + sb2.duration;
      if (Math.abs(sb2.start - planStart) > BEAT_TOL || Math.abs(sceneEnd - planEnd) > BEAT_TOL) {
        mismatches.push(`    ! beat ${i + 1} "${b.name || ''}": storyboard plans ${s(planStart)}-${s(planEnd)}, `
          + `scene beats[${i}] ("${sb2.id}") is ${s(sb2.start)}-${s(sceneEnd)}.`);
      }
    });
    if (mismatches.length) {
      console.log(`  beats[] vs storyboard: ${mismatches.length} beat(s) disagree (re-run \`make assemble D=${file}\` to regenerate beats[] from the storyboard):`);
      for (const m of mismatches) console.log(m);
      console.log('    (report-only: never blocks, not even under --strict.)\n');
    }
  }

  // 3. inside a beat the plan paid seconds for, does the film hold still for most of them?
  for (const [i, b] of spanned.entries()) {
    const [a, z] = b.span;
    const inside = [a, ...events.filter((e) => e.t > a + 1e-9 && e.t < z - 1e-9).map((e) => e.t), z].sort((x, y) => x - y);
    let worst = 0, at = a;
    for (let k = 1; k < inside.length; k++) { const gap = inside[k] - inside[k - 1]; if (gap > worst) { worst = gap; at = inside[k - 1]; } }
    if (worst < STILL) continue;
    // a count ticking, a ken burn, a shader: the frame is moving even though no event fires. Not a hold.
    if (moverSpans.some(([ms, me]) => ms <= at + 1e-9 && me >= at + worst - 1e-9)) continue;
    warn('beat-holds-still', `beat ${i + 1} "${b.name || ''}" (${s(a)}-${s(z)}) holds ${s(worst)} from ${s(at)} with nothing arriving, leaving or moving`
      + `${b.becomes ? `, while the plan says this beat is where "${b.becomes}"` : ''}. `
      + `That is ${Math.round((worst / Math.max(T.duration, 1e-9)) * 100)}% of the whole film spent on one unchanging frame. `
      + `Stage the change across the beat instead of landing it all at the edge, or give the beat fewer seconds.`);
  }

  // 3b. does the plan promise a change across seconds the author explicitly froze?
  for (const [i, b] of spanned.entries()) {
    const [a, z] = b.span;
    // Two surfaces frozen across the same seconds is ONE stalled frame, not two findings. Report the
    // worst hold in the beat and name how many layers share it.
    let hit = null;
    for (const h of holds) {
      const lo = Math.max(a, h.span[0]), hi = Math.min(z, h.span[1]);
      if (hi - lo < STILL) continue;
      // ONE layer holding still is not the frame holding still, and conflating the two makes this gate
      // shout at good films. The control arm of the A/B test pins a surface for 6.7s and is the better
      // film, because other things arrive and leave the whole time. So the hold only counts across the
      // stretch of it where nothing ELSE happens either. A hold's own two keys bound the window, so any
      // event strictly inside it belongs to something else.
      const marks = [lo, ...events.filter((e) => e.t > lo + 1e-9 && e.t < hi - 1e-9).map((e) => e.t), hi].sort((x, y) => x - y);
      let worst = 0, at = lo;
      for (let k = 1; k < marks.length; k++) if (marks[k] - marks[k - 1] > worst) { worst = marks[k] - marks[k - 1]; at = marks[k - 1]; }
      if (worst < STILL) continue;
      if (!hit || worst > hit.worst) hit = { worst, at, layers: new Set([h.layer]) };
      else if (Math.abs(worst - hit.worst) < 1e-6) hit.layers.add(h.layer);
    }
    if (hit) {
      const who = [...hit.layers].join(' + ');
      warn('held-through-the-change', `beat ${i + 1} "${b.name || ''}" (${s(a)}-${s(z)}) runs ${s(z - a)}, and for ${s(hit.worst)} of it, from ${s(hit.at)}, `
        + `the ${who} layer(s) sit pinned to identical motion keys while nothing else arrives, leaves or moves either. `
        + `${b.becomes ? `The plan says this beat is where "${b.becomes}". ` : ''}`
        + `The hold is authored, not inferred: two consecutive keys carry the same values. If the beat is where something turns, `
        + `stage the turn across it; if the object is meant to rest here, it does not need this many seconds.`);
    }
  }

  // 4. does the film turn where the plan says it turns?
  const boundaries = [...new Set(spanned.flatMap((b) => b.span))].sort((x, y) => x - y);
  for (const t of T.cutTimes) {
    if (boundaries.some((bd) => Math.abs(bd - t) <= DRIFT)) continue;
    warn('unplanned-junction', `the film cuts at ${s(t)} and the plan has no beat boundary within ${s(DRIFT)} of it `
      + `(planned boundaries: ${boundaries.map(s).join(', ')}). Either the storyboard is out of date with the edit, or the film breaks somewhere the plan never accounted for.`);
  }
}

// ---------- the storyboard's prose decisions, against the film ----------
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// Which beat did the SPECTACLE line name? Two ways, both literal: an ordinal ("beat 4"), or exactly one
// beat name quoted inside the line. Anything else is unresolved and SAID to be unresolved, guessing
// which beat the author meant would put a finding on a film for a sentence this gate misread.
function plannedSpectacleBeat(line, list) {
  const m = /\bbeat\s*#?\s*(\d+)\b/i.exec(line);
  if (m) {
    const i = +m[1] - 1;
    return (i >= 0 && i < list.length) ? { i, how: `it says "beat ${m[1]}"` } : null;
  }
  const low = line.toLowerCase();
  const hits = list.map((b, i) => ({ b, i })).filter(({ b }) => b.name && b.name.length >= 4 && low.includes(b.name.toLowerCase()));
  return hits.length === 1 ? { i: hits[0].i, how: `it names the beat "${hits[0].b.name}"` } : null;
}

if (sb && sb.spectacle) {
  if (!isObj(d.spectacle)) {
    warn('spectacle-not-built', `${sbPath} declares a spectacle: ${sb.spectacle}. ${file} has no \`spectacle\` block, so the film has no peak. `
      + `The plan names the one moment the film is allowed to shout, and naming it is also a promise that every other beat stays restrained; neither half was built. `
      + `Add \`"spectacle": { "at": <seconds>, "of": "<layer id>", "device": "<device>", "why": "<what the moment is for>" }\` to the scene (core/spectacle.js), or drop the line from the plan.`);
  } else if (spanned.length) {
    const loc = plannedSpectacleBeat(sb.spectacle, spanned);
    if (!loc) {
      warn('spectacle-beat-unnamed', `${sbPath} declares a spectacle: ${sb.spectacle}. The scene puts its peak at ${s(d.spectacle.at)}, `
        + `but the line names no beat this gate can find, so the two cannot be compared. Write the beat into it, as "beat 4" or with the beat's own title, `
        + `and this check starts telling you whether the peak landed where you planned it.`);
    } else {
      const [a, z] = spanned[loc.i].span;
      const at = num(d.spectacle.at, null);
      if (at !== null && (at < a - NEAR || at > z + NEAR)) {
        warn('spectacle-in-wrong-beat', `${sbPath} puts the spectacle in beat ${loc.i + 1} "${spanned[loc.i].name || ''}" (${s(a)}-${s(z)}), because ${loc.how}. `
          + `The scene fires it at ${s(at)}, outside that beat. The loudest instant of the film lands somewhere the plan did not budget for it, `
          + `and the whole rest of the film has been quietened to buy a peak in the other place. Move \`spectacle.at\` into the beat, or re-plan the beat around where the peak really is.`);
      }
    }
  }
}

// THE SEAM'S VALUE. `transition_value:` (harness/lib/contract.mjs, Task 2) declares what a boundary
// does to ground VALUE (dark->light · light->dark · held) BEFORE the film is built; `ground-arc.mjs`
// only ever measured a flip after the fact. GUARDED on at least one beat declaring the field: the
// cross-check re-samples the built film's pixels (measureGroundFlips), which is the one expensive step
// in this whole gate, and 44 existing storyboards declare it on zero beats today, so this costs nothing
// until an author opts in. Follows this gate's own restraint: it reports PRESENCE of a disagreement
// between what was declared and what rendered, never a taste judgement about which is right.
if (sb && sb.beats.some((b) => b.transition_value)) {
  const tlBeats = timeline(sb).beats;
  const flips = await measureGroundFlips(path.resolve(file));
  tlBeats.forEach((b, i) => {
    if (!b.transition_value || b.start == null) return;
    const nearby = flips.filter((f) => Math.abs(f.t - b.start) <= JOIN_TOLERANCE);
    const measured = nearby.length ? `${nearby[0].from}->${nearby[0].to} at ${nearby[0].t}s` : null;
    if (b.transition_value === 'held') {
      if (nearby.length) {
        warn('ground-value-mismatch', `beat "${b.name}" declares \`transition_value: held\`, but the render `
          + `flips ${measured} right at this join. Either the hold broke, or the declaration is stale.`);
      }
      return;
    }
    if (!nearby.length) {
      warn('ground-value-mismatch', `beat "${b.name}" declares \`transition_value: ${b.transition_value}\`, `
        + `but ground-arc measures no flip within ${JOIN_TOLERANCE}s of this beat's start (${s(b.start)}). `
        + `The plan's flip was never built, or it landed somewhere else.`);
      return;
    }
    const gotDirection = `${nearby[0].from}->${nearby[0].to}`;
    if (gotDirection !== b.transition_value) {
      warn('ground-value-mismatch', `beat "${b.name}" declares \`transition_value: ${b.transition_value}\`, `
        + `but ground-arc measures ${measured} at this join. The plan and the render disagree about which `
        + `way the ground moves.`);
    }
  });
}

// PACE. The plan budgets seconds per IDEA before any beat is written; the film has a runtime and a beat
// count. This lays one over the other. It counts the PLAN's ideas against the RENDER's clock, so it
// catches a film that grew past its budget; it cannot see two ideas crowded into one beat, which is a
// judgement `make judge` makes and no arithmetic here can.
const PACE_BANDS = { showreel: [1.5, 4], explainer: [3, 8], held: [6, Infinity] };
if (sb && sb.pace && spanned.length) {
  const raw = sb.pace;
  const named = Object.keys(PACE_BANDS).filter((g) => new RegExp(`\\b${g}\\b`, 'i').test(raw));
  // The template's own placeholder lists all three genres. An author who never deleted the other two has
  // not chosen a pace, and reading the first one as their choice would invent a decision nobody made.
  if (named.length !== 1) {
    warn('pace-not-chosen', `${sbPath} carries \`pace: ${raw}\`. That is the template's menu, not a choice. `
      + `Pace is a genre decision made before any beat is written: keep exactly one of showreel · explainer · held and give it a seconds-per-idea budget.`);
  } else {
    const genre = named[0].toLowerCase();
    // An explicit budget in the line wins over the genre's band: "2.5s per idea", "2-4 s/idea".
    const two = /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*s(?:ec)?\b[^.]{0,24}?\bidea/i.exec(raw);
    const one = /(\d+(?:\.\d+)?)\s*s(?:ec)?\b[^.]{0,24}?\bidea/i.exec(raw);
    const band = two ? [+two[1], +two[2]] : one ? [+one[1] * 0.6, +one[1] * 1.4] : PACE_BANDS[genre];
    const source = two ? `its own ${two[1]}-${two[2]}s budget` : one ? `its own ${one[1]}s budget (±40%)` : `a ${genre}'s ${band[0]}-${band[1] === Infinity ? '∞' : band[1]}s band`;
    const real = T.duration / spanned.length;
    const shots = T.duration / (T.cutTimes.length + 1);
    if (real < band[0] || real > band[1]) {
      warn('pace-not-kept', `${sbPath} declares \`pace: ${raw}\`, and the film gives its ${spanned.length} planned idea(s) ${s(T.duration)}, `
        + `which is ${real.toFixed(2)}s per idea against ${source}. Its shots average ${shots.toFixed(2)}s. `
        + `${real > band[1] ? 'The film is slower than the pace it was planned at: cut the duration before adding beats, because a slow film is almost always a film that is too long.'
          : 'The film is faster than the pace it was planned at: a beat carrying two ideas is two beats or one cut, never one crowded frame.'} `
        + `Either re-cut to the budget, or change \`pace:\` to the genre this film really is.`);
    }
  }
}

// ---------- report ----------
const fails = findings.filter((f) => f.sev === 'FAIL' && !allow.has(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !allow.has(f.code));
const waived = findings.filter((f) => allow.has(f.code));
// One fact, one owner: the record is the finding and the line is rendered from it, so author-check
// reads `code` off a structure instead of re-reading this sentence (engine-doctrine/MISTAKES.md #401).
const F = gateFindings({ scene: file, indent: '  ',
  line: (r, g) => r.waived ? `  ${g} [${r.code}] waived via authoring.allow` : `  ${g} [${r.code}] ${r.summary}\n` });
for (const f of fails) F.fail(f.code, f.msg);
for (const f of warns) F.warn(f.code, f.msg);
for (const f of waived) F.finding({ code: f.code, severity: f.sev === 'FAIL' ? 'error' : 'warn', summary: f.msg, waived: true });
F.emit();
// The peak question runs on a planned film too. A sidecar carries beats and `becomes:` lines and never
// a spectacle, so a film can be fully planned, fully checked here, and still nominate nothing.
printNomination();
if (!fails.length && !warns.length) console.log('  ✓ the film has a moment where the plan promised one, and no planned beat sits still.');
console.log(`\n  ${fails.length} fail · ${warns.length} warn`);
// The honesty line prints on GREEN too. A gate that only qualifies itself when it fails teaches the
// reader that a tick means more than it does.
console.log(`  (this gate proves a change HAPPENS at each promised junction. That the change is the one named,`);
console.log(`   and that the object survives it, is what \`make judge\` and your eyes are for.`);
console.log(`   It proves the spectacle was BUILT and sits in the planned beat, never that the moment is worth the`);
console.log(`   silence it bought; and it counts the plan's ideas against the film's clock, never how many ideas are`);
console.log(`   crowded into one beat.)\n`);
process.exit(fails.length || (strict && warns.length) ? 1 : 0);
