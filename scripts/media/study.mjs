// study.mjs, READ A REFERENCE FILM. The film-side twin of `make sections`.
//
// `make sections` inventories a real WEBSITE so a film can reflect it: a shot per section, a stable
// selector, a ready capture command. Nothing here read a FILM. Every frame tool we own (make beats,
// make reveal, make seam-check, make judge) points at our OWN output, so a reference is studied by
// eye, once, and the study is lost. This writes the study down.
//
//   node scripts/media/study.mjs <video> [name] [--threshold 0.3] [--min-shot 0.4] [--fixed 2] [--cells 4]
//
// NAME IT FOR A PERSON. The name becomes grammar/<name>.json, a row in docs/CRAFT/GRAMMAR.md and, if
// the film earns a deep study, docs/CRAFT/REF-<name>.md. The first one written here was called
// `pin-16818198602994243`, which is the id in a URL: it says nothing about a film anyone might be
// looking for, and it was the filename of a download rather than a decision. `together-chat` is the
// same film.
//   make study VIDEO=refs/brew.mp4 NAME=brew
//
// It writes refs/<name>/: sheet.png (one row per shot: in · mid · out), study.json (the measured
// facts) and study.md (the table an author fills in). refs/ is gitignored, which is the point below.
//
// WHAT IT MEASURES, AND WHERE THAT STOPS. Duration, resolution, fps and shot boundaries come off the
// file. So do three facts per shot that used to be left blank, because a person filling them in was
// reading them off the sheet by eye anyway, and an eye reads a still while two of the three are
// properties of MOTION:
//
//   GROUND    mean luma across the shot. Which way the world is lit, and therefore which `bg` window
//             the recreation needs. Read off a still, correctly, so this one was only ever tedious.
//   MOTION    mean |luma delta| between consecutive frames, the SAME measurement internal/scene/scene.go
//             prints beside a render's duration and on the same 0.5 floor, so a reference and our
//             attempt at it are two numbers on one scale rather than two impressions.
//   TONE      the most saturated colour in the shot, and how saturated. A still shows you the hue; it
//             does not tell you whether the shot is carrying one accent or is simply grey.
//
// WHAT STAYS BLANK, and it is the important half. "What is on screen", "what MOVES" (as in which
// object and in which direction, not how much), "what triggers the next shot" and "what sound sits
// there" are judgements. A tool that guessed them would produce a confident wrong answer wearing a
// measurement's clothes, which is the failure mode this repo has already deleted two gates for.
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

// ── the film as two per-frame series, in two decodes ─────────────────────────────────────────────
//
// WHY THIS REPLACED PER-SHOT SAMPLING. The old shape asked ffmpeg a question per shot per statistic,
// so a 5-shot film cost 11 decodes, and each answer was one number for a span. That is the wrong shape
// twice over: it is slower, and a mean over 3.5 seconds cannot tell a shot that moves steadily from one
// that holds for three seconds and then explodes. In a 20s film a great deal happens and a per-shot
// average is a summary of a summary.
//
// Two decodes now, over the WHOLE film, at its own frame rate:
//   LUMA   how light the frame is, per frame
//   DELTA  how much it changed from the frame before, per frame
//
// Every per-shot figure is then a slice of an array we already hold, and the arrays are what make the
// rest possible: choosing which frames are worth LOOKING at, and storing the film's shape rather than
// its average.
//
// COST. Two full decodes at 160x90 of a 30s file is about a second. The sheet after it is unchanged.
// Nothing here costs an agent a token: ffmpeg reads every frame, and tokens are only spent on the
// handful of frames that end up in the sheet, which is exactly the split to want.
function frameSeries(chain) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', VIDEO, '-an', '-vf',
    `${chain},metadata=mode=print:key=lavfi.signalstats.YAVG`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = [];
  let t = null;
  for (const line of String(r.stderr).split('\n')) {
    const p = /pts_time:\s*([0-9.]+)/.exec(line);
    if (p) { t = +p[1]; continue; }
    const v = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec(line);
    if (v && t != null) { out.push({ t, v: +v[1] }); t = null; }
  }
  return out;
}

const LUMA = frameSeries('scale=160:90,signalstats');
// The first difference frame is the frame against itself and reads 0. Dropped rather than averaged in,
// because "how much did this change from the one before" has no answer for the first frame.
const DELTA = frameSeries('scale=160:90,tblend=all_mode=difference,signalstats').slice(1);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const between = (series, t0, t1) => series.filter((x) => x.t >= t0 && x.t < t1).map((x) => x.v);

