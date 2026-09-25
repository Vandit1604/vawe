#!/usr/bin/env node
// quality/gates/stage.mjs: WHERE IS THIS FILM, and what is the ONE next thing to do.
//
//   make stage D=films/scene/<film>.json   ·   node quality/gates/stage.mjs <film> [--json]
//   make stage                                  · no film yet: the roster, and the one furthest from done
//   make stage Q="make a launch video for x"    · no film yet EITHER: what to even start
//
// Every stage below already had a command. What did not exist was anything that knew which stage a
// film was IN, so the order lived only in prose in AGENTS.md, and prose is a suggestion. An author who
// can quote the order still runs it backwards five hours into a session (engine-doctrine/MISTAKES.md #591, #595).
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
import { readReceipt } from '../../harness/lib/receipt.mjs';
import { parseFragmentSpec } from '../../harness/lib/contract.mjs';
import { population, LIBRARY, isTemplate } from '../../harness/lib/census.mjs';
import { route } from '../../harness/author/route.mjs';
import { scratchBase } from '../../harness/lib/scratch.mjs';
// score/toks/coverageIn/CONFIDENT: the SAME ranker `make arsenal` uses (harness/author/arsenal.mjs),
// never a second one, and the SAME confidence cutoff, never a re-derived one. `score` alone has no
// ceiling (it ranks the best of N whether any of them answers the query), which is exactly how
// "up"/"out"/"focus" (ordinary English, substring-contained in half the vocabulary's camelCase names)
// used to outrank a real match; coverageIn's idf weighting is arsenal's own fix for that.
import { score, toks, coverageIn, CONFIDENT } from '../../harness/author/arsenal.mjs';
// GROUPS: every authorable kind, discovered by importing each covered registry BY NAME rather than
// arsenal.mjs collect()'s readdir-and-import-everything, which would run every core/<pkg>/*.test.mjs
// file's node:test cases as a side effect of building this corpus. `make stage` is read every turn
// (AGENTS.md), so that cost is not acceptable here the way it is for `make arsenal`, run once, on
// demand. See harness/author/discovery.mjs for the full accounting.
import { GROUPS, usedNames, pasteLine, ambiguousNames, tokenGroupsOf, bestWindowMatch } from '../../harness/author/discovery.mjs';
import { skillsForStage } from '../../harness/lib/skill-stages.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Same order stageOf() builds S in. A second copy, not a derived one, because ranking the roster needs
// the order BEFORE any single film's stageOf() has run.
export const STAGE_ORDER = ['brief', 'plan', 'design', 'approval', 'assemble', 'direct', 'render', 'judge'];

/** Every path a film owns, resolved the same way author-check and studio resolve them. */
export function filePaths(arg) {
  const raw = String(arg || '').replace(/\.(json|storyboard\.md)$/, '');
  const base = raw.includes('/') ? raw : path.join(process.env.VAWE_FILMS_DIR || 'films/scene', raw);
  const scene = path.join(ROOT, base + '.json');
  let named = null;
  try { const d = JSON.parse(fs.readFileSync(scene, 'utf8'));
    if (typeof d.storyboard === 'string') named = path.join(ROOT, d.storyboard); } catch { /* not written yet */ }
  const sb = [named, path.join(ROOT, base + '.storyboard.md')].find((f) => f && fs.existsSync(f)) || path.join(ROOT, base + '.storyboard.md');
  return { name: path.basename(base), base, scene, sb, brief: path.join(ROOT, base + '.brief.md'),
    mp4: path.join(ROOT, 'out', path.basename(base) + '.mp4') };
}

