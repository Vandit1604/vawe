#!/usr/bin/env node
// quality/gates/stage.mjs: WHERE IS THIS FILM, and what is the ONE next thing to do.
//
//   make stage D=formats/scene/<film>.json   ·   node quality/gates/stage.mjs <film> [--json]
//   make stage                                  · no film yet: the roster, and the one furthest from done
//   make stage Q="make a launch video for x"    · no film yet EITHER: what to even start
//
// Every stage below already had a command. What did not exist was anything that knew which stage a
// film was IN, so the order lived only in prose in AGENTS.md, and prose is a suggestion. An author who
// can quote the order still runs it backwards five hours into a session (docs/MISTAKES.md #591, #595).
//
// STATE IS DERIVED FROM ARTIFACTS, NEVER STORED. A state file drifts from the repo the moment someone
// deletes a fragment by hand, and then it is a confident liar. A storyboard that exists cannot lie
// about existing. The one thing not derivable is APPROVAL, which is a human act, so it is a line a
// human writes (`/vawe-approve`) and that harness/live/stage-gate.mjs refuses to let an agent write.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseStoryboard, blocksOf, fieldIn, frontmatter } from '../../harness/author/storyboard-parse.mjs';
import { population, LIBRARY } from '../../harness/lib/census.mjs';
import { route } from '../../harness/author/route.mjs';
import { CAMERA_MOVE_NAMES, CAMERA_MOVE_BLURBS } from '../../core/camera-moves/index.js';
import { TRANSITIONS } from '../../core/transitions/catalog.js';
import { PRESETS as KINETIC_PRESETS, PRESET_BLURBS as KINETIC_BLURBS } from '../../core/type/type.js';
import { EASINGS } from '../../core/motion/motion.js';
// score/toks/coverageIn: the SAME ranker `make arsenal` uses (harness/author/arsenal.mjs), never a
// second one. `score` alone has no ceiling (it ranks the best of N whether any of them answers the
// query), which is exactly how "up"/"out"/"focus" (ordinary English, substring-contained in half the
// vocabulary's camelCase names) used to outrank a real match; coverageIn's idf weighting is arsenal's
// own fix for that. NOT `arsenal.mjs collect()`: it walks every `core/<pkg>/*.js`, dynamically
// IMPORTING each one to find its registry, and `.test.mjs` sits in those same directories (this repo's
// own convention, core/camera-moves/*.test.mjs) - importing one runs its `node:test` cases as a side
// effect. `make stage` is read every turn (AGENTS.md), so a call that silently re-runs the engine's
// test suite on every invocation is not an acceptable cost here, whatever `make arsenal` can afford
// once, on demand. CONFIDENT (arsenal's own 0.47 cutoff) is calibrated for that ~700-entry corpus and is
// not reused here for the same reason: on the combined ~176-name pool below it is not the same number.
import { score, toks, coverageIn } from '../../harness/author/arsenal.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Same order stageOf() builds S in. A second copy, not a derived one, because ranking the roster needs
// the order BEFORE any single film's stageOf() has run.
export const STAGE_ORDER = ['brief', 'plan', 'approval', 'design', 'assemble', 'direct', 'render', 'judge'];

/** Every path a film owns, resolved the same way author-check and studio resolve them. */
export function filePaths(arg) {
  const raw = String(arg || '').replace(/\.(json|storyboard\.md)$/, '');
  const base = raw.includes('/') ? raw : path.join('formats/scene', raw);
  const scene = path.join(ROOT, base + '.json');
  let named = null;
  try { const d = JSON.parse(fs.readFileSync(scene, 'utf8'));
    if (typeof d.storyboard === 'string') named = path.join(ROOT, d.storyboard); } catch { /* not written yet */ }
  const sb = [named, path.join(ROOT, base + '.storyboard.md')].find((f) => f && fs.existsSync(f)) || path.join(ROOT, base + '.storyboard.md');
  return { name: path.basename(base), base, scene, sb, brief: path.join(ROOT, base + '.brief.md'),
    mp4: path.join(ROOT, 'out', path.basename(base) + '.mp4') };
}

const gatePasses = (script, file) => {
  try { execFileSync(process.execPath, [path.join(ROOT, script), file], { encoding: 'utf8', stdio: 'pipe' }); return true; }
  catch { return false; }
};

