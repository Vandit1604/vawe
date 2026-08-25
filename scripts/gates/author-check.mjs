// scripts/gates/author-check.mjs — THE MANDATORY AUTHORING-QUALITY LADDER.
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
//   BLOCKS  — the film is broken. A schema error, a hole in the clock, a plan the render does not deliver.
//   REPORTS — the film may be off the house style. Always printed, never a wall, promoted by TASTE=1.
// Measured before this was written: turning the REPORTS half into blocks fails 116 of the 141 scenes in
// this library, four films in five, which is the exact shape CLAUDE.md warns about — a rule waived by
// reflex has already been repealed and nobody wrote it down. So the steps became mandatory and the
// severities did not move. See docs/TASTE.md · "One process, two severities".
//
// BLOCKS:
//   validate  — schema + em-dash (correctness; never waivable)
//   beats     — the TIMELINE gate: dead air, an empty last frame, an empty cut/seam window, a dead backdrop
//   assets    — the READINESS preflight: every referenced image/icon/capture/vo exists on disk (STRICT only)
//   inspect   — the per-beat value contract, if a .intent.json sidecar exists (absent → visible WARN)
//   plan      — plan vs render, off the same sidecar
//
// REPORTS (always run and always print; TASTE=1 gives them teeth):
//   storyboard— is there a plan this film came from, and does the plan hold together
//   critique  — the value gate: hollow/placeholder/unbacked/thin/mis-centre beats
//   direct    — the direction gate: cut families, effect-soup, continuity, pacing, and the book-grounded
//               motion tells (linear-motion, monotone-timing, enter-and-retreat)
//   floor     — the AMBITION floor (inverse of effect-soup): fails a plain slideshow (no kinetic type,
//               no camera, no transitions). Directed lives BETWEEN soup and slideshow.
//   dissolve  — the TRANSITION gate: two text states cross-dissolved in place
//   designspec— the LOOK lock: off-palette colours / non-role fonts vs the theme
//   copy      — the WORDS lock: hook/jargon/restatement/flat-number tells in on-screen text
//   pace      — is anything happening, and how often
//   hero      — the one LAYOUT finding that can run pre-render: `thin-hero`, via verify/audit.mjs --hero.
//               Landscape only, and it costs a browser launch (1.4s measured), so it announces the cost
//               before it pays it. Portrait films are told the rule has nothing to say about them.
//   treatment — is the film's written rationale current with its storyboard
//   drift     — how many other films excuse the same waiver
//
// `visual-vocabulary` used to sit here and was DELETED, not moved: its size measurement squared a
// single-axis layer, so a 590x18 underline was scored as 590x590 and passed a blocking gate whose only
// job was to catch exactly that. See docs/TASTE.md and docs/MISTAKES.md.
//
// The vision judge (docs/JUDGE.md) is NOT run here: it needs the rendered mp4, so it is a post-render
// step. A deterministic script also cannot force an agent to judge honestly. So the ladder ends by
// printing the REQUIRED post-render judge step — author-check being green is necessary, not sufficient.
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
import { execFileSync, spawnSync } from 'node:child_process';
import { sceneDims } from '../../core/safe.js';
import { population } from '../lib/census.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- THE RATCHET ------------------------------------------------------------------------------------
//
// A rule that is right and new fails the whole library on its first run. `no-storyboard` fires on 88 of
// the 132 scenes here. Both of the obvious answers are worse than the red:
//   BACKFILL — write 88 storyboards to satisfy a gate. For a judgement rule that produces 88 fake plans,
//              the number goes green and nobody learns anything.
//   WAIT     — "promote it when under a quarter are missing" leaves the rule toothless for months and
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
// today's film by re-running the stamp — which is the only way a ratchet stays a ratchet.
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
// `fails` must be CHEAP and PURE — fs and JSON, nothing else. The census runs it over every scene in the
// library on every author-check run, so a probe that launched a browser would cost 132 browsers. A rule
// whose finding only exists after a child gate has run cannot be ratcheted this way, and should not be:
// its census would go stale between runs, which is #159.
const RATCHET_RULES = {
  'no-storyboard': {
    what: 'the film has a written plan (a storyboard, declared or found beside it)',
    fails: (sceneFile, sceneJson) => !resolveStoryboard(sceneFile, sceneJson).path,
  },
};

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
// and print a confident number (docs/MISTAKES.md #377). `quiet` because censusLine below is the line that
// states N, and two counts of the same thing is how they drift apart.
//
// SOFT, not fatal, and the distinction is the point. This census is DISPLAY: it tells an author how many
// other films the rule reaches. The ladder's verdict about the film in front of them does not depend on
// it, so a bare worktree must still be able to run author-check. It prints the reason it cannot count
// instead of a number, which is the whole ask — say what you looked at, and say when you could not look.
let censusBlind = null;
const libraryScenes = () => {
  const pop = population('ratchet census', {
    filter: (f) => f.endsWith('.json') && !/\.(animatic|intent|expanded|beatsync|captioned|directed)\./.test(f) && f !== 'schema.json',
    quiet: true,
    soft: true,
  });
  censusBlind = pop.blind;
  return pop.names
  .map((f) => path.join(SCENE_DIR, f))
  .map((p) => { try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return d?.module === 'scene' ? { p, d, name: path.basename(p, '.json') } : null; } catch { return null; } })
  .filter(Boolean);
};