// A CUT IS A PROPERTY OF THE JOINT, NOT OF THE SHOT AFTER IT. The first difference frame inside a shot
// is that shot's opening frame measured against the CLOSING FRAME OF THE PREVIOUS ONE, so on a hard cut
// it is enormous and it belongs to neither shot. Measured on the first film through here: shots 2 to 5
// reported peaks of 218, 215, 203 and 192 while their loudest real frame was 33, and a 1.17s shot whose
// own peak is 6.9 reported a mean of 6.64 because one cut frame dominated its 35.
//
// So a shot's own statistics start after the joint, and the joint's size is kept separately, where it
// is worth having: it is the measurement of how hard the film cuts.
const CUT_GUARD = 2;   // difference frames to drop at a shot's head. Two, because a cut can smear one.
const insideShot = (t0, t1, isFirst) => {
  const xs = DELTA.filter((x) => x.t >= t0 && x.t < t1);
  return (isFirst ? xs : xs.slice(CUT_GUARD)).map((x) => x.v);
};
const jointSize = (t0, isFirst) => {
  if (isFirst) return null;
  const head = DELTA.filter((x) => x.t >= t0).slice(0, CUT_GUARD).map((x) => x.v);
  return head.length ? Number(Math.max(...head).toFixed(1)) : null;
};

// ── per-shot measurement: ground · motion · tone ─────────────────────────────────────────────────
// Three numbers a person was reading off the contact sheet by eye, two of which a still cannot show.
//
// THE MOTION FIGURE IS THE SAME ONE THE RENDERER PRINTS, deliberately. internal/scene/scene.go
// measures mean |luma delta| between consecutive frames on a downscaled grid and calls a frame still
// below 0.5; the same scale here is what lets "the reference runs 1.7 and ours runs 0.3" be one
// sentence instead of two unrelated impressions. Both are calibrated against the same ffmpeg
// expression (scale,tblend=difference,signalstats YAVG), which is what this asks ffmpeg for directly.
//
// Sampled, not exhaustive: a 3fps read over the shot. A shot is a held idea, so the difference between
// sampling it and decoding every frame is noise, and decoding every frame of a 30s file five times
// over is thirty seconds a study does not need to cost.
const SAMPLE_FPS = 3;             // enough for a shot's mean LUMA: a shot is a held idea.
const STILL_FLOOR = 0.5;          // the same floor internal/scene/scene.go uses. One owner, two readers.

// MOTION IS READ AT THE FILM'S OWN RATE, and the first cut of this read it at SAMPLE_FPS with a comment
// claiming the result was on the renderer's scale. It was not, and the error is instructive: a frame
// difference is a difference between CONSECUTIVE frames, so sampling at 3fps puts ten times the time
// between them and returns roughly ten times the number. The shots came back at 18 and 21 against a
// renderer that prints 0.3 to 1.7, and both numbers were captioned as comparable.
//
// A luma AVERAGE is indifferent to how often you sample it. A luma DELTA is a measurement of the gap.
// So `ground` keeps the cheap sampling and `motion` decodes every frame of the shot.

// `signalstats` computes YAVG into FRAME METADATA and prints nothing on its own: the `metadata=print`
// filter after it is what puts a number on stderr, and `-v error` then suppresses the very lines being
// parsed. Both were wrong in the first cut of this, and the symptom was a table of `?` rather than an
// error, which is this repo's most-logged failure shape wearing a study's clothes.
const statOf = (t0, len, chain) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-ss', t0.toFixed(3), '-t', Math.max(0.2, len).toFixed(3),
    '-i', VIDEO, '-vf', `${chain},metadata=mode=print:key=lavfi.signalstats.YAVG`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 24 });
  const vals = [...String(r.stderr).matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

// The most saturated pixel of an 8x8 reduction, per shot. Eight by eight because a 1x1 average of a
// black frame with one blue mark on it is black, which is true and useless: the question a recreation
// asks is "is this shot carrying an accent", and an average answers "no" to every shot that is mostly
// ground. Reduced rather than full-res so one dead pixel cannot be the answer.
const toneOf = (t0, len) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', t0.toFixed(3), '-t', Math.max(0.2, len).toFixed(3),
    '-i', VIDEO, '-vf', `fps=1,scale=8:8`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
    { encoding: 'buffer', maxBuffer: 1 << 24 });
  const buf = r.stdout;
  if (!buf || buf.length < 3) return null;
  let best = null;
  for (let i = 0; i + 2 < buf.length; i += 3) {
    const [R, G, B] = [buf[i], buf[i + 1], buf[i + 2]];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    // Saturation on the HSV definition, weighted by value: a saturated near-black is noise, not an
    // accent, and without the weight the answer to every dark shot is whichever pixel is least black.
    const sat = mx === 0 ? 0 : ((mx - mn) / mx) * (mx / 255);
    if (!best || sat > best.sat) best = { sat, hex: `#${[R, G, B].map((c) => c.toString(16).padStart(2, '0')).join('')}` };
  }
  return best;
};

