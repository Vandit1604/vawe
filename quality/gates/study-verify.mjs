// quality/gates/study-verify.mjs: does `make study` measure correctly? Check it against a film whose
// answers we already know.
//
//   node quality/gates/study-verify.mjs formats/scene/brew-launch-act1.json
//   make study-verify D=formats/scene/<scene>.json
//
// WHY THIS IS POSSIBLE AT ALL, and why it is the right gate. `make study` reads someone else's film and
// nobody can grade it: the reference has no source, so a wrong measurement and a right one look the
// same. OUR OWN FILMS HAVE GROUND TRUTH. The scene JSON declares the duration, the transition times and
// the backdrop windows, and the renderer produces the mp4 from exactly those. So rendering one and
// studying the result asks the measurement a question with a known answer.
//
// This is the shape the doctrine allows a gate to have: a comparison against a baseline (CLAUDE.md,
// "ARCHITECTURE: fix it at the root, or fail there"). There is no write site to fix instead, because
// the thing being checked is whether a MEASUREMENT is true, and that is only knowable by measuring
// something you already know.
//
// WHAT A MISMATCH MEANS IS NOT ALWAYS "THE TOOL IS WRONG", and the first run proved it. `cuts` in a
// scene is the ENGINE's cut mechanism; a scene score measures a VISUAL discontinuity. A film can have
// the second without the first, and higgsfield-recreation does: at 3.10s two layers end and a third is
// travelling at speed, so the frame changes hard while the JSON declares no cut at all. The tool is
// right about what a viewer sees, which is the thing a grammar study is for. So a cut the JSON does not
// declare is reported as UNDECLARED and explained, never as a failure.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { pickRecipe } from '../../recipes/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv.find((a) => a.endsWith('.json'));
const RENDER = !process.argv.includes('--no-render');
const f = gateFindings();
if (!file) { console.error('usage: node quality/gates/study-verify.mjs <scene.json> [--no-render]'); process.exit(2); }
const abs = path.resolve(ROOT, file);
if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
const name = path.basename(abs, '.json');
const scene = JSON.parse(fs.readFileSync(abs, 'utf8'));
const mp4 = path.join(ROOT, 'out', `${name}.mp4`);

if (RENDER || !fs.existsSync(mp4)) {
  console.log(`  rendering ${name} (draft)…`);
  // VAWE_SERVE_ALL=1: this gate's own scenes are not always under the render server's default
  // allowlist (the ground-truth fixture lives in quality/fixtures/, alongside its siblings, not
  // formats/scene/ — .gitignore keeps formats/scene/*.json out of the repo for anything that is
  // authored content rather than the framework itself). Safe to set unconditionally: it only widens
  // what the dev server will fetch, never narrows a normal formats/scene/ render.
  const r = spawnSync(path.join(ROOT, 'bin/vawe'), [path.relative(ROOT, abs), '--draft'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VAWE_SERVE_ALL: '1' } });
  if (!fs.existsSync(mp4)) { console.error(`✗ render produced no ${path.relative(ROOT, mp4)}\n${r.stderr || r.stdout}`); process.exit(1); }
}

const studyName = `_verify-${name}`;
const s = spawnSync('node', [path.join(ROOT, 'harness/media/study.mjs'), path.relative(ROOT, mp4), studyName],
  { cwd: ROOT, encoding: 'utf8' });
const gp = path.join(ROOT, 'grammar', `${studyName}.json`);
if (!fs.existsSync(gp)) { console.error(`✗ study wrote no grammar file\n${s.stderr || s.stdout}`); process.exit(1); }
const g = JSON.parse(fs.readFileSync(gp, 'utf8'));

// ---- the declared truth -------------------------------------------------------------------------
// Every mechanism that produces a visual boundary, in one list, because the author may have used any
// of them and they are the same fact to a viewer.
// `recipes[]` (a flow-seam, say) is a boundary too: it is expanded into motion keys at render time,
// never into `scene.seams` (that field is the ENGINE's own seam mechanism's lowered form, see
// AGENTS.md "Author a boundary through transitions[] only"), but the file on disk still names it, so
// the raw scene JSON read here still has it. `at` is the slot's OWN meaning, "the first frame of empty
// ground" (recipes/README.md), which is not what a study reports: `measureSeam` names the joint at the
// gap's CORE MIDPOINT, so the expected boundary is `at + gap/2`, `gap` read off the recipe's own params
// (an author override, else its measured default) the same way expand.mjs resolves it.
function recipeJointTime(r) {
  if (r.recipe !== 'flow-seam') return r.at;
  const recipe = pickRecipe(r.recipe);
  const gap = (r.params && r.params.gap != null) ? r.params.gap : recipe.params.gap.default;
  return r.at + gap / 2;
}
const declaredCuts = [
  ...(scene.cuts || []).map((c) => c.t),
  ...(scene.transitions || []).map((t) => t.at),
  ...(scene.seams || []).map((x) => x.t),
  ...(scene.recipes || []).map(recipeJointTime),
].filter((t) => typeof t === 'number').sort((a, b) => a - b);
const measuredCuts = (g.shots || []).slice(1).map((x) => x.t0);

