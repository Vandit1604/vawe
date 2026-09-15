// harness/author/styleframes.mjs: the LOOK, settled and signed off, before the motion is trusted.
//
// Stage 5 of the studio pipeline, and the one this repo never had. A studio designs three to five
// frames to final quality and gets them approved BEFORE anyone animates, because animation is the
// expensive part and you cannot un-animate a look that was wrong. vawe's animation is cheap, so the
// economic argument is weaker here, but the DESIGN argument is not, and it is the one that bites:
// composition, hierarchy, palette and type are decisions a still forces you to resolve and motion lets
// you paper over. `onefile` shipped a backdrop that rendered as loud blue blocks, and it survived every
// static gate because no gate looks at a picture. One still would have shown it in three seconds.
//
// WHAT MAKES THIS DIFFERENT FROM `make beats`, which also grabs frames:
//   · beats samples EVERY beat at thumbnail size to check a film you have already built.
//     styleframes picks the few most visually DISTINCT moments, at full render scale, as the artefact
//     you approve and design against.
//   · beats answers "does each beat land". styleframes answers "is this the right-looking film at all".
//   · the frames are written full size, one file each, because a style frame is a deliverable you open
//     and stare at, not a cell in a contact sheet.
//
//   node harness/author/styleframes.mjs <scene.json> [--n 4] [--scale 2]
//   make styleframes D=films/scene/<name>.json [N=4]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { openScene } from './scene-page.mjs';

