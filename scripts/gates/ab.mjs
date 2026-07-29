// scripts/gates/ab.mjs — BLIND A/B PREP. Lay two cuts of a film beside each other, beat by beat, with
// every trace of which is which removed, and write the brief three independent judges will score.
//
// Why blind. The one controlled experiment this repo has run on a process change (docs/MISTAKES.md #161)
// lost to its control, and it only produced that answer because the judge could not see which arm was the
// one someone had worked on. A judge that knows which cut is "the new one" is not measuring the cut.
//
// Why three. N reduces VARIANCE, not BIAS: three judges drawn from one model share their blind spots, so
// a 3-0 is weaker evidence than the arithmetic suggests. The control for bias is the position-swap re-run
// (`--seed`), not a fourth judge. Adding a judge to break a tie is vote-shopping: it converts a real
// signal ("these are indistinguishable") into a manufactured majority.
//
// Usage:
//   node scripts/gates/ab.mjs --a <scene.json|mp4> --b <scene.json|mp4> --name <slug> --claim "<on-screen line>"
//                             [--seed 0] [--vs <brand>] [--judges 3]
//   make ab A=… B=… NAME=… CLAIM=…
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beatsOf, evenSamples } from './beats-of.mjs';
import { frameTile, tileGrid, tileBox } from './tile.mjs';
import { abRubric } from './rubric.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const A = arg('a'), B = arg('b'), NAME = arg('name'), CLAIM = arg('claim');
const SEED = arg('seed', '0'), BRAND = arg('vs', ''), JUDGES = Math.max(2, +arg('judges', '3') || 3);
if (!A || !B || !NAME) die('usage: ab.mjs --a <a> --b <b> --name <slug> --claim "<line>" [--seed 0] [--vs brand]');
// The claim is mandatory on purpose. A blind judge is asked what the picture MEANS; that answer is only
// checkable against a claim the author committed to first. An author who cannot quote the on-screen line
// their graphic encodes is decorating, and this is the cheapest possible place to find that out.
if (!CLAIM) die('--claim is required: quote the on-screen line the film\'s graphic is supposed to encode.');

const ff = (a) => execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });
const probe = (f, entries, sel = []) => execFileSync('ffprobe',
  ['-v', 'error', ...sel, '-show_entries', entries, '-of', 'default=nk=1:nw=1', f]).toString().trim();

// ---------- resolve each arm to a rendered mp4 ----------
// Renders are deterministic, so re-rendering an unchanged arm is pure waste and the single biggest cost in
// a campaign. Freshness is by mtime: an mp4 older than its scene is stale. (An edit-then-revert still
// re-renders; that is the safe direction to be wrong in.)
function resolve(inp) {
  if (inp.endsWith('.mp4')) {
    if (!fs.existsSync(inp)) die(`no such video: ${inp}`);
    return { mp4: inp, scene: null };
  }
  if (!inp.endsWith('.json')) die(`arm must be a scene .json or an .mp4: ${inp}`);
  const raw = fs.readFileSync(inp, 'utf8');
  const mp4 = path.join('out', `${path.basename(inp, '.json')}.mp4`);
  const stale = !fs.existsSync(mp4) || fs.statSync(mp4).mtimeMs < fs.statSync(inp).mtimeMs;
  if (stale) {
    console.log(`  rendering ${inp} ${fs.existsSync(mp4) ? '(scene is newer than its mp4)' : '(no mp4 yet)'} ...`);
    execFileSync('./bin/vawe', [inp], { stdio: 'inherit' });
  } else console.log(`  reusing ${mp4} (up to date)`);
  return { mp4, scene: JSON.parse(raw), src: inp, hash: crypto.createHash('sha256').update(raw).digest('hex') };
}

const armA = resolve(A), armB = resolve(B);

// ---------- position assignment ----------
// Seeded by content, not by Math.random. The ban on Math.random in this repo exists so one input yields
// one output; an experiment whose arm assignment differed per run would be irreproducible, which is the
// same property one level up. The assignment must be unpredictable to the judge and RECOVERABLE by the
// recorder, and a hash is both. `--seed` is what the swap re-run flips.
const digest = crypto.createHash('sha256')
  .update(`${NAME}:${SEED}:${armA.hash ?? armA.mp4}:${armB.hash ?? armB.mp4}`).digest();
const flip = (digest[0] & 1) === 1;
const LEFT = flip ? armB : armA, RIGHT = flip ? armA : armB;

// ---------- beat tables, each arm's own ----------
const durOf = (m) => parseFloat(probe(m, 'format=duration'));
const dimsOf = (m) => probe(m, 'stream=width,height', ['-select_streams', 'v:0']).split('\n').map(Number);
// BOTH arms are sampled by the SAME model or neither is. The campaign's own working cycle compares a kept
// `out/<name>.before.mp4` against the edited scene JSON, which would otherwise put beat clustering on one
// arm and even spacing on the other. Two arms sampled differently are not comparable, and the difference
// would read to a judge as a difference in pace: an artefact of the instrument, scored as a quality.
// BOTH arms are sampled by the SAME model or neither is. Two arms sampled differently are not
// comparable, and the difference reads to a judge as a difference in pace: an artefact of the
// instrument, scored as a quality.
//
// When only ONE arm has a scene (the usual before/after case, where the control is a kept mp4), use that
// scene's beat table for BOTH. That is one model applied twice, not two models. It matters because the
// even-spacing fallback samples at fixed fractions of the clock and lands wherever it lands: on a film
// full of kinetic type it caught a staggered word reveal half-drawn, and all three judges scored the
// still as broken layout. `beatsOf` samples 55% into each beat, which is past the entrance by design.
const model = LEFT.scene || RIGHT.scene;
if (!model) console.log('  note: neither arm has a scene, so both are sampled at even spacing — a sample may land mid-entrance.');
else if (!(LEFT.scene && RIGHT.scene)) console.log('  note: one arm is a bare mp4; both arms are sampled on the other arm\'s beat table (one model, applied twice).');
const tableOf = (arm) => { const d = durOf(arm.mp4); return model ? beatsOf(model, d) : evenSamples(d); };
const tl = tableOf(LEFT), tr = tableOf(RIGHT);
const [CW, CH] = dimsOf(LEFT.mp4);
const landscape = CW >= CH;
const { tw, th } = tileBox(landscape);