const TOL = 0.12;   // 3.6 frames at 30fps. A cut's detected frame can sit either side of its own start.
const findings = [];
const ok = [];

const near = (a, b) => Math.abs(a - b) <= TOL;
if (Math.abs(g.measured.duration - (scene.duration || 0)) > 0.15) {
  findings.push(['duration', `scene declares ${scene.duration}s, the film measures ${g.measured.duration}s`]);
  f.fail('duration', `scene declares ${scene.duration}s, the film measures ${g.measured.duration}s`);
} else ok.push(`duration ${g.measured.duration}s matches the declared ${scene.duration}s`);

const missed = declaredCuts.filter((t) => !measuredCuts.some((m) => near(m, t)));
const extra = measuredCuts.filter((m) => !declaredCuts.some((t) => near(m, t)));
if (missed.length) {
  findings.push(['cut-missed', `the scene declares a boundary at ${missed.map((t) => t + 's').join(', ')} and the study found none within ${TOL}s`]);
  f.fail('cut-missed', `the scene declares a boundary at ${missed.map((t) => t + 's').join(', ')} and the study found none within ${TOL}s`);
}
if (declaredCuts.length && !missed.length)
  ok.push(`all ${declaredCuts.length} declared boundary(ies) found, within ${TOL}s: ${declaredCuts.map((t, i) => `${t}→${measuredCuts.find((m) => near(m, t))}`).join(', ')}`);
if (!declaredCuts.length) ok.push('the scene declares no boundary');

// ---- GROUND TRUTH: within ONE FRAME, and the right kind and axis --------------------------------
// The 0.12s tolerance above is generous (a cut's detected frame can smear either side of its own
// start). For a scene we built to KNOW the answer, that is not good enough: this checks every declared
// boundary lands within one frame of the film's own rate, names the right KIND (a `recipes[]` flow-seam
// must measure as a seam, on the axis it declared) and that a long, undeclared tail (a deliberate still
// hold) carries no spurious joint at all.
const FRAME_TOL = 1 / (g.measured.fps || 30);
for (const t of declaredCuts) {
  const m = measuredCuts.find((x) => near(x, t));
  if (m == null) continue;   // already reported as `cut-missed` above
  if (Math.abs(m - t) > FRAME_TOL) {
    findings.push(['ground-truth-frame', `boundary at ${t}s measured at ${m}s, ${Math.abs(m - t).toFixed(3)}s off: more than one frame (${FRAME_TOL.toFixed(3)}s)`]);
    f.fail('ground-truth-frame', `boundary at ${t}s measured at ${m}s, ${Math.abs(m - t).toFixed(3)}s off: more than one frame (${FRAME_TOL.toFixed(3)}s)`);
  } else ok.push(`boundary at ${t}s measured within one frame (${m}s, ${Math.abs(m - t).toFixed(3)}s)`);
}
for (const r of scene.recipes || []) {
  if (r.recipe !== 'flow-seam') continue;
  const axis = (r.params && r.params.axis) || 'x';
  const expected = recipeJointTime(r);
  const sm = (g.seams || []).find((s) => Math.abs(s.t - expected) < 0.6);
  if (!sm) {
    findings.push(['ground-truth-seam-missing', `recipe "flow-seam" at ${r.at}s (axis "${axis}") was not measured as a seam`]);
    f.fail('ground-truth-seam-missing', `recipe "flow-seam" at ${r.at}s (axis "${axis}") was not measured as a seam`);
  } else if (sm.axis !== axis) {
    findings.push(['ground-truth-axis', `recipe "flow-seam" at ${r.at}s declares axis "${axis}", measured "${sm.axis}"`]);
    f.fail('ground-truth-axis', `recipe "flow-seam" at ${r.at}s declares axis "${axis}", measured "${sm.axis}"`);
  } else ok.push(`recipe seam at ${r.at}s measured axis "${sm.axis}" (${sm.direction}), matching`);
}
// A "still hold" is not authored as a fact anywhere in the scene format; it is what a long enough gap
// after the last declared boundary MEANS. Long enough that it cannot be end-of-film framing: 1.5s.
const lastBoundary = declaredCuts.length ? Math.max(...declaredCuts) : 0;
const tailLen = g.measured.duration - lastBoundary;
if (tailLen > 1.5) {
  const spurious = measuredCuts.filter((m) => m > lastBoundary + FRAME_TOL);
  if (spurious.length) {
    findings.push(['ground-truth-spurious', `no boundary is declared after ${lastBoundary}s (a ${tailLen.toFixed(2)}s still hold) but the study found ${spurious.join(', ')}`]);
    f.fail('ground-truth-spurious', `no boundary is declared after ${lastBoundary}s (a ${tailLen.toFixed(2)}s still hold) but the study found ${spurious.join(', ')}`);
  } else ok.push(`the ${tailLen.toFixed(2)}s tail after the last declared boundary (${lastBoundary}s) carries no spurious joint`);
}

