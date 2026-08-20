// scripts/gates/author-check.mjs — THE MANDATORY AUTHORING-QUALITY LADDER.
//
// The static quality gates existed but were opt-in and mostly WARN-tier, so a maximal "effect-soup"
// video passed everything the render flow actually ran (only schema + purity were mandatory). This one
// command chains them so `make video` can REQUIRE the loop (it runs author-check unless NOCHECK=1).
// See docs/MISTAKES.md (authoring-gates-were-optional) and docs/CRAFT/DIRECTION.md.
//
// The ladder (all PRE-render, so it can gate the render). It has two halves, and the split is whether a
// step can be WRONG about a film it has never seen:
//
// ALWAYS ON — these catch BROKEN, and cost about a second:
//   validate  — schema + em-dash (correctness; never waivable)
//   beats     — the TIMELINE gate: dead air, an empty last frame, an empty cut/seam window, a dead backdrop
//   assets    — the READINESS preflight: every referenced image/icon/capture/vo exists on disk (advisory)
//   inspect   — the per-beat value contract, if a .intent.json sidecar exists (absent → visible WARN)
//   plan      — plan vs render, off the same sidecar
//
// OPT-IN, behind TASTE=1 (or --taste) — these check HOUSE STYLE, which is an argument, not a fact:
//   critique  — the value gate: hollow/placeholder/unbacked/thin/mis-centre beats
//   direct    — the direction gate: cut families, effect-soup, continuity, pacing, and the book-grounded
//               motion tells (linear-motion, monotone-timing, enter-and-retreat)
//   floor     — the AMBITION floor (inverse of effect-soup): fails a plain slideshow (no kinetic type,
//               no camera, no transitions). Directed lives BETWEEN soup and slideshow.
//   dissolve  — the TRANSITION gate: two text states cross-dissolved in place
//   designspec— the LOOK lock: off-palette colours / non-role fonts vs the theme
//   copy      — the WORDS lock: hook/jargon/restatement/flat-number tells in on-screen text
//   hero      — the one LAYOUT finding that can run pre-render: `thin-hero`, via verify/audit.mjs --hero.
//               Landscape only, advisory, and it costs a browser launch (1.4s measured). A landscape film
//               that skips it is TOLD it was skipped and where the check otherwise happens.
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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReceipt } from '../lib/receipt.mjs';
import { execFileSync } from 'node:child_process';
import { sceneDims } from '../../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
// ITERATE MODE: same gates, same findings, no consequence. While a film is still being explored, a
// blocking gate does not save time, it breaks the loop — you stop to fix or waive something you were
// about to rewrite anyway. Measured, the whole static ladder costs about a second against an 8s draft
// render, so the cost was never the runtime; it was being interrupted. So iterate reports everything
// and exits 0, and says plainly what WOULD block, while ship keeps the teeth.
const iterate = process.argv.includes('--iterate') || process.env.MODE === 'iterate';
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

