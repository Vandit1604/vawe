// scripts/gates/author-check.mjs: THE MANDATORY AUTHORING-QUALITY LADDER.
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
//   hero. The one LAYOUT finding that can run pre-render: `thin-hero`, via verify/audit.mjs --hero.
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
// Usage: node scripts/gates/author-check.mjs <scene.json> [--strict] [--taste] [--vs <brand>]
//        make author-check D=<file> [STRICT=1] [TASTE=1] [VS=<brand>]
// TASTE=1 no longer decides WHETHER the style gates run. They always run. It decides whether their
// findings BLOCK, which is the only decision that was ever really behind that flag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { readReceipt } from '../lib/receipt.mjs';
import { spawnSync } from 'node:child_process';
import { codeDocMap, docMap } from './doc-map.mjs';
import { codesEmitted } from '../lib/finding-codes.mjs';
import { readFindings } from '../lib/findings.mjs';
import { sceneDims } from '../../core/safe.js';
import { population, LIBRARY } from '../lib/census.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- THE RATCHET ------------------------------------------------------------------------------------
//
// A rule that is right and new fails the whole library on its first run. `no-storyboard` fires on 88 of
// the 132 scenes here. Both of the obvious answers are worse than the red:
//   BACKFILL: write 88 storyboards to satisfy a gate. For a judgement rule that produces 88 fake plans,
//              the number goes green and nobody learns anything.
//   WAIT: "promote it when under a quarter are missing" leaves the rule toothless for months and
//              depends on a cleanup nobody is scheduled to do.
// So: grandfather the past EXPLICITLY, block new work immediately. A scene that predates the rule is
// recorded as LEGACY in a generated manifest, with the rule and the date it was adopted.
//
// LEGACY IS NOT A WAIVER, and the difference is the whole point. A waiver says a person looked at this
// film, decided the rule is wrong for it, and wrote down why (`authoring.allow` + `_why`, in the scene).
// Legacy says NOBODY HAS LOOKED. It carries no reason because there is no reason yet. If the two ever
// print the same, legacy has become a silent waiver and the rule is repealed the way CLAUDE.md describes.
//
// IT ONLY TIGHTENS. `--adopt` freezes a rule's legacy set once, on the day the rule is promoted, and
// refuses to run twice. `--stamp` can only REMOVE rows: a scene that now complies, a scene that was
// deleted, a scene that was EDITED. Nothing can add a row after adoption, so no author can grandfather
// today's film by re-running the stamp, which is the only way a ratchet stays a ratchet.
//
// AN EDITED LEGACY SCENE LOSES ITS LEGACY STATUS. Touching a film is when you owe it a plan: the moment
// you have the file open and are making decisions about it is the cheapest moment there will ever be to
// write down what it is for. The escape hatch for a genuine one-line fix is not a fake storyboard, it is
// a waiver with a sentence in it, which is a decision someone can read and argue with later.
//
//   node scripts/gates/author-check.mjs --legacy                  · the census, writes nothing
//   node scripts/gates/author-check.mjs --legacy --adopt <rule>   · freeze today's failures as legacy
//   node scripts/gates/author-check.mjs --legacy --stamp          · prune fixed/edited/deleted rows
const MANIFEST = path.join(repoRoot, 'scripts/gates/legacy-manifest.json');
const SCENE_DIR = path.join(repoRoot, 'formats', 'scene');
const TODAY = () => new Date().toISOString().slice(0, 10);

// A storyboard is resolved in exactly one place, so the census and the ladder step can never disagree
// about which films have a plan.
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
const RATCHET_RULES = {
  'no-storyboard': {
    what: 'the film has a written plan (a storyboard, declared or found beside it)',
    fails: (sceneFile, sceneJson) => !resolveStoryboard(sceneFile, sceneJson).path,
  },
  // A film cut into beats where NOTHING is choreographed and NOTHING crosses a junction is a slideshow,
  // whatever else is true of it. This is the one defect the two films this repo argues from do not have
  // and the median film here does: `higgsfield-recreation` keys 6 of its 8 layers and cuts zero times,
  // `brew-launch-act1` keys 4 and punctuates with camera fx, and the library median is 0 keyed layers.
  //
  // Measured before it was written, which is the lesson `visual-vocabulary` cost: it fires on 16 of 140
  // scenes and spares BOTH exemplars. It is deliberately generous, because the cheap wrong version of
  // this rule counts pictures or layer area and a hairline defeats it. It asks only whether the author
  // choreographed ANYTHING: one keyed track, or one layer that survives a junction via `becomes`,
  // `follow` or `acrossBeats`. One is enough. A film that cannot answer yes has not been directed.
  //
  // The legacy set it freezes is mostly showcase reels, and a reel really is a list: that is a fair
  // waiver with a reason, and it is exactly why this is a ratchet and not a promotion. CLAUDE.md's own
  // note stands, this rule is wrong about a metric-cut list film, and being wrong there now costs a
  // sentence in `_why` instead of a repealed rule nobody wrote down.
  'no-authored-motion': {
    what: 'something in the film is choreographed: a keyed `motion` track, or a layer that survives a junction',
    fails: (_sceneFile, d) => {
      const L = Array.isArray(d && d.layers) ? d.layers : [];
      const joints = (d.cuts || []).length + (d.transitions || []).length + (d.seams || []).length;
      if (joints < 2) return false;                       // no junctions, nothing to read as a slideshow
      const content = L.filter((l) => l && CONTENT_TYPES.has(l.type || 'text')).length;
      if (content < 6) return false;                      // too small to be a slideshow of anything
      const keyed = L.some((l) => Array.isArray(l && l.motion) && l.motion.length >= 2);
      const carried = L.some((l) => l && (l.becomes || l.follow || l.acrossBeats));
      return !keyed && !carried;
    },
  },
};