const measureShot = (s) => {
  const luma = mean(between(LUMA, s.t0, s.t1));
  const deltas = insideShot(s.t0, s.t1, s.i === 1);
  const delta = mean(deltas);
  const joint = jointSize(s.t0, s.i === 1);
  const tone = toneOf(s.t0, s.len);
  // THE SHAPE, not just the average. A shot that holds for three seconds and then explodes has the same
  // mean as one that moves steadily, and they are different shots. `peak` is the loudest single frame
  // and `held` is the share of the shot below the still floor, so "3.0 average, peak 14, 60% held"
  // describes a beat that a single number cannot.
  const peak = deltas.length ? Math.max(...deltas) : null;
  const held = deltas.length ? deltas.filter((d) => d < STILL_FLOOR).length / deltas.length : null;
  // Downsampled by MAX, never by mean. A mean over a quarter-second erases the single-frame burst that
  // is the whole point of keeping a curve at all: the bloom in shot 1 peaks at 49 for a few frames and
  // averages to 3, and it is the 49 that tells you what the shot does.
  const BUCKETS = Math.max(1, Math.round(s.len * 4));
  const guarded = DELTA.filter((x) => x.t >= s.t0 && x.t < s.t1);
  const body = s.i === 1 ? guarded : guarded.slice(CUT_GUARD);
  const curve = Array.from({ length: BUCKETS }, (_, b) => {
    const lo = s.t0 + (b / BUCKETS) * s.len, hi = s.t0 + ((b + 1) / BUCKETS) * s.len;
    const win = body.filter((x) => x.t >= lo && x.t < hi).map((x) => x.v);
    return win.length ? Number(Math.max(...win).toFixed(1)) : 0;
  });
  return {
    luma: luma == null ? null : Number(luma.toFixed(1)),
    ground: luma == null ? null : (luma > 128 ? 'light' : luma > 60 ? 'mid' : 'dark'),
    motion: delta == null ? null : Number(delta.toFixed(2)),
    peak: peak == null ? null : Number(peak.toFixed(2)),
    joint,
    held: held == null ? null : Number(held.toFixed(2)),
    frames: deltas.length,
    curve,
    alive: delta == null ? null : delta >= STILL_FLOOR,
    accent: tone && tone.sat > 0.12 ? tone.hex : null,
    saturation: tone ? Number(tone.sat.toFixed(3)) : null,
  };
};

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

// Measured once, here, so study.json, the sheet and the table all read the same numbers rather than
// each asking ffmpeg its own question. One fact, one owner: the failure this repo logs most often.
for (const s of shots) Object.assign(s, measureShot(s));

const lens = shots.map((s) => s.len).sort((a, b) => a - b);
const median = lens.length % 2 ? lens[(lens.length - 1) / 2] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2;

// ── which frames are worth LOOKING at ────────────────────────────────────────────────────────────
//
// THE ONE PLACE TOKENS ARE SPENT, so it is the one place the choice matters. ffmpeg reads every frame
// for free; an agent reads the contact sheet. The old sheet took in · mid · out of each shot, which is
// a choice by POSITION, and position is uncorrelated with what happens. On a 9.5s shot the midpoint is
// a frame chosen because it is halfway, and a lot happens in nine seconds.
//
// EVENTS, instead. The delta series is the film's change curve, and its local maxima are the moments
// something starts, stops or lands: an entrance settling, a word arriving, a camera braking. Picking
// those costs no more tokens than picking the midpoint and shows the shot's structure rather than its
// middle. The first and last frame of a shot are always kept, because "what it opens on" and "what it
// leaves on" are questions about position and are answered correctly by position.
//
// SEPARATED, so three peaks 100ms apart do not spend three cells on one event. The separation is a
// fraction of the shot rather than a constant: on a 1.2s shot 0.4s apart is three distinct moments,
// and on an 11s shot it is the same instant three times.
const CELLS = Number(flag('--cells', 4));       // frames per shot row, including the in and out frames