// run one gate as a child; stream its output; return {code, blockCodes}. A "blocking" finding is a line
// the gate marks with ✗ and a [code] tag (critique errors, direct FAILs use exactly this format).
const runGate = (label, script, args) => {
  process.stdout.write(`\n──────── ${label} ────────\n`);
  let out = '', code = 0;
  try { out = execFileSync("node", [path.join(repoRoot, script), target, ...args], { encoding: 'utf8', cwd: repoRoot }); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  process.stdout.write(out.endsWith('\n') ? out : out + '\n');
  const blockCodes = [...out.matchAll(/✗\s*\[([a-z0-9-]+)\]/gi)].map((m) => m[1]);
  return { code, out, blockCodes };
};

const results = [];
const record = (name, { code, blockCodes }, { waivable, exitMeansFail = true }) => {
  const failed = exitMeansFail ? code !== 0 : false;
  // if the gate failed only on findings the scene explicitly allows, downgrade to a waiver.
  const unwaived = waivable ? blockCodes.filter((c) => !allow.has(c)) : blockCodes;
  const waived = waivable && failed && blockCodes.length > 0 && unwaived.length === 0;
  results.push({ name, failed: failed && !waived, waived, unwaived, blockCodes });
};

// TASTE GATES ARE OPT-IN. Seven of the steps below do not check that a film is BROKEN; they check that
// it matches a house style, and the style they were fitted to is a library this repo's own docs call
// debt. Fitted rules do not stay true: `direction-floor` blocked 38 of 130 shipped scenes and
// `visual-vocabulary` was waived by a quarter of the library before it was deleted for measuring the
// wrong thing. A rule that is waived by reflex has already been repealed; leaving it switched on only
// hides that fact behind a green tick.
//
// So they run when you ask for them, and the run says plainly that they were skipped otherwise:
//   TASTE=1 make author-check D=<file>      · or `--taste`
// The default ladder keeps every step that catches BROKEN — a schema error, a hole in the timeline, a
// missing asset, a plan the render does not deliver. Nothing here was deleted; see docs/TASTE.md for
// what was culled, why, and what would have to be true to switch one back on by default.
const taste = process.argv.includes('--taste') || process.env.TASTE === '1';
const skippedTaste = [];
const tasteGate = (name, label, script, args, opts) => {
  if (!taste) { skippedTaste.push(name); return; }
  record(name, runGate(label, script, args), opts);
};

// 1. validate — correctness, never waivable.
record('validate', runGate('validate (schema + em-dash)', 'core/validate.mjs', []), { waivable: false });
// 1b. beats — the TIMELINE gate: dead air, an empty closing plate, a transition window with nothing in it,
//     a backdrop that structurally cannot move. Every other gate reads the scene as a bag of layers; this
//     one walks the clock. Blocking, waivable by code.
record('beats', runGate('beat check (timeline holes)', 'scripts/gates/beat-check.mjs', strict ? ['--strict'] : []), { waivable: true });
// 2. critique — value gate; errors block, waivable by rule code. TASTE.
tasteGate('critique', 'critique (value gate)', 'scripts/gates/critique.mjs', strict ? ['--strict'] : [], { waivable: true });
// 3. direct — direction gate; FAILs block, waivable by code. TASTE.
tasteGate('direct', 'direct (direction gate)', 'scripts/author/motion-director.mjs', [], { waivable: true });
// 3b. direction floor — the AMBITION lower bound (inverse of effect-soup): fails a plain slideshow. TASTE.
tasteGate('floor', 'direction floor (ambition)', 'scripts/gates/direction-floor.mjs', strict ? ['--strict'] : [], { waivable: true });

// 4c. dissolve — the TRANSITION gate. Everything else here samples settled frames by construction, so a
//     crossfade between two text states (a double exposure: both strings at half strength through the
//     middle) was invisible to the whole ladder and shipped five times. See MISTAKES #171, #174. TASTE.
tasteGate('dissolve', 'dissolve check (crossfade mud)', 'scripts/gates/dissolve-check.mjs', strict ? ['--strict'] : [], { waivable: true });
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
tasteGate('designspec', 'design-spec lock (theme colours + fonts)', 'scripts/gates/designspec-check.mjs', ['--strict'], { waivable: true, exitMeansFail: true });
// 4c. copy — the WORDS lock: hook length / weak opener, marketing jargon, restated headlines, flat numbers. TASTE.
tasteGate('copy', 'copy gate (on-screen writing)', 'scripts/gates/copy-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// PACE. It sits with the taste gates rather than the always-on ones because a still film is sometimes
// right, and it is opt-in for the same reason the rest of this half is. What it is NOT is a matter of
// opinion: two films authored as a deliberate improvement came out slower than the one they replaced,
// measured, and the only thing that noticed was a census run by hand afterwards (docs/MISTAKES.md #322).
tasteGate('pace', 'pace (is anything happening, and how often)', 'scripts/gates/pace-check.mjs', strict ? ['--strict'] : [], { waivable: true, exitMeansFail: strict });
// 4d. assets — the READINESS preflight: every referenced image/icon/capture/vo actually exists on disk.
{ const r = runGate('asset preflight (referenced files exist)', 'scripts/gates/asset-check.mjs', strict ? ['--strict'] : []); record('assets', r, { waivable: true, exitMeansFail: strict }); }

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
// It sits with the TASTE gates for the honest reason, and the reason is the cost rather than the noise.
// DOSE, measured by running --hero over the library: 29 of the 91 landscape scenes carry a thin-hero
// finding (32%). That is a usable warning rate, well under the "four landscape films in five" the audit's
// own comment cites, which counted sampled FRAMES under the 60% reference rather than films under the 55%
// floor with the split-frame exemption applied. What keeps it opt-in is that the always-on half of this
// ladder catches BROKEN in about a second, and a browser launch triples that for a house-style warning.
// Portrait scenes never reach it: the rule only fires when the frame is wider than it is tall.
{
  const [vw, vh] = sceneDims(scene, '');
  if (vw > vh) {
    if (taste) runGate('hero fill (thin-hero, pre-render)', 'verify/audit.mjs', ['--hero']);
    else {
      skippedTaste.push('hero');
      // NAME THE ABSENCE. A landscape film that skips this gets told where the check lives and when it
      // will run, so a missing finding is a known gap rather than a silence that reads as a pass.
      console.log(`\n──────── hero fill (thin-hero) ────────`);
      console.log(`  ⚠ NOT CHECKED. This is a ${vw}x${vh} landscape film, and nothing above measured whether its`);
      console.log(`      hero line is set at video scale. Pre-render:  TASTE=1 make author-check D=${file}`);
      console.log(`      (about 1.4s: it launches a browser). Otherwise it is reported post-render by \`make audit\`,`);
      console.log(`      after the mp4 is paid for.`);
    }
  } else {
    console.log(`\n──────── hero fill (thin-hero) ────────`);
    console.log(`  ○ portrait canvas (${vw}x${vh}); thin-hero is a landscape rule and has nothing to say here.`);
  }
}

// 4e. treatment — the film's own rationale. ADVISORY, always: a treatment is an argument a person
//     makes, so a gate can only check that one exists and still describes THIS storyboard. It goes
//     stale the moment the plan moves, and a stale rationale is worse than none because it reads as
//     current. Silent when there is no storyboard to have a treatment for.
{
  const sbPath = file.replace(/\.json$/, '.storyboard.md');
  if (fs.existsSync(sbPath)) {
    const t = readReceipt('treatment', sbPath);
    console.log(`\n──────── treatment (why this film looks like this) ────────`);
    if (!t.exists) {
      console.log(`  ~ no treatment for ${path.basename(sbPath)}. The argument for this direction, and against`);
      console.log(`    the ones you turned down, is not written anywhere. \`make treatment SB=${sbPath}\``);
    } else if (t.stale) {
      console.log(`  ~ the treatment is STALE: ${path.basename(sbPath)} has changed since ${t.rel} was written.`);
      console.log(`    Re-run \`make treatment SB=${sbPath}\` — it refreshes the measured block and leaves your prose.`);
    } else {
      console.log(`  ✓ treatment current (${t.receipt.treatment || 'recorded'}).`);
    }
  }
}

// 4f. waiver drift — is this waiver a decision or a habit? ADVISORY, and never blocking, because a gate
//     that blocked on this would itself be waived. It reads the whole library and reports how many other
//     films excuse the same rule, which is the only level at which "we keep letting ourselves off" is
//     visible. Written after a gate blocked two films on the same day and the second one was waived.
runGate('waiver drift (is this a decision or a habit)', 'scripts/gates/waiver-drift.mjs', []);

// 5. inspect — the per-beat value contract. inspect.mjs silently passes when no sidecar exists; here
//    we make that ABSENCE visible as a WARN so the value contract is a choice, not an accident.
const sidecar = file.replace(/\.json$/, '.intent.json');
if (fs.existsSync(sidecar)) {
  record('inspect', runGate('inspect (per-beat value contract)', 'scripts/gates/inspect.mjs', strict ? ['--strict'] : []), { waivable: true });
  // 5b. plan vs render — inspect reads the scene at ONE instant per beat, so it cannot see a beat that
  //     stalls. This one lines the plan's beat spans up against the film's clock: a promised junction
  //     with no event at it, and a beat the author froze while the plan says it turns.
  record('plan', runGate('plan vs render (does the film do what the plan said)', 'scripts/gates/plan-vs-render.mjs', strict ? ['--strict'] : []), { waivable: true });
} else {
  process.stdout.write(`\n──────── inspect (per-beat value contract) ────────\n`);
  process.stdout.write(`  ⚠ no .intent.json sidecar — this scene declares no per-beat value contract.\n` +
    `      A sidecar states, per beat, the artifact that earns the frame + what must show/animate;\n` +
    `      inspect then verifies the render delivers it. Add ${path.basename(sidecar)} to make value checkable.\n`);
  if (strict) results.push({ name: 'inspect', failed: true, waived: false, unwaived: ['no-intent-sidecar'], blockCodes: [] });
  // AND RUN plan vs render ANYWAY. Skipping it here meant the film with no plan was the one film never
  // asked whether it nominates a peak, which is the film most likely not to have one. The gate itself
  // says plainly that it has no plan to check against; the one question it can still answer without a
  // plan is `no-spectacle-nominated`, and that question is worth asking of exactly this film.
  // Not recorded as a result: with no sidecar it can only advise, and a step that can only advise has
  // no verdict to put in the ladder's table.
  runGate('plan vs render (no plan, so: does the film nominate a peak)', 'scripts/gates/plan-vs-render.mjs', strict ? ['--strict'] : []);
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
const line = (r) => {
  const mark = r.failed ? '✗' : r.waived ? '○' : '✓';
  const note = r.failed ? `BLOCKS (${r.unwaived.join(', ') || 'exit ' + 1})` : r.waived ? `waived (${r.blockCodes.join(', ')})` : 'ok';
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
console.log(`\n  NOCHECK=1 skips this target, NOT the engine: a scene with a bad name or a broken schema`);
console.log(`  still fails at boot. What you lose by skipping is the craft half, and the early warning.`);
if (skippedTaste.length) {
  console.log(`\n  ⚠ ${skippedTaste.length} TASTE gate(s) NOT RUN: ${skippedTaste.join(', ')}.`);
  console.log(`      These check house style, not breakage, so they are opt-in. Nothing above says anything`);
  console.log(`      about whether this film is any good.  Run them:  TASTE=1 make author-check D=${file}`);
  console.log(`      Why they are off by default: docs/TASTE.md · "What was culled, and why".`);
}

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