// The layer types that carry MEANING, as opposed to dressing the frame. `rect`, `glow`, `beam` and the
// paint fields are deliberately absent: a film made of five rectangles is not a film with five ideas in
// it, and counting them would let decoration buy a pass. Same split CLAUDE.md draws between DECORATION
// and EXPLANATION, applied to the layer table.
const CONTENT_TYPES = new Set(['text', 'image', 'svg', 'html', 'component', 'count', 'doc',
  'lottie', 'video', 'board', 'canvas', 'clip', 'group', 'composition']);

// ---- RATCHETED CODES: the same ratchet, for rules whose verdict only a gate can give ------------
//
// `RATCHET_RULES` above requires a predicate that is CHEAP and PURE, and that is right for the hot
// path: the census runs it over every scene on every author-check run. But almost every rule worth
// tightening is not expressible that way. `plain-slideshow` needs a motion vocabulary counted,
// `crossfade-mud` needs the transition windows walked, `off-colour` needs the theme resolved. Writing
// pure twins of those predicates would put one rule in two places, which is the drift this repo logs
// more than anything else, and the twin would be the copy that goes stale.
//
// So the split follows where the cost actually falls:
//   ADOPT TIME (rare, a maintenance command): run the OWNING GATE over the library, once. Slow and
//     honest, and it is the only moment the whole library has to be evaluated.
//   CHECK TIME (every run): re-run NOTHING. The gate already ran in the ladder above and its codes are
//     in `results`, so severity is a manifest lookup on a code we already have.
//
// Which gate owns a code is DERIVED, never listed: scripts/lib/finding-codes.mjs already scans the gate
// sources for exactly this, and a hand-kept map would rot the first time a rule moved file.
const RATCHET_CODES = {
  'plain-slideshow': 'the film reaches past a slideshow: kinetic type, a camera move, or real transitions',
  'no-preflight': 'the film went through the decision chain before the JSON existed',
  'crossfade-mud': 'no transition dissolves one text state into another in place',
  'no-continuous-object': 'something survives the film\'s cuts',
  'effect-soup': 'the film does not stack more effect families than it can spend',
  'linear-motion': 'motion carries easing, not a constant rate',
  'monotone-timing': 'the film varies its timing rather than moving everything alike',
  'enter-and-retreat': 'a layer leaves the way it came, in one direction of travel',
  'no-transition': 'a multi-beat film earns at least one real seam or cut, not flat jumps',
  'sparse-beats': 'the film has enough beats for its length, not two or three cards held too long',
  'feature-poverty': 'the film reaches into the engine\'s expressive families, not just the top of the box',
  'craft-unvisited': 'every CRAFT doc that applies to this film is answered in the plan',
  'no-plan-for-craft': 'the film has a storyboard the craft checklist can be answered in',
  // The backdrop is the largest area of the frame, and 81% of the library paints one flat field for the
  // whole runtime. beat-check has warned on it for a while and the warn was scrolled past. The flat-film
  // tier is ratcheted now: a NEW film has to move the backdrop on at least one beat (a moving preset, or
  // bg windows with `t` that turn), or state the still ground as a decision. The dead-markup tier of the
  // same code stays a hard beat-check fail, so this does not loosen it.
  'static-bg': 'the backdrop moves, at least one beat is not a flat field asleep for the whole film',
  // static-bg checks whether a film DECLARES a backdrop that can move; sweep-static checks the RENDERED
  // pixels for whether anything actually did. It needs the mp4, so it no-ops (and passes) until the film is
  // rendered, then a NEW film whose whole timeline is frozen blocks. A film can pass one and fail the other.
  'sweep-static': 'the rendered pixels move, the whole film is not one frozen frame held for its runtime',
  // NOT RATCHETED, and the measurement is the reason. `off-colour` fires on BOTH exemplars, because a
  // recreation carries the captured brand's colours and those are not in our theme palette. A rule that
  // fails the two films this repo argues from is a wrong rule for a whole class of film, not a
  // discovery, and adopting it would teach authors to deform a faithful recreation until a number
  // moved. It stays a report. This is the check `visual-vocabulary` did not run.
  'off-font': 'every face is one of the theme roles',
  'restated-headline': 'a beat does not repeat the line above it',
  'jargon': 'the on-screen words are specific, not marketing filler',
};

/** The gate script that emits a code, read from the sources rather than a list. */
function gateForCode(code) {
  const files = codesEmitted().get(code);
  if (!files) return null;
  // Prefer a real gate over a shared helper, and never point at the ladder itself.
  const cands = [...files].filter((f) => f !== 'scripts/gates/author-check.mjs');
  return cands.find((f) => f.startsWith('scripts/gates/')) || cands.find((f) => f.startsWith('scripts/author/')) || cands[0] || null;
}

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