// A GATE VERDICT IS CACHED ON ITS INPUTS, because this runs on every keystroke.
//
// stageOf() is called by harness/live/stage-say.mjs, a PreToolUse hook, so it pays its cost once per
// turn. Measured on a real film: storyboard-check 2.9s, frame-check 22.4s, because frame-check opens a
// browser and measures every fragment. The hook's budget is 30s, so it timed out and the author lost
// the stage line entirely, which is the one thing the hook exists to print.
//
// A film's stage cannot change unless the film's own files change, so the verdict is keyed on a
// fingerprint of them: the scene, the storyboard, the design sheet and every fragment beside it, by
// size and mtime. Cheap to compute (a stat each) and exact enough: a save changes mtime, and that is
// precisely when a verdict may differ. A cache miss costs what it always cost.
const fingerprint = (file) => {
  const base = String(file).replace(/\.(json|storyboard\.md|design\.md)$/, '');
  const dir = path.dirname(base);
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.startsWith(path.basename(base) + '.') || n === path.basename(base) + '.json'); }
  catch { /* the film may not exist yet, which the empty fingerprint below records honestly */ }
  return names.sort().map((n) => {
    try { const st = fs.statSync(path.join(dir, n)); return `${n}:${st.size}:${st.mtimeMs}`; }
    catch { return `${n}:gone`; }
  }).join('|');
};

const CACHE = path.join(ROOT, '.vawe-data/stage-gate-cache.json');
const readCache = () => { try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { return {}; } };

const gatePasses = (script, file) => {
  const key = `${script}::${file}`;
  const fp = fingerprint(file);
  const cache = readCache();
  if (cache[key] && cache[key].fp === fp) return cache[key].ok;
  const ok = runGate(script, file);
  try {
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify({ ...cache, [key]: { fp, ok } }));
  } catch { /* a cache write failure costs a re-run, never a wrong answer */ }
  return ok;
};

