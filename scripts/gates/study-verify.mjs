// scripts/gates/study-verify.mjs: does `make study` measure correctly? Check it against a film whose
// answers we already know.
//
//   node scripts/gates/study-verify.mjs formats/scene/brew-launch-act1.json
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv.find((a) => a.endsWith('.json'));
const RENDER = !process.argv.includes('--no-render');
if (!file) { console.error('usage: node scripts/gates/study-verify.mjs <scene.json> [--no-render]'); process.exit(2); }
const abs = path.resolve(ROOT, file);
if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
const name = path.basename(abs, '.json');
const scene = JSON.parse(fs.readFileSync(abs, 'utf8'));
const mp4 = path.join(ROOT, 'out', `${name}.mp4`);

if (RENDER || !fs.existsSync(mp4)) {
  console.log(`  rendering ${name} (draft)…`);
  const r = spawnSync(path.join(ROOT, 'bin/vawe'), [path.relative(ROOT, abs), '--draft'], { cwd: ROOT, encoding: 'utf8' });
  if (!fs.existsSync(mp4)) { console.error(`✗ render produced no ${path.relative(ROOT, mp4)}\n${r.stderr || r.stdout}`); process.exit(1); }
}

const studyName = `_verify-${name}`;
const s = spawnSync('node', [path.join(ROOT, 'scripts/media/study.mjs'), path.relative(ROOT, mp4), studyName],
  { cwd: ROOT, encoding: 'utf8' });
const gp = path.join(ROOT, 'grammar', `${studyName}.json`);
if (!fs.existsSync(gp)) { console.error(`✗ study wrote no grammar file\n${s.stderr || s.stdout}`); process.exit(1); }
const g = JSON.parse(fs.readFileSync(gp, 'utf8'));

// ---- the declared truth -------------------------------------------------------------------------
// Every mechanism that produces a visual boundary, in one list, because the author may have used any
// of them and they are the same fact to a viewer.
const declaredCuts = [
  ...(scene.cuts || []).map((c) => c.t),
  ...(scene.transitions || []).map((t) => t.at),
  ...(scene.seams || []).map((x) => x.t),
].filter((t) => typeof t === 'number').sort((a, b) => a - b);
const measuredCuts = (g.shots || []).slice(1).map((x) => x.t0);

const TOL = 0.12;   // 3.6 frames at 30fps. A cut's detected frame can sit either side of its own start.
const findings = [];
const ok = [];

const near = (a, b) => Math.abs(a - b) <= TOL;
if (Math.abs(g.measured.duration - (scene.duration || 0)) > 0.15)
  findings.push(['duration', `scene declares ${scene.duration}s, the film measures ${g.measured.duration}s`]);
else ok.push(`duration ${g.measured.duration}s matches the declared ${scene.duration}s`);

const missed = declaredCuts.filter((t) => !measuredCuts.some((m) => near(m, t)));
const extra = measuredCuts.filter((m) => !declaredCuts.some((t) => near(m, t)));
if (missed.length) findings.push(['cut-missed', `the scene declares a boundary at ${missed.map((t) => t + 's').join(', ')} and the study found none within ${TOL}s`]);
if (declaredCuts.length && !missed.length)
  ok.push(`all ${declaredCuts.length} declared boundary(ies) found, within ${TOL}s: ${declaredCuts.map((t, i) => `${t}→${measuredCuts.find((m) => near(m, t))}`).join(', ')}`);
if (!declaredCuts.length) ok.push('the scene declares no boundary');

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
for (const sh of g.shots || []) {
  const nearEdge = [60, 128].some((e) => Math.abs(sh.luma - e) < 4);
  if (nearEdge && !String(sh.ground).endsWith('?'))
    findings.push(['ground-false-confidence', `shot ${sh.i} measured luma ${sh.luma}, within 4 of a bucket edge, and was named "${sh.ground}" with no doubt marker.`]);
  if (nearEdge) ok.push(`shot ${sh.i} luma ${sh.luma} sits on a bucket edge and says so: "${sh.ground}"`);
}

console.log(`\n  STUDY-VERIFY · ${name}\n`);
for (const line of ok) console.log(`  ✓ ${line}`);
for (const [code, msg] of findings) console.log(`  ✗ [${code}] ${msg}`);
if (extra.length) {
  console.log(`\n  ⚠ ${extra.length} UNDECLARED boundary(ies) at ${extra.map((t) => t + 's').join(', ')}.`);
  console.log(`    Not a failure. \`cuts\` is the ENGINE's cut mechanism; a scene score measures what a`);
  console.log(`    VIEWER sees. Layers ending together, or one travelling fast, changes the frame hard`);
  console.log(`    without any cut being declared. Check the sheet: refs/${studyName}/sheet.png`);
}
console.log('');
process.exit(findings.length ? 1 : 0);