/** Does `code` fire on this scene? Runs the owning gate. ADOPT-TIME ONLY: never on the hot path. */
function codeFiresOn(code, sceneFile) {
  const gate = gateForCode(code);
  if (!gate) return false;
  const { records } = spawnGate(gate, [sceneFile], { timeout: 60000 });
  return (records || []).some((f) => f.code === code && f.severity !== 'info');
}

// The identity of a scene for legacy purposes is its CONTENT, canonicalised, not its bytes. Sorting keys
// means a reformat or a key reorder does not cost a film its grandfathering, while any change to what the
// film actually is does.
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
  : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]))
  : v;
const sceneHash = (sceneJson) => crypto.createHash('sha256').update(JSON.stringify(canonical(sceneJson))).digest('hex').slice(0, 16);

const readManifest = () => {
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return { version: 1, rules: {} }; }
};
// The population comes from scripts/lib/census.mjs so the ratchet cannot count a third of the library
// and print a confident number (docs/MISTAKES.md #391). `quiet` because censusLine below is the line that
// states N, and two counts of the same thing is how they drift apart.
//
// SOFT, not fatal, and the distinction is the point. This census is DISPLAY: it tells an author how many
// other films the rule reaches. The ladder's verdict about the film in front of them does not depend on
// it, so a bare worktree must still be able to run author-check. It prints the reason it cannot count
// instead of a number, which is the whole ask, say what you looked at, and say when you could not look.
let censusBlind = null;
const libraryScenes = () => {
  const pop = population('ratchet census', { filter: LIBRARY, quiet: true, soft: true });
  censusBlind = pop.blind;
  return pop.names
  .map((f) => path.join(SCENE_DIR, f))
  .map((p) => { try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return d?.module === 'scene' ? { p, d, name: path.basename(p, '.json') } : null; } catch { return null; } })
  .filter(Boolean);
};

// One scene, one rule: legacy / new / current. `edited` is reported separately from `absent` because they
// are different arguments. One film was never looked at, the other was looked at this week.
function ratchetStatus(rule, sceneFile, sceneJson, manifest = readManifest(), fired = true) {
  const spec = RATCHET_RULES[rule];
  const entry = manifest.rules?.[rule];
  if ((!spec && !RATCHET_CODES[rule]) || !entry) return { ratcheted: false, state: 'current' };
  // A CODE rule is only ever asked about a scene whose gate ALREADY fired it, so there is nothing to
  // re-evaluate here and running the gate would put a subprocess on the hot path. `fired` lets the
  // census (which does have to evaluate) pass the answer in.
  if (spec ? !spec.fails(sceneFile, sceneJson) : fired === false) return { ratcheted: true, adopted: entry.adopted, state: 'current' };
  const row = entry.legacy?.[path.basename(sceneFile, '.json')];
  if (!row) return { ratcheted: true, adopted: entry.adopted, state: 'new', why: 'absent' };
  if (row.hash !== sceneHash(sceneJson)) return { ratcheted: true, adopted: entry.adopted, state: 'new', why: 'edited', since: row.since };
  return { ratcheted: true, adopted: entry.adopted, state: 'legacy', since: row.since };
}

// The two numbers. "0 new failures" is actionable; "88 failures" is noise people learn to scroll past,
// and that habit is the actual disease.
function census(rule, manifest = readManifest()) {
  const c = { legacy: 0, current: 0, new: 0, total: 0, newNames: [], editedNames: [] };
  for (const s of libraryScenes()) {
    c.total++;
    const st = ratchetStatus(rule, s.p, s.d, manifest, RATCHET_CODES[rule] ? codeFiresOn(rule, s.p) : true);
    if (st.state === 'legacy') c.legacy++;
    else if (st.state === 'new') { c.new++; c.newNames.push(s.name); if (st.why === 'edited') c.editedNames.push(s.name); }
    else c.current++;
  }
  return c;
}
const censusLine = (rule, c) => censusBlind
  ? `NOT COUNTED. This checkout cannot see the library:\n      ${censusBlind.replace(/\n\s+/g, '\n      ')}`
  : `${c.legacy} legacy · ${c.current} current · ${c.new} NEW failures  (of ${c.total} scene(s) in ${SCENE_DIR.replace(repoRoot + '/', '')})`;
// `newNames` was collected on every run and printed nowhere. Those are the films the rule stops TODAY,
// so withholding them makes the number unactionable: a reader learns twelve films block and cannot find
// one of them. Sorted, because a census whose order moves is a diff nobody can read.
const censusNames = (c) => [...c.newNames].sort();

