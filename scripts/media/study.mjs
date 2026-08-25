// study.mjs — READ A REFERENCE FILM. The film-side twin of `make sections`.
//
// `make sections` inventories a real WEBSITE so a film can reflect it: a shot per section, a stable
// selector, a ready capture command. Nothing here read a FILM. Every frame tool we own (make beats,
// make reveal, make seam-check, make judge) points at our OWN output, so a reference is studied by
// eye, once, and the study is lost. This writes the study down.
//
//   node scripts/media/study.mjs <video> [name] [--threshold 0.3] [--min-shot 0.4] [--fixed 2]
//   make study VIDEO=refs/brew.mp4 NAME=brew
//
// It writes refs/<name>/: sheet.png (one row per shot: in · mid · out), study.json (the measured
// facts) and study.md (the table an author fills in). refs/ is gitignored, which is the point below.
//
// WHAT IT MEASURES, AND WHERE THAT STOPS. Duration, resolution, fps and shot boundaries come off the
// file. "What is on screen", "what moves", "what triggers the next shot" and "what sound sits there"
// do not, and a tool that guessed them would produce a confident wrong answer that reads like a
// measurement. So study.md ships those four columns EMPTY. A human fills them from the sheet.
//
// COPYRIGHT. This reads someone else's film to learn its GRAMMAR: shot lengths, the cut rate, what
// triggers what. It is not a lifting tool. The sheet and the frames stay in refs/, which .gitignore
// excludes, and nothing here emits a scene layer, an asset path or a crop. Never put a reference's
// frames, copy or marks in a film we publish (CLAUDE.md, "Never embed copyrighted material").
// The method this follows discards the reference's UI, copy and colour on purpose and keeps only the
// causal skeleton. Copying the skeleton is study. Copying the pixels is a Content ID claim.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { drawtext } from '../author/sheets.mjs';
import { ffmpegOrDie } from '../lib/scratch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const VIDEO = positional[0];
const THRESHOLD = Number(flag('--threshold', 0.3));
const MIN_SHOT = Number(flag('--min-shot', 0.4));   // two detections closer than this are one cut
const FIXED = Number(flag('--fixed', 2));           // fallback sampling period, seconds

const die = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };

if (argv.includes('--selftest')) {
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error(`✗ ${m}: ${JSON.stringify(a)}`); process.exit(1); } };
  const run = [{ t: 3.0, score: 0.4 }, { t: 3.1, score: 0.9 }, { t: 3.2, score: 0.5 }, { t: 6.0, score: 0.7 }];
  eq(clusterCuts(run, 0.3, 0.4), [{ t: 3.1, score: 0.9 }, { t: 6.0, score: 0.7 }], 'a run collapses to its peak');
  eq(clusterCuts(run, 0.95, 0.4), [], 'nothing above the threshold is no cuts, not a guess');
  eq(clusterCuts([{ t: 0.1, score: 0.9 }], 0.3, 0.4), [], 'the first frames are never a cut');
  console.log('✓ study selftest: clusterCuts');
  process.exit(0);
}

if (!VIDEO) die('usage: node scripts/media/study.mjs <video> [name] [--threshold 0.3]');
if (!fs.existsSync(VIDEO)) die(`no such file: ${VIDEO}`);
// A missing tool is not a clean result. seam-snap reported one for months (docs/MISTAKES.md), so this
// refuses at the entry point and names the binary rather than producing an empty study.
for (const bin of ['ffprobe', 'ffmpeg']) {
  if (spawnSync(bin, ['-version'], { encoding: 'utf8' }).error) {
    die(`${bin} is not on PATH. \`make study\` reads the file with ffmpeg; install it (brew install ffmpeg) and re-run.`);
  }
}

// ── probe: the facts that come off the file ──────────────────────────────────────────────────────
const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
  'stream=width,height,r_frame_rate', '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1', VIDEO], { encoding: 'utf8' });