const runGate = (script, file) => {
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
    ? blocksOf(sbSrc).map((b) => parseFragmentSpec(fieldIn(b, 'fragment')).path).filter(Boolean)
    : [];
  const missingFrags = [...new Set(fragments)].filter((f) => !fs.existsSync(path.join(ROOT, f)));
  // No scene JSON exists before approval: the storyboard is the plan, and `make assemble` (AGENTS.md
  // stage 5) writes `layers` for the first time. A `_scaffold: true` filter used to live here for a
  // placeholder layer `make scaffold` wrote; that generator is gone and no film on disk carries the tag.
  const layers = scene && Array.isArray(scene.layers) ? scene.layers.length : 0;

  // THE PLAN JUDGE MAY BE REQUIRED TO HAVE RUN, NEVER TO HAVE PASSED. `exists && !stale` is "the eye
  // looked at THIS version of the storyboard"; it says nothing about what it found, because findings
  // never gate a stage (harness/lib/receipt.mjs's hash already refuses a stale read on its own: a
  // receipt whose subject moved reads `stale: true`, never a false PASS over an outdated plan).
  //
  // AN EXISTING `approved:` LINE ALSO SATISFIES IT. The judge exists to inform the owner's signature,
  // not to be imposed after it: `approved:` is a fact only a human writes (harness/live/stage-gate.mjs
  // refuses it from an agent), so a plan a person already signed off has already cleared a higher bar
  // than this gate asks for. Without this, every already-approved film in the library reads backwards
  // (measured: 4 films at assemble/direct/render, none of them at plan judgement, regress to PLAN the
  // day this ships) the moment this gate exists, which is the exact failure `design before approval`
  // (474981ba) measured and refused to reintroduce: "every approved film stays approved." A film still
  // waiting for its first signature is not exempted: this only reads an `approved:` already on disk.
  const planJudge = sbExists ? readReceipt('plan-judge', p.sb) : { exists: false, stale: false };
  const planJudgeRan = !!approved || (planJudge.exists && !planJudge.stale);
  const structurallyOk = sbExists && gatePasses('quality/gates/storyboard-check.mjs', p.sb);

  const S = [
    { id: 'brief', done: fs.existsSync(p.brief) || sbExists,
      why: 'nobody has asked what this film is about. A brief is five lines and any of them missing changes the film.',
      next: `make quiz NAME=${p.name} URL=<the product site>   (no site? engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md, and write ${path.relative(ROOT, p.brief)} by hand)` },
    { id: 'plan', done: structurallyOk && planJudgeRan,
      why: !sbExists ? 'there is no storyboard. Every role that writes into the film transcribes it, so a gap here becomes an invention further down.'
        : !structurallyOk ? 'the storyboard exists and does not pass its own gate yet.'
        : planJudge.exists && planJudge.stale ? `the plan judge's last verdict is stale: ${path.relative(ROOT, p.sb)} changed since it ran.`
        : 'the storyboard passes its own gate, but nothing has judged it as a PLAN yet: one through-line, beats that earn their seconds, a spectacle that is actually loudest, an eye path that holds, motion that varies. An exit code cannot answer any of those.',
      next: !sbExists ? `write ${path.relative(ROOT, p.sb)} from engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md   (have a reference or an idea and no prompt yet? make ideate REF=<ref> | NAME=${p.name} IDEA="..." first, engine-doctrine/CRAFT/IDEATE.md)`
        : !structurallyOk ? `make storyboard-check SB=${path.relative(ROOT, p.sb)}`
        : `make plan-judge D=${p.base}.json   (findings only; the owner still signs off at approval)` },
    { id: 'design', done: sbExists && missingFrags.length === 0 && gatePasses('quality/gates/frame-check.mjs', p.scene),
      why: missingFrags.length
        ? `${missingFrags.length} fragment(s) the plan names do not exist yet: ${missingFrags.join(', ')}`
        : 'the fragments exist and do not match what their beats planned: run frame-check and read it.',
      next: missingFrags.length ? `node harness/author/stagekit.mjs ${p.base}.json, then author each fragment: stage kit → the reference's grammar → the smallest useful ui-skills set (command npx -y ui-skills categories) → make preview HTML=<frag> THEME=<theme> → look at it` : `make frame-check D=${p.base}.json` },
    { id: 'approval', done: !!approved,
      why: 'the frames pass and nobody has signed the plan off. Nothing is rendered until the plan is LOCKED and the user signs off.',
      next: `make studio D=${p.base}.json, then share http://127.0.0.1:8799/studio (it opens on the plan, drawn from the real frames) so anyone can see it, then the USER runs /vawe-approve ${p.name}` },
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
  // The skill(s) claiming this stage, read off skills/*/SKILL.md's own `stage:` frontmatter
  // (harness/lib/skill-stages.mjs), never a second hand-kept table.
  return { ...p, stage: at.id, why: at.why, next: at.next, order: S.map((s) => s.id),
    skills: skillsForStage(at.id),
    approved: approved || null, fragments: [...new Set(fragments)], missingFrags, layers, sbExists, sceneExists };
}

/**
 * Every film in the library, staged. Reuses harness/lib/census.mjs's LIBRARY filter rather than a
 * second walk of films/scene/: one owner for "which files count as a film" (engine-doctrine/MISTAKES.md #391).
 * A film that errors while staging (unparseable storyboard, say) is reported, not thrown, because one
 * bad film should not blind the roster to the rest.
 */
export function roster({ all = false, cap = 12 } = {}) {
  const scenePop = population('stage roster (scene)', { filter: LIBRARY, quiet: true });
  // LIBRARY requires a parseable scene.json, so a film still at brief/plan/design/approval that has
  // not been SCAFFOLDED yet has no scene.json and is invisible to scenePop alone, which is exactly the
  // population `make stage` exists to shepherd: a film can sit at approval indefinitely and never
  // appear in the one command that answers "what is in flight" (measured: latch-recreation, a
  // storyboard and a prompt, no scene.json, reads APPROVAL by `stageOf` directly but was absent from
  // `--all` entirely). A `.storyboard.md` sidecar is LIBRARY's own signal a person planned a film
  // (census.mjs's comment above LIBRARY), so the honest population is the UNION of both walks,
  // deduplicated by basename so a film that already has both is counted once. Both walks go through
  // population() so a blind checkout still says so for either kind, never a hand-rolled readdirSync.
  const sbPop = population('stage roster (storyboard only)', { ext: '.storyboard.md',
    filter: (f) => f !== 'schema.storyboard.md' && !isTemplate(f), quiet: true });
  const sceneBases = new Set(scenePop.names.map((f) => f.replace(/\.json$/, '')));
  const sbOnlyBases = sbPop.names.map((f) => f.replace(/\.storyboard\.md$/, '')).filter((b) => !sceneBases.has(b));
  const bases = [...scenePop.names.map((f) => f.replace(/\.json$/, '')), ...sbOnlyBases];
  // A LEADING UNDERSCORE IS THIS REPO'S SCRATCH CONVENTION, and 164 of the 176 films in this library
  // are probes: _catalog-1, _camera-blur-probe, _auto-orient. Listing them alphabetically puts every
  // throwaway ahead of every real film, so the front door opened on 176 rows of test scenes. A front
  // door that answers with the whole directory is not an answer. `--all` still prints everything.
  const names = all ? bases : bases.filter((f) => !path.basename(f).startsWith('_'));
  const rows = names.map((base) => {
    try { const st = stageOf(base); return { name: st.name, stage: st.stage, next: st.next, ok: true }; }
    catch (err) { return { name: base, stage: 'error', next: String(err && err.message || err), ok: false }; }
  });
  rows.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const worst = rows.find((r) => r.ok) || rows[0] || null;
  // Furthest from done first, then capped: the rows that matter are the unfinished ones, and a film
  // already at judge needs no prompting. `total` counts what was found, `rows` is what is worth reading.
  const shown = all ? rows : rows.slice(0, cap);
  return { n: rows.length, total: bases.length, rows: shown, hidden: rows.length - shown.length, worst,
    sceneCount: scenePop.names.length, storyboardOnlyCount: sbOnlyBases.length };
}

// ADOPTION: a WORKLIST, never a gate. Measured (AGENTS.md's build brief): the core carries 790 named
// capabilities across 62 kinds, and 42 authored films reach for a thin slice of it (0 named camera
// moves before this, `anim: "fade"` 256 times). `make stage` is where an author already looks every
// turn, so this is the one place a film's own worklist can be pushed rather than left for
// `make arsenal` to be asked about.
//
// GROUNDED IN THIS FILM, NOT THE WHOLE MARKDOWN. Measured on vawe-flow: none of its 9 beats declares a
// `camera:`, `move:`, `motion:` or `transition_in:` field at all, so scanning the WHOLE storyboard text
// for an English word a name happens to share (`up`/`rise`/`slide` as "transitions", `weight`/`type` as
// "kinetic presets") reports "used" with nothing real behind it. The fix, unchanged from the version
// this replaced: `used` reads only the fields a beat could plausibly reach a name FROM (the five
// structured fields, plus a real `use:` line for everything else); the SUGGESTION corpus is the
// free-prose fields that describe intent (harness/author/discovery.mjs PROSE_FIELDS), since prose
// naming a technique is not the same claim as a field that reaches the engine. `usedNames` and
// `fieldBlob` are the one shared owner of both, reused by beat-surfacer.mjs so the two speak of the
// same beat the same way.
//
// THE CONFIDENCE CUTOFF IS ARSENAL'S OWN, reused rather than re-derived (the build brief this answers
// asks for exactly that): CONFIDENT was calibrated against arsenal.mjs collect()'s own ~790-entry
// corpus, so the corpus here is built the same way collect() would see it (every covered registry,
// unfiltered) rather than a smaller bespoke pool a different threshold would have to be re-measured
// against.

/**
 * groupRow(label, entries, isUsed, coverage, tokenGroups, ambiguous) -> {label, used, total,
 * suggestions}. `suggestions` ranks the entries this film has NOT already reached for against the
 * whole corpus's idf weighting, past CONFIDENT on their single best-matching span
 * (harness/author/discovery.mjs bestWindowMatch), each carrying the exact line to paste and the words
 * that matched it.
 */
function groupRow(label, entries, isUsed, coverage, tokenGroups, ambiguous) {
  // A word every entry in the group shares ("camera" on every camera move's own blurb) proves nothing
  // next to a name: the SAME restates() logic core/registry/registry.js checkBlurb uses to keep a blurb
  // from padding itself with its own kind, reused here to keep a PRINTED match from doing the same.
  const labelWords = new Set(toks(label));
  const remaining = entries.filter((e) => !isUsed(e));
  const suggestions = remaining
    .map((e) => ({ ...e, ...bestWindowMatch(e, tokenGroups, coverage) }))
    .filter((e) => e.s > 0 && e.c >= CONFIDENT)
    .sort((a, b) => b.c - a.c || b.s - a.s)
    .map((e) => {
      const entryToks = new Set(toks(`${e.name} ${e.blurb}`));
      // The print is evidence a person reads, not the full token overlap the scorer used: a short word
      // shared with dozens of blurbs ("at", "one", "by") proves nothing next to a name, so only words
      // of 4+ letters are shown, never the group's own kind word, capped to the 4 most distinctive.
      const matched = [...new Set(e.qt.filter((t) => entryToks.has(t) && t.length >= 4 && !labelWords.has(t)))]
        .sort((a, b) => b.length - a.length).slice(0, 4);
      return { name: e.name, kind: e.kind, matched, line: pasteLine(e, ambiguous) };
    })
    // A suggestion with no displayable evidence is one this print cannot justify: the words that
    // cleared CONFIDENT were themselves too short or too common to show (score() counts a 4-point hit
    // for `hay.includes(q)` even at 3 letters, coverageIn's idf floor is not a length floor), and a
    // line with nothing beside it reads as arbitrary rather than grounded.
    .filter((e) => e.matched.length > 0)
    .slice(0, 3);
  return { label, used: entries.length - remaining.length, total: entries.length, suggestions };
}

/** adoptionReport(film) -> rows[] | null (no storyboard yet). Exported for `--json`. */
export function adoptionReport(film) {
  const p = filePaths(film);
  if (!fs.existsSync(p.sb)) return null;
  const sbSrc = fs.readFileSync(p.sb, 'utf8');
  const sb = parseStoryboard(sbSrc);
  const isUsed = usedNames(sbSrc, sb.beats);
  const groups = GROUPS.map(([label, entries]) => [label, entries()]);
  const all = groups.flatMap(([, entries]) => entries);
  const coverage = coverageIn(all);
  const ambiguous = ambiguousNames(all);
  const tokenGroups = sb.beats.flatMap((b) => tokenGroupsOf(b));
  return groups.map(([label, entries]) => groupRow(label, entries, isUsed, coverage, tokenGroups, ambiguous));
}

// THE AUDIT THIS ANSWERS: agents reported a screen done, a measure read, a camera framed, all three
// wrong, because nothing showed them a frame before the render. design and direct are exactly the two
// stages where an agent writes HTML/motion with no eyes on it yet, so this is a WORKLIST of commands
// that already exist, aimed at THIS film's own fragments/theme/reference, never invented and never a
// gate: `make stage` prints it, nothing here blocks anything.
/**
 * lookBlock(film) -> null (no storyboard yet) | { fragments, theme, reference, screens[], dev,
 * sheets: {beats, reveal}, contentCheck | addReference }. Every field is read off THIS film's own
 * storyboard/scene files, the same way stageOf() does.
 */
export function lookBlock(film) {
  const p = filePaths(film);
  if (!fs.existsSync(p.sb)) return null;
  const sbSrc = fs.readFileSync(p.sb, 'utf8');
  const fm = frontmatter(sbSrc);
  const fragments = [...new Set(blocksOf(sbSrc)
    .map((b) => parseFragmentSpec(fieldIn(b, 'fragment')).path).filter(Boolean))];
  const scene = fs.existsSync(p.scene) ? (() => { try { return JSON.parse(fs.readFileSync(p.scene, 'utf8')); } catch { return null; } })() : null;
  const rawTheme = (scene && scene.theme) || fm.field('theme');
  // `themes/vawe.json` (a storyboard's frontmatter shape) vs `default` (a scene's own field): make
  // screen/preview want the bare name either way.
  const theme = rawTheme ? String(rawTheme).replace(/^themes\//, '').replace(/\.json$/, '') : null;
  const reference = fm.field('reference');
  const screens = fragments.map((f) => `make screen F=${f}`
    + (reference ? ` REF=${reference} ACT=<n>` : '') + (theme ? ` THEME=${theme}` : ''));
  const dev = `make dev D=${p.base}.json`;
  const sheets = { beats: path.join(scratchBase(), 'beats', `${p.name}.png`), reveal: path.join(scratchBase(), 'reveal', `${p.name}.png`) };
  const contentCheck = reference ? `make content-check D=${p.base}.json REF=${reference}` : null;
  const addReference = reference ? null
    : `no reference named. Studied one already? add \`reference: "<name>"\` to ${path.relative(ROOT, p.sb)}'s `
      + `frontmatter, matching grammar/<name>.json. Not studied yet: make study VIDEO=<clip> NAME=<name>, then add the field.`;
  // FIX 2: the page audit (overflow, safe, contrast, buried, tiny/clipped text) needs no render, only
  // the scene JSON, so a design/direct-stage author can see it at exactly the same moment as the frames
  // above, not after paying for the mp4. Same invocation `make ship` already trusts (Makefile:319).
  const audit = scene ? `node quality/audit.mjs ${p.base}.json --aspect all` : null;
  return { fragments, theme, reference, screens, dev, sheets, contentCheck, addReference, audit };
}

// Stage 1 has no film yet, so stageOf() has nothing to read. What DOES exist is the same deliverable
// router the planning skill uses (harness/author/route.mjs), reachable so far only by an agent that
// already knew it existed. Q= runs it and states the same brief-stage answer stageOf() would once a
// storyboard exists: what this film is, and the one command that starts it.
function briefFor(q) {
  const matched = route(q);
  const next = `make quiz NAME=<name> URL=<the product site>   (no site? engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md)`;
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
  const look = ['design', 'direct'].includes(st.stage) ? lookBlock(st.base) : null;
  if (json) { console.log(JSON.stringify({ ...st, adoption, look }, null, 2)); process.exit(0); }
  const line = st.order.map((id) => (id === st.stage ? `[${id}]` : id)).join(' → ');
  console.log(`\n  ${st.name} is at stage ${st.stage.toUpperCase()}`);
  console.log(`  ${line}`);
  console.log(`\n  why: ${st.why}`);
  console.log(`  do:  ${st.next}`);
  if (st.skills.length) console.log(`  skill: ${st.skills.join(', ')}`);
  console.log('');
  if (look) {
    console.log(`  LOOK (frames now, not after render):`);
    for (const s of look.screens) console.log(`    ${s}`);
    console.log(`    ${look.dev}   (draft render; writes the sheets below)`);
    if (look.audit) console.log(`    ${look.audit}   (page audit; no render needed)`);
    console.log(`    ${look.contentCheck || look.addReference}`);
    console.log(`    sheets: ${look.sheets.beats}  ·  ${look.sheets.reveal}`);
    console.log('');
  }
  if (adoption) {
    console.log(`  adoption (this film's storyboard, against what the core has):`);
    // Groups with a real suggestion print first, since a ~25-line budget cannot always afford all
    // eight: a matched group is the one an author can act on right now, a bare used/total on its own
    // is context. No suggestion clears CONFIDENT for a group -> nothing prints under it, the honest
    // answer, not a guess this film never asked for (the defect the old whole-document version had).
    const ordered = [...adoption].sort((a, b) => b.suggestions.length - a.suggestions.length);
    let budget = 25;
    for (const r of ordered) {
      if (budget <= 0) break;
      console.log(`    ${r.label.padEnd(16)} ${r.used}/${r.total} used`);
      budget--;
      for (const s of r.suggestions.slice(0, budget)) {
        console.log(`        ${s.line}${s.matched.length ? `   (${s.matched.join(', ')})` : ''}`);
        budget--;
      }
    }
    console.log('');
  }
}