if (process.argv.includes('--legacy')) {
  const adopt = (() => { const i = process.argv.indexOf('--adopt'); return i >= 0 ? process.argv[i + 1] : null; })();
  const stamp = process.argv.includes('--stamp');
  const m = readManifest();
  m.version = 1;
  m._generated = 'GENERATED FILE. Do not hand-edit: a hand-kept list goes stale the day it is written.';
  m._stamp = 'node scripts/gates/author-check.mjs --legacy [--adopt <rule>|--stamp]   ·   make legacy';
  m._legacy_is_not_a_waiver = 'A row here means NOBODY HAS LOOKED at this film against this rule. It carries no reason because there is no reason yet. A waiver is the opposite: a person decided, and wrote why, in the scene\'s own authoring.allow/_why.';
  m.rules ||= {};
  if (adopt) {
    const isCode = !RATCHET_RULES[adopt] && !!RATCHET_CODES[adopt];
    if (!RATCHET_RULES[adopt] && !isCode) { console.error(`✗ ${adopt} is not a ratcheted rule. Known: ${[...Object.keys(RATCHET_RULES), ...Object.keys(RATCHET_CODES)].join(', ')}`); process.exit(2); }
    if (m.rules[adopt]) { console.error(`✗ ${adopt} was already adopted on ${m.rules[adopt].adopted}. A ratchet only tightens: re-adopting would grandfather today's films, which is the one thing this mechanism exists to prevent.`); process.exit(2); }
    const legacy = {};
    const scenes = libraryScenes();
    if (isCode) {
      const gate = gateForCode(adopt);
      if (!gate) { console.error(`✗ no gate emits [${adopt}]. A rule with no gate cannot be ratcheted, and a waiver for it would excuse nothing.`); process.exit(2); }
      // The one moment the whole library is evaluated by the real gate. Slow on purpose: the alternative
      // is a pure twin of the rule, which is one rule in two places and the copy that goes stale.
      console.log(`\n  adopting [${adopt}] via ${gate} over ${scenes.length} scene(s). This runs the real gate, so it is slow.`);
      let n = 0;
      for (const sc of scenes) {
        if (++n % 25 === 0) process.stdout.write(`    …${n}/${scenes.length}\n`);
        if (codeFiresOn(adopt, sc.p)) legacy[sc.name] = { since: TODAY(), hash: sceneHash(sc.d) };
      }
    } else {
      for (const sc of scenes) if (RATCHET_RULES[adopt].fails(sc.p, sc.d)) legacy[sc.name] = { since: TODAY(), hash: sceneHash(sc.d) };
    }
    m.rules[adopt] = { adopted: TODAY(), what: (RATCHET_RULES[adopt] || RATCHET_CODES[adopt] && { what: RATCHET_CODES[adopt] }).what, legacy, viaGate: isCode ? gateForCode(adopt) : undefined };
    console.log(`\n  ADOPTED ${adopt} · ${Object.keys(legacy).length} scene(s) grandfathered on ${TODAY()}.`);
  }
  if (stamp) {
    for (const [rule, entry] of Object.entries(m.rules)) {
      const spec = RATCHET_RULES[rule];
      // A code-ratcheted rule prunes through its GATE, not through a predicate. Same rule as above:
      // rows may only leave.
      const fails = spec ? (sc) => spec.fails(sc.p, sc.d) : (RATCHET_CODES[rule] ? (sc) => codeFiresOn(rule, sc.p) : null);
      if (!fails) continue;
      const live = new Map(libraryScenes().map((s) => [s.name, s]));
      for (const name of Object.keys(entry.legacy || {})) {
        const s = live.get(name);
        // Pruning only. A row can leave (the film complied, was edited, or is gone); none can arrive.
        const gone = !s ? 'deleted' : !fails(s) ? 'now complies' : entry.legacy[name].hash !== sceneHash(s.d) ? 'edited since it was grandfathered' : null;
        if (gone) { delete entry.legacy[name]; console.log(`  − ${rule}: ${name} loses legacy status (${gone}).`); }
      }
      entry.stamped = TODAY();
    }
  }
  if (adopt || stamp) fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  console.log(`\n  RATCHET · ${path.relative(repoRoot, MANIFEST)}\n`);
  for (const rule of [...Object.keys(RATCHET_RULES), ...Object.keys(RATCHET_CODES)]) {
    const entry = m.rules[rule];
    if (!entry) { console.log(`  ○ ${rule} · not adopted. It has no legacy set, so it blocks every scene it fires on.`); continue; }
    const c = census(rule, m);
    console.log(`  ${rule} (adopted ${entry.adopted}): ${censusLine(rule, c)}`);
    if (c.new) console.log(`      NEW: ${c.newNames.join(', ')}${c.editedNames.length ? `   (edited since grandfathering: ${c.editedNames.join(', ')})` : ''}`);
  }
  // THE DEBT BOARD. The per-rule lines above answer "is this rule holding?"; this answers the question
  // an author actually has, which is "what should I fix next, and is the pile shrinking?". Without it,
  // grandfathering reads as a permanent amnesty rather than a backlog: the counts only ever appear
  // beside the rule that granted them, never beside the FILM that owes them.
  const owed = new Map();
  for (const [rule, entry] of Object.entries(m.rules)) {
    for (const name of Object.keys(entry.legacy || {})) {
      if (!owed.has(name)) owed.set(name, []);
      owed.get(name).push(rule);
    }
  }
  if (owed.size) {
    const rows = [...owed].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const total = rows.reduce((n, r) => n + r[1].length, 0);
    console.log(`\n  DEBT · ${total} row(s) across ${rows.length} film(s). Not forgiven, just not blocking yet.`);
    console.log(`  Worst first, because fixing one film can clear several rules at once:\n`);
    for (const [name, rules] of rows.slice(0, 12)) {
      console.log(`      ${String(rules.length).padStart(2)}  ${name.padEnd(30)} ${rules.join(' ')}`);
    }
    if (rows.length > 12) console.log(`      … and ${rows.length - 12} more film(s) owing 1 rule each.`);
    console.log(`\n  Pay one off: fix the film, then \`make legacy STAMP=1\` drops its row. Rows can only ever leave.`);
  }
  console.log(`\n  legacy = nobody has looked yet. waived = somebody decided and wrote why. Never the same thing.\n`);
  process.exit(0);
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
if (!file) { console.error('usage: node scripts/gates/author-check.mjs <scene.json> [--strict] [--taste] [--vs <brand>]'); process.exit(2); }
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
// written with the repo's own vocabulary could not pass its own mandatory ladder. core/expand.js now
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
// The ratchet decides the SEVERITY of `no-storyboard` for this one film, and it must be known before the
// ladder prints its own contents: a step that announces itself as a report and then blocks is a liar.
const sbRatchet = ratchetStatus('no-storyboard', file, scene);
const sbCensus = sbRatchet.ratcheted ? census('no-storyboard') : null;
// Same shape, same reason, for the defect that is one tier below "has a plan": has anything been
// CHOREOGRAPHED. Known before the ladder prints itself, because a step that announces itself as a
// report and then blocks is a liar.
const moRatchet = ratchetStatus('no-authored-motion', file, scene);
const moFails = RATCHET_RULES['no-authored-motion'].fails(file, scene);
const moCensus = moRatchet.ratcheted ? census('no-authored-motion') : null;
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
  ['storyboard', sbRatchet.state === 'new' ? 'blocks' : 'reports', 'whether this film has a written plan, and whether the plan holds together'],
  ['beats', 'blocks', 'the clock: dead air, an empty closing frame, a backdrop that cannot move'],
  ['sweep-static', 'reports', 'the RENDERED pixels: did anything move, or is the whole film frozen (needs a render; ratcheted)'],
  ['critique', 'reports', 'beat value: hollow, placeholder, unbacked or thin beats'],
  ['direct', 'reports', 'direction: cut families, effect soup, continuity, and the motion tells'],
  ['floor', 'reports', 'ambition: whether this is a plain slideshow'],
  ['motion', moRatchet.state === 'new' ? 'blocks' : 'reports', 'whether anything in this film is choreographed rather than named'],
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
record('preflight', runGate('preflight', 'preflight (the decisions before the JSON)', 'scripts/gates/preflight.mjs', [], { subject: file }), { waivable: true, tier: 'reports' });
record('validate', runGate('validate', 'validate (schema + em-dash)', 'core/validate.mjs', []), { waivable: false });

// 1a. storyboard, DOES THIS FILM HAVE A PLAN, AND DOES THE PLAN HOLD TOGETHER?
//
// This step exists because the previous answer was a printed sentence and nothing else: plan-vs-render
// said "write the storyboard" to a film that had none, and no step anywhere asked whether one existed.
// Every frontmatter field the storyboard carries (`spectacle:`, `pace:`, `threads:`) was therefore
// optional in the only sense that matters, which is that skipping it cost nothing and said nothing.
//
// SEVERITY, ARGUED. 130 of the 141 scenes in this library have no storyboard. Blocking on day one would
// fail 92% of the library on its first run, and CLAUDE.md already names what happens next: everyone adds
// a waiver and the rule is repealed without anyone writing it down. So `no-storyboard` REPORTS. It is
// promoted to a block when the shape of the library makes that a rule rather than a purge, the
// condition is written into docs/TASTE.md, not left as a wish: once fewer than a quarter of the scenes
// in formats/scene/ are missing a plan, `no-storyboard` moves to the blocking tier.
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
    if (sbCensus) console.log(`      ratchet · no-storyboard: ${censusLine('no-storyboard', sbCensus)}`);
    const excused = allow.has('no-storyboard');
    if (sbRatchet.state === 'legacy') {
      // LEGACY, printed as its own thing. It must never read like a waiver: nobody argued for this film,
      // the rule simply arrived after it did.
      console.log(`      ▪ LEGACY: this film predates the rule (grandfathered ${sbRatchet.since}, adopted ${sbRatchet.adopted}).`);
      console.log(`        That is NOT a waiver. Nobody has looked at this film yet, and no reason is recorded.`);
      console.log(`        Edit this scene and it loses legacy status, and then this finding stops you.`);
      console.log(`  → 1 finding: no-storyboard (legacy, does not block).`);
      results.push({ name: 'storyboard', tier: 'reports', failed: taste && !excused, waived: excused, legacy: !excused, legacySince: sbRatchet.since, reported: !taste && !excused, findings: 1, unwaived: excused ? [] : ['no-storyboard'], blockCodes: ['no-storyboard'] });
    } else if (sbRatchet.state === 'new') {
      console.log(`      ▪ THIS FILM IS NOT GRANDFATHERED${sbRatchet.why === 'edited' ? ` ANY MORE: it held legacy status from ${sbRatchet.since} and has been edited since.` : `: it is not in the legacy manifest.`}`);
      console.log(`        The rule blocks here. Write the plan, or waive it with a reason someone can read:`);
      console.log(`          {"authoring":{"allow":["no-storyboard"],"_why":{"no-storyboard":"…"}}}`);
      console.log(`  → 1 finding: no-storyboard (BLOCKS, this film is new work).`);
      results.push({ name: 'storyboard', tier: 'blocks', failed: !excused, waived: excused, reported: false, findings: 1, unwaived: excused ? [] : ['no-storyboard'], blockCodes: ['no-storyboard'] });
    } else {
      console.log(`  → 1 finding: no-storyboard.`);
      results.push({ name: 'storyboard', tier: 'reports', failed: taste && !excused, waived: excused, reported: !taste && !excused, findings: 1, unwaived: excused ? [] : ['no-storyboard'], blockCodes: ['no-storyboard'] });
    }
  } else {
    console.log(`  plan: ${path.relative(repoRoot, sbPath)}${declaredSb ? ' (declared by the scene)' : ' (found by name)'}`);
    const sbRun = spawnSync('node', [path.join(repoRoot, 'scripts/gates/storyboard-check.mjs'), sbPath], { encoding: 'utf8', cwd: repoRoot });
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
record('beats', runGate('beats', 'beat check (timeline holes)', 'scripts/gates/beat-check.mjs', strict ? ['--strict'] : []), { waivable: true });

// sweep-static. The pixels-moved check, the post-render twin of beats' declared-backdrop check. It reads
// the RENDERED mp4, so before a render it reports "render first" and finds nothing; once rendered, a film
// whose whole timeline is frozen emits [sweep-static], which is ratcheted (RATCHET_CODES) so a NEW frozen
// film blocks while the library is grandfathered. Reports here; the escalation pass below gives it teeth.
record('sweep-static', runGate('sweep-static', 'sweep-static (rendered pixels moved)', 'scripts/gates/sweep-static.mjs', []), { waivable: true, tier: 'reports' });
// 2. critique, value gate; errors report, waivable by rule code.
styleGate('critique', 'critique (value gate)', 'scripts/gates/critique.mjs', strict ? ['--strict'] : [], { waivable: true });
// 3. direct, direction gate; FAILs report, waivable by code.
styleGate('direct', 'direct (direction gate)', 'scripts/author/motion-director.mjs', [], { waivable: true });
// 3b. direction floor. The AMBITION lower bound (inverse of effect-soup): fails a plain slideshow.
styleGate('floor', 'direction floor (ambition)', 'scripts/gates/direction-floor.mjs', strict ? ['--strict'] : [], { waivable: true });

// 3c. AUTHORED MOTION. The floor above measures a VOCABULARY: it counts techniques and clears a film
//     that names three of them. This one asks a narrower question the count cannot reach: did anybody
//     choreograph anything, or was every move selected from a menu. A film can name four techniques,
//     pass the floor, and still be five slides joined by cuts, because `"preset": "up"` is a technique.
//     That is not hypothetical: it is what shipped as this repo's own launch film, and the two films
//     the doctrine argues from fail it in the opposite direction, keying 6 of 8 and 4 of 30 layers.
//     No subprocess: the predicate is fs + JSON, and it already ran for the census.
{
  const relief = moRatchet.state === 'legacy'
    ? `  · grandfathered on ${moRatchet.since}. It reports here and blocks nothing.\n` : '';
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
      + `      Theory and the measurements: docs/CRAFT/KEYED-MOTION.md.\n${relief}`);
    printDocs(['no-authored-motion']);
  } else {
    process.stdout.write(`  → nothing found.\n`);
  }
  record('motion', { code: moFails ? 1 : 0, blockCodes: moFails ? ['no-authored-motion'] : [], findings: moFails ? 1 : 0 },
    { waivable: true, tier: moRatchet.state === 'new' ? 'blocks' : 'reports' });
}

