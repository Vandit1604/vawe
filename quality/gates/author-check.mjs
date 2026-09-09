// quality/gates/author-check.mjs: THE MANDATORY AUTHORING-QUALITY LADDER.
//
// The static quality gates existed but were opt-in and mostly WARN-tier, so a maximal "effect-soup"
// video passed everything the render flow actually ran (only schema + purity were mandatory). This one
// command chains them so `make video` can REQUIRE the loop (it runs author-check unless NOCHECK=1).
// See docs/MISTAKES.md (authoring-gates-were-optional) and docs/CRAFT/DIRECTION.md.
//
// EVERY STEP RUNS, EVERY TIME. There is no opt-in half any more. A mechanism nobody is made to use is a
// mechanism that does not exist, and half this ladder sat behind TASTE=1 where almost nobody set it.
//
// What is NOT uniform is SEVERITY, and that separation is the whole design:
//   BLOCKS: the film is broken. A schema error, a hole in the clock, a plan the render does not deliver.
//   REPORTS: the film may be off the house style. Always printed, never a wall, promoted by TASTE=1.
// Measured before this was written: turning the REPORTS half into blocks fails 116 of the 141 scenes in
// this library, four films in five, which is the exact shape CLAUDE.md warns about, a rule waived by
// reflex has already been repealed and nobody wrote it down. So the steps became mandatory and the
// severities did not move. See docs/TASTE.md · "One process, two severities".
//
// BLOCKS:
//   validate: schema + em-dash (correctness; never waivable)
//   beats. The TIMELINE gate: dead air, an empty last frame, an empty cut/seam window, a dead backdrop
//   assets. The READINESS preflight: every referenced image/icon/capture/vo exists on disk (STRICT only)
//   inspect. The per-beat value contract, if a .intent.json sidecar exists (absent → visible WARN)
//   plan, plan vs render, off the same sidecar
//
// REPORTS (always run and always print; TASTE=1 gives them teeth):
//   storyboard: is there a plan this film came from, and does the plan hold together
//   critique. The value gate: hollow/placeholder/unbacked/thin/mis-centre beats
//   direct. The direction gate: cut families, effect-soup, continuity, pacing, and the book-grounded
//               motion tells (linear-motion, monotone-timing, enter-and-retreat)
//   floor. The AMBITION floor (inverse of effect-soup): fails a plain slideshow (no kinetic type,
//               no camera, no transitions). Directed lives BETWEEN soup and slideshow.
//   dissolve. The TRANSITION gate: two text states cross-dissolved in place
//   designspec. The LOOK lock: off-palette colours / non-role fonts vs the theme
//   copy. The WORDS lock: hook/jargon/restatement/flat-number tells in on-screen text
//   pace, is anything happening, and how often
//   sound. The SILENCE gate: silent:true with no `_why`, an audio block that produces nothing, and
//               where the bed came from. It ran for months and nothing read it, because it was not a
//               step here and stated its findings in a shape finding-codes.mjs could not see.
//   hero. The one LAYOUT finding that can run pre-render: `thin-hero`, via quality/audit.mjs --hero.
//               Landscape only, and it costs a browser launch (1.4s measured), so it announces the cost
//               before it pays it. Portrait films are told the rule has nothing to say about them.
//   treatment: is the film's written rationale current with its storyboard
//   drift, how many other films excuse the same waiver
//
// `visual-vocabulary` used to sit here and was DELETED, not moved: its size measurement squared a
// single-axis layer, so a 590x18 underline was scored as 590x590 and passed a blocking gate whose only
// job was to catch exactly that. See docs/TASTE.md and docs/MISTAKES.md.
//
// The vision judge (docs/JUDGE.md) is NOT run here: it needs the rendered mp4, so it is a post-render
// step. A deterministic script also cannot force an agent to judge honestly. So the ladder ends by
// printing the REQUIRED post-render judge step, author-check being green is necessary, not sufficient.
//
// Rules stay tunable: a scene may waive a specific BLOCKING rule it deliberately breaks with
//   { "authoring": { "allow": ["cut-families", "profile"] } }
// Waivers apply only to blocking findings (critique errors, direct FAILs); validate is never waivable.
//
// Usage: node quality/gates/author-check.mjs <scene.json> [--strict] [--taste] [--vs <brand>]
//        make author-check D=<file> [STRICT=1] [TASTE=1] [VS=<brand>]
// TASTE=1 no longer decides WHETHER the style gates run. They always run. It decides whether their
// findings BLOCK, which is the only decision that was ever really behind that flag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReceipt } from '../lib/receipt.mjs';
import { spawnSync } from 'node:child_process';
import { codeDocMap, docMap } from './doc-map.mjs';
import { readFindings } from '../lib/findings.mjs';
import { sceneDims } from '../../core/layout/safe.js';
import { LIBRARY } from '../lib/census.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- THE ONE EXCUSE MECHANISM ------------------------------------------------------------------------
//
// This used to be three: `authoring.allow` + `_why` in the scene (a person decided, and wrote why),
// `quality/gates/legacy-manifest.json` (a date says nobody has looked yet), and a ratchet engine
// (RATCHET_CODES / RATCHET_RULES / gateForCode / codeFiresOn, plus a `--legacy` census over the whole
// library) that read the manifest and decided, per code, whether THIS film was grandfathered or new.
//
// It is one now. `quality/gates/legacy-fold.mjs` walked every row the manifest held and, for each film
// that still fires the rule, wrote it into that film's own `authoring.allow` + `_why` (`"legacy:
// grandfathered <date>, adopted <date> (<what the rule checks>)"`), then the manifest and the ratchet
// machinery that read it were deleted here. A ratchet exists to answer one question over time: has this
// rule's debt been paid down enough to stop grandfathering the past? Once the library is folded, that
// question has one answer, an explicit waiver on a real scene, and a rule can go straight to being a
// PLAIN BLOCK: it fires or it doesn't, and `authoring.allow` is the only door out, for old debt and a
// deliberate new exception alike. See docs/TASTE.md and AGENTS.md "Waivers, legacy, and the difference".
//
// HARD_CODES below (was RATCHET_CODES) is still where a code opts into "no reports tier, no free pass":
// if it fires and the scene has not waived it, the run stops. Two codes were retired rather than folded,
// because the fold would have been ceremony over a rule that had already stopped meaning anything:
//   `sparse-beats`  fires on 58% of the library and every single occurrence is already legacy or waived.
//                   A rule with zero live enforcement anywhere is not excused, it is decoration.
//   `no-plan-for-craft` (never adopted into the ratchet at all) fired on 83% of the library with ZERO
//                   waivers, because it duplicated `no-storyboard` under a looser check (it only looks
//                   for the sibling `<base>.storyboard.md`, not a scene's declared `storyboard` field) and
//                   exited before the craft checklist could even run. Folded into `craft-unvisited`
//                   instead, in quality/gates/craft-checklist.mjs: no storyboard now just means every
//                   relevant doc reads as unanswered, which is what that code already measures.
// Both numbers, and the rest of the per-code table, are in docs/TASTE.md "Measured, before any cut".