function eventFrames(s, n) {
  const inT = Math.min(s.t0 + 0.08, s.t1 - 0.01);
  const outT = Math.max(s.t1 - 0.08, s.t0);
  const want = Math.max(0, n - 2);
  if (want === 0) return [inT, outT];
  const sep = Math.max(0.25, s.len / (n + 1));
  // Rank every frame in the shot by how much it changed, then take them greedily while keeping them
  // `sep` apart. Greedy is the right algorithm here and not a shortcut: the question is "show me the
  // n loudest distinct moments", which is exactly what greedy-by-rank-with-a-spacing-rule answers.
  const inner = DELTA.filter((x) => x.t > inT + sep * 0.5 && x.t < outT - sep * 0.5)
    .sort((a, b) => b.v - a.v);
  const picked = [];
  for (const cand of inner) {
    if (picked.length >= want) break;
    if (picked.every((p) => Math.abs(p - cand.t) >= sep)) picked.push(cand.t);
  }
  // A shot with nothing happening in it has no events, and padding with midpoints would invent
  // structure. It gets a shorter row, and a shorter row IS the reading: nothing happened here.
  return [inT, ...picked.sort((a, b) => a - b), outT];
}

// ── contact sheet: one row per shot, in · mid · out ───────────────────────────────────────────────
// Same shape as make beats, and for the same reason: the middle of a shot is the frame that hides the
// entrance, which is exactly what a study is looking for (docs/CRAFT/REFERENCE-STUDY.md, MISTAKES #124).
const frames = path.join(dir, 'frames');
fs.mkdirSync(frames, { recursive: true });
const tileW = 300, tileH = Math.round((tileW * height) / width);
const rows = [];
for (const s of shots) {
  const ts = eventFrames(s, CELLS).map((t) => Math.max(s.t0, Math.min(s.t1 - 0.01, t)));
  const cells = ts.map((t, k) => {
    // The label says WHY this frame is in the sheet. A cell captioned `peak 12.4` is a claim the reader
    // can check against the picture; one captioned `mid` was only ever a coordinate.
    const d = DELTA.reduce((best, x) => (Math.abs(x.t - t) < Math.abs(best.t - t) ? x : best), DELTA[0] || { t: 0, v: 0 });
    const tag = k === 0 ? 'in' : k === ts.length - 1 ? 'out' : `peak ${d.v.toFixed(1)}`;
    const out = path.join(frames, `s${String(s.i).padStart(2, '0')}_${tag}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', VIDEO, '-frames:v', '1', '-vf',
      `scale=${tileW}:${tileH},drawtext=text='${drawtext(`${s.i}.${tag} ${t.toFixed(2)}s`)}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65`,
      out], out, `shot ${s.i} ${tag}`);
    return out;
  });
  const row = path.join(frames, `row_${String(s.i).padStart(2, '0')}.png`);
  // PADDED TO A COMMON WIDTH, because a shot with no events gets fewer cells and `vstack` refuses rows
  // of different widths. The pad is on the right and is black, so a short row reads as what it is:
  // a shot where nothing happened worth looking at.
  ffmpegOrDie(['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]),
    '-filter_complex', `hstack=inputs=${cells.length},pad=${tileW * CELLS}:${tileH}:0:0:black`,
    '-frames:v', '1', row], row, `row ${s.i}`);
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
  shots: shots.map((s) => ({ i: s.i, t0: fx(s.t0), t1: fx(s.t1), len: fx(s.len),
    score: s.score == null ? null : fx(s.score, 3),
    luma: s.luma, ground: s.ground, motion: s.motion, alive: s.alive, accent: s.accent, saturation: s.saturation })),
};
fs.writeFileSync(path.join(dir, 'study.json'), JSON.stringify(study, null, 2) + '\n');

// ── the grammar store: the one artefact that OUTLIVES the checkout ───────────────────────────────
//
// `refs/` is gitignored, on purpose and correctly: it holds other people's films. So everything this
// tool learns has been dying with the working copy. Eleven reference films sat in that directory the
// day this was written and not one had a study beside it, which is the same evaporation the tool was
// built to stop, one level up: the sheet stopped the reading being lost inside a session, and nothing
// stopped it being lost between them.
//
// `grammar/<name>.json` is COMMITTED, and what makes that safe is exactly what makes it useful. It
// carries no frame, no crop, no copy and no mark: shot lengths, mean luma, frame-to-frame motion, one
// accent hex per shot, and the sentences a person wrote about what causes what. That is the causal
// skeleton the study method says to keep and the pixels are the half it says to throw away, so the
// committed artefact is the legal one by construction rather than by care.
//
// The measured half is written every run and overwrites. The AUTHORED half is merged forward, never
// clobbered: a re-study after a threshold change must not silently delete the judgements somebody made
// against the old one.
const GRAMMAR_DIR = path.join(ROOT, 'grammar');