// One scene, one rule: legacy / new / current. `edited` is reported separately from `absent` because they
// are different arguments — one film was never looked at, the other was looked at this week.
function ratchetStatus(rule, sceneFile, sceneJson, manifest = readManifest()) {
  const spec = RATCHET_RULES[rule];
  const entry = manifest.rules?.[rule];
  if (!spec || !entry) return { ratcheted: false, state: 'current' };
  if (!spec.fails(sceneFile, sceneJson)) return { ratcheted: true, adopted: entry.adopted, state: 'current' };
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
    const st = ratchetStatus(rule, s.p, s.d, manifest);
    if (st.state === 'legacy') c.legacy++;
    else if (st.state === 'new') { c.new++; c.newNames.push(s.name); if (st.why === 'edited') c.editedNames.push(s.name); }
    else c.current++;
  }
  return c;
}
const censusLine = (rule, c) => censusBlind
  ? `NOT COUNTED — this checkout cannot see the library:\n      ${censusBlind.replace(/\n\s+/g, '\n      ')}`
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
    if (!RATCHET_RULES[adopt]) { console.error(`✗ ${adopt} is not a ratcheted rule. Known: ${Object.keys(RATCHET_RULES).join(', ')}`); process.exit(2); }
    if (m.rules[adopt]) { console.error(`✗ ${adopt} was already adopted on ${m.rules[adopt].adopted}. A ratchet only tightens: re-adopting would grandfather today's films, which is the one thing this mechanism exists to prevent.`); process.exit(2); }
    const legacy = {};
    for (const s of libraryScenes()) if (RATCHET_RULES[adopt].fails(s.p, s.d)) legacy[s.name] = { since: TODAY(), hash: sceneHash(s.d) };
    m.rules[adopt] = { adopted: TODAY(), what: RATCHET_RULES[adopt].what, legacy };
    console.log(`\n  ADOPTED ${adopt} · ${Object.keys(legacy).length} scene(s) grandfathered on ${TODAY()}.`);
  }
  if (stamp) {
    for (const [rule, entry] of Object.entries(m.rules)) {
      const spec = RATCHET_RULES[rule];
      if (!spec) continue;
      const live = new Map(libraryScenes().map((s) => [s.name, s]));
      for (const name of Object.keys(entry.legacy || {})) {
        const s = live.get(name);
        // Pruning only. A row can leave (the film complied, was edited, or is gone); none can arrive.
        const gone = !s ? 'deleted' : !spec.fails(s.p, s.d) ? 'now complies' : entry.legacy[name].hash !== sceneHash(s.d) ? 'edited since it was grandfathered' : null;
        if (gone) { delete entry.legacy[name]; console.log(`  − ${rule}: ${name} loses legacy status (${gone}).`); }
      }
      entry.stamped = TODAY();
    }
  }
  if (adopt || stamp) fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  console.log(`\n  RATCHET · ${path.relative(repoRoot, MANIFEST)}\n`);
  for (const rule of Object.keys(RATCHET_RULES)) {
    const entry = m.rules[rule];
    if (!entry) { console.log(`  ○ ${rule} · not adopted. It has no legacy set, so it blocks every scene it fires on.`); continue; }
    const c = census(rule, m);
    console.log(`  ${rule} (adopted ${entry.adopted}): ${censusLine(rule, c)}`);
    if (c.new) console.log(`      NEW: ${c.newNames.join(', ')}${c.editedNames.length ? `   (edited since grandfathering: ${c.editedNames.join(', ')})` : ''}`);
  }
  console.log(`\n  legacy = nobody has looked yet. waived = somebody decided and wrote why. Never the same thing.\n`);
  process.exit(0);
}

