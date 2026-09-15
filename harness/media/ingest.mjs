// harness/media/ingest.mjs: turn a SOURCE video into something an agent can edit from.
//
// `cuts[]` (core/engine/expand.js) lets a scene chain real footage into a timeline: {src, in, out}
// entries, lowered into video layers by the relative-time grammar. An agent still has to WATCH the
// footage to find those in/out points, one timestamp at a time. This does that watching once: probe
// the file, find its shot boundaries and its quiet spans, draw a contact sheet, and write a starting
// cuts.json the agent edits rather than authors from nothing.
//
//   node harness/media/ingest.mjs <source.mp4> [name] [--threshold 0.3] [--min-shot 0.4]
//     [--silence-db -30] [--silence-min 0.5] [--out-dir films/scene]
//
// NO SECOND SCENE DETECTOR. Shot boundaries reuse study.mjs's own measurements: detectCuts (built on
// clusterCuts), detectSeams, detectPans, detectCrossfades and the merge that resolves them into one
// boundary list (mergeJoints) -- the same four-kind detection `make study` does for a reference film,
// pointed at a source clip instead. Those were module-scoped closures over study.mjs's own CLI flags
// (and importing study.mjs for them used to also RUN its whole CLI as a side effect, since none of its
// top-level script was guarded behind an "is this the main module" check); they now live in
// harness/media/shot-detect.mjs, pure functions with the free variables (video path, scratch dir,
// thresholds) turned into parameters, and study.mjs imports them back for its own CLI so there is
// exactly one copy of each.
//
// Writes films/scene/<name>.cuts.json (the cut list) and films/scene/<name>.contact-sheet.png
// (one cell per shot, labelled with its start time). If films/scene/<name>.transcript.json exists
// (shape documented below), each shot's overlapping words are folded in as a `note`.
//
// The CLI body below runs only when this file is the entry point (`if (isMain)`), not on import: an
// earlier version ran study.mjs's own script unguarded, which meant importing one pure function also
// probed a file, decoded frames and wrote a contact sheet as a side effect of `import`. Everything
// this file exports (parseSilenceOutput, buildContactSheet) is a pure or explicitly-invoked function,
// so importing this module for a test never runs ffmpeg on its own.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectCuts, detectSeams, detectPans, detectCrossfades, frameSeries, mergeJoints } from './shot-detect.mjs';
import { hasAudioStream } from './clip-audio.mjs';
import { drawtext } from '../author/sheets.mjs';
import { ffmpegOrDie } from '../lib/scratch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isMain = import.meta.url === `file://${process.argv[1]}`;

// Silence-span parsing pulled into its own pure function (ffmpeg's stderr text in, spans out) so
// ingest.test.mjs can assert it on a fixed string instead of spawning ffmpeg every run.
export function parseSilenceOutput(stderrText) {
  const silences = [];
  let start = null;
  for (const line of String(stderrText).split('\n')) {
    const s = /silence_start:\s*([0-9.]+)/.exec(line);
    if (s) { start = +s[1]; continue; }
    const e = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/.exec(line);
    if (e && start != null) { silences.push({ start, end: +e[1], duration: +e[2] }); start = null; }
  }
  return silences;
}