const args = process.argv.slice(2);
const D = args.find((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!D || !fs.existsSync(D)) { console.error('usage: styleframes <scene.json> [--n 4] [--scale 2]'); process.exit(2); }
const N = Math.max(2, Math.min(8, +flag('--n', 4)));
const SCALE = +flag('--scale', 2);

const SLUG = path.basename(D, '.json');
const OUT = `/tmp/styleframes/${SLUG}`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const scene = await openScene(D, { scale: SCALE, fps: 30 });
const dur = scene.meta.duration;

// ── pick the moments ───────────────────────────────────────────────────────────────────────────────
// NOT evenly spaced, and not one per beat. A film's beats are often four views of the same look, and
// five near-identical style frames tell you nothing you did not know from the first. So: sample densely,
// signature each frame, then greedily take the ones furthest from everything already taken. What comes
// back is the film's distinct LOOKS, which is the thing being approved.
const PROBES = Math.min(48, Math.max(12, Math.round(dur * 2)));
const sig = (file) => {
  // a coarse colour+luma fingerprint: 8x8 average grid. Enough to tell two compositions apart, blind
  // to the one-pixel differences that make every frame technically unique.
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=8:8', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 20 });
  return Array.from(raw);
};
const dist = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

process.stderr.write(`  probing ${PROBES} moments across ${dur.toFixed(1)}s…\n`);
const probes = [];
for (let i = 0; i < PROBES; i++) {
  // 6% in from each end: the first and last instants of a film are usually mid-fade and represent
  // nothing anybody designed.
  const t = dur * (0.06 + 0.88 * (i / Math.max(1, PROBES - 1)));
  const f = path.join(OUT, `.probe-${i}.png`);
  await scene.grab(t, f);
  probes.push({ t, f, s: sig(f) });
}

// SETTLED, NOT TRANSITIONAL. The first cut of this picked purely by distinctness and returned a frame
// at 0.88s with the headline still fading in at half opacity, a frame nobody designed, presented as
// the design. A style frame is the SETTLED state of a look. A probe sitting inside a transition differs
// sharply from both its neighbours, so that is exactly what to measure and penalise.
for (let i = 0; i < probes.length; i++) {
  const prev = probes[i - 1] || probes[i + 1] || probes[i];
  const next = probes[i + 1] || probes[i - 1] || probes[i];
  probes[i].motion = (dist(probes[i].s, prev.s) + dist(probes[i].s, next.s)) / 2;
}
const calm = Math.max(1, Math.min(...probes.map((p) => p.motion)) + 1);

// Greedy: take the frame furthest from everything already taken, discounted by how much it is moving.
// Start from the calmest probe rather than the first, because the first is only "first".
const score = (p, chosen) => Math.min(...chosen.map((q) => dist(p.s, q.s))) / (1 + p.motion / calm);
const picked = [probes.reduce((a, b) => (b.motion < a.motion ? b : a))];
while (picked.length < N && picked.length < probes.length) {
  let best = null, bestD = -1;
  for (const p of probes) {
    if (picked.includes(p)) continue;
    const d = score(p, picked);
    if (d > bestD) { bestD = d; best = p; }
  }
  if (!best) break;
  picked.push(best);
}
picked.sort((a, b) => a.t - b.t);

// ── write them full size ───────────────────────────────────────────────────────────────────────────
const frames = [];
for (const [i, p] of picked.entries()) {
  const file = path.join(OUT, `frame-${i + 1}-${p.t.toFixed(2).replace('.', 'p')}s.png`);
  fs.renameSync(p.f, file);
  frames.push({ t: p.t, file });
}
for (const p of probes) if (fs.existsSync(p.f)) fs.unlinkSync(p.f);
await scene.close();

// a sheet, purely for reading them together; the individual files are the deliverable
const sheet = path.join(OUT, 'sheet.png');
const cols = Math.min(2, frames.length);
const tileW = 900;
const inputs = frames.flatMap((f) => ['-i', f.file]);
const chain = frames.map((_, i) => `[${i}:v]scale=${tileW}:-2,pad=iw+16:ih+16:8:8:white[t${i}]`).join(';');
const rows = [];
for (let i = 0; i < frames.length; i += cols) {
  const r = frames.slice(i, i + cols).map((_, j) => `[t${i + j}]`).join('');
  rows.push(`${r}hstack=${Math.min(cols, frames.length - i)}[r${i}]`);
}
const stack = rows.length > 1 ? `;${rows.map((_, i) => `[r${i * cols}]`).join('')}vstack=${rows.length}[v]` : ';[r0]null[v]';
spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${chain};${rows.join(';')}${stack}`, '-map', '[v]', sheet]);

// ── the LOOK gates, and only the look gates ────────────────────────────────────────────────────────
// designspec (palette + font lock) judges appearance rather than motion. Running the motion gates here
// would be wrong: at this stage there is nothing to say about pacing, and a stage that reports failures
// it cannot act on teaches people to skip it.
// `slop` used to run here too. It was retired in 2026-08 (engine-doctrine/MISTAKES.md #340) and its script deleted,
// but this loop kept spawning it, so node exited 1 on a missing module and every run of this stage
// printed a phantom "✗ slop" and exited non-zero. A gate name that does not resolve to a file is a bug,
// never a finding, so resolve it first and say so loudly.
const look = [];
for (const g of ['designspec-check']) {
  const script = `quality/gates/${g}.mjs`;
  if (!fs.existsSync(script)) { console.error(`✗ styleframes: gate script ${script} does not exist. Fix the list, do not report it as a failing gate.`); process.exit(2); }
  const r = spawnSync('node', [script, D], { encoding: 'utf8' });
  look.push({ gate: g, code: r.status, out: (r.stdout || '') + (r.stderr || '') });
}

// ── the lock: what was approved, and whether it still is ───────────────────────────────────────────
// A style frame signed off against a scene that has since changed is not an approval, it is a memory.
// Same receipt idiom the beats sheet uses.
const hash = crypto.createHash('sha256').update(fs.readFileSync(D)).digest('hex').slice(0, 16);
const lock = { scene: D, sceneHash: hash, frames: frames.map((f) => ({ t: +f.t.toFixed(2), file: f.file })), scale: SCALE };
fs.writeFileSync(path.join(OUT, 'styleframes.lock.json'), JSON.stringify(lock, null, 2) + '\n');

console.log(`\n  STYLE FRAMES · ${SLUG} · ${frames.length} of ${PROBES} probed moments, most visually distinct first`);
for (const f of frames) console.log(`    ${f.t.toFixed(2).padStart(6)}s   ${f.file}`);
  console.log('  (picked for visual distinctness, biased toward SETTLED frames over mid-transition ones)');
console.log(`\n  sheet: ${sheet}`);
for (const l of look) {
  const bad = l.code !== 0;
  console.log(`  ${bad ? '✗' : '✓'} ${l.gate}${bad ? ': ' + (l.out.split('\n').find((x) => /[✗×]/.test(x)) || 'failed').trim() : ''}`);
}
console.log('\n  These are the LOOK, not the motion. Open them full size and answer only: is this the film');
console.log('  I want to have made? Composition, hierarchy, palette, type. Approve, then animate.\n');
process.exit(look.some((l) => l.code !== 0) ? 1 : 0);