const fields = Object.fromEntries(String(probe.stdout).trim().split('\n').filter(Boolean)
  .map((l) => l.split('=')).map(([k, v]) => [k, v]));
const width = +fields.width, height = +fields.height;
const duration = +fields.duration;
const fpsM = /^(\d+)(?:\/(\d+))?$/.exec(String(fields.r_frame_rate || ''));
const fps = fpsM ? +fpsM[1] / (fpsM[2] ? +fpsM[2] : 1) : 0;
// Entry-point validation: anything without a real video stream stops here, named. A text file handed
// to the sampler further down produces a stack trace from ffmpeg, which reads as a tool bug.
if (!width || !height || !(duration > 0)) {
  die(`${VIDEO} has no readable video stream (ffprobe found width=${fields.width ?? '?'} height=${fields.height ?? '?'} duration=${fields.duration ?? '?'}). Is it a video?`);
}
const hasAudio = !!String(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
  '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', VIDEO], { encoding: 'utf8' }).stdout).trim();

const NAME = positional[1] || path.basename(VIDEO).replace(/\.[^.]+$/, '');
const dir = path.join(ROOT, 'refs', NAME);
// Clear first, same reason as sections.mjs: shot files are numbered from the detection, so a re-run at
// a different threshold leaves the old numbering beside the new one and the sheet stops matching the doc.
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

/** The frames eligible to BE a cut. The first frame always scores high because nothing precedes it,
 *  so ffmpeg reports the opening of every film as a scene change. One owner for that rule, because
 *  the peak and the near-miss count are both reported as reasons and must describe the same set:
 *  peak was once taken over every hit, so a film whose only high score was its own first frame
 *  printed "peak 0.593, below 0.3" and stated a reason that was not true. */
function cutEligible(h) { return h.t > 0.2; }

/** One cut lands on several consecutive frames, so collapse a run into its highest-scoring frame.
 *  Pure and exported so `--selftest` can assert it without a video file. */
export function clusterCuts(hits, threshold, minShot) {
  const out = [];
  for (const h of hits.filter((x) => x.score > threshold && cutEligible(x)).sort((a, b) => a.t - b.t)) {
    const prev = out[out.length - 1];
    if (prev && h.t - prev.t < minShot) { if (h.score > prev.score) { prev.t = h.t; prev.score = h.score; } continue; }
    out.push({ ...h });
  }
  return out;
}

// ── shot boundaries ──────────────────────────────────────────────────────────────────────────────
// ffmpeg's scene score per frame. A hard cut spikes it; a dissolve does not, which is why the result
// below is reported with its evidence instead of asserted. Detections cluster (a cut lands on several
// consecutive frames), so nearby hits collapse to the highest-scoring one.
function detectCuts() {
  const meta = path.join(dir, '.scene-scores.txt');
  ffmpegOrDie(['-v', 'error', '-y', '-i', VIDEO, '-an',
    '-vf', `select='gt(scene,0.01)',metadata=print:file=${meta}`, '-f', 'null', '-'], meta, 'scene detect');
  const hits = [];
  let t = null;
  for (const line of fs.readFileSync(meta, 'utf8').split('\n')) {
    const p = /pts_time:([0-9.]+)/.exec(line);
    if (p) { t = +p[1]; continue; }
    const s = /scene_score=([0-9.]+)/.exec(line);
    if (s && t != null) { hits.push({ t, score: +s[1] }); t = null; }
  }
  fs.rmSync(meta, { force: true });
  const eligible = hits.filter(cutEligible);
  const peak = eligible.reduce((m, h) => Math.max(m, h.score), 0);
  const clustered = clusterCuts(hits, THRESHOLD, MIN_SHOT);
  // Near-misses are the hint that the threshold is wrong for THIS film, and the author cannot see
  // them from the sheet. Our own renders cross-dissolve, so half their authored cuts land here.
  const near = eligible.filter((h) => h.score > THRESHOLD / 2 && h.score <= THRESHOLD).length;
  return { peak, near, cuts: clustered };
}

