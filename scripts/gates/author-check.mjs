// scripts/gates/author-check.mjs — THE MANDATORY AUTHORING-QUALITY LADDER.
//
// The static quality gates existed but were opt-in and mostly WARN-tier, so a maximal "effect-soup"
// video passed everything the render flow actually ran (only schema + purity were mandatory). This one
// command chains them so `make video` can REQUIRE the loop (it runs author-check unless NOCHECK=1).
// See docs/MISTAKES.md (authoring-gates-were-optional) and docs/CRAFT/DIRECTION.md.
//
// The ladder (all PRE-render, so it can gate the render):
//   validate  — schema + em-dash (correctness; never waivable)
//   critique  — the value gate: hollow/placeholder/unbacked/thin/mis-centre beats
//   direct    — the direction gate: cut families, effect-soup, continuity, pacing, and the book-grounded
//               motion tells (linear-motion, monotone-timing, enter-and-retreat)
//   floor     — the AMBITION floor (inverse of effect-soup): fails a plain slideshow (no kinetic type,
//               no camera, no transitions). Directed lives BETWEEN soup and slideshow.
//   slop      — the impeccable 41-rule anti-slop detector on the rendered DOM (advisory here)
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
// Usage: node scripts/gates/author-check.mjs <scene.json> [--strict] [--vs <brand>]
//        make author-check D=<file> [STRICT=1] [VS=<brand>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
const vsArg = (() => { const i = process.argv.indexOf('--vs'); return i >= 0 ? process.argv[i + 1] : null; })();
if (!file) { console.error('usage: node scripts/gates/author-check.mjs <scene.json> [--strict] [--vs <brand>]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

let scene = {};
try { scene = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
const allow = new Set((scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : []);
const vs = vsArg || (typeof scene.theme === 'string' ? scene.theme : null);

// run one gate as a child; stream its output; return {code, blockCodes}. A "blocking" finding is a line
// the gate marks with ✗ and a [code] tag (critique errors, direct FAILs use exactly this format).
const runGate = (label, script, args) => {
  process.stdout.write(`\n──────── ${label} ────────\n`);
  let out = '', code = 0;
  try { out = execFileSync('node', [path.join(repoRoot, script), file, ...args], { encoding: 'utf8', cwd: repoRoot }); }
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

// 1. validate — correctness, never waivable.
record('validate', runGate('validate (schema + em-dash)', 'core/validate.mjs', []), { waivable: false });
// 2. critique — value gate; errors block, waivable by rule code.
record('critique', runGate('critique (value gate)', 'scripts/gates/critique.mjs', strict ? ['--strict'] : []), { waivable: true });
// 3. direct — direction gate; FAILs block, waivable by code.
record('direct', runGate('direct (direction gate)', 'scripts/author/motion-director.mjs', []), { waivable: true });
// 3b. direction floor — the AMBITION lower bound (inverse of effect-soup): fails a plain slideshow.
record('floor', runGate('direction floor (ambition)', 'scripts/gates/direction-floor.mjs', strict ? ['--strict'] : []), { waivable: true });
// 4. slop — advisory here (exit code surfaced, not blocking unless --strict). Hand-written HTML tells.
{ const r = runGate('slop (anti-slop detector)', 'scripts/gates/slop.mjs', []); record('slop', r, { waivable: true, exitMeansFail: strict }); }

// 5. inspect — the per-beat value contract. inspect.mjs silently passes when no sidecar exists; here
//    we make that ABSENCE visible as a WARN so the value contract is a choice, not an accident.
const sidecar = file.replace(/\.json$/, '.intent.json');
if (fs.existsSync(sidecar)) {
  record('inspect', runGate('inspect (per-beat value contract)', 'scripts/gates/inspect.mjs', strict ? ['--strict'] : []), { waivable: true });
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
  const mark = r.failed ? '✗' : r.waived ? '○' : '✓';
  const note = r.failed ? `BLOCKS (${r.unwaived.join(', ') || 'exit ' + 1})` : r.waived ? `waived (${r.blockCodes.join(', ')})` : 'ok';
  console.log(`  ${mark} ${r.name.padEnd(10)} ${note}`);
}
if (waivers.length) console.log(`  (waivers come from "authoring.allow" in the scene — deliberate rule breaks)`);

// ---- the required post-render step the static ladder structurally cannot be ----
console.log(`\n  ▶ REQUIRED after render (the ladder is not complete without it):`);
console.log(`      make judge D=${file}${vs ? ` VS=${vs}` : ''}`);
console.log(`      then READ /tmp/judge/sheet.png against /tmp/judge/rubric.md and score every frame`);
console.log(`      (readability · hierarchy · composition · brand + asset fidelity · produced · value).`);
console.log(`      If your eye catches a flaw, it is a FIX — never ship one you noticed. See docs/JUDGE.md.`);

if (failed.length) {
  console.log(`\n✗ author-check FAILED: ${failed.map((r) => r.name).join(', ')}. Fix, or waive a deliberate break via {"authoring":{"allow":[...]}}. ${strict ? '(--strict: warnings also block.)' : ''}\n`);
  process.exit(1);
}
console.log(`\n✓ author-check passed${waivers.length ? ` (${waivers.length} waived)` : ''}. Static ladder green — now do the judge step above before shipping.\n`);
process.exit(0);