const dir = path.join('/tmp/ab', NAME);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(path.join(dir, 'verdicts'), { recursive: true });

// a blank tile stands in where one cut has no beat at this index. A differing beat count is itself a
// signal about pace, so the rows are paired BY INDEX and never resampled onto a common grid.
const blank = (out, label) => {
  ff(['-y', '-f', 'lavfi', '-i', `color=white:s=${tw}x${th}`, '-frames:v', '1',
    '-vf', `drawtext=text='${label}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=26:fontcolor=0x999999`, out]);
  return out;
};

const rows = Math.max(tl.length, tr.length);
const tiles = [];
for (let i = 0; i < rows; i++) {
  for (const [side, t] of [['LEFT', tl[i]], ['RIGHT', tr[i]]]) {
    const out = path.join(dir, `t${String(i).padStart(2, '0')}-${side}.png`);
    const arm = side === 'LEFT' ? LEFT : RIGHT;
    tiles.push(t ? frameTile(arm.mp4, t.t, out, { tw, th, label: `${side} · beat ${i + 1}` })
      : blank(out, `${side} (no beat)`));
  }
}
tileGrid(tiles, { cols: 2, tw, th, out: path.join(dir, 'sheet.png') });

// full-resolution pairs. A 340x604 tile cannot support a readability call; the sheet is for structure and
// pace, and the brief tells the judge to open at least one of these before scoring legibility.
for (let i = 0; i < rows; i++) {
  const halves = [['LEFT', tl[i], LEFT], ['RIGHT', tr[i], RIGHT]].map(([side, t, arm], k) => {
    const out = path.join(dir, `_full${i}${k}.png`);
    if (!t) return blank(out, `${side} (no beat)`);
    ff(['-y', '-ss', t.t.toFixed(2), '-i', arm.mp4, '-frames:v', '1',
      '-vf', `scale=${CW}:${CH}:force_original_aspect_ratio=decrease,pad=${CW}:${CH}:(ow-iw)/2:(oh-ih)/2:white,drawtext=text='${side}':x=24:y=24:fontsize=48:fontcolor=black:box=1:boxcolor=white@0.85:boxborderw=10`, out]);
    return out;
  });
  ff(['-y', '-i', halves[0], '-i', halves[1], '-filter_complex',
    `[0:v]scale=${CW}:${CH}[l];[1:v]scale=${CW}:${CH}[r];[l][r]hstack=inputs=2`,
    path.join(dir, `beat-${String(i + 1).padStart(2, '0')}.png`)]);
  halves.forEach((h) => fs.rmSync(h, { force: true }));
}

// ---------- the brief (blind) and the key (sealed) ----------
fs.writeFileSync(path.join(dir, 'brief.md'), abRubric({ rows, landscape, brand: BRAND, dir, judge: null }));

const provenance = (arm) => ({
  input: arm.src ?? arm.mp4, mp4: arm.mp4, sceneHash: arm.hash ?? null,
  allow: arm.scene?.authoring?.allow ?? [],
});
// The gate tree hash is the MISTAKES.md #161 fix: that experiment's control was contaminated by a gate
// nobody recorded, so it measured skill+gate against gate-alone. Which gates were live is now a fact.
let gatesTree = null;
try { gatesTree = execFileSync('git', ['rev-parse', 'HEAD:scripts/gates'], { cwd: ROOT }).toString().trim(); } catch { /* not a repo, or gates untracked */ }

const key = {
  name: NAME, seed: SEED, claim: CLAIM, brand: BRAND || null, judges: JUDGES, rows, landscape,
  gatesTree, positions: { LEFT: provenance(LEFT), RIGHT: provenance(RIGHT) },
  beats: { LEFT: tl.map((t) => t.start), RIGHT: tr.map((t) => t.start) },
};
const keyPath = path.join(dir, 'key.json');
fs.writeFileSync(keyPath, `${JSON.stringify(key, null, 2)}\n`);
fs.chmodSync(keyPath, 0o400);

console.log(`\n  ab · ${NAME} · ${rows} paired beat(s) · ${landscape ? 'landscape' : 'portrait'} · ${JUDGES} judges`);
console.log(`  claim: "${CLAIM}"`);
console.log(`\n  → BRIEF: ${dir}/brief.md`);
console.log(`\n  Spawn ${JUDGES} judges in ONE message, each given ONLY that path and its own judge number.`);
console.log(`  Tell each: read the brief, follow it, write /tmp/ab/${NAME}/verdicts/<your number>.json.`);
console.log(`  Do NOT paste the claim, the filenames, or anything about either arm into their prompts.`);
console.log(`  Then: make ab-record NAME=${NAME}\n`);
console.log(`  (key.json is sealed 0400 — do not open it until the verdicts are recorded.)\n`);