// A storyboard is resolved in exactly one place, so this stays the one function that answers the question.
function resolveStoryboard(sceneFile, sceneJson) {
  const declared = typeof sceneJson.storyboard === 'string' ? sceneJson.storyboard
    : (sceneJson.authoring && typeof sceneJson.authoring.storyboard === 'string' ? sceneJson.authoring.storyboard : null);
  const dir = path.dirname(sceneFile), base = path.basename(sceneFile, '.json');
  const candidates = declared
    ? [path.resolve(repoRoot, declared), path.resolve(dir, declared)]
    : [path.join(dir, `${base}.storyboard.md`), path.join(dir, '_concepts', `${base}.storyboard.md`)];
  return { declared, candidates, path: candidates.find((p) => fs.existsSync(p)) || null };
}

// A rule joins the ratchet BY NAME here. `no-storyboard` is the first user, not the only one.
// `fails` must be CHEAP and PURE: fs and JSON, nothing else. The census runs it over every scene in the
// library on every author-check run, so a probe that launched a browser would cost 132 browsers. A rule
// whose finding only exists after a child gate has run cannot be ratcheted this way, and should not be:
// its census would go stale between runs, which is #159.
// The layer types that carry MEANING, as opposed to dressing the frame. `rect`, `glow`, `beam` and the
// paint fields are deliberately absent: a film made of five rectangles is not a film with five ideas in
// it, and counting them would let decoration buy a pass. Same split CLAUDE.md draws between DECORATION
// and EXPLANATION, applied to the layer table.
const CONTENT_TYPES = new Set(['text', 'image', 'svg', 'html', 'component', 'count', 'doc',
  'lottie', 'video', 'board', 'canvas', 'clip', 'group', 'composition']);
// A film cut into beats where NOTHING is choreographed and NOTHING crosses a junction is a slideshow,
// whatever else is true of it. `higgsfield-recreation` keys 6 of its 8 layers and cuts zero times,
// `brew-launch-act1` keys 4 and punctuates with camera fx; the library median is 0 keyed layers. It
// asks only whether the author choreographed ANYTHING: one keyed track, or one layer that survives a
// junction via `becomes`, `follow` or `acrossBeats`. One is enough.
const motionFails = (_sceneFile, d) => {
  const L = Array.isArray(d && d.layers) ? d.layers : [];
  const joints = (d.cuts || []).length + (d.transitions || []).length + (d.seams || []).length;
  if (joints < 2) return false;                       // no junctions, nothing to read as a slideshow
  const content = L.filter((l) => l && CONTENT_TYPES.has(l.type || 'text')).length;
  if (content < 6) return false;                      // too small to be a slideshow of anything
  const keyed = L.some((l) => Array.isArray(l && l.motion) && l.motion.length >= 2);
  const carried = L.some((l) => l && (l.becomes || l.follow || l.acrossBeats));
  return !keyed && !carried;
};

// ---- HARD CODES: fires, and the scene has not waived it, and the run stops. No manifest, no census, --
// no legacy state: those questions were about the LIBRARY over time, and the library has been folded
// (quality/gates/legacy-fold.mjs) into explicit per-scene waivers, so the only question left is the one
// `authoring.allow` was always built to answer. Two codes that used to live here were retired instead
// of folded (`sparse-beats`, and `no-plan-for-craft` which was never even adopted): see the block above.
const HARD_CODES = {
  'plain-slideshow': 'the film reaches past a slideshow: kinetic type, a camera move, or real transitions',
  'no-preflight': 'the film went through the decision chain before the JSON existed',
  'crossfade-mud': 'no transition dissolves one text state into another in place',
  'no-continuous-object': 'something survives the film\'s cuts',
  'effect-soup': 'the film does not stack more effect families than it can spend',
  'linear-motion': 'motion carries easing, not a constant rate',
  'monotone-timing': 'the film varies its timing rather than moving everything alike',
  'enter-and-retreat': 'a layer leaves the way it came, in one direction of travel',
  'no-transition': 'a multi-beat film earns at least one real seam or cut, not flat jumps',
  'feature-poverty': 'the film reaches into the engine\'s expressive families, not just the top of the box',
  'craft-unvisited': 'every CRAFT doc that applies to this film is answered in the plan',
  // The backdrop is the largest area of the frame. beat-check has warned on it for a while.
  'static-bg': 'the backdrop moves, at least one beat is not a flat field asleep for the whole film',
  // static-bg checks whether a film DECLARES a backdrop that can move; sweep-static checks the RENDERED
  // pixels for whether anything actually did. It needs the mp4, so it no-ops (and passes) until the film
  // is rendered. A film can pass one and fail the other.
  'sweep-static': 'the rendered pixels move, the whole film is not one frozen frame held for its runtime',
  // NOT HARD, and the measurement is the reason. `off-colour` fires on BOTH exemplars, because a
  // recreation carries the captured brand's colours and those are not in our theme palette. A rule that
  // fails the two films this repo argues from is a wrong rule for a whole class of film, not a
  // discovery. It stays a report. This is the check `visual-vocabulary` did not run.
  'off-font': 'every face is one of the theme roles',
  'restated-headline': 'a beat does not repeat the line above it',
  'jargon': 'the on-screen words are specific, not marketing filler',
};

// ---- HOW A GATE'S VERDICT REACHES THIS FILE ---------------------------------------------------------
//
// By a STRUCTURE, and never by re-reading the gate's prose. What used to be here was:
//
//     new RegExp(`[✗~]\\s*\\[${code}\\]`).test(out)
//
// and every one of the forty gates that can fail was one reformat away from becoming invisible to it.
// Nothing would error. The step would print its findings in full, this file would read none of them,
// and the film would pass. docs/MISTAKES.md #401 is the same class already paid for: motion-audit
// printed its verdict line to stdout after its JSON, so the documented machine-readable output was not
// machine-readable, and a sweep reported all 154 scenes as crashed.
//
// So a gate writes its records to the file named in VAWE_FINDINGS_OUT (scripts/lib/findings.mjs) while
// printing exactly the prose it printed before. One run, both shapes: the person watching gets the
// sentences and this file gets `code` and `severity`. A gate that does not speak records yet writes
// nothing, and reads here as no findings, which is what the regex said about it too.
const findingsTmp = path.join('/tmp/.author-check', String(process.pid));
let findingsSeq = 0;
/** Run a gate, return { r, records }. `records` is null when the gate wrote none. */
function spawnGate(script, args, opts = {}) {
  fs.mkdirSync(findingsTmp, { recursive: true });
  const out = path.join(findingsTmp, `findings-${++findingsSeq}.json`);
  try { fs.rmSync(out, { force: true }); } catch { /* first run */ }
  const r = spawnSync('node', [path.join(repoRoot, script), ...args],
    { encoding: 'utf8', cwd: repoRoot, ...opts, env: { ...process.env, VAWE_FINDINGS_OUT: out } });
  return { r, records: readFindings(out) };
}