// The stages, in order. Each names the ONE command that moves the film out of it. `done` is asked in
// order and the FIRST stage that is not done is where the film is: a film cannot be at `build` while
// its plan is unapproved, and expressing that as an ordered list rather than a set of flags is what
// makes skipping a stage unrepresentable rather than merely discouraged.
export function stageOf(arg) {
  const p = filePaths(arg);
  const sceneExists = fs.existsSync(p.scene);
  const scene = sceneExists ? (() => { try { return JSON.parse(fs.readFileSync(p.scene, 'utf8')); } catch { return null; } })() : null;
  const sbExists = fs.existsSync(p.sb);
  const sbSrc = sbExists ? fs.readFileSync(p.sb, 'utf8') : '';
  const sb = sbExists ? parseStoryboard(sbSrc) : null;
  const approved = sbExists ? frontmatter(sbSrc).field('approved') : null;
  const fragments = sbExists
    ? blocksOf(sbSrc).map((b) => (fieldIn(b, 'fragment') || '').split(/\s+\(/)[0].trim()).filter(Boolean)
    : [];
  const missingFrags = [...new Set(fragments)].filter((f) => !fs.existsSync(path.join(ROOT, f)));
  const layers = (scene && Array.isArray(scene.layers) ? scene.layers : []).length;

  const S = [
    { id: 'brief', done: fs.existsSync(p.brief) || sbExists,
      why: 'nobody has asked what this film is about. A brief is five lines and any of them missing changes the film.',
      next: `make quiz NAME=${p.name} URL=<the product site>   (no site? docs/CRAFT/AUTHORING-WALKTHROUGH.md, and write ${path.relative(ROOT, p.brief)} by hand)` },
    { id: 'plan', done: sbExists && gatePasses('quality/gates/storyboard-check.mjs', p.sb),
      why: sbExists ? 'the storyboard exists and does not pass its own gate yet.' : 'there is no storyboard. Every role that writes into the film transcribes it, so a gap here becomes an invention further down.',
      next: sbExists ? `make storyboard-check SB=${path.relative(ROOT, p.sb)}` : `make scaffold OUT=${p.base}.json THEME=<theme> DUR=<seconds>   (have a reference or an idea and no prompt yet? make ideate REF=<ref> | NAME=${p.name} IDEA="..." first, docs/CRAFT/IDEATE.md)` },
    { id: 'approval', done: !!approved,
      why: 'the plan passes and nobody has signed it off. Nothing is rendered until the plan is LOCKED and the user signs off.',
      next: `make studio D=${p.base}.json   (press 1 for the plan, then the USER runs /vawe-approve ${p.name})` },
    { id: 'design', done: sbExists && missingFrags.length === 0 && gatePasses('quality/gates/frame-check.mjs', p.scene),
      why: missingFrags.length
        ? `${missingFrags.length} fragment(s) the plan names do not exist yet: ${missingFrags.join(', ')}`
        : 'the fragments exist and do not match what their beats planned: run frame-check and read it.',
      next: missingFrags.length ? `node harness/author/stagekit.mjs ${p.base}.json, then author each fragment: stage kit → the reference's grammar → the smallest useful ui-skills set (command npx -y ui-skills categories) → make preview HTML=<frag> THEME=<theme> → look at it` : `make frame-check D=${p.base}.json` },
    { id: 'assemble', done: layers > 0,
      why: 'the frames are approved and the scene JSON has no layers, so there is no film yet.',
      next: `make assemble D=${p.base}.json` },
    { id: 'direct', done: layers > 0 && (Array.isArray(scene.transitions) ? scene.transitions.length : 0) > 0,
      why: 'the layers exist and no cut does. Motion first, then transitions: a content-aware cut reads the velocity at the joint.',
      next: `make critics D=${p.base}.json DECIDERS=1   (motion, then transition, then sound, in that order)` },
    { id: 'render', done: fs.existsSync(p.mp4),
      why: 'the film is written and has never been rendered.',
      next: `make ship D=${p.base}.json` },
    { id: 'judge', done: false,
      why: 'rendered. The eye is the only step that SEES, and it is not optional.',
      next: `make judge D=${p.base}.json, then make ledger D=${p.base}.json` },
  ];
  const at = S.find((s) => !s.done) || S[S.length - 1];
  return { ...p, stage: at.id, why: at.why, next: at.next, order: S.map((s) => s.id),
    approved: approved || null, fragments: [...new Set(fragments)], missingFrags, layers, sbExists, sceneExists };
}

/**
 * Every film in the library, staged. Reuses harness/lib/census.mjs's LIBRARY filter rather than a
 * second walk of formats/scene/: one owner for "which files count as a film" (docs/MISTAKES.md #391).
 * A film that errors while staging (unparseable storyboard, say) is reported, not thrown, because one
 * bad film should not blind the roster to the rest.
 */
export function roster({ all = false, cap = 12 } = {}) {
  const pop = population('stage roster', { filter: LIBRARY, quiet: true });
  // A LEADING UNDERSCORE IS THIS REPO'S SCRATCH CONVENTION, and 164 of the 176 films in this library
  // are probes: _catalog-1, _camera-blur-probe, _auto-orient. Listing them alphabetically puts every
  // throwaway ahead of every real film, so the front door opened on 176 rows of test scenes. A front
  // door that answers with the whole directory is not an answer. `--all` still prints everything.
  const names = all ? pop.names : pop.names.filter((f) => !path.basename(f).startsWith('_'));
  const rows = names.map((f) => {
    const base = f.replace(/\.json$/, '');
    try { const st = stageOf(base); return { name: st.name, stage: st.stage, next: st.next, ok: true }; }
    catch (err) { return { name: base, stage: 'error', next: String(err && err.message || err), ok: false }; }
  });
  rows.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const worst = rows.find((r) => r.ok) || rows[0] || null;
  // Furthest from done first, then capped: the rows that matter are the unfinished ones, and a film
  // already at judge needs no prompting. `total` counts what was found, `rows` is what is worth reading.
  const shown = all ? rows : rows.slice(0, cap);
  return { n: rows.length, total: pop.names.length, rows: shown, hidden: rows.length - shown.length, worst };
}

// ADOPTION: a WORKLIST, never a gate. Measured (AGENTS.md's build brief): the core carries 14 camera
// moves, a wide transition catalog, 31 kinetic presets, 42 easings, and across 42 authored films almost
// none of it is reached for. `make stage` is where an author already looks every turn, so this is the
// one place a film's own worklist can be pushed rather than left for `make arsenal` to be asked about.
//
// GROUNDED IN THIS FILM, NOT THE WHOLE MARKDOWN. The first cut matched against the storyboard's raw
// text, headers and all, so `up`/`rise`/`slide`/`blur`/`flash`/`ink` (transitions) and
// `weight`/`type`/`focus`/`gradient` (kinetic presets) came back "used" purely because those English
// words happen to sit inside a `why:`/`style:`/`weight:` line somewhere in the file: measured on
// vawe-flow, none of its 9 beats declares a `camera:`, `move:`, `motion:` or `transition_in:` field at
// all, so a "6/89 used" transitions count had nothing real behind it (harness/lib/contract.mjs's own
// parsers confirm every one of those fields is null on every beat). The fix is to read only the fields
// a beat could plausibly reach one of these names FROM: the four structured fields this repo just gave
// a real grammar (camera, move, motion, transition_in) for the USED count, plus the free-prose fields
// that describe intent (mechanism, becomes, trigger, onscreen) for the SUGGESTION corpus only, since
// prose naming a technique is not the same claim as a field that reaches the engine.
const USED_FIELDS = ['camera', 'move', 'motion', 'transition_in'];
const SUGGEST_FIELDS = [...USED_FIELDS, 'mechanism', 'becomes', 'trigger'];

const fieldBlob = (beats, keys, withOnscreen) => beats.map((b) => {
  const parts = keys.map((k) => b[k]).filter(Boolean);
  if (withOnscreen && Array.isArray(b.onscreen) && b.onscreen.length) parts.push(b.onscreen.join(' '));
  return parts.join(' ');
}).join(' ');

// Never worth suggesting: the absence of the family's own effect (a hard cut with no visual, no
// easing at all) is not a capability an author "tries". `cut none`/`slide none` in the coordinator's
// own words are the SAME entry as bare `none` (core/transitions/catalog.js emits one row per name, not
// per mechanism), so excluding the name once already covers every mechanism it appears under.
const IDENTITY = new Set(['none', 'linear', 'hold']);

// THE CORPUS coverageIn's idf weighting needs a real population to measure a word's rarity against:
// too small and almost every word looks "common" (one hit in 14 camera moves alone already clears the
// 6% filler floor, so coverage never leaves 0); too MISMATCHED (arsenal's own ~700-entry collect()) and
// the number is calibrated for a corpus this file cannot afford to build (see the import comment: it
// dynamically imports every core/<pkg>/*.js, running this repo's own core/camera-moves/*.test.mjs files
// as a side effect). The fix is the corpus this worklist ALREADY has for free: all four families
// combined, ~176 names. `ADOPTION_CONFIDENT` is calibrated the same way arsenal's own CONFIDENT was
// (docs comment, core's arsenal.mjs): the midpoint between a measured real answer and a measured
// near-miss, on THIS corpus. Measured on vawe-flow: cameraShake (a real blurb match on "shake"/impact
// language) sits at 0.055, followCursor (matches "cursor"/"click") at 0.045, followLayer at 0.096;
// softiris/slide-left/easeInOutElastic (no blurb text at all to match against, only a bare name) sit at
// 0.015/0.016/0.007. 0.03 sits in the gap.
const ADOPTION_CONFIDENT = 0.03;

/**
 * familyRow(label, names, blurbOf, beats, corpus) -> {label, used, total, suggestions}. `used` counts a
 * name present in one of the FOUR structured fields on any beat (the fields harness/lib/contract.mjs
 * now gives a real grammar); `suggestions` ranks the rest against the wider prose corpus, scored and
 * covered against `corpus` (all four families combined, so the idf weighting reflects a real
 * population) then filtered back down to this family's own names, past ADOPTION_CONFIDENT. Each
 * suggestion carries the matched words, so the print can show its own evidence rather than assert one.
 */
function familyRow(label, names, beats, corpus, coverage, qt) {
  const usedBlob = fieldBlob(beats, USED_FIELDS, false);
  const used = new Set(names.filter((n) => new RegExp(`\\b${n}\\b`).test(usedBlob)));
  const nameSet = new Set(names);
  const familyEntries = corpus.filter((e) => nameSet.has(e.name) && !used.has(e.name) && !IDENTITY.has(e.name));
  // A word every entry in the family shares ("camera" on every camera move's own blurb) proves nothing
  // next to a name: the SAME restates() logic core/registry/registry.js checkBlurb uses to keep a blurb
  // from padding itself with its own kind, reused here to keep a PRINTED match from doing the same.
  const labelWords = new Set(toks(label));
  const suggestions = familyEntries
    .map((e) => ({ ...e, s: score(e, qt), c: coverage(e, qt) }))
    .filter((e) => e.s > 0 && e.c >= ADOPTION_CONFIDENT)
    .sort((a, b) => b.c - a.c || b.s - a.s)
    .slice(0, 3)
    .map((e) => {
      const entryToks = new Set(toks(`${e.name} ${e.blurb}`));
      // The print is evidence a person reads, not the full token overlap the scorer used: a short word
      // shared with dozens of blurbs ("at", "one", "by") proves nothing next to a name, so only words
      // of 4+ letters are shown, never the family's own kind word, capped to the 4 most distinctive.
      const matched = [...new Set(qt.filter((t) => entryToks.has(t) && t.length >= 4 && !labelWords.has(t)))]
        .sort((a, b) => b.length - a.length).slice(0, 4);
      return { name: e.name, matched };
    });
  return { label, used: used.size, total: names.length, suggestions };
}

/** adoptionReport(film) -> rows[] | null (no storyboard yet). Exported for `--json`. */
export function adoptionReport(film) {
  const p = filePaths(film);
  if (!fs.existsSync(p.sb)) return null;
  const sb = parseStoryboard(fs.readFileSync(p.sb, 'utf8'));
  const transitionNames = [...new Set(TRANSITIONS.map((t) => t.name))];
  const corpus = [
    ...CAMERA_MOVE_NAMES.map((n) => ({ name: n, kind: 'camera moves', blurb: CAMERA_MOVE_BLURBS[n] || '' })),
    ...transitionNames.map((n) => ({ name: n, kind: 'transitions', blurb: '' })),
    ...Object.keys(KINETIC_PRESETS).map((n) => ({ name: n, kind: 'kinetic presets', blurb: KINETIC_BLURBS[n] || '' })),
    ...Object.keys(EASINGS).map((n) => ({ name: n, kind: 'easings', blurb: '' })),
  ];
  const coverage = coverageIn(corpus);
  const qt = toks(fieldBlob(sb.beats, SUGGEST_FIELDS, true));
  return [
    familyRow('camera moves', CAMERA_MOVE_NAMES, sb.beats, corpus, coverage, qt),
    familyRow('transitions', transitionNames, sb.beats, corpus, coverage, qt),
    familyRow('kinetic presets', Object.keys(KINETIC_PRESETS), sb.beats, corpus, coverage, qt),
    familyRow('easings', Object.keys(EASINGS), sb.beats, corpus, coverage, qt),
  ];
}

// Stage 1 has no film yet, so stageOf() has nothing to read. What DOES exist is the same deliverable
// router the planning skill uses (harness/author/route.mjs), reachable so far only by an agent that
// already knew it existed. Q= runs it and states the same brief-stage answer stageOf() would once a
// storyboard exists: what this film is, and the one command that starts it.
function briefFor(q) {
  const matched = route(q);
  const next = `make quiz NAME=<name> URL=<the product site>   (no site? docs/CRAFT/AUTHORING-WALKTHROUGH.md)`;
  return { stage: 'brief', request: q, deliverable: matched.name, intake: matched.intake, next };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const qIdx = argv.indexOf('--q');
  const q = qIdx >= 0 ? argv[qIdx + 1] : null;
  const skip = qIdx >= 0 ? [qIdx, qIdx + 1] : [];
  const arg = argv.filter((a, i) => a !== '--json' && !skip.includes(i) && a).find((a) => !a.startsWith('--')) || process.env.D || null;

  if (q) {
    const b = briefFor(q);
    if (json) { console.log(JSON.stringify(b, null, 2)); process.exit(0); }
    console.log(`\n  "${q}" is at stage BRIEF: no film exists yet.`);
    console.log(`  deliverable: ${b.deliverable}`);
    console.log('  intake:');
    for (const line of b.intake) console.log(`    - ${line}`);
    console.log(`\n  do:  ${b.next}\n`);
    process.exit(0);
  }

  if (!arg) {
    const r = roster({ all: argv.includes('--all') });
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    const scratch = r.total - r.n;
    console.log(`\n  ${r.n} film(s)${scratch > 0 ? `, and ${scratch} scratch scene(s) not listed` : ''}\n`);
    for (const row of r.rows) console.log(`  ${row.stage.toUpperCase().padEnd(9)} ${row.name}`);
    if (r.hidden > 0) console.log(`\n  ...and ${r.hidden} further along. \`make stage --all\` lists every one.`);
    if (r.worst) console.log(`\n  furthest from done: ${r.worst.name} (${r.worst.stage.toUpperCase()})`
      + `\n  do:  ${r.worst.next}\n`);
    else console.log('');
    process.exit(0);
  }

  const st = stageOf(arg);
  // A worklist, printed only where an author is already about to REACH for one of these families:
  // design (writing fragments) and direct (motion/transition/sound). Earlier stages have nothing to
  // adopt yet; later stages have already made the calls this is meant to prompt, not re-litigate.
  const adoption = ['design', 'direct'].includes(st.stage) ? adoptionReport(st.base) : null;
  if (json) { console.log(JSON.stringify({ ...st, adoption }, null, 2)); process.exit(0); }
  const line = st.order.map((id) => (id === st.stage ? `[${id}]` : id)).join(' → ');
  console.log(`\n  ${st.name} is at stage ${st.stage.toUpperCase()}`);
  console.log(`  ${line}`);
  console.log(`\n  why: ${st.why}`);
  console.log(`  do:  ${st.next}\n`);
  if (adoption) {
    console.log(`  adoption (this film's storyboard, against what the core has):`);
    for (const r of adoption) {
      // No suggestion clears CONFIDENT: printing nothing here is the honest answer, not a guess this
      // film never asked for (the exact defect the old, whole-document word-collision version had).
      const sug = r.suggestions.length
        ? ` · try: ${r.suggestions.map((s) => `${s.name}${s.matched.length ? ` (${s.matched.join(', ')})` : ''}`).join(', ')}`
        : '';
      console.log(`    ${r.label.padEnd(16)} ${r.used}/${r.total} used${sug}`);
    }
    console.log('');
  }
}