function writeGrammar(study, shots) {
  fs.mkdirSync(GRAMMAR_DIR, { recursive: true });
  const file = path.join(GRAMMAR_DIR, `${NAME}.json`);
  let prior = null;
  try { prior = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first study of this film */ }
  const priorShot = (i) => (prior && prior.shots || []).find((x) => x.i === i) || {};

  const out = {
    name: NAME,
    // The FILENAME, never the file. A reader who has the film can point study at it again; a reader who
    // does not still gets every number and every judgement, which is the whole point of committing this.
    source: path.basename(study.source),
    measured: study.measured,
    shots: shots.map((s) => ({
      i: s.i, t0: Number(s.t0.toFixed(2)), len: Number(s.len.toFixed(2)),
      ground: s.ground, luma: s.luma, accent: s.accent,
      // THE SHAPE, not just the average. Two shots with the same mean are different shots if one holds
      // and then explodes. `peak` is the loudest single frame, `held` the share of frames below the
      // still floor, and `curve` is the change series itself at 4 samples a second: enough to see a
      // build, a stop and a burst, small enough that a whole film is a few dozen numbers.
      motion: s.motion, peak: s.peak, held: s.held, frames: s.frames, joint: s.joint,
      curve: s.curve,
      // authored, merged forward
      onScreen: priorShot(s.i).onScreen ?? null,
      moves: priorShot(s.i).moves ?? null,
      trigger: priorShot(s.i).trigger ?? null,
    })),
    // Film-level judgements. `pace` and `motionBand` are derived; the rest are a person's.
    pace: { medianShot: study.measured.medianShot, perMinute: study.measured.cutsPerMinute },
    groundPattern: shots.map((s) => s.ground || '?').join(' → '),
    motionBand: (() => {
      const ms = shots.map((s) => s.motion).filter((m) => typeof m === 'number');
      return ms.length ? { lo: Math.min(...ms), hi: Math.max(...ms) } : null;
    })(),
    threads: (prior && prior.threads) ?? null,
    spectacle: (prior && prior.spectacle) ?? null,
    takeaway: (prior && prior.takeaway) ?? null,
  };
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  return { file, filled: out.shots.filter((x) => x.onScreen).length, total: out.shots.length };
}

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

Everything left of \`on screen\` is MEASURED. \`ground\` is the shot's mean luma, \`motion\` is the mean
frame-to-frame luma delta on the same scale \`./bin/vawe\` prints beside a render (still below ${STILL_FLOOR}), and
\`tone\` is the most saturated colour in the shot, or blank when the shot carries no accent at all.

The three right-hand columns are yours, and they are judgements no measurement reaches: WHICH object
moves and where it goes, what makes the next shot arrive, and what sits under it.

| # | time | length | ground | motion | peak | held | tone | on screen | what moves where | what triggers the next |
|---|------|--------|--------|--------|------|------|------|-----------|------------------|------------------------|
${shots.map((s) => `| ${s.i} | ${fx(s.t0)}s | ${fx(s.len)}s | ${s.ground ?? '?'} ${s.luma ?? ''} | ${s.motion ?? '?'} | ${s.peak ?? '?'} | ${s.held == null ? '?' : Math.round(s.held * 100) + '%'} | ${s.accent || '·'} | <…> | <…> | <…> |`).join('\n')}

\`peak\` is the loudest single frame and \`held\` is the share of frames below the still floor. Two shots
with the same \`motion\` are different shots when one of them holds for three seconds and then explodes,
and the contact sheet is now cut AT those peaks rather than at each shot's midpoint.

**The film's own motion, for comparison with ours.** Reference films in \`refs/\` run 1.7 to 2.0 and are
still for 13-24% of their frames; this library's median film runs far below that. \`./bin/vawe <scene>\`
prints the same number for our attempt, so the recreation has a target rather than an impression.

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
const g = writeGrammar(study, shots);
console.log(`  grammar → ${rel(g.file)}  (${g.filled}/${g.total} shots carry an authored reading; it is COMMITTED and outlives refs/)`);
console.log(`  Read ${rel(sheet)}, fill the four authored columns in ${rel(dir)}/study.md, then storyboard.`);