const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
// ITERATE MODE: same gates, same findings, no consequence. While a film is still being explored, a
// blocking gate does not save time, it breaks the loop — you stop to fix or waive something you were
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
// reason on every single one — and that difference is exactly the difference between a rule people
// argue with and a keyword that makes a gate stop talking (docs/MISTAKES.md #203).
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

// Blocks and comps are BUILD-TIME sugar: `validate` rejects an un-expanded one outright, and every gate
// that walks layers sees `{type:"block"}` as one opaque thing rather than the chart it becomes. So a scene
// written with the repo's own vocabulary could not pass its own mandatory ladder: the source failed
// validate, and the `.expanded.json` is a derivative some gates skip by name. Neither file could be
// green. Expand to a temp that keeps the BASENAME (receipts and theme resolution key off it) and is not
// named `.expanded` (so nothing skips it), then gate that.
let target = file;
const hasSugar = (L) => Array.isArray(L) && L.some((l) => l && (l.type === 'block' || l.type === 'comp' || hasSugar(l.children)));
if (hasSugar(scene.layers)) {
  const dir = path.join('/tmp/.author-check', String(process.pid));
  fs.mkdirSync(dir, { recursive: true });
  target = path.join(dir, path.basename(file));
  execFileSync('node', [path.join(repoRoot, 'scripts/author/expand-blocks.mjs'), file, target], { cwd: repoRoot, stdio: 'ignore' });
  console.log(`  (block/comp sugar expanded for the gates → ${target}; findings refer to ${path.basename(file)})`);
}

// ---- WHERE THE STORYBOARD COMES FROM ----------------------------------------------------------------
// A scene declares its plan one of two ways, and the explicit one wins:
//   1. `"storyboard": "path/to/x.storyboard.md"` in the scene JSON, relative to the repo root or to the
//      scene. This is the declaration: it survives a rename and it says out loud that a plan exists.
//   2. the naming convention already used by plan-vs-render — <base>.storyboard.md beside the scene, or
//      in _concepts/ next to it.
// A scene with neither is not silently fine. It gets a finding (`no-storyboard`), because the alternative
// is what this ladder used to do: print "write the storyboard" into a void and check nothing.
const sbBase = path.basename(file, '.json');
const { declared: declaredSb, candidates: sbCandidates, path: sbPath } = resolveStoryboard(file, scene);
// The ratchet decides the SEVERITY of `no-storyboard` for this one film, and it must be known before the
// ladder prints its own contents: a step that announces itself as a report and then blocks is a liar.
const sbRatchet = ratchetStatus('no-storyboard', file, scene);
const sbCensus = sbRatchet.ratcheted ? census('no-storyboard') : null;
const sidecarPath = file.replace(/\.json$/, '.intent.json');
const hasSidecar = fs.existsSync(sidecarPath);
const [sceneW, sceneH] = sceneDims(scene, '');
const landscape = sceneW > sceneH;