const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
// ITERATE MODE: same gates, same findings, no consequence. While a film is still being explored, a
// blocking gate does not save time, it breaks the loop. You stop to fix or waive something you were
// about to rewrite anyway. Measured, the whole static ladder costs about a second against an 8s draft
// render, so the cost was never the runtime; it was being interrupted. So iterate reports everything
// and exits 0, and says plainly what WOULD block, while ship keeps the teeth.
const iterate = process.argv.includes('--iterate') || process.env.MODE === 'iterate';
// TASTE no longer decides whether the style gates RUN. They always run. It decides whether their findings
// block, which is the only decision that flag was ever really carrying.
const taste = process.argv.includes('--taste') || process.env.TASTE === '1';
const vsArg = (() => { const i = process.argv.indexOf('--vs'); return i >= 0 ? process.argv[i + 1] : null; })();
if (!file) { console.error('usage: node quality/gates/author-check.mjs <scene.json> [--strict] [--taste] [--vs <brand>]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

let scene = {};
try { scene = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
const allow = new Set((scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : []);
// A WAIVER MUST STATE ITS REASON. The doctrine has always said a waiver is a deliberate exception with
// a written cause; the audit says otherwise. Across the tracked library `no-continuous-object` is
// waived 6 times with 0 reasons and `dead-air` 3 times with 0, while `no-visual-vocabulary` carried a
// reason on every single one, and that difference is exactly the difference between a rule people
// argue with and a keyword that makes a gate stop talking (docs/MISTAKES.md #209).
//
// Nothing here judges whether the reason is GOOD. It cannot. It only makes waiving cost one sentence,
// which is the whole mechanism: the cost is what turns a reflex back into a decision, and a bad reason
// written down is reviewable in a way that silence never is.
{
  const why = (scene.authoring && (scene.authoring._why || scene.authoring.why || scene.authoring.reason)) || {};
  const bare = [...allow].filter((k) => !(typeof why[k] === 'string' && why[k].trim().length >= 12));
  if (bare.length) {
    console.error(`\n✗ author-check · ${bare.length} waiver(s) with no stated reason: ${bare.join(', ')}`);
    console.error('  A waiver is a deliberate exception, and a deliberate exception has a cause someone can read.');
    console.error('  Add one line each under `authoring._why`, naming what the rule would have you do and why');
    console.error('  this film is right not to:\n');
    console.error('    "authoring": {');
    console.error(`      "allow": [${[...allow].map((k) => `"${k}"`).join(', ')}],`);
    console.error('      "_why": {');
    console.error(bare.map((k) => `        "${k}": "why this film is the exception"`).join(',\n'));
    console.error('      }\n    }\n');
    process.exit(1);
  }
}
const vs = vsArg || (typeof scene.theme === 'string' ? scene.theme : null);

// Blocks, beats and comps are BUILD-TIME sugar, and used to need a separate `make expand` pass before
// any gate could read them: `validate` rejected an un-expanded scene outright, and every gate that
// walked layers saw `{type:"block"}` as one opaque thing rather than the chart it becomes, so a scene
// written with the repo's own vocabulary could not pass its own mandatory ladder. core/engine/expand.js now
// resolves the sugar at LOAD time (`loadScene`, which every gate below already calls to read a scene
// off disk), so the ladder gates the source file directly.
const target = file;

// ---- WHERE THE STORYBOARD COMES FROM ----------------------------------------------------------------
// A scene declares its plan one of two ways, and the explicit one wins:
//   1. `"storyboard": "path/to/x.storyboard.md"` in the scene JSON, relative to the repo root or to the
//      scene. This is the declaration: it survives a rename and it says out loud that a plan exists.
//   2. the naming convention already used by plan-vs-render, <base>.storyboard.md beside the scene, or
//      in _concepts/ next to it.
// A scene with neither is not silently fine. It gets a finding (`no-storyboard`), because the alternative
// is what this ladder used to do: print "write the storyboard" into a void and check nothing.
const sbBase = path.basename(file, '.json');
const { declared: declaredSb, candidates: sbCandidates, path: sbPath } = resolveStoryboard(file, scene);
// Both of these BLOCK now, unconditionally: fires and not waived stops the run. No ratchet state to
// know in advance any more, so nothing has to be computed before the ladder prints itself.
const moFails = motionFails(file, scene);
const sidecarPath = file.replace(/\.json$/, '.intent.json');
const hasSidecar = fs.existsSync(sidecarPath);
const [sceneW, sceneH] = sceneDims(scene, '');
const landscape = sceneW > sceneH;

// ---- THE LADDER, DECLARED BEFORE IT RUNS -------------------------------------------------------------
// A person watching this needs to know where it is and what is left. So the whole run is listed first,
// with what each step reads and whether it can stop you, and every step then announces its own position.
const LADDER = [
  ['preflight', 'reports', 'whether the decisions that belong BEFORE the JSON were made for this version'],
  ['validate', 'blocks', 'the schema, the vocabulary, and em-dashes in on-screen text'],
  ['storyboard', 'blocks', 'whether this film has a written plan, and whether the plan holds together'],
  ['beats', 'blocks', 'the clock: dead air, an empty closing frame, a backdrop that cannot move'],
  ['sweep-static', 'reports', 'the RENDERED pixels: did anything move, or is the whole film frozen (needs a render; hard code)'],
  ['critique', 'reports', 'beat value: hollow, placeholder, unbacked or thin beats'],
  ['direct', 'reports', 'direction: cut families, effect soup, continuity, and the motion tells'],
  ['floor', 'reports', 'ambition: whether this is a plain slideshow'],
  ['motion', 'blocks', 'whether anything in this film is choreographed rather than named'],
  ['dissolve', 'reports', 'transitions: two text states cross-dissolved into mud'],
  ['designspec', 'reports', 'the look lock: colours off the theme palette, fonts outside its roles'],
  ['craft', 'reports', 'the craft checklist: every CRAFT doc relevant to this film is answered in the plan'],
  ['copy', 'reports', 'the words: weak hook, jargon, a restated headline, a number set flat'],
  ['read', 'reports', 'whether a viewer can read each line in the seconds it is on screen'],
  ['pace', 'reports', 'whether anything happens, and how often'],
  ['eye', 'reports', 'where the eye is when a cut lands, and where the next shot sends it'],
  ['sound', 'reports', 'whether this film\'s silence is a decision somebody wrote down'],
  ['assets', strict ? 'blocks' : 'reports', 'every referenced image, icon, capture and voice file exists'],
  ...(landscape ? [['hero', 'reports', 'whether the hero line is set at video scale (launches a browser)']] : []),
  ...(sbPath ? [['treatment', 'reports', 'whether the written rationale still describes this plan']] : []),
  ['drift', 'reports', 'how many other films excuse the same waivers this one does'],
  // Both of these need the intent sidecar to have a contract to verify. Without one they still run and
  // still speak, but they can only advise, so the listing must not promise teeth they do not have here.
  ['inspect', hasSidecar || strict ? 'blocks' : 'reports', hasSidecar ? 'the per-beat value contract in the intent sidecar' : 'the per-beat value contract (there is no sidecar, so: that there is none)'],
  ['plan', hasSidecar ? 'blocks' : 'reports', hasSidecar ? 'whether the film puts an event where the plan promised one' : 'whether the film nominates a peak at all (no sidecar to check spans against)'],
];
const TOTAL = LADDER.length;
console.log(`\n▶ author-check · ${path.basename(file)} · ${TOTAL} steps, all of them, every time.`);
console.log(`  ${LADDER.filter((s) => s[1] === 'blocks').length} can stop you; ${LADDER.filter((s) => s[1] === 'reports').length} report and do not.`);
for (const [i, [name, tier, what]] of LADDER.entries()) {
  console.log(`   ${String(i + 1).padStart(2)}. ${name.padEnd(11)} ${tier === 'blocks' ? 'BLOCKS ' : 'reports'}  ${what}`);
}
console.log(`  Style findings report by default and BLOCK under TASTE=1. Why: docs/TASTE.md.`);

let stepNo = 0;
const describe = (name) => (LADDER.find((s) => s[0] === name) || [null, null, ''])[2];
// Open a step: say which one it is, what it reads, and warn BEFORE a slow one rather than after.
const openStep = (name, label, { slow } = {}) => {
  stepNo += 1;
  process.stdout.write(`\n──────── step ${stepNo}/${TOTAL} · ${label} ────────\n`);
  process.stdout.write(`  checks: ${describe(name)}\n`);
  if (slow) process.stdout.write(`  this one is slow: it launches a browser, about 1.4s. Everything above cost milliseconds.\n`);
};

// The code → doc map, read once from the frontmatter `make doc-index` already gates. Built lazily and
// cached: a run touches it up to 19 times, and a doc-map failure must not take the ladder down with it,
// so a broken map costs the pointers and nothing else.
let DOCS = null;
const docFor = (code) => {
  if (DOCS === null) { try { DOCS = codeDocMap(docMap().entries); } catch { DOCS = new Map(); } }
  return DOCS.get(code);
};
const printDocs = (codes) => {
  const seen = new Map();
  for (const c of codes) { const d = docFor(c); if (d && !seen.has(d)) seen.set(d, c); }
  for (const [doc, code] of seen) process.stdout.write(`  read: ${doc}   (settles [${code}])\n`);
};

// run one gate as a child; stream its output; return {code, blockCodes}. A "blocking" finding is a line
// the gate marks with ✗ and a [code] tag (critique errors, direct FAILs use exactly this format).
const runGate = (name, label, script, args, opts = {}) => {
  openStep(name, label, opts);
  // spawnSync, not execFileSync: a gate that PASSES can still print a warning, and it prints it to
  // stderr, which execFileSync throws away on success. That is how a step with a visible ⚠ above it
  // could summarise itself as "nothing found".
  // `target` is the source `file`; sugar expands at load inside each gate now, not to a second file on
  // disk, so every gate reads the same bytes the author edits and a receipt hashed against them stays
  // valid. `opts.subject` still opts a step out, kept for a gate that names a different file entirely.
  const { r, records } = spawnGate(script, [opts.subject || target, ...args]);
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const code = r.status ?? 1;
  process.stdout.write(out.endsWith('\n') ? out : out + '\n');
  // THE CODES COME OFF THE RECORDS. A waived finding is not a block, which is what the old regex meant
  // by only matching ✗: the gates print `○` over a code the scene already excused.
  const live = (records || []).filter((f) => !f.waived);
  const blockCodes = live.filter((f) => f.severity === 'error').map((f) => f.code);
  // WHAT IS WRONG, AND WHERE THE ANSWER LIVES. A gate names a defect in a sentence it had to fit on one
  // line; the reasoning behind it is a page somebody already wrote and nobody opens. Measured before
  // this line existed: 10 of 64 gates cited a doc, and 12 of 33 CRAFT docs were reachable only by
  // browsing an index. Routing here rather than in each gate means all of them gain it at once, and it
  // reads the SAME `codes:` frontmatter `make doc-index` already validates, so there is one owner.
  // Warnings are included: `continuity` fired as a warning on the film that prompted all of this.
  const warnCodes = live.filter((f) => f.severity === 'warn').map((f) => f.code);
  printDocs([...blockCodes, ...warnCodes]);
  // A STEP THAT FINDS NOTHING MUST SAY SO. Silence and a clean run look identical in a log, and a person
  // reading this cannot tell a gate that passed from a gate that fell over.
  //
  // THIS COUNT IS DELIBERATELY NOT THE RECORDS, and the two are different facts. `blockCodes` above is
  // WHICH RULES FIRED, and it must be structural because a rule that stops being seen stops stopping
  // anybody. This is HOW MANY MARKED LINES THE STEP PRINTED, a fact about the transcript the reader is
  // looking at: it counts the ⚠ advisories from validate, critique and inspect, which are not coded
  // findings and never were, so reading it off the records would make the tally disagree with the
  // screen. Nothing is decided from it; it is a tally under output the reader can already see.
  const findings = (out.match(/^\s*[✗~⚠]/gm) || []).length;
  process.stdout.write(findings === 0 && code === 0
    ? `  → nothing found.\n`
    : `  → ${findings} finding(s)${blockCodes.length ? `: ${[...new Set(blockCodes)].join(', ')}` : ''}.\n`);
  return { code, out, blockCodes, warnCodes, findings };
};

const results = [];
// tier decides what a finding COSTS, and it is the only thing TASTE=1 moves. `reports` steps still run,
// still print and still land in the verdict table; they simply cannot fail the build unless asked to.
const record = (name, { code, blockCodes, warnCodes = [], findings = 0 }, { waivable, exitMeansFail = true, tier = 'blocks' }) => {
  const teeth = tier === 'blocks' || taste;
  const failed = exitMeansFail && teeth ? code !== 0 : false;
  // if the gate failed only on findings the scene explicitly allows, downgrade to a waiver.
  const unwaived = waivable ? blockCodes.filter((c) => !allow.has(c)) : blockCodes;
  const waived = waivable && failed && blockCodes.length > 0 && unwaived.length === 0;
  const reported = tier === 'reports' && !teeth && code !== 0;
  results.push({ name, tier, failed: failed && !waived, waived, reported, findings, unwaived, blockCodes, warnCodes });
};

// TASTE GATES ARE OPT-IN. Seven of the steps below do not check that a film is BROKEN; they check that
// it matches a house style, and the style they were fitted to is a library this repo's own docs call
// debt. Fitted rules do not stay true: `direction-floor` blocked 38 of 130 shipped scenes and
// `visual-vocabulary` was waived by a quarter of the library before it was deleted for measuring the
// wrong thing. A rule that is waived by reflex has already been repealed; leaving it switched on only
// hides that fact behind a green tick.
//
// THAT REASONING IS ABOUT SEVERITY, AND IT WAS APPLIED TO EXISTENCE. Skipping the step does not protect
// an author from a rule fitted to the wrong library; it protects the rule from ever being read. So the
// steps run and print, always, and `taste` now decides one thing only: whether their findings block.
//   TASTE=1 make author-check D=<file>      · or `--taste`
// Measured on this library the day the flag changed meaning: with teeth, 116 of 141 scenes fail. That is
// the number that keeps this a report rather than a wall. docs/TASTE.md carries what would have to change.
const styleGate = (name, label, script, args, opts) =>
  record(name, runGate(name, label, script, args), { ...opts, tier: 'reports' });

// 1. validate, correctness, never waivable.
// 0. preflight. The one step that is not about the JSON in front of you: it asks whether the nine
//    decisions in docs/CRAFT/README.md were put in front of somebody for THIS version. It cannot grade
//    the answers and does not pretend to, the same way `make beats` proves a sheet was looked at and
//    not that the beats are good. Ratcheted like the rest, so the library warns and new work complies.
record('preflight', runGate('preflight', 'preflight (the decisions before the JSON)', 'quality/gates/preflight.mjs', [], { subject: file }), { waivable: true, tier: 'reports' });
record('validate', runGate('validate', 'validate (schema + em-dash)', 'core/validate/validate.mjs', []), { waivable: false });

// 1a. storyboard, DOES THIS FILM HAVE A PLAN, AND DOES THE PLAN HOLD TOGETHER?
//
// This step exists because the previous answer was a printed sentence and nothing else: plan-vs-render
// said "write the storyboard" to a film that had none, and no step anywhere asked whether one existed.
// Every frontmatter field the storyboard carries (`spectacle:`, `pace:`, `threads:`) was therefore
// optional in the only sense that matters, which is that skipping it cost nothing and said nothing.
//
// SEVERITY. Used to be argued from a census (most of the library had no storyboard, so blocking on day
// one would have failed most of it). That census is retired: `quality/gates/legacy-fold.mjs` wrote an
// explicit `authoring.allow` + `_why` onto every film that was excused by date, so the rule can go
// straight to a plain block, fires and not waived, and every film that used to be grandfathered still
// passes, on the record, instead of by the calendar.
{
  openStep('storyboard', 'storyboard (is there a plan, and does it hold)');
  if (!sbPath) {
    console.log(`  ✗ [no-storyboard] this scene declares no storyboard, and none was found beside it.`);
    console.log(`      Looked for: ${sbCandidates.map((p) => path.relative(repoRoot, p)).join('  ·  ')}`);
    console.log(`      A film with no written plan has no spectacle, no pace budget and no named thread, so three`);
    console.log(`      of this ladder's checks have nothing to compare the render against and stay quiet.`);
    console.log(`      Write one from docs/CRAFT/STORYBOARD-TEMPLATE.md, then: make storyboard-check SB=<file>`);
    console.log(`      Then point this scene at it, so a rename cannot break the link:`);
    console.log(`        "storyboard": "formats/scene/${sbBase}.storyboard.md"`);
    const excused = allow.has('no-storyboard');
    if (!excused) {
      console.log(`        The rule blocks here. Write the plan, or waive it with a reason someone can read:`);
      console.log(`          {"authoring":{"allow":["no-storyboard"],"_why":{"no-storyboard":"…"}}}`);
    }
    console.log(`  → 1 finding: no-storyboard${excused ? ' (waived)' : ' (BLOCKS)'}.`);
    results.push({ name: 'storyboard', tier: 'blocks', failed: !excused, waived: excused, reported: false, findings: 1, unwaived: excused ? [] : ['no-storyboard'], blockCodes: ['no-storyboard'] });
  } else {
    console.log(`  plan: ${path.relative(repoRoot, sbPath)}${declaredSb ? ' (declared by the scene)' : ' (found by name)'}`);
    const sbRun = spawnSync('node', [path.join(repoRoot, 'quality/gates/storyboard-check.mjs'), sbPath], { encoding: 'utf8', cwd: repoRoot });
    const out = `${sbRun.stdout || ''}${sbRun.stderr || ''}`, code = sbRun.status ?? 1;
    process.stdout.write(out.endsWith('\n') ? out : out + '\n');
    const findings = (out.match(/^\s*[✗~⚠]/gm) || []).length;
    console.log(findings === 0 && code === 0 ? `  → nothing found.` : `  → ${findings} finding(s) in the plan itself.`);
    record('storyboard', { code, blockCodes: code !== 0 ? ['storyboard-incomplete'] : [], findings }, { waivable: true, tier: 'reports' });
  }
}

// 1b. beats. The TIMELINE gate: dead air, an empty closing plate, a transition window with nothing in it,
//     a backdrop that structurally cannot move. Every other gate reads the scene as a bag of layers; this
//     one walks the clock. Blocking, waivable by code.
record('beats', runGate('beats', 'beat check (timeline holes)', 'quality/gates/beat-check.mjs', strict ? ['--strict'] : []), { waivable: true });

// sweep-static. The pixels-moved check, the post-render twin of beats' declared-backdrop check. It reads
// the RENDERED mp4, so before a render it reports "render first" and finds nothing; once rendered, a film
// whose whole timeline is frozen emits [sweep-static], a HARD_CODE (below), so it blocks unless waived.
// Reports here; the escalation pass below gives it teeth.
record('sweep-static', runGate('sweep-static', 'sweep-static (rendered pixels moved)', 'quality/gates/sweep-static.mjs', []), { waivable: true, tier: 'reports' });
// 2. critique, value gate; errors report, waivable by rule code.
styleGate('critique', 'critique (value gate)', 'quality/gates/critique.mjs', strict ? ['--strict'] : [], { waivable: true });
// 3. direct, direction gate; FAILs report, waivable by code.
styleGate('direct', 'direct (direction gate)', 'scripts/author/motion-director.mjs', [], { waivable: true });
// 3b. direction floor. The AMBITION lower bound (inverse of effect-soup): fails a plain slideshow.
styleGate('floor', 'direction floor (ambition)', 'quality/gates/direction-floor.mjs', strict ? ['--strict'] : [], { waivable: true });

// 3c. AUTHORED MOTION. The floor above measures a VOCABULARY: it counts techniques and clears a film
//     that names three of them. This one asks a narrower question the count cannot reach: did anybody
//     choreograph anything, or was every move selected from a menu. A film can name four techniques,
//     pass the floor, and still be five slides joined by cuts, because `"preset": "up"` is a technique.
//     That is not hypothetical: it is what shipped as this repo's own launch film, and the two films
//     the doctrine argues from fail it in the opposite direction, keying 6 of 8 and 4 of 30 layers.
//     No subprocess: the predicate is fs + JSON.
{
  openStep('motion', 'authored motion (choreography)', {});
  if (moFails) {
    process.stdout.write(
      `  ✗ [no-authored-motion] ${(scene.cuts || []).length + (scene.transitions || []).length + (scene.seams || []).length} junction(s), and not one layer is choreographed:\n`
      + `      no keyed \`motion\` track, and nothing carried across a junction by becomes / follow / acrossBeats.\n`
      + `      Every move in this film was SELECTED (anim, preset, cut), not authored. That is a slideshow,\n`
      + `      and no other gate can see it: presets satisfy the ambition floor by being counted.\n`
      + `      Cheapest fix, and the numbers are measured off the two exemplars rather than invented:\n`
      + `        node scripts/author/track.mjs pan   --to -600 --dur 1.25 --scene ${target} --layer <n>\n`
      + `        node scripts/author/track.mjs blast --dur 1.5              --scene ${target} --layer <n>\n`
      + `      Or reach for a keyed BEAT: recordedPan / scrollStory / focusRack / echoRing (make blueprints).\n`
      + `      Theory and the measurements: docs/CRAFT/KEYED-MOTION.md.\n`);
    printDocs(['no-authored-motion']);
  } else {
    process.stdout.write(`  → nothing found.\n`);
  }
  record('motion', { code: moFails ? 1 : 0, blockCodes: moFails ? ['no-authored-motion'] : [], findings: moFails ? 1 : 0 },
    { waivable: true, tier: 'blocks' });
}

// 4c. dissolve. The TRANSITION gate. Everything else here samples settled frames by construction, so a
//     crossfade between two text states (a double exposure: both strings at half strength through the
//     middle) was invisible to the whole ladder and shipped five times. See MISTAKES #171, #174.
styleGate('dissolve', 'dissolve check (crossfade mud)', 'quality/gates/dissolve-check.mjs', strict ? ['--strict'] : [], { waivable: true });
// 4. slop, RETIRED 2026-08. It ran 41 borrowed rules over a DOM dump carrying three of the CSS
// properties those rules read, so most of them had no evidence to work from and their silence read as
// a pass across the whole library (docs/MISTAKES.md #340). Its replacement is the designspec rule
// table, which runs in the gate below. The vendored detector is still the right tool for a hand-authored
// FRAGMENT, where it gets real computed styles, `make preview HTML=<file>` still runs it.
// 4b. designspec. The LOOK lock (visual twin of the storyboard): off-palette colours / non-role fonts. TASTE.
// BLOCKS under TASTE, not just under STRICT. It was a warning, and across two films it named the exact
// drift ("#8fdcff is 17% from anything in the palette") and I read it and shipped anyway, twice. A
// gate whose finding is precise and whose severity is advisory teaches the author that warnings are
// decoration. Every scene in the library passes it: the seven that are legitimately off the brand say
// so per-scene, with a reason, in {"authoring":{"allow":["off-colour"]}} (docs/MISTAKES.md #337).
styleGate('designspec', 'design-spec lock (theme colours + fonts)', 'quality/gates/designspec-check.mjs', ['--strict'], { waivable: true, exitMeansFail: true });
// 4b2. craft. THE CHECKLIST: every CRAFT doc whose `applies-when:` matches this film must be answered in
// the storyboard's `craft:` map, so an author cannot ship without going through the docs that apply. This
// is the fix for the failure that a huge doc system existed and a film used none of it: it turns the
// relevant docs from something you may read into a checklist the plan carries. quality/gates/craft-checklist.mjs.
styleGate('craft', 'craft checklist (every relevant CRAFT doc answered)', 'quality/gates/craft-checklist.mjs', [], { waivable: true, exitMeansFail: true });
// 4c. copy. The WORDS lock: hook length / weak opener, marketing jargon, restated headlines, flat numbers.
styleGate('copy', 'copy gate (on-screen writing)', 'quality/gates/copy-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// 4d. read. The CLOCK lock, and it is the half `copy` cannot see. `copy` grades the LINE: its length,
// its opener, its jargon. Nothing anywhere graded the line against the SECONDS it exists for, so a
// nine-word headline living for 0.6s passed the whole ladder. Constants are Netflix's and the BBC's
// subtitling numbers converted to 30fps, cited in the gate; film editing publishes none.
//
// SEVERITY, ARGUED, and the argument is in the census. `unreadable-hold` fires on 61% of the library,
// which normally means a rule is mis-fitted. Here it means something narrower and more useful: the
// median failing line holds 0.58 of what read-it-twice asks, so this library is authored to be read
// ONCE. The rule measures the right thing and asks for an ambition we have never had. It is promoted
// to BLOCKS on a written condition rather than a wish: when fewer than a fifth of gate-visible scenes
// carry an `unreadable-hold` finding. The other four codes fit the library today.
styleGate('read', 'read gate (can a viewer read it in time)', 'quality/gates/read-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// PACE. A still film is sometimes right, so this reports rather than blocks. What it is NOT is a matter
// of opinion: two films authored as a deliberate improvement came out slower than the one they replaced,
// measured, and the only thing that noticed was a census run by hand afterwards (docs/MISTAKES.md #336).
styleGate('pace', 'pace (is anything happening, and how often)', 'quality/gates/pace-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// EYE-TRACE. Murch ranks it fourth of six at 7% and says to sacrifice upward from the bottom, so a cut
// that serves the story may fairly cost the eye a journey. It reports for that reason, not because the
// measurement is weak. Know two limits before you act on it. The focal point is scored from the JSON,
// so a layer whose colour is a color-mix or a gradient cannot be read: those are dropped and the count
// prints on every verdict, never defaulted to zero. And a side holding ONE live layer is marked, because
// a layer can win by being alone. The first false positive found was a corner watermark scoring 43%
// across an 0.8s hole, where the real defect is dead air and `beats` owns it.
styleGate('eye', 'eye-trace (where the viewer is looking at each cut)', 'quality/gates/eye-trace.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// SOUND. Is the silence a decision, or an omission?
//
// WHY IT WAS NOT HERE. It was written, it worked, and nothing ran it. `make audio-check` existed and
// no step of this ladder called it, so the one gate that asks about a whole structural register was
// reachable only by a person who already knew to ask. That is the same shape as a field written and
// never read, which is the failure this repo logs more than any other.
//
// SEVERITY, ARGUED, AND THE ARGUMENT IS THE CENSUS. Of the 148 gate-visible scenes, 106 declare
// `audio.silent:true` and 25 of those say why; 17 name no `audio` block at all and 1 has a block that
// produces nothing. So blocking on day one fails 99 films, two in three, and CLAUDE.md already names
// what happens next: everyone adds a waiver and the rule is repealed with nobody writing it down.
// docs/MISTAKES.md #25 and #159 are that bill, paid twice.
//
// It is not ratcheted either, and that is the narrower call. A ratchet grandfathers the past and blocks
// new work, which is right for `no-storyboard`, where the debt is a missing artefact. Here the rule
// asks for a STATED DECISION rather than a particular answer, and the honest cheap answer to it,
// `"silent": true, "_why": "…"`, is one line an author writes while reading the finding. A rule that
// costs one line does not need a manifest of 99 rows to be adoptable; it needs to be printed where
// somebody will see it, which is what this step is. Promote it when the census says fewer than a fifth
// of gate-visible scenes are silent without a reason: `node quality/gates/audio-check.mjs --all`.
styleGate('sound', 'sound gate (is the silence a decision)', 'quality/gates/audio-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// 4d. assets. The READINESS preflight: every referenced image/icon/capture/vo actually exists on disk.
{ const r = runGate('assets', 'asset preflight (referenced files exist)', 'quality/gates/asset-check.mjs', strict ? ['--strict'] : []); record('assets', r, { waivable: true, exitMeansFail: strict }); }

// 4g. hero fill. The one LAYOUT finding that can be moved before the render.
//
// WHY IT WAS LATE. `thin-hero` lives in quality/audit.mjs, which runs under `make audit` after the mp4
// exists, so a hero line set at web scale was reported once the render had been paid for. Every other
// rule in that file needs the rendered page for a reason this one shares: it measures INK width, and the
// declared `w` is not the ink. The audit says so in its own comment, with the numbers: the boxes are
// about right (70% median) and the glyphs fill 67.5% of them, so a static check on `w` would call the
// library healthy and report nothing. A weaker approximation would therefore not be a rougher version
// of this finding, it would be a different and mostly silent one, and a gate that is quiet where the
// real check is loud is worse than the documented absence.
//
// So the PAGE moves earlier, not the rule. `quality/audit.mjs --hero` runs the same browser, the same
// sampled frames and the same in-page function, with the contrast screenshots and the overlay shot
// skipped. Measured on argus-launch (23s, 16:9): 4.60s for the full audit, 1.44s for --hero.
//
// It REPORTS rather than blocks for the honest reason, and the reason is the cost rather than the noise.
// DOSE, measured by running --hero over the library: 29 of the 91 landscape scenes carry a thin-hero
// finding (32%). That is a usable warning rate, well under the "four landscape films in five" the audit's
// own comment cites, which counted sampled FRAMES under the 60% reference rather than films under the 55%
// floor with the split-frame exemption applied. It now runs every time, and it announces its cost first,
// because a step that surprises you with a browser launch is a step you learn to route around.
// Portrait scenes never reach it: the rule only fires when the frame is wider than it is tall.
if (landscape) {
  runGate('hero', 'hero fill (thin-hero, pre-render)', 'quality/audit.mjs', ['--hero'], { slow: true });
} else {
  console.log(`\n──────── hero fill (thin-hero) ────────`);
  console.log(`  ○ portrait canvas (${sceneW}x${sceneH}); thin-hero is a landscape rule and has nothing to say here.`);
}

// 4e. treatment. The film's own rationale. It REPORTS, always: a treatment is an argument a person
//     makes, so a gate can only check that one exists and still describes THIS storyboard. It goes
//     stale the moment the plan moves, and a stale rationale is worse than none because it reads as
//     current. It runs against whichever storyboard step 2 resolved, so a declared plan is checked too;
//     it used to look only for a sibling file and therefore never fired on a plan kept in _concepts/.
if (sbPath) {
  const t = readReceipt('treatment', sbPath);
  openStep('treatment', 'treatment (why this film looks like this)');
  if (!t.exists) {
    console.log(`  ~ no treatment for ${path.basename(sbPath)}. The argument for this direction, and against`);
    console.log(`    the ones you turned down, is not written anywhere. \`make treatment SB=${sbPath}\``);
    console.log(`  → 1 finding: no treatment written.`);
  } else if (t.stale) {
    console.log(`  ~ the treatment is STALE: ${path.basename(sbPath)} has changed since ${t.rel} was written.`);
    console.log(`    Re-run \`make treatment SB=${sbPath}\`: it refreshes the measured block and leaves your prose.`);
    console.log(`  → 1 finding: the rationale describes an older plan.`);
  } else {
    console.log(`  ✓ treatment current (${t.receipt.treatment || 'recorded'}).`);
    console.log(`  → nothing found.`);
  }
}

// 4f. waiver drift, is this waiver a decision or a habit? REPORTS, and never blocks, because a gate
//     that blocked on this would itself be waived. It reads the whole library and reports how many other
//     films excuse the same rule, which is the only level at which "we keep letting ourselves off" is
//     visible. Written after a gate blocked two films on the same day and the second one was waived.
runGate('drift', 'waiver drift (is this a decision or a habit)', 'quality/gates/waiver-drift.mjs', []);

// 5. inspect. The per-beat value contract. inspect.mjs silently passes when no sidecar exists; here
//    we make that ABSENCE visible as a WARN so the value contract is a choice, not an accident.
const sidecar = sidecarPath;
// Hand the storyboard to plan-vs-render explicitly. It resolves one by name on its own, but a scene that
// DECLARES its plan should have that declaration honoured, and only this step knows what was declared.
const planArgs = [...(strict ? ['--strict'] : []), ...(sbPath ? ['--sb', sbPath] : [])];
if (hasSidecar) {
  record('inspect', runGate('inspect', 'inspect (per-beat value contract)', 'quality/gates/inspect.mjs', strict ? ['--strict'] : []), { waivable: true });
  // 5b. plan vs render, inspect reads the scene at ONE instant per beat, so it cannot see a beat that
  //     stalls. This one lines the plan's beat spans up against the film's clock: a promised junction
  //     with no event at it, and a beat the author froze while the plan says it turns.
  record('plan', runGate('plan', 'plan vs render (does the film do what the plan said)', 'quality/gates/plan-vs-render.mjs', planArgs), { waivable: true });
} else {
  openStep('inspect', 'inspect (per-beat value contract)');
  process.stdout.write(`  ⚠ no .intent.json sidecar: this scene declares no per-beat value contract.\n` +
    `      A sidecar states, per beat, the artifact that earns the frame + what must show/animate;\n` +
    `      inspect then verifies the render delivers it. Add ${path.basename(sidecar)} to make value checkable.\n` +
    // NAME THE COMMAND. A gate that says what is missing and not how to produce it sends the reader
    // back to a prose file to look it up, which is the round trip this ladder exists to remove.
    `      Generate one from the plan: make intent SB=<storyboard.md> D=${target}\n` +
    `  → 1 finding: no value contract to verify.\n`);
  if (strict) results.push({ name: 'inspect', tier: 'blocks', failed: true, waived: false, reported: false, unwaived: ['no-intent-sidecar'], blockCodes: [] });
  // AND RUN plan vs render ANYWAY. Skipping it here meant the film with no plan was the one film never
  // asked whether it nominates a peak, which is the film most likely not to have one. The gate itself
  // says plainly that it has no plan to check against; the one question it can still answer without a
  // plan is `no-spectacle-nominated`, and that question is worth asking of exactly this film.
  // Not recorded as a result: with no sidecar it can only advise, and a step that can only advise has
  // no verdict to put in the ladder's table.
  runGate('plan', 'plan vs render (no sidecar, so: does the film nominate a peak)', 'quality/gates/plan-vs-render.mjs', planArgs);
}

// ---- verdict ----
const failed = results.filter((r) => r.failed);
const waivers = results.filter((r) => r.waived);
console.log(`\n════════ author-check · ${path.basename(file)} ════════`);
// TWO KINDS OF FINDING, and reading them as one list is why NOCHECK=1 looks like it skips safety.
// `validate` runs the SAME validator the engine runs at boot (core/engine/boot.js imports validateAll), and
// every vocabulary registry throws during layer build. Those cannot be skipped by anything: a scene
// that fails them will not render, with or without this target. Everything else here is this target's
// own judgement about craft, and the engine will happily render a film that fails all of it.
// docs/MISTAKES.md #379.
const ENGINE_REFUSES = new Set(['validate']);
const line = (r) => {
  const mark = r.failed ? '✗' : r.waived ? '○' : r.reported ? '~' : '✓';
  const note = r.failed ? `BLOCKS (${r.unwaived.join(', ') || 'exit ' + 1})`
    : r.waived ? `waived (${r.blockCodes.join(', ')}) · somebody decided, and said why`
    : r.reported ? `reported, does not block (${r.blockCodes.join(', ') || 'see above'})`
    // A GATE CAN EXIT 0 AND STILL HAVE SAID SOMETHING. critique prints its warnings and returns 0, so
    // this line read "nothing found" directly under three ⚠ findings and the summary, the part people
    // actually read, erased them. Exit code is the verdict; the finding count is the evidence, and the
    // table has to carry both or it contradicts the transcript above it.
    : r.findings > 0 ? `${r.findings} finding(s) above, none blocking`
    : 'nothing found';
  console.log(`  ${mark} ${r.name.padEnd(10)} ${note}`);
};
const refusals = results.filter((r) => ENGINE_REFUSES.has(r.name));
const judgements = results.filter((r) => !ENGINE_REFUSES.has(r.name));
if (refusals.length) {
  console.log('\n  THE ENGINE WOULD REFUSE THIS, not skippable, NOCHECK=1 included:');
  refusals.forEach(line);
}
if (judgements.length) {
  console.log('\n  CRAFT JUDGEMENTS: this target\'s opinion; the engine renders these regardless:');
  judgements.forEach(line);
}
if (waivers.length) console.log(`  (waivers come from "authoring.allow" in the scene, deliberate rule breaks)`);
console.log(`\n  Every one of the ${TOTAL} steps ran. ${results.length} returned a verdict; the rest print and advise.`);
const reported = results.filter((r) => r.reported);
// Printed findings from a gate that PASSED. Neither `failed` nor `reported` covers them, and before this
// existed they were summarised as "nothing found" three lines under their own ⚠ output.
const noisy = results.filter((r) => !r.failed && !r.waived && !r.reported && !r.legacy && r.findings > 0);
if (reported.length) {
  console.log(`\n  ~ ${reported.length} step(s) found something and did not stop you: ${reported.map((r) => r.name).join(', ')}.`);
  console.log(`      These are house-style findings. They are real and they are printed in full above.`);
  console.log(`      Give them teeth:  TASTE=1 make author-check D=${file}`);
  console.log(`      Why they report rather than block: docs/TASTE.md · "One process, two severities".`);
} else if (!taste && !noisy.length) {
  console.log(`\n  ✓ the house-style steps found nothing either. Nothing above is being held back from you.`);
}
if (noisy.length) {
  console.log(`\n  · ${noisy.reduce((n, r) => n + r.findings, 0)} finding(s) came from step(s) that still returned a verdict of PASS: `
    + `${noisy.map((r) => `${r.name} (${r.findings})`).join(', ')}.`);
  console.log(`      A passing gate can still have said something. Those lines are printed in full above;`);
  console.log(`      TASTE=1 does not change them, because their gate did not fail.`);
}
console.log(`\n  NOCHECK=1 skips this target, NOT the engine: a scene with a bad name or a broken schema`);
console.log(`  still fails at boot. What you lose by skipping is the craft half, and the early warning.`);

// ---- the required post-render step the static ladder structurally cannot be ----
console.log(`\n  ▶ REQUIRED after render (the ladder is not complete without it):`);
console.log(`      make judge D=${file}${vs ? ` VS=${vs}` : ''}`);
console.log(`      then READ /tmp/judge/${path.basename(file, '.json')}/sheet.png against its rubric.md and score every frame`);
console.log(`      (readability · hierarchy · composition · brand + asset fidelity · produced · value).`);
console.log(`      If your eye catches a flaw, it is a FIX, never ship one you noticed. See docs/JUDGE.md.`);

// ---- HARD CODES, decided from what already ran ------------------------------------------------------
// A HARD_CODES code blocks whenever it fires and the scene has not waived it, whatever tier its own step
// sits in. This re-runs nothing: every code below came out of a gate that already ran in the ladder
// above, so the cost is a Set lookup on a code we already have.
{
  const seen = new Map();
  for (const r of results) for (const c of [...(r.blockCodes || []), ...(r.warnCodes || [])]) {
    if (HARD_CODES[c] && !seen.has(c)) seen.set(c, r.name);
  }
  // A DERIVATIVE CANNOT OWE THIS. `scripts/lib/census.mjs` excludes generated siblings (.beatsync/
  // .expanded/.animatic/.captioned/.directed/.intent) from the library; blocking one anyway would be a
  // population mismatch, not a finding: you would fix the SOURCE, not the derivative.
  const inLibrary = LIBRARY(path.basename(file), file);
  const blocked = [];
  for (const [c, step] of seen) {
    if (!inLibrary) continue;
    if (allow.has(c)) continue;                       // waived, with a `_why` the always-on half checks
    blocked.push([c, step]);
  }
  if (blocked.length) {
    console.log(`\n  ✗ ${blocked.length} hard code(s) BLOCK this film. They are not new rules: they are the`);
    console.log(`    house-style findings above, made binding regardless of TASTE=1.`);
    for (const [c, step] of blocked) {
      console.log(`      [${c}] (step ${step})`);
      const d = docFor(c); if (d) console.log(`          read: ${d}`);
    }
    console.log(`\n    Fix them, or decide against one in the scene and say why:`);
    console.log(`      "authoring": { "allow": ["${blocked[0][0]}"], "_why": { "${blocked[0][0]}": "…" } }`);
    for (const [c] of blocked) results.push({ name: `hard:${c}`, tier: 'blocks', failed: true, waived: false, reported: false, findings: 0, unwaived: [c], blockCodes: [c], warnCodes: [] });
  }
}
const failedStrict = results.filter((r) => r.failed);

if (failedStrict.length) {
  if (iterate) {
    console.log(`\n~ iterating: ${failedStrict.map((r) => r.name).join(', ')} WOULD block at ship. Nothing stopped here.`);
    console.log(`  Run \`make ship D=${file}\` when you want the ladder to mean something.\n`);
    process.exit(0);
  }
  console.log(`\n✗ author-check FAILED: ${failedStrict.map((r) => r.name).join(', ')}. Fix, or waive a deliberate break via {"authoring":{"allow":[...]}}. ${strict ? '(--strict: warnings also block.)' : ''}\n`);
  process.exit(1);
}
console.log(`\n✓ author-check passed${waivers.length ? ` (${waivers.length} waived)` : ''}. Static ladder green, now do the judge step above before shipping.\n`);
process.exit(0);