// 4c. dissolve. The TRANSITION gate. Everything else here samples settled frames by construction, so a
//     crossfade between two text states (a double exposure: both strings at half strength through the
//     middle) was invisible to the whole ladder and shipped five times. See MISTAKES #171, #174.
styleGate('dissolve', 'dissolve check (crossfade mud)', 'scripts/gates/dissolve-check.mjs', strict ? ['--strict'] : [], { waivable: true });
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
styleGate('designspec', 'design-spec lock (theme colours + fonts)', 'scripts/gates/designspec-check.mjs', ['--strict'], { waivable: true, exitMeansFail: true });
// 4b2. craft. THE CHECKLIST: every CRAFT doc whose `applies-when:` matches this film must be answered in
// the storyboard's `craft:` map, so an author cannot ship without going through the docs that apply. This
// is the fix for the failure that a huge doc system existed and a film used none of it: it turns the
// relevant docs from something you may read into a checklist the plan carries. scripts/gates/craft-checklist.mjs.
styleGate('craft', 'craft checklist (every relevant CRAFT doc answered)', 'scripts/gates/craft-checklist.mjs', [], { waivable: true, exitMeansFail: true });
// 4c. copy. The WORDS lock: hook length / weak opener, marketing jargon, restated headlines, flat numbers.
styleGate('copy', 'copy gate (on-screen writing)', 'scripts/gates/copy-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
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
styleGate('read', 'read gate (can a viewer read it in time)', 'scripts/gates/read-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// PACE. A still film is sometimes right, so this reports rather than blocks. What it is NOT is a matter
// of opinion: two films authored as a deliberate improvement came out slower than the one they replaced,
// measured, and the only thing that noticed was a census run by hand afterwards (docs/MISTAKES.md #336).
styleGate('pace', 'pace (is anything happening, and how often)', 'scripts/gates/pace-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// EYE-TRACE. Murch ranks it fourth of six at 7% and says to sacrifice upward from the bottom, so a cut
// that serves the story may fairly cost the eye a journey. It reports for that reason, not because the
// measurement is weak. Know two limits before you act on it. The focal point is scored from the JSON,
// so a layer whose colour is a color-mix or a gradient cannot be read: those are dropped and the count
// prints on every verdict, never defaulted to zero. And a side holding ONE live layer is marked, because
// a layer can win by being alone. The first false positive found was a corner watermark scoring 43%
// across an 0.8s hole, where the real defect is dead air and `beats` owns it.
styleGate('eye', 'eye-trace (where the viewer is looking at each cut)', 'scripts/gates/eye-trace.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
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
// of gate-visible scenes are silent without a reason: `node scripts/gates/audio-check.mjs --all`.
styleGate('sound', 'sound gate (is the silence a decision)', 'scripts/gates/audio-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// 4d. assets. The READINESS preflight: every referenced image/icon/capture/vo actually exists on disk.
{ const r = runGate('assets', 'asset preflight (referenced files exist)', 'scripts/gates/asset-check.mjs', strict ? ['--strict'] : []); record('assets', r, { waivable: true, exitMeansFail: strict }); }

// 4g. hero fill. The one LAYOUT finding that can be moved before the render.
//
// WHY IT WAS LATE. `thin-hero` lives in verify/audit.mjs, which runs under `make audit` after the mp4
// exists, so a hero line set at web scale was reported once the render had been paid for. Every other
// rule in that file needs the rendered page for a reason this one shares: it measures INK width, and the
// declared `w` is not the ink. The audit says so in its own comment, with the numbers: the boxes are
// about right (70% median) and the glyphs fill 67.5% of them, so a static check on `w` would call the
// library healthy and report nothing. A weaker approximation would therefore not be a rougher version
// of this finding, it would be a different and mostly silent one, and a gate that is quiet where the
// real check is loud is worse than the documented absence.
//
// So the PAGE moves earlier, not the rule. `verify/audit.mjs --hero` runs the same browser, the same
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
  runGate('hero', 'hero fill (thin-hero, pre-render)', 'verify/audit.mjs', ['--hero'], { slow: true });
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
runGate('drift', 'waiver drift (is this a decision or a habit)', 'scripts/gates/waiver-drift.mjs', []);

// 5. inspect. The per-beat value contract. inspect.mjs silently passes when no sidecar exists; here
//    we make that ABSENCE visible as a WARN so the value contract is a choice, not an accident.
const sidecar = sidecarPath;
// Hand the storyboard to plan-vs-render explicitly. It resolves one by name on its own, but a scene that
// DECLARES its plan should have that declaration honoured, and only this step knows what was declared.
const planArgs = [...(strict ? ['--strict'] : []), ...(sbPath ? ['--sb', sbPath] : [])];
if (hasSidecar) {
  record('inspect', runGate('inspect', 'inspect (per-beat value contract)', 'scripts/gates/inspect.mjs', strict ? ['--strict'] : []), { waivable: true });
  // 5b. plan vs render, inspect reads the scene at ONE instant per beat, so it cannot see a beat that
  //     stalls. This one lines the plan's beat spans up against the film's clock: a promised junction
  //     with no event at it, and a beat the author froze while the plan says it turns.
  record('plan', runGate('plan', 'plan vs render (does the film do what the plan said)', 'scripts/gates/plan-vs-render.mjs', planArgs), { waivable: true });
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
  runGate('plan', 'plan vs render (no sidecar, so: does the film nominate a peak)', 'scripts/gates/plan-vs-render.mjs', planArgs);
}

// ---- verdict ----
const failed = results.filter((r) => r.failed);
const waivers = results.filter((r) => r.waived);
console.log(`\n════════ author-check · ${path.basename(file)} ════════`);
// TWO KINDS OF FINDING, and reading them as one list is why NOCHECK=1 looks like it skips safety.
// `validate` runs the SAME validator the engine runs at boot (core/boot.js imports validateAll), and
// every vocabulary registry throws during layer build. Those cannot be skipped by anything: a scene
// that fails them will not render, with or without this target. Everything else here is this target's
// own judgement about craft, and the engine will happily render a film that fails all of it.
// docs/MISTAKES.md #379.
const ENGINE_REFUSES = new Set(['validate']);
// FOUR MARKS, NOT THREE. `○ waived` and `▪ legacy` must never be the same glyph or the same sentence:
// one says a person decided and wrote why, the other says nobody has looked. Collapse them and legacy
// becomes a silent waiver, which is how a rule gets repealed with nobody writing it down.
const line = (r) => {
  const mark = r.failed ? '✗' : r.waived ? '○' : r.legacy ? '▪' : r.reported ? '~' : '✓';
  const note = r.failed ? `BLOCKS (${r.unwaived.join(', ') || 'exit ' + 1})`
    : r.waived ? `waived (${r.blockCodes.join(', ')}) · somebody decided, and said why`
    : r.legacy ? `LEGACY (${r.blockCodes.join(', ')}, grandfathered ${r.legacySince}) · nobody has looked yet`
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
const legacies = results.filter((r) => r.legacy);
if (legacies.length) {
  console.log(`  (▪ legacy comes from ${path.relative(repoRoot, MANIFEST)} · the rule arrived after the film did.`);
  console.log(`   No reason is recorded anywhere because nobody has made one. Edit the film and it blocks.)`);
}
if (sbCensus) {
  console.log(`\n  ratchet · no-storyboard: ${censusLine('no-storyboard', sbCensus)}`);
  const names = censusBlind ? [] : censusNames(sbCensus);
  if (names.length) {
    const edited = new Set(sbCensus.editedNames);
    console.log(`    the ${names.length} NEW failure(s): these block their own author-check run, not this one:`);
    for (const n of names) console.log(`      ${n}${edited.has(n) ? '  (was legacy, edited since)' : ''}`);
  }
}
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

// ---- STRICTNESS, per code, decided from what already ran -----------------------------------------
// A ratcheted code blocks a film that is NOT grandfathered for it, whatever tier its step sits in. This
// re-runs nothing: every code below came out of a gate that already ran in the ladder above, so the
// cost of maximum strictness on the hot path is a manifest lookup.
//
// A waiver still works, and is the point. Legacy says nobody has looked; a waiver says somebody looked,
// decided the rule is wrong for THIS film, and wrote why. The second is a decision a person can argue
// with later, which is the only reason to make a rule strict at all.
{
  const seen = new Map();
  for (const r of results) for (const c of [...(r.blockCodes || []), ...(r.warnCodes || [])]) {
    if (RATCHET_CODES[c] && !seen.has(c)) seen.set(c, r.name);
  }
  // A DERIVATIVE CANNOT OWE THIS DEBT. `scripts/lib/census.mjs` excludes generated siblings
  // (.beatsync/.expanded/.animatic/.captioned/.directed/.intent) from the library, so the adopt pass
  // never saw them and no legacy row can exist for one. Ratcheting them anyway made every derivative
  // permanently "new", which is a population mismatch, not a finding: you would fix the SOURCE. Found
  // by sweeping the library after the wave, where it was the only newly-blocked file of 140.
  const inLibrary = LIBRARY(path.basename(file), file);
  const blocked = [], grandfathered = [];
  for (const [c, step] of seen) {
    if (!inLibrary) continue;
    if (allow.has(c)) continue;                       // waived, with a `_why` the always-on half checks
    const st = ratchetStatus(c, file, scene);
    if (!st.ratcheted) continue;                      // not adopted yet: it is still only a report
    (st.state === 'legacy' ? grandfathered : blocked).push([c, step, st]);
  }
  // LEGACY IS A DEBT, AND IT IS PRINTED LIKE ONE. A grandfathered rule that passes quietly is
  // indistinguishable from a rule nobody has, which is the repeal-by-silence this whole mechanism
  // exists to prevent. So it warns, every run, names what this film owes, and says what paying it
  // costs. Nothing is excused for life: the row leaves the manifest the moment the film complies.
  if (grandfathered.length) {
    console.log(`\n  ⚠ THIS FILM OWES ${grandfathered.length} rule(s). Grandfathered, not forgiven, and not blocking today:`);
    for (const [c, step, st] of grandfathered) {
      console.log(`      [${c}] (step ${step}) · owed since ${st.since}`);
      const d = docFor(c); if (d) console.log(`          read: ${d}`);
    }
    console.log(`      Fix one and the row disappears: make legacy STAMP=1. Edit the film without fixing it and it BLOCKS.`);
  }
  if (blocked.length) {
    console.log(`\n  ✗ ${blocked.length} ratcheted rule(s) BLOCK this film. They are not new rules: they are the`);
    console.log(`    house-style findings above, made binding for work written after they were adopted.`);
    for (const [c, step, st] of blocked) {
      console.log(`      [${c}] (step ${step}) · adopted ${st.adopted}${st.why === 'edited' ? `, and this film lost its legacy status when it was edited` : ''}`);
      const d = docFor(c); if (d) console.log(`          read: ${d}`);
    }
    console.log(`\n    Fix them, or decide against one in the scene and say why:`);
    console.log(`      "authoring": { "allow": ["${blocked[0][0]}"], "_why": { "${blocked[0][0]}": "…" } }`);
    for (const [c, step] of blocked) results.push({ name: `strict:${c}`, tier: 'blocks', failed: true, waived: false, reported: false, findings: 0, unwaived: [c], blockCodes: [c], warnCodes: [] });
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