// One cell per shot, its start-time frame, labelled. hstack refuses a single input, so a one-shot
// source (no joints at all) falls back to a plain frame instead of asking ffmpeg to stack nothing.
export function buildContactSheet(video, shotList, dur, out, frameSize) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-sheet-'));
  const cellW = 320, cellH = Math.round(cellW * (frameSize.height / frameSize.width));
  const cells = shotList.map((s, k) => {
    const t = Math.max(0, Math.min(s.t0 + 0.08, dur - 0.05));
    const file = path.join(tmp, `s${String(k + 1).padStart(3, '0')}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf',
      `scale=${cellW}:${cellH},drawtext=text='${drawtext(`${k + 1} ${t.toFixed(2)}s`)}':x=6:y=6:`
      + "fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65",
      file], file, `shot ${k + 1} frame`);
    return file;
  });
  if (cells.length === 1) {
    ffmpegOrDie(['-v', 'error', '-y', '-i', cells[0], '-frames:v', '1', out], out, 'contact sheet');
  } else {
    ffmpegOrDie(['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]),
      '-filter_complex', `hstack=inputs=${cells.length}`, '-frames:v', '1', out], out, 'contact sheet');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (isMain) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  const SRC = positional[0];
  const NAME = positional[1] || path.basename(SRC || '').replace(/\.[^.]+$/, '');

  // Shot-detection defaults: THE SAME NUMBERS study.mjs defaults to, so a shot list drawn from a
  // source clip and a shot list drawn from a reference film agree on what counts as a cut, a seam, a
  // pan or a crossfade. Override any of them from the command line if this source needs it.
  const THRESHOLD = Number(flag('--threshold', 0.3));
  const MIN_SHOT = Number(flag('--min-shot', 0.4));
  const SEAM_THRESHOLD = Number(flag('--seam-threshold', 0.3));
  const EDGE_LOW = Number(flag('--edge-low', 0.08));
  const EDGE_HIGH = Number(flag('--edge-high', 0.2));
  const PAN_FLOOR = Number(flag('--pan-floor', 6));
  const PAN_MIN_RUN = Number(flag('--pan-min-run', 0.4));
  const CROSSFADE_LO = Number(flag('--crossfade-lo', 0.5));
  const CROSSFADE_HI = Number(flag('--crossfade-hi', 5));
  const CROSSFADE_MIN_RUN = Number(flag('--crossfade-min-run', 0.4));

  // Silence defaults: ffmpeg's own silencedetect defaults (noise=-30dB, d=0.5s -- "quiet enough, long
  // enough to be a real gap rather than a consonant"), overridable per source.
  const SILENCE_DB = Number(flag('--silence-db', -30));
  const SILENCE_MIN = Number(flag('--silence-min', 0.5));

  const OUT_DIR = flag('--out-dir', path.join(ROOT, 'films/scene'));

  const die = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };

  if (!SRC) die('usage: node harness/media/ingest.mjs <source.mp4> [name] [--threshold 0.3] [--silence-db -30]');
  if (!fs.existsSync(SRC)) die(`no such file: ${SRC}`);
  for (const bin of ['ffprobe', 'ffmpeg']) {
    if (spawnSync(bin, ['-version'], { encoding: 'utf8' }).error) die(`${bin} is not on PATH (brew install ffmpeg).`);
  }

  // ── 1. probe the source honestly ────────────────────────────────────────────────────────────
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,r_frame_rate,avg_frame_rate', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1', SRC], { encoding: 'utf8' });
  const fields = Object.fromEntries(String(probe.stdout).trim().split('\n').filter(Boolean)
    .map((l) => l.split('=')).map(([k, v]) => [k, v]));
  const width = +fields.width, height = +fields.height, duration = +fields.duration;
  const rate = (v) => { const m = /^(\d+)(?:\/(\d+))?$/.exec(String(v || '')); return m ? +m[1] / (m[2] ? +m[2] : 1) : 0; };
  const fps = rate(fields.avg_frame_rate) || rate(fields.r_frame_rate);
  if (!width || !height || !(duration > 0)) die(`${SRC} has no readable video stream. Is it a video?`);
  const hasAudio = hasAudioStream(SRC);

  console.log(`✓ probed ${SRC}: ${duration.toFixed(2)}s, ${fps.toFixed(2)}fps, ${width}x${height}, `
    + `${hasAudio ? 'has audio' : 'no audio track'}`);

  // ── 2. shot boundaries: study.mjs's own four detectors, merged ─────────────────────────────
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-'));
  const cutsResult = detectCuts(SRC, scratchDir, THRESHOLD, MIN_SHOT);
  const DELTA = frameSeries(SRC, 'scale=160:90,tblend=all_mode=difference,signalstats').slice(1);
  const EDGE = frameSeries(SRC, `scale=410:270,edgedetect=low=${EDGE_LOW}:high=${EDGE_HIGH},signalstats`);
  const seams = detectSeams(EDGE, SEAM_THRESHOLD, duration);
  const pans = detectPans(DELTA, PAN_FLOOR, PAN_MIN_RUN);
  const crossfades = detectCrossfades(DELTA, CROSSFADE_LO, CROSSFADE_HI, CROSSFADE_MIN_RUN);
  const { joints, conflicts } = mergeJoints([
    { kind: 'cut', items: cutsResult.cuts },
    { kind: 'seam', items: seams },
    { kind: 'pan', items: pans },
    { kind: 'crossfade', items: crossfades },
  ], MIN_SHOT);
  fs.rmSync(scratchDir, { recursive: true, force: true });

  // NO SILENT FALLBACK (study.mjs's own rule): nothing detected is ONE SHOT, stated as such, never
  // an invented equal-slice sample dressed up as a cut.
  const bounds = joints.length ? [0, ...joints.map((j) => j.t)] : [0];
  const shots = bounds.map((t0, i) => ({
    i: i + 1, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration,
    jointKind: i === 0 ? null : joints[i - 1].kind,
  })).filter((s) => s.t1 - s.t0 > 0.05);

  console.log(`✓ ${shots.length} shot(s) detected`
    + (joints.length ? ` (${joints.map((j) => j.kind).join(', ')})` : ' (no joints found: one shot)')
    + (conflicts.length ? `; ${conflicts.length} conflicting detection(s), higher-priority kind kept` : ''));

  // ── 3. silences: ffmpeg silencedetect, the one recipe worth taking from the cheatsheet ──────
  const silences = hasAudio
    ? parseSilenceOutput(spawnSync('ffmpeg', ['-v', 'info', '-i', SRC, '-af',
        `silencedetect=noise=${SILENCE_DB}dB:d=${SILENCE_MIN}`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr)
    : [];
  console.log(`✓ silence: noise=${SILENCE_DB}dB min=${SILENCE_MIN}s → ${silences.length} quiet span(s)`
    + (hasAudio ? '' : ' (skipped: no audio track)'));
  for (const sp of silences) {
    console.log(`  quiet ${sp.start.toFixed(2)}s → ${sp.end.toFixed(2)}s (${sp.duration.toFixed(2)}s)`);
  }

  // ── transcript sidecar (optional input, never produced here) ───────────────────────────────
  // films/scene/<name>.transcript.json: { source, segments: [{ t0, t1, text, words?: [{t0,t1,w}] }] }.
  // Produced by whatever transcribes audio (a local whisper build, an API, a hand edit); ingest only
  // READS it, so a film with none renders exactly as if this section did not exist.
  const transcriptFile = path.join(OUT_DIR, `${NAME}.transcript.json`);
  let segments = [];
  if (fs.existsSync(transcriptFile)) {
    try { segments = JSON.parse(fs.readFileSync(transcriptFile, 'utf8')).segments || []; }
    catch { console.error(`⚠ ${transcriptFile} is not valid JSON, ignoring it.`); }
    console.log(`✓ transcript found: ${segments.length} segment(s) folded into shot notes`);
  } else {
    console.log(`- no ${path.relative(ROOT, transcriptFile)}; shots carry no note. `
      + `Add that sidecar (segments with t0/t1/text) and re-run ingest to fill them in.`);
  }
  const noteFor = (s) => segments.filter((seg) => seg.t0 < s.t1 && seg.t1 > s.t0)
    .map((seg) => seg.text).join(' ').trim() || undefined;

  // ── src path the engine's src-url.js resolves: repo-root-relative with a leading slash ─────
  const srcAbs = path.resolve(SRC);
  const relFromRoot = path.relative(ROOT, srcAbs);
  const cutsSrc = relFromRoot.startsWith('..') ? srcAbs : `/${relFromRoot}`;
  if (relFromRoot.startsWith('..')) {
    console.error(`⚠ ${SRC} is outside the repo; wrote its absolute path. Copy it under assets/ for a `
      + 'path the render engine can resolve.');
  }

  // ── 4. write the cut list and the contact sheet ─────────────────────────────────────────────
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cuts = shots.map((s) => {
    const entry = { src: cutsSrc, in: Number(s.t0.toFixed(3)), out: Number(s.t1.toFixed(3)), audio: hasAudio };
    const note = noteFor(s);
    if (note) entry.note = note;
    return entry;
  });
  const cutsFile = path.join(OUT_DIR, `${NAME}.cuts.json`);
  fs.writeFileSync(cutsFile, JSON.stringify(cuts, null, 1) + '\n');

  const sheetFile = path.join(OUT_DIR, `${NAME}.contact-sheet.png`);
  buildContactSheet(SRC, shots, duration, sheetFile, { width, height });

  console.log(`✓ wrote ${path.relative(ROOT, cutsFile)} (${cuts.length} entr${cuts.length === 1 ? 'y' : 'ies'})`);
  console.log(`✓ wrote ${path.relative(ROOT, sheetFile)}`);
  console.log(`→ next: look at the contact sheet, edit ${path.relative(ROOT, cutsFile)}'s in/out points, `
    + `paste its array as a scene's "edits", then render.`);
}