const { peak, near, cuts } = detectCuts();
const detected = cuts.length > 0;
// Fall back rather than ship a wrong cut list. A film built on dissolves scores nothing at any usable
// threshold (creed.mp4 peaks at 0.12), and a one-shot film correctly scores nothing at all.
const bounds = detected
  ? [0, ...cuts.map((c) => c.t)]
  : Array.from({ length: Math.max(2, Math.ceil(duration / FIXED)) }, (_, i) => (i * duration) / Math.max(2, Math.ceil(duration / FIXED)));
const shots = bounds.map((t0, i) => ({
  i: i + 1, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration,
  score: detected ? (i === 0 ? null : cuts[i - 1].score) : null,
})).filter((s) => s.t1 - s.t0 > 0.05).map((s) => ({ ...s, len: s.t1 - s.t0 }));

const lens = shots.map((s) => s.len).sort((a, b) => a - b);
const median = lens.length % 2 ? lens[(lens.length - 1) / 2] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2;

// ── contact sheet: one row per shot, in · mid · out ───────────────────────────────────────────────
// Same shape as make beats, and for the same reason: the middle of a shot is the frame that hides the
// entrance, which is exactly what a study is looking for (docs/CRAFT/REFERENCE-STUDY.md, MISTAKES #124).
const frames = path.join(dir, 'frames');
fs.mkdirSync(frames, { recursive: true });
const tileW = 300, tileH = Math.round((tileW * height) / width);
const rows = [];
for (const s of shots) {
  const ts = [s.t0 + 0.08, (s.t0 + s.t1) / 2, s.t1 - 0.08].map((t) => Math.max(s.t0, Math.min(s.t1 - 0.01, t)));
  const cells = ts.map((t, k) => {
    const tag = k === 0 ? 'in' : k === 1 ? 'mid' : 'out';
    const out = path.join(frames, `s${String(s.i).padStart(2, '0')}_${tag}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', VIDEO, '-frames:v', '1', '-vf',
      `scale=${tileW}:${tileH},drawtext=text='${drawtext(`${s.i}.${tag} ${t.toFixed(2)}s`)}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65`,
      out], out, `shot ${s.i} ${tag}`);
    return out;
  });
  const row = path.join(frames, `row_${String(s.i).padStart(2, '0')}.png`);
  ffmpegOrDie(['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]),
    '-filter_complex', `hstack=inputs=${cells.length}`, '-frames:v', '1', row], row, `row ${s.i}`);
  rows.push(row);
}
const sheet = path.join(dir, 'sheet.png');
ffmpegOrDie(['-v', 'error', '-y', ...rows.flatMap((r) => ['-i', r]),
  '-filter_complex', `vstack=inputs=${rows.length}`, '-frames:v', '1', sheet], sheet, 'contact sheet');

// ── the study ─────────────────────────────────────────────────────────────────────────────────────
const fx = (n, d = 2) => Number(n.toFixed(d));
const study = {
  source: (() => { const r = path.relative(ROOT, path.resolve(VIDEO)); return r.startsWith('..') ? path.resolve(VIDEO) : r; })(),
  name: NAME,
  measured: {
    duration: fx(duration), width, height, fps: fx(fps, 3),
    aspect: `${width}:${height}`, hasAudio,
    shotDetection: detected ? 'scene-score' : 'fixed-sampling',
    threshold: THRESHOLD, peakSceneScore: fx(peak, 3), nearMisses: near,
    shots: shots.length, medianShot: fx(median), cutsPerMinute: fx((shots.length / duration) * 60, 1),
  },
  shots: shots.map((s) => ({ i: s.i, t0: fx(s.t0), t1: fx(s.t1), len: fx(s.len), score: s.score == null ? null : fx(s.score, 3) })),
};
fs.writeFileSync(path.join(dir, 'study.json'), JSON.stringify(study, null, 2) + '\n');

