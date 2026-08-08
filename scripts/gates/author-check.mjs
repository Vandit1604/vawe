// scripts/gates/author-check.mjs — THE MANDATORY AUTHORING-QUALITY LADDER.
//
// The static quality gates existed but were opt-in and mostly WARN-tier, so a maximal "effect-soup"
// video passed everything the render flow actually ran (only schema + purity were mandatory). This one
// command chains them so `make video` can REQUIRE the loop (it runs author-check unless NOCHECK=1).
// See docs/MISTAKES.md (authoring-gates-were-optional) and docs/CRAFT/DIRECTION.md.
//
// The ladder (all PRE-render, so it can gate the render):
//   validate  — schema + em-dash (correctness; never waivable)
//   beats     — the TIMELINE gate: dead air, an empty last frame, an empty cut/seam window, a dead backdrop
//   critique  — the value gate: hollow/placeholder/unbacked/thin/mis-centre beats
//   direct    — the direction gate: cut families, effect-soup, continuity, pacing, and the book-grounded
//               motion tells (linear-motion, monotone-timing, enter-and-retreat)
//   floor     — the AMBITION floor (inverse of effect-soup): fails a plain slideshow (no kinetic type,
//               no camera, no transitions). Directed lives BETWEEN soup and slideshow.
//   slop      — the impeccable 41-rule anti-slop detector on the rendered DOM (advisory here)
//   designspec— the LOOK lock: off-palette colours / non-role fonts vs the theme (advisory here)
//   copy      — the WORDS lock: hook/jargon/restatement/flat-number tells in on-screen text (advisory)
//   assets    — the READINESS preflight: every referenced image/icon/capture/vo exists on disk (advisory)
//   inspect   — the per-beat value contract, if a .intent.json sidecar exists (absent → visible WARN)
//
// The vision judge (docs/JUDGE.md) is NOT run here: it needs the rendered mp4, so it is a post-render
// step. A deterministic script also cannot force an agent to judge honestly. So the ladder ends by
// printing the REQUIRED post-render judge step — author-check being green is necessary, not sufficient.
//
// Rules stay tunable: a scene may waive a specific BLOCKING rule it deliberately breaks with
//   { "authoring": { "allow": ["cut-families", "profile"] } }
// Waivers apply only to blocking findings (critique errors, direct FAILs); validate is never waivable.
//
// THE TASTE SPLIT (default OFF, `TASTE=1` or `--taste` turns it on):
//   Eight steps — critique, direct, floor, visuals, dissolve, slop, designspec, copy — do not check that
//   a film is BROKEN. They check that it matches a taste, and that taste was fitted to this library at a
//   moment the library has since been called debt: 52 of 93 scenes carried no large picture, 18 of the 18
//   eligible short films waive continuity, and the show floor is waived by 32% of scenes. A rule derived
//   from films nobody liked measures new work against films nobody liked, so it blocks the fix and passes
//   the thing it was fitted to. They still run on demand, because the readings are real; they no longer
//   run by default, because the verdicts were not earned.
//   The rest — validate, beats, assets, treatment — catch BROKEN, not UGLY: bad schema, a hole in the
//   clock, a missing file. Those hold at every taste.
//   Skipped steps are PRINTED in the summary as `(taste, off)`. A gate that vanishes quietly is how a rule
//   dies without anyone deciding to kill it, which is the failure this split exists to avoid repeating.
//   `--iterate` turns the eight back ON, because it strips every verdict anyway: what the default removes
//   is the power to block, and iterate has none to remove. Anything that runs this ladder to RECORD rather
//   than to gate (draft-check) should do the same.
//   `make judge` is untouched and is still the honest taste check: it looks at the frames.
//
// Usage: node scripts/gates/author-check.mjs <scene.json> [--strict] [--taste] [--iterate] [--vs <brand>]
//        make author-check D=<file> [STRICT=1] [TASTE=1] [VS=<brand>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReceipt } from '../lib/receipt.mjs';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
// ITERATE MODE: same gates, same findings, no consequence. While a film is still being explored, a
// blocking gate does not save time, it breaks the loop — you stop to fix or waive something you were
// about to rewrite anyway. Measured, the whole static ladder costs about a second against an 8s draft
// render, so the cost was never the runtime; it was being interrupted. So iterate reports everything
// and exits 0, and says plainly what WOULD block, while ship keeps the teeth.
const iterate = process.argv.includes('--iterate') || process.env.MODE === 'iterate';
// TASTE MODE: the eight style gates, off unless asked for. See the header for why they stopped being
// mandatory and what still is. ITERATE IMPLIES TASTE: the argument for the default is that the eight
// gates' VERDICTS were not earned, and iterate has no verdict — it cannot block anything. Their
// READINGS are real, and iterate is the one command whose whole job is to show an author where a film
// stands, so leaving them off there would make it show the least.
const taste = process.env.TASTE === '1' || process.argv.includes('--taste') || iterate;
const vsArg = (() => { const i = process.argv.indexOf('--vs'); return i >= 0 ? process.argv[i + 1] : null; })();
if (!file) { console.error('usage: node scripts/gates/author-check.mjs <scene.json> [--strict] [--taste] [--iterate] [--vs <brand>]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

let scene = {};
try { scene = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
const allow = new Set((scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : []);
// A WAIVER MUST STATE ITS REASON. The doctrine has always said a waiver is a deliberate exception with
// a written cause; the audit says otherwise. Across the tracked library `no-continuous-object` is
// waived 6 times with 0 reasons and `dead-air` 3 times with 0, while `no-visual-vocabulary` carries a
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
// validate, and the `.expanded.json` is a derivative that `visual-vocabulary` skips. Neither file could be
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
// a taste step that did not run still gets a row in the verdict. Nothing here is allowed to disappear.
const skip = (name) => results.push({ name, failed: false, waived: false, skipped: true, unwaived: [], blockCodes: [] });

// 1. validate — correctness, never waivable.
record('validate', runGate('validate (schema + em-dash)', 'core/validate.mjs', []), { waivable: false });
// 1b. beats — the TIMELINE gate: dead air, an empty closing plate, a transition window with nothing in it,
//     a backdrop that structurally cannot move. Every other gate reads the scene as a bag of layers; this
//     one walks the clock. Blocking, waivable by code.
record('beats', runGate('beat check (timeline holes)', 'scripts/gates/beat-check.mjs', strict ? ['--strict'] : []), { waivable: true });
// 2. critique — value gate; errors block, waivable by rule code. TASTE.
if (taste) record('critique', runGate('critique (value gate)', 'scripts/gates/critique.mjs', strict ? ['--strict'] : []), { waivable: true });
else skip('critique');
// 3. direct — direction gate; FAILs block, waivable by code. TASTE.
if (taste) record('direct', runGate('direct (direction gate)', 'scripts/author/motion-director.mjs', []), { waivable: true });
else skip('direct');
// 3b. direction floor — the AMBITION lower bound (inverse of effect-soup): fails a plain slideshow. TASTE.
if (taste) record('floor', runGate('direction floor (ambition)', 'scripts/gates/direction-floor.mjs', strict ? ['--strict'] : []), { waivable: true });
else skip('floor');

// 4b. visual vocabulary — the OTHER floor. `direction-floor` asks whether the film MOVES enough; this
//     asks whether it SHOWS anything, or whether every layer carrying information is type. 52 of 93
//     shipped scenes had no large pictorial layer at all when this landed, which was nobody's decision.
//     TASTE.
if (taste) record('visuals', runGate('visual vocabulary (show, do not only tell)', 'scripts/gates/visual-vocabulary.mjs', strict ? ['--strict'] : []), { waivable: true });
else skip('visuals');

// 4c. dissolve — the TRANSITION gate. Everything else here samples settled frames by construction, so a
//     crossfade between two text states (a double exposure: both strings at half strength through the
//     middle) was invisible to the whole ladder and shipped five times. See MISTAKES #171, #174. TASTE.
if (taste) record('dissolve', runGate('dissolve check (crossfade mud)', 'scripts/gates/dissolve-check.mjs', strict ? ['--strict'] : []), { waivable: true });
else skip('dissolve');
// 4. slop — advisory here (exit code surfaced, not blocking unless --strict). Hand-written HTML tells. TASTE.
if (taste) { const r = runGate('slop (anti-slop detector)', 'scripts/gates/slop.mjs', []); record('slop', r, { waivable: true, exitMeansFail: strict }); }
else skip('slop');
// 4b. designspec — the LOOK lock (visual twin of the storyboard): off-palette colours / non-role fonts.
//     Advisory here (surfaced, blocks only under --strict), same as slop. The theme is the locked spec. TASTE.
if (taste) { const r = runGate('design-spec lock (theme colours + fonts)', 'scripts/gates/designspec-check.mjs', strict ? ['--strict'] : []); record('designspec', r, { waivable: true, exitMeansFail: strict }); }
else skip('designspec');
// 4c. copy — the WORDS lock: hook length / weak opener, marketing jargon, restated headlines, flat numbers. TASTE.
if (taste) { const r = runGate('copy gate (on-screen writing)', 'scripts/gates/copy-check.mjs', strict ? ['--strict'] : []); record('copy', r, { waivable: true, exitMeansFail: strict }); }
else skip('copy');
// 4d. assets — the READINESS preflight: every referenced image/icon/capture/vo actually exists on disk.
{ const r = runGate('asset preflight (referenced files exist)', 'scripts/gates/asset-check.mjs', strict ? ['--strict'] : []); record('assets', r, { waivable: true, exitMeansFail: strict }); }

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
//     visible. Written after visual-vocabulary correctly blocked two films on the same day and the second
//     one was waived.
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
}

// ---- verdict ----
const failed = results.filter((r) => r.failed);
const waivers = results.filter((r) => r.waived);
console.log(`\n════════ author-check · ${path.basename(file)} ════════`);
for (const r of results) {
  if (r.skipped) { console.log(`  · ${r.name.padEnd(10)} (taste, off)`); continue; }
  const mark = r.failed ? '✗' : r.waived ? '○' : '✓';
  const note = r.failed ? `BLOCKS (${r.unwaived.join(', ') || 'exit ' + 1})` : r.waived ? `waived (${r.blockCodes.join(', ')})` : 'ok';
  console.log(`  ${mark} ${r.name.padEnd(10)} ${note}`);
}
if (results.some((r) => r.skipped)) console.log(`  (the taste steps are off by default: TASTE=1 or --taste runs them. \`make judge\` is the honest taste check.)`);
if (waivers.length) console.log(`  (waivers come from "authoring.allow" in the scene — deliberate rule breaks)`);

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