// ---- THE LADDER, DECLARED BEFORE IT RUNS -------------------------------------------------------------
// A person watching this needs to know where it is and what is left. So the whole run is listed first,
// with what each step reads and whether it can stop you, and every step then announces its own position.
const LADDER = [
  ['validate', 'blocks', 'the schema, the vocabulary, and em-dashes in on-screen text'],
  ['storyboard', sbRatchet.state === 'new' ? 'blocks' : 'reports', 'whether this film has a written plan, and whether the plan holds together'],
  ['beats', 'blocks', 'the clock: dead air, an empty closing frame, a backdrop that cannot move'],
  ['critique', 'reports', 'beat value: hollow, placeholder, unbacked or thin beats'],
  ['direct', 'reports', 'direction: cut families, effect soup, continuity, and the motion tells'],
  ['floor', 'reports', 'ambition: whether this is a plain slideshow'],
  ['dissolve', 'reports', 'transitions: two text states cross-dissolved into mud'],
  ['designspec', 'reports', 'the look lock: colours off the theme palette, fonts outside its roles'],
  ['copy', 'reports', 'the words: weak hook, jargon, a restated headline, a number set flat'],
  ['read', 'reports', 'whether a viewer can read each line in the seconds it is on screen'],
  ['pace', 'reports', 'whether anything happens, and how often'],
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

// run one gate as a child; stream its output; return {code, blockCodes}. A "blocking" finding is a line
// the gate marks with ✗ and a [code] tag (critique errors, direct FAILs use exactly this format).
const runGate = (name, label, script, args, opts = {}) => {
  openStep(name, label, opts);
  // spawnSync, not execFileSync: a gate that PASSES can still print a warning, and it prints it to
  // stderr, which execFileSync throws away on success. That is how a step with a visible ⚠ above it
  // could summarise itself as "nothing found".
  const r = spawnSync('node', [path.join(repoRoot, script), target, ...args], { encoding: 'utf8', cwd: repoRoot });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const code = r.status ?? 1;
  process.stdout.write(out.endsWith('\n') ? out : out + '\n');
  const blockCodes = [...out.matchAll(/✗\s*\[([a-z0-9-]+)\]/gi)].map((m) => m[1]);
  // A STEP THAT FINDS NOTHING MUST SAY SO. Silence and a clean run look identical in a log, and a person
  // reading this cannot tell a gate that passed from a gate that fell over.
  const findings = (out.match(/^\s*[✗~⚠]/gm) || []).length;
  process.stdout.write(findings === 0 && code === 0
    ? `  → nothing found.\n`
    : `  → ${findings} finding(s)${blockCodes.length ? `: ${[...new Set(blockCodes)].join(', ')}` : ''}.\n`);
  return { code, out, blockCodes, findings };
};

const results = [];
// tier decides what a finding COSTS, and it is the only thing TASTE=1 moves. `reports` steps still run,
// still print and still land in the verdict table; they simply cannot fail the build unless asked to.
const record = (name, { code, blockCodes, findings = 0 }, { waivable, exitMeansFail = true, tier = 'blocks' }) => {
  const teeth = tier === 'blocks' || taste;
  const failed = exitMeansFail && teeth ? code !== 0 : false;
  // if the gate failed only on findings the scene explicitly allows, downgrade to a waiver.
  const unwaived = waivable ? blockCodes.filter((c) => !allow.has(c)) : blockCodes;
  const waived = waivable && failed && blockCodes.length > 0 && unwaived.length === 0;
  const reported = tier === 'reports' && !teeth && code !== 0;
  results.push({ name, tier, failed: failed && !waived, waived, reported, findings, unwaived, blockCodes });
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

// 1. validate — correctness, never waivable.
record('validate', runGate('validate', 'validate (schema + em-dash)', 'core/validate.mjs', []), { waivable: false });

// 1a. storyboard — DOES THIS FILM HAVE A PLAN, AND DOES THE PLAN HOLD TOGETHER?
//
// This step exists because the previous answer was a printed sentence and nothing else: plan-vs-render
// said "write the storyboard" to a film that had none, and no step anywhere asked whether one existed.
// Every frontmatter field the storyboard carries (`spectacle:`, `pace:`, `threads:`) was therefore
// optional in the only sense that matters, which is that skipping it cost nothing and said nothing.
//
// SEVERITY, ARGUED. 130 of the 141 scenes in this library have no storyboard. Blocking on day one would
// fail 92% of the library on its first run, and CLAUDE.md already names what happens next: everyone adds
// a waiver and the rule is repealed without anyone writing it down. So `no-storyboard` REPORTS. It is
// promoted to a block when the shape of the library makes that a rule rather than a purge — the
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

// 1b. beats — the TIMELINE gate: dead air, an empty closing plate, a transition window with nothing in it,
//     a backdrop that structurally cannot move. Every other gate reads the scene as a bag of layers; this
//     one walks the clock. Blocking, waivable by code.
record('beats', runGate('beats', 'beat check (timeline holes)', 'scripts/gates/beat-check.mjs', strict ? ['--strict'] : []), { waivable: true });
// 2. critique — value gate; errors report, waivable by rule code.
styleGate('critique', 'critique (value gate)', 'scripts/gates/critique.mjs', strict ? ['--strict'] : [], { waivable: true });
// 3. direct — direction gate; FAILs report, waivable by code.
styleGate('direct', 'direct (direction gate)', 'scripts/author/motion-director.mjs', [], { waivable: true });
// 3b. direction floor — the AMBITION lower bound (inverse of effect-soup): fails a plain slideshow.
styleGate('floor', 'direction floor (ambition)', 'scripts/gates/direction-floor.mjs', strict ? ['--strict'] : [], { waivable: true });

// 4c. dissolve — the TRANSITION gate. Everything else here samples settled frames by construction, so a
//     crossfade between two text states (a double exposure: both strings at half strength through the
//     middle) was invisible to the whole ladder and shipped five times. See MISTAKES #171, #174.
styleGate('dissolve', 'dissolve check (crossfade mud)', 'scripts/gates/dissolve-check.mjs', strict ? ['--strict'] : [], { waivable: true });
// 4. slop — RETIRED 2026-08. It ran 41 borrowed rules over a DOM dump carrying three of the CSS
// properties those rules read, so most of them had no evidence to work from and their silence read as
// a pass across the whole library (docs/MISTAKES.md #326). Its replacement is the designspec rule
// table, which runs in the gate below. The vendored detector is still the right tool for a hand-authored
// FRAGMENT, where it gets real computed styles — `make preview HTML=<file>` still runs it.
// 4b. designspec — the LOOK lock (visual twin of the storyboard): off-palette colours / non-role fonts. TASTE.
// BLOCKS under TASTE, not just under STRICT. It was a warning, and across two films it named the exact
// drift ("#8fdcff is 17% from anything in the palette") and I read it and shipped anyway — twice. A
// gate whose finding is precise and whose severity is advisory teaches the author that warnings are
// decoration. Every scene in the library passes it: the seven that are legitimately off the brand say
// so per-scene, with a reason, in {"authoring":{"allow":["off-colour"]}} (docs/MISTAKES.md #323).
styleGate('designspec', 'design-spec lock (theme colours + fonts)', 'scripts/gates/designspec-check.mjs', ['--strict'], { waivable: true, exitMeansFail: true });
// 4c. copy — the WORDS lock: hook length / weak opener, marketing jargon, restated headlines, flat numbers.
styleGate('copy', 'copy gate (on-screen writing)', 'scripts/gates/copy-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// 4d. read — the CLOCK lock, and it is the half `copy` cannot see. `copy` grades the LINE: its length,
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
// measured, and the only thing that noticed was a census run by hand afterwards (docs/MISTAKES.md #322).
styleGate('pace', 'pace (is anything happening, and how often)', 'scripts/gates/pace-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// 4d. assets — the READINESS preflight: every referenced image/icon/capture/vo actually exists on disk.
{ const r = runGate('assets', 'asset preflight (referenced files exist)', 'scripts/gates/asset-check.mjs', strict ? ['--strict'] : []); record('assets', r, { waivable: true, exitMeansFail: strict }); }

// 4g. hero fill — the one LAYOUT finding that can be moved before the render.
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

// 4e. treatment — the film's own rationale. It REPORTS, always: a treatment is an argument a person
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
    console.log(`    Re-run \`make treatment SB=${sbPath}\` — it refreshes the measured block and leaves your prose.`);
    console.log(`  → 1 finding: the rationale describes an older plan.`);
  } else {
    console.log(`  ✓ treatment current (${t.receipt.treatment || 'recorded'}).`);
    console.log(`  → nothing found.`);
  }
}

// 4f. waiver drift — is this waiver a decision or a habit? REPORTS, and never blocks, because a gate
//     that blocked on this would itself be waived. It reads the whole library and reports how many other
//     films excuse the same rule, which is the only level at which "we keep letting ourselves off" is
//     visible. Written after a gate blocked two films on the same day and the second one was waived.
runGate('drift', 'waiver drift (is this a decision or a habit)', 'scripts/gates/waiver-drift.mjs', []);

// 5. inspect — the per-beat value contract. inspect.mjs silently passes when no sidecar exists; here
//    we make that ABSENCE visible as a WARN so the value contract is a choice, not an accident.
const sidecar = sidecarPath;
// Hand the storyboard to plan-vs-render explicitly. It resolves one by name on its own, but a scene that
// DECLARES its plan should have that declaration honoured, and only this step knows what was declared.
const planArgs = [...(strict ? ['--strict'] : []), ...(sbPath ? ['--sb', sbPath] : [])];
if (hasSidecar) {
  record('inspect', runGate('inspect', 'inspect (per-beat value contract)', 'scripts/gates/inspect.mjs', strict ? ['--strict'] : []), { waivable: true });
  // 5b. plan vs render — inspect reads the scene at ONE instant per beat, so it cannot see a beat that
  //     stalls. This one lines the plan's beat spans up against the film's clock: a promised junction
  //     with no event at it, and a beat the author froze while the plan says it turns.
  record('plan', runGate('plan', 'plan vs render (does the film do what the plan said)', 'scripts/gates/plan-vs-render.mjs', planArgs), { waivable: true });
} else {
  openStep('inspect', 'inspect (per-beat value contract)');
  process.stdout.write(`  ⚠ no .intent.json sidecar — this scene declares no per-beat value contract.\n` +
    `      A sidecar states, per beat, the artifact that earns the frame + what must show/animate;\n` +
    `      inspect then verifies the render delivers it. Add ${path.basename(sidecar)} to make value checkable.\n` +
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
// docs/MISTAKES.md #365.
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
    // this line read "nothing found" directly under three ⚠ findings and the summary — the part people
    // actually read — erased them. Exit code is the verdict; the finding count is the evidence, and the
    // table has to carry both or it contradicts the transcript above it.
    : r.findings > 0 ? `${r.findings} finding(s) above, none blocking`
    : 'nothing found';
  console.log(`  ${mark} ${r.name.padEnd(10)} ${note}`);
};
const refusals = results.filter((r) => ENGINE_REFUSES.has(r.name));
const judgements = results.filter((r) => !ENGINE_REFUSES.has(r.name));
if (refusals.length) {
  console.log('\n  THE ENGINE WOULD REFUSE THIS — not skippable, NOCHECK=1 included:');
  refusals.forEach(line);
}
if (judgements.length) {
  console.log('\n  CRAFT JUDGEMENTS — this target\'s opinion; the engine renders these regardless:');
  judgements.forEach(line);
}
if (waivers.length) console.log(`  (waivers come from "authoring.allow" in the scene — deliberate rule breaks)`);
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
    console.log(`    the ${names.length} NEW failure(s) — these block their own author-check run, not this one:`);
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
console.log(`      If your eye catches a flaw, it is a FIX — never ship one you noticed. See docs/JUDGE.md.`);

if (failed.length) {
  if (iterate) {
    console.log(`\n~ iterating: ${failed.map((r) => r.name).join(', ')} WOULD block at ship. Nothing stopped here.`);
    console.log(`  Run \`make ship D=${file}\` when you want the ladder to mean something.\n`);
    process.exit(0);
  }
  console.log(`\n✗ author-check FAILED: ${failed.map((r) => r.name).join(', ')}. Fix, or waive a deliberate break via {"authoring":{"allow":[...]}}. ${strict ? '(--strict: warnings also block.)' : ''}\n`);
  process.exit(1);
}
console.log(`\n✓ author-check passed${waivers.length ? ` (${waivers.length} waived)` : ''}. Static ladder green — now do the judge step above before shipping.\n`);
process.exit(0);