// ---- the backdrop -------------------------------------------------------------------------------
// A window's LIGHTNESS is knowable from its preset name only for the unambiguous ones, so this checks
// the shape it can check: how many distinct grounds the film shows, against how many distinct
// consecutive presets it declares. Two adjacent windows on the same preset are one ground to a viewer.
const presets = (Array.isArray(scene.bg) ? scene.bg : [scene.bg]).filter(Boolean).map((b) => b.preset || (b.html ? 'html' : '?'));
const declaredRuns = presets.filter((p, i) => i === 0 || p !== presets[i - 1]).length;
const grounds = (g.shots || []).map((x) => x.ground);
const measuredRuns = grounds.filter((x, i) => i === 0 || x !== grounds[i - 1]).length;
// REPORTED, NEVER FAILED, and the first run is why. `ground` is the whole FRAME's mean luma and a
// scene's `bg` list is only the backdrop, so a bright card entering a dark frame moves one and not the
// other. higgsfield-recreation declares one backdrop and reads dark → mid because its content arrives,
// which is correct on both sides. The line is worth printing and is not evidence of a defect.
const groundNote = `backdrop: ${declaredRuns} declared run(s), frame lightness reads ${measuredRuns} (${g.groundPattern})`
  + (measuredRuns > declaredRuns ? '. More runs than backdrops is normal: content changes frame luma.' : '');
ok.push(groundNote);

// A luma sitting within 4 of a bucket edge is a coin toss reported as a fact. Named rather than binned
// silently: brew's accent window measured 128.4 against a light/mid edge at 128 and was called light.
// The knife-edge case is now handled where the value is written (study.mjs marks it `light?`), so this
// only checks that the marking survived. A bucket that lost its doubt on the way here is a real defect.
// `ground` now buckets `groundLuma` (the border ring, see study.mjs), not the whole-frame `luma`: a
// centred card no longer drags a coloured wash into the wrong bucket. The edge-doubt check follows it.
for (const sh of g.shots || []) {
  const gl = sh.groundLuma ?? sh.luma;
  const nearEdge = [60, 128].some((e) => Math.abs(gl - e) < 4);
  if (nearEdge && !String(sh.ground).endsWith('?')) {
    findings.push(['ground-false-confidence', `shot ${sh.i} measured groundLuma ${gl}, within 4 of a bucket edge, and was named "${sh.ground}" with no doubt marker.`]);
    f.fail('ground-false-confidence', `shot ${sh.i} measured groundLuma ${gl}, within 4 of a bucket edge, and was named "${sh.ground}" with no doubt marker.`);
  }
  if (nearEdge) ok.push(`shot ${sh.i} groundLuma ${gl} sits on a bucket edge and says so: "${sh.ground}"`);
}

console.log(`\n  STUDY-VERIFY · ${name}\n`);
for (const line of ok) console.log(`  ✓ ${line}`);
for (const [code, msg] of findings) console.log(`  ✗ [${code}] ${msg}`);
if (extra.length) {
  console.log(`\n  ⚠ ${extra.length} UNDECLARED boundary(ies) at ${extra.map((t) => t + 's').join(', ')}.`);
  console.log(`    Not a failure. \`cuts\` is the ENGINE's cut mechanism; a scene score measures what a`);
  console.log(`    VIEWER sees. Layers ending together, or one travelling fast, changes the frame hard`);
  console.log(`    without any cut being declared. Check the sheet: refs/${studyName}/sheet.png`);
  f.note('undeclared-boundary', `${extra.length} undeclared boundary(ies) at ${extra.map((t) => t + 's').join(', ')}, not a failure: check refs/${studyName}/sheet.png`);
}
console.log('');
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