const rel = (p) => path.relative(ROOT, p);
const note = detected
  ? `Shot boundaries are MEASURED (ffmpeg scene score > ${THRESHOLD}, peak ${fx(peak, 3)}). Check them against the sheet.`
  : `NO hard cuts found (peak scene score ${fx(peak, 3)}, below ${THRESHOLD}). The film dissolves, or it is one shot. Rows below are a FIXED ${FIXED}s sample, not a cut list.`;

const md = `# Study · ${NAME}

Source: \`${study.source}\` · ${study.measured.duration}s · ${width}x${height} · ${study.measured.fps}fps · ${hasAudio ? 'has audio' : 'no audio track'}
Sheet: \`${rel(sheet)}\`

${note}
${shots.length} ${detected ? 'shots' : 'samples'} · median ${study.measured.medianShot}s · ${study.measured.cutsPerMinute} per minute.

> You are not copying this film's look. You are extracting its GRAMMAR: how long a shot holds, what
> makes the next one arrive, what carries across. Throw away its UI, its copy and its colours. Never
> put its frames or its marks in a film we publish.

## The table

The first two columns are measured. The last four are yours: fill them from the sheet, one line each.

| # | time | length | on screen | what moves | what triggers the next | sound |
|---|------|--------|-----------|------------|------------------------|-------|
${shots.map((s) => `| ${s.i} | ${fx(s.t0)}s | ${fx(s.len)}s | <…> | <…> | <…> | <…> |`).join('\n')}

## Then cut it

The method that produced this table cut a 31s film to 15s by REMOVING shots, never by speeding them
up. One event per screen. Mark each row above KEEP or CUT before you write a storyboard.

## Carry forward

Answer these three, then run \`make storyboard-draft\` (or write the storyboard by hand) and paste the
answers in. The storyboard is where they turn into our film.

- **pace:** median shot ${study.measured.medianShot}s. Our library runs 2.5-4s beats. Do we match this reference, and can we?
- **threads:** what survives a cut here? Name it, then name OUR version of it in our own subject.
- **spectacle:** which single shot is the loud one, and what makes it loud?

Storyboard fields these feed: \`pace:\`, \`threads:\`/\`object:\`, \`spectacle:\`.
See \`docs/CRAFT/STORYBOARD-TEMPLATE.md\` and \`docs/CRAFT/REFERENCE-STUDY.md\`.
`;
fs.writeFileSync(path.join(dir, 'study.md'), md);

// ── report ────────────────────────────────────────────────────────────────────────────────────────
console.log(`✓ ${shots.length} ${detected ? 'shots' : 'fixed samples'} · ${study.measured.duration}s · ${width}x${height} · ${study.measured.fps}fps → ${rel(dir)}/`);
if (!detected) {
  console.log(`  ⚠ no hard cuts: peak scene score ${fx(peak, 3)} < ${THRESHOLD}. Dissolves or a single shot.`);
  console.log(`    Lower it with --threshold 0.15 if you believe there are cuts, then READ the sheet before trusting the list.`);
}
if (detected && near) {
  console.log(`  ⚠ ${near} frame(s) scored between ${THRESHOLD / 2} and ${THRESHOLD}: probably dissolves this list MISSES. Re-run with --threshold ${THRESHOLD / 2} and compare the sheets.`);
}
for (const s of shots) {
  console.log(`  ${String(s.i).padStart(2, ' ')}. ${fx(s.t0).toFixed(2)}s  ${fx(s.len).toFixed(2)}s${s.score == null ? '' : `  (score ${fx(s.score, 3)})`}`);
}
console.log(`\n  median shot ${study.measured.medianShot}s · ${study.measured.cutsPerMinute}/min${hasAudio ? '' : ' · NO audio track: the sound column is empty by fact, not by omission'}`);
console.log(`  Read ${rel(sheet)}, fill the four authored columns in ${rel(dir)}/study.md, then storyboard.`);
