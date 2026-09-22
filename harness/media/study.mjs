// study.mjs, READ A REFERENCE FILM. The film-side twin of `make sections`.
//
// `make sections` inventories a real WEBSITE so a film can reflect it: a shot per section, a stable
// selector, a ready capture command. Nothing here read a FILM. Every frame tool we own (make beats,
// make reveal, make seam-check, make judge) points at our OWN output, so a reference is studied by
// eye, once, and the study is lost. This writes the study down.
//
//   node harness/media/study.mjs <video> [name] [--threshold 0.3] [--min-shot 0.4] [--fixed 2] [--cells 4]
//   node harness/media/study.mjs <video> [name] --content-only   # add content.mjs's numbers, nothing else
//
// NAME IT FOR A PERSON. The name becomes grammar/<name>.json, a row in engine-doctrine/CRAFT/GRAMMAR.md and, if
// the film earns a deep study, engine-doctrine/CRAFT/REF-<name>.md. The first one written here was called
// `pin-16818198602994243`, which is the id in a URL: it says nothing about a film anyone might be
// looking for, and it was the filename of a download rather than a decision. `together-chat` is the
// same film.
//   make study VIDEO=refs/brew.mp4 NAME=brew
//
// It writes refs/<name>/: sheet.png (one row per shot, frames chosen at the delta curve's local
// maxima, NOT in/mid/out), strip*.png (a busy shot sampled contiguously, --strips), study.json (the measured
// facts) and study.md (the table an author fills in). refs/ is gitignored, which is the point below.
//
// WHAT IT MEASURES, AND WHERE THAT STOPS. Duration, resolution, fps and shot boundaries come off the
// file. So do three facts per shot that used to be left blank, because a person filling them in was
// reading them off the sheet by eye anyway, and an eye reads a still while two of the three are
// properties of MOTION:
//
//   GROUND    mean luma of the shot's BORDER RING (not the whole frame: a centred card or hero word
//             would drag the reading toward itself, not the backdrop). Which way the world is lit, and
//             therefore which `bg` window the recreation needs. `groundHex` beside it is the measured
//             colour, so a coloured wash and a plain light backdrop in the same bucket don't read alike.
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
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { drawtext } from '../author/sheets.mjs';
import { ffmpegOrDie } from '../lib/scratch.mjs';
import { measureSpan } from './content.mjs';
import { clusterCuts, detectCuts, detectSeams, detectPans, detectCrossfades, frameSeries, mergeJoints, motionDeltaSeries } from './shot-detect.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const VIDEO = positional[0];
const THRESHOLD = Number(flag('--threshold', 0.3));
const MIN_SHOT = Number(flag('--min-shot', 0.4));   // two detections closer than this are one cut
// STRIPS. The event sheet answers "what happens"; it cannot answer "HOW does it move", because a peak
// is where change is MAXIMAL, not the shape of the move around it. Four frames chosen at four peaks of
// a nine-second reference read as four states, and a reader then invents the motion between them. That
// misread is on the record: studying refs/mo1 at 1fps produced "it never changes composition", and at
// 2fps the same film plainly flips its ground. The motion lives between the samples.
//
// So: for the shots that MOVE most, a contiguous strip at a real rate. Rate, not count, because the
// question is about time. Off by default; a strip is many more tokens than a sheet and is worth it only
// when the question is how something moves rather than what it shows.
const STRIPS = Number(flag('--strips', 0));         // how many of the busiest shots get a dense strip
const STRIP_FPS = Number(flag('--strip-fps', 8));   // samples per second inside a strip

// SEAM DETECTION. A hard cut is a big FRAME DIFFERENCE, which is what detectCuts() below measures. A
// no-cut film, one where every act is separated by a beat of empty ground instead of a cut, never trips
// it: content fades OUT before it fades back IN, so no two consecutive frames differ enough to register,
// and the film that motivated this read scores a peak of 0.27 against a 0.3 default. The joint is real,
// it is just not a delta event, so a second measurement looks for it directly: EDGE CONTENT, near zero
// exactly when the frame is empty ground. Threshold justified off measured numbers (see detectSeams).
const SEAM_THRESHOLD = Number(flag('--seam-threshold', 0.3));
const EDGE_LOW = Number(flag('--edge-low', 0.08));
const EDGE_HIGH = Number(flag('--edge-high', 0.2));
const SEAM_WINDOW = Number(flag('--seam-window', 0.25));  // seconds sampled each side of a seam, for flow direction

// SECOND-OPINION JOINTS. A cut is a spike; a seam is a run of near-zero edge content. Neither sees a
// joint of a THIRD shape: the frame keeps changing steadily for a while, too long and too even to be
// either. Two more kinds, both read off the same DELTA series so they cost no extra decode:
//   PAN         a large, SUSTAINED, roughly flat delta run: a whip or push, moving the whole frame at
//               close to constant speed rather than spiking once (a cut) or settling (ordinary motion).
//   CROSSFADE   a smaller, sustained, flat delta run: two pictures dissolving through each other reads
//               as a steady, moderate difference for the length of the fade, never a single peak.
// "Flat" is what tells either apart from an ordinary shot's motion, which bursts and settles. Defaults
// are ponytail: checked, not tuned, against two real clips (madera: 1 pan at 10.89s mean 13.4, 4
// crossfades mean 1.1-4.3; make-it-move: nothing above PAN_FLOOR, its rotate/cylinder motion is a
// within-shot BUILD rather than a between-act joint, which this pass does not claim to catch). Upgrade
// path: measure a corpus of whip pans and crossfades the way SEAM_THRESHOLD was, then tighten these.
const PAN_FLOOR = Number(flag('--pan-floor', 6));         // delta this high, sustained, is not ordinary motion
const PAN_MIN_RUN = Number(flag('--pan-min-run', 0.4));   // seconds a run must hold to count
const CROSSFADE_LO = Number(flag('--crossfade-lo', 0.5)); // above STILL_FLOOR: something is actually changing
const CROSSFADE_HI = Number(flag('--crossfade-hi', 5));   // below PAN_FLOOR: not a whip
const CROSSFADE_MIN_RUN = Number(flag('--crossfade-min-run', 0.4));
const FLAT_RATIO = Number(flag('--flat-ratio', 1.6));     // run's peak/mean must sit under this to count as "flat", not a burst

// UNIQUE FRAMES. Two consecutive decoded frames that differ by less than this (same DELTA scale as
// STILL_FLOOR, at 160x90) are the same picture: a held frame, or a re-encode of one. Far below
// STILL_FLOOR (0.5, "the frame is basically still") on purpose: a still SHOT still carries frame-to-frame
// grain and compression noise that DUP_FLOOR must not call motion. Checked against two real clips:
// madera measures 782 decoded frames, 689 unique (88%); make-it-move measures 534 decoded, 440 unique
// (82%). Neither is the owner's illustrative "about 724" for madera, and that is expected: "about" was
// never a target to hit, DUP_FLOOR is a threshold with room to move, and this is what it measures today.
const DUP_FLOOR = Number(flag('--dup-floor', 0.15));
const PAGE_COLS = Number(flag('--page-cols', 4));
const PAGE_ROWS = Number(flag('--page-rows', 5));
const FRAME_TOLERANCE = Number(flag('--frame-tolerance', 3));  // decoded-frame-count vs container, in frames

const die = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };

if (argv.includes('--selftest')) {
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error(`✗ ${m}: ${JSON.stringify(a)}`); process.exit(1); } };
  const run = [{ t: 3.0, score: 0.4 }, { t: 3.1, score: 0.9 }, { t: 3.2, score: 0.5 }, { t: 6.0, score: 0.7 }];
  eq(clusterCuts(run, 0.3, 0.4), [{ t: 3.1, score: 0.9 }, { t: 6.0, score: 0.7 }], 'a run collapses to its peak');
  eq(clusterCuts(run, 0.95, 0.4), [], 'nothing above the threshold is no cuts, not a guess');
  eq(clusterCuts([{ t: 0.1, score: 0.9 }], 0.3, 0.4), [], 'the first frames are never a cut');
  console.log('✓ study selftest: clusterCuts');

  // Synthetic edge-content curve: two content spans (high YAVG) separated by a 3-frame empty-ground
  // gap (YAVG 0, 0, 0.1), all <= a 0.3 threshold. Mirrors madera's own numbers (content 0.8-11, seams
  // 0.00-0.24) without decoding a video.
  const edge = [
    { t: 0.10, v: 5.0 }, { t: 0.12, v: 4.5 }, { t: 0.14, v: 3.0 },
    { t: 0.16, v: 0.00 }, { t: 0.18, v: 0.00 }, { t: 0.20, v: 0.10 },
    { t: 0.22, v: 2.0 }, { t: 0.24, v: 4.0 }, { t: 0.26, v: 5.0 },
  ];
  const seams = detectSeams(edge, 0.3, 1.0);
  eq(seams.length, 1, 'one gap in the middle is one seam');
  eq(seams[0].t0, 0.16, 'the outer run starts at the first below-threshold frame');
  eq(seams[0].t1, 0.20, 'the outer run ends at the last below-threshold frame');
  eq(seams[0].core0, 0.16, 'the core starts at the first truly-empty frame');
  eq(seams[0].core1, 0.18, 'the core ends at the last truly-empty frame, dropping the 0.10 tail');
  eq(Number(seams[0].t.toFixed(3)), 0.17, 'the reported joint is the core midpoint');
  eq(seams[0].frames.length, 2, 'the core carries only the frames at the run\'s own minimum');
  eq(detectSeams(edge, -1, 1.0), [], 'nothing under an impossible threshold is no seams, not a guess');
  eq(detectSeams([{ t: 0.02, v: 0 }, { t: 0.98, v: 0 }], 0.3, 1.0), [],
    'a run touching the film\'s own start or end is framing, not a joint');
  console.log('✓ study selftest: detectSeams');

  // A pan/whip: a run of frames all far above PAN_FLOOR, flat (no single spike), long enough to be a
  // sustained move rather than one loud frame of ordinary shot motion.
  const panRun = [
    { t: 0.9, v: 1.0 }, { t: 1.00, v: 8.0 }, { t: 1.05, v: 8.3 }, { t: 1.10, v: 7.8 },
    { t: 1.15, v: 8.1 }, { t: 1.20, v: 8.0 }, { t: 1.25, v: 7.9 }, { t: 1.35, v: 8.1 }, { t: 1.55, v: 1.0 },
  ];
  eq(detectPans(panRun, 6, 0.3, 1.6).length, 1, 'a sustained flat run above the floor is one pan');
  eq(detectPans(panRun, 6, 0.9, 1.6).length, 0, 'a run shorter than the minimum is not a pan');
  eq(detectPans(panRun, 6, 0.3, 1.02).length, 0, 'a run whose peak beats its mean by more than flat-ratio is not flat, so not a pan');
  console.log('✓ study selftest: detectPans');

  // A crossfade: the same shape, one octave quieter (a dissolve changes the frame less than a whip).
  const cfRun = [
    { t: 0.9, v: 0.1 }, { t: 1.0, v: 1.2 }, { t: 1.1, v: 1.3 }, { t: 1.2, v: 1.25 },
    { t: 1.3, v: 1.28 }, { t: 1.4, v: 1.22 }, { t: 1.5, v: 1.24 }, { t: 1.6, v: 0.1 },
  ];
  eq(detectCrossfades(cfRun, 0.5, 5, 0.3, 1.6).length, 1, 'a held mid-band flat run is one crossfade');
  eq(detectCrossfades(cfRun, 0.5, 5, 0.8, 1.6).length, 0, 'shorter than the minimum is not a crossfade');
  eq(detectCrossfades(panRun, 0.5, 5, 0.3, 1.6).length, 0, 'a run above the crossfade ceiling is not a crossfade (it is a pan)');
  console.log('✓ study selftest: detectCrossfades');
  process.exit(0);
}

if (!VIDEO) die('usage: node harness/media/study.mjs <video> [name] [--threshold 0.3]');
if (!fs.existsSync(VIDEO)) die(`no such file: ${VIDEO}`);
// A missing tool is not a clean result. seam-snap reported one for months (engine-doctrine/MISTAKES.md), so this
// refuses at the entry point and names the binary rather than producing an empty study.
for (const bin of ['ffprobe', 'ffmpeg']) {
  if (spawnSync(bin, ['-version'], { encoding: 'utf8' }).error) {
    die(`${bin} is not on PATH. \`make study\` reads the file with ffmpeg; install it (brew install ffmpeg) and re-run.`);
  }
}

// ── content-only: add content.mjs's four numbers to an EXISTING grammar, nothing else ──────────────
// A full re-study overwrites the measured half and would also blow away the AUTHORED half's home
// (refs/<name>/ is cleared below) for no reason: content per shot needs only the clip and the shot
// bounds a study already wrote. This skips every other measurement (cuts, seams, pages, the sheet) and
// merges one new field into shots[], leaving onScreen/moves/trigger/threads/spectacle/takeaway untouched.
if (argv.includes('--content-only')) {
  const name = positional[1] || path.basename(VIDEO).replace(/\.[^.]+$/, '');
  const grammarFile = path.join(ROOT, 'grammar', `${name}.json`);
  if (!fs.existsSync(grammarFile)) die(`no grammar/${name}.json to add content to. Run a full \`make study\` first.`);
  const grammar = JSON.parse(fs.readFileSync(grammarFile, 'utf8'));
  // t0/t1 are the shot's own joints; measureSpan already samples strictly inside them.
  for (const s of grammar.shots || []) s.content = measureSpan(VIDEO, s.t0, s.t0 + s.len);
  fs.writeFileSync(grammarFile, JSON.stringify(grammar, null, 1) + '\n');
  console.log(`✓ content added to ${(grammar.shots || []).length} shot(s) in grammar/${name}.json`);
  process.exit(0);
}

// ── probe: the facts that come off the file ──────────────────────────────────────────────────────
// `nb_frames` IS ASKED FOR, and it is what makes the last frame findable. `format=duration` is the
// CONTAINER's length, and on a file whose audio runs past its video it overstates the picture: measured
// here, a 17.867s container held 445 video frames at 25fps, so the last one starts at 17.76 and every
// seek past that wrote nothing while ffmpeg exited 0. Two of thirteen references died on it.
const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
  'stream=width,height,r_frame_rate,avg_frame_rate,nb_frames', '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1', VIDEO], { encoding: 'utf8' });
const fields = Object.fromEntries(String(probe.stdout).trim().split('\n').filter(Boolean)
  .map((l) => l.split('=')).map(([k, v]) => [k, v]));
const width = +fields.width, height = +fields.height;
const duration = +fields.duration;
// `r_frame_rate` IS A CEILING, NOT A RATE. On a variable-frame-rate file it reports the container's
// nominal maximum: one reference here declares 120 and holds 396 frames across 12.54s, which is 31.6.
// `avg_frame_rate` is the real one. Measured on that file, believing r_frame_rate put the last frame at
// (396-2)/120 = 3.28s, and every extraction after 3.28s was clamped to it, so three of its seven shots
// showed the SAME frame for their in and their out and the sheet read as a film that stops halfway.
const rate = (v) => { const m = /^(\d+)(?:\/(\d+))?$/.exec(String(v || '')); return m ? +m[1] / (m[2] ? +m[2] : 1) : 0; };
const rFps = rate(fields.r_frame_rate), aFps = rate(fields.avg_frame_rate);
const fps = aFps > 0 ? aFps : rFps;
// Entry-point validation: anything without a real video stream stops here, named. A text file handed
// to the sampler further down produces a stack trace from ffmpeg, which reads as a tool bug.
if (!width || !height || !(duration > 0)) {
  die(`${VIDEO} has no readable video stream (ffprobe found width=${fields.width ?? '?'} height=${fields.height ?? '?'} duration=${fields.duration ?? '?'}). Is it a video?`);
}
const hasAudio = !!String(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
  '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', VIDEO], { encoding: 'utf8' }).stdout).trim();

// A CONTAINER'S DURATION IS NOT THE LAST DECODABLE FRAME, and two of thirteen references died on the
// difference. `format=duration` is the stream's stated length; seeking to `duration - 0.08` can land
// past the final frame, and ffmpeg then exits 0 having written nothing, which `ffmpegOrDie` correctly
// refuses. The margin is in FRAMES rather than in seconds because that is the unit the problem is in.
// The last frame's own start time, from the video stream's frame count where the file states one, and
// otherwise a three-frame margin off the container. Never `duration` itself.
// DERIVED WITHOUT fps AT ALL where the frame count is known, which is what makes it immune to the lie
// above: the last frame is a FRACTION of the duration, and both numbers come off the same stream.
// Moved up here (it used to sit beside `eventFrames`, further down) because the seam-flow measurement
// below needs it too, to clamp a post-seam window that would otherwise seek past the last frame.
const nbFrames = Number(fields.nb_frames) || 0;
// THE LOWER OF TWO ESTIMATES, because each is wrong in a different direction and neither alone is safe.
//   duration x (n-2)/n  is immune to a lying r_frame_rate (the VFR case above) and assumes the
//                       container's duration IS the video's span. It is not when a container carries
//                       audio padding: mo1's make-it-move holds 534 frames at 60fps, so its last frame
//                       starts at 8.883s, while the container reports 8.981s. That formula returned
//                       8.947s, four frames past the end, and every seek there wrote nothing while
//                       ffmpeg exited 0, which is the exact failure the comment above this one
//                       describes and this line then reproduced.
//   (n-2)/avgFps        is immune to that padding and depends on the frame rate, which is why it is
//                       avg_frame_rate and never r_frame_rate.
// Whichever is smaller is inside both truths.
const byDuration = nbFrames > 2 ? duration * ((nbFrames - 2) / nbFrames) : Infinity;
const byRate = nbFrames > 2 && fps > 0 ? (nbFrames - 2) / fps : Infinity;
const LAST_FRAME = Number.isFinite(Math.min(byDuration, byRate))
  ? Math.min(byDuration, byRate)
  : duration - 3 / (fps || 30);
const seekable = (t) => Math.max(0, Math.min(t, LAST_FRAME));

// THE SAME FILM UNDER TWO NAMES IS THE STORE'S OWN VERSION OF THE DRIFT IT EXISTS TO PREVENT, and it
// happened on the first day: a reference arrived by link, was downloaded as `rebuilt.mp4`, studied, and
// read carefully, and it was already sitting in refs/ as `pin-333759022407379112.mp4`, byte-identical
// and never studied. Two grammar rows, one film, and a corpus that counts it twice when it says what
// films like this measure.
//
// A content hash is the only thing that catches that, because the names, the sizes on disk and the
// download dates all differ. Stored in the grammar row so a re-study of the twin says so.
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const VIDEO_HASH = sha(path.resolve(VIDEO));

const NAME = positional[1] || path.basename(VIDEO).replace(/\.[^.]+$/, '');
const dir = path.join(ROOT, 'refs', NAME);
// Clear first, same reason as sections.mjs: shot files are numbered from the detection, so a re-run at
// a different threshold leaves the old numbering beside the new one and the sheet stops matching the doc.
//
// REFUSE TO EAT THE INPUT. The natural place to keep a reference clip is refs/<name>/, which is also
// where this writes, so a `study refs/mo1/x.mp4 mo1` used to delete its own source and then fail with
// ffmpeg's "No such file or directory" pointing at a file that existed a moment earlier. It happened
// twice here and cost a re-download both times. The clear is still right; eating the argument is not.
const videoAbs = path.resolve(VIDEO);
if (videoAbs.startsWith(dir + path.sep)) {
  die(`the video lives inside refs/${NAME}/, which is exactly where this study WRITES, and the write
`
    + `  clears that directory first. Studying it would delete the source.
`
    + `  Move the clip out (refs/_clips/ is a good home) or study it under a different NAME.`);
}
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

// clusterCuts, detectCuts, detectSeams, detectPans, detectCrossfades and frameSeries used to live
// here as module-scoped closures; they are pure and side-effect-free (until called), so they now
// live in shot-detect.mjs and this file imports them, rather than duplicating them for
// harness/media/ingest.mjs to import safely (importing THIS file used to also run its whole CLI).
const LUMA = frameSeries(VIDEO, 'scale=160:90,signalstats');
// motionDeltaSeries (shot-detect.mjs) owns this chain now: the top-level medianFrameDelta figure
// below reuses this SAME array rather than a second decode with a second copy of the filter string.
const DELTA = motionDeltaSeries(VIDEO);
// Scaled bigger than LUMA/DELTA (410x270, not 160x90): edge detail is finer-grained than luma, and a
// letterform that survives 410x270 can vanish at 160x90. Cost is one more decode of the same film.
const EDGE = frameSeries(VIDEO, `scale=410:270,edgedetect=low=${EDGE_LOW}:high=${EDGE_HIGH},signalstats`);

// GROUND: the BORDER RING's mean luma, not the whole frame's. A centred UI card or hero word is bright
// and sits over the middle of the frame; averaging the whole frame (as `luma`/LUMA below still does, for
// good reason, see its own comment) lets that card drag a coloured wash into "light". madera's acts 3
// and 5 are a measured instance: a blurred-photo wash (#a48f76, luma 136) and an olive wash (#8c7c68,
// luma 175.6) both read "light" off the whole-frame mean, because a white window sits in the middle of
// both. The border ring is the one region a centred card cannot reach, so it is what "what is the
// backdrop doing" actually has to sample. Four thin crops (not one, since content can bleed to any one
// edge) averaged per frame; each crop is far smaller than a full LUMA decode, so this costs little.
function borderSeries() {
  const CROPS = {
    top: 'crop=iw:ih*0.12:0:0', bottom: 'crop=iw:ih*0.12:0:ih-ih*0.12',
    left: 'crop=iw*0.12:ih:0:0', right: 'crop=iw*0.12:ih:iw-iw*0.12:0',
  };
  const series = Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, frameSeries(VIDEO, `${c},scale=80:80,signalstats`)]));
  // Index-aligned with LUMA, not time-matched: all five decodes read the same frame sequence off the
  // same file, so frame i means the same thing in every one of them (the same assumption DELTA/LUMA
  // already rely on elsewhere in this file).
  return LUMA.map((f, i) => {
    const vs = Object.values(series).map((s) => s[i]?.v).filter((v) => typeof v === 'number');
    return { t: f.t, v: vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : f.v };
  });
}
const GROUND = borderSeries();

// EVERY FRAME DECODED, COUNTED, AND CHECKED AGAINST THE CONTAINER. LUMA is a full decode (no `fps=`
// filter drops anything), so LUMA.length IS the decoded frame count. A mismatch beyond the margin this
// file already knows (audio padding, VFR: see LAST_FRAME above) means something was skipped or invented,
// and a study that cannot account for its own frame count has no business measuring what is in them.
const DECODED_FRAMES = LUMA.length;
const EXPECTED_FRAMES = nbFrames > 0 ? nbFrames : Math.round(duration * fps);
if (Math.abs(DECODED_FRAMES - EXPECTED_FRAMES) > FRAME_TOLERANCE) {
  die(`decoded ${DECODED_FRAMES} frames but the container states ${EXPECTED_FRAMES} `
    + `(nb_frames=${nbFrames || 'unset'}, duration*fps=${(duration * fps).toFixed(1)}). `
    + `That is more than the ${FRAME_TOLERANCE}-frame margin already known for audio-padding and `
    + `VFR containers (see LAST_FRAME above), so this refuses rather than measure a film it cannot `
    + `account for. Check with: ffprobe -select_streams v:0 -show_frames ${VIDEO} | grep -c pts_time`);
}

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

// ── seam flow: which way the content moves through a joint ──────────────────────────────────────
// A seam is empty ground for a beat, so neither shot's own delta curve says which way it travelled.
// What does: WHERE the edge mass sits just before the gap opens (the outgoing shot's last visible
// content) against where it sits just after the gap closes (the incoming shot's first). A centroid, not
// a flow field: cheap, and in the ~0.25s either side of a seam the frame is either leaving toward one
// edge or arriving from one, never both, so one weighted-average point per side is enough.
function edgeCentroid(t0, len) {
  const W = 160, H = 90;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', Math.max(0, t0).toFixed(3), '-t', Math.max(0.02, len).toFixed(3),
    '-i', VIDEO, '-vf', `edgedetect=low=${EDGE_LOW}:high=${EDGE_HIGH},scale=${W}:${H},format=gray`,
    '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], { encoding: 'buffer', maxBuffer: 1 << 26 });
  const buf = r.stdout;
  const frame = W * H;
  if (!buf || buf.length < frame) return null;
  const n = Math.floor(buf.length / frame);
  let sumW = 0, sumX = 0, sumY = 0;
  for (let f = 0; f < n; f++) {
    const base = f * frame;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = buf[base + y * W + x];
      if (v > 32) { sumW += v; sumX += v * x; sumY += v * y; }
    }
  }
  if (!sumW) return null;
  return { cx: sumX / sumW / W, cy: sumY / sumW / H };
}

// The ground's own colour on each side of a seam: every pixel averaged, not the single most-saturated
// one `toneOf` picks, because the seam is by definition carrying no accent, just the backdrop.
function meanColorOf(t0, len) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', Math.max(0, t0).toFixed(3), '-t', Math.max(0.02, len).toFixed(3),
    '-i', VIDEO, '-vf', 'scale=8:8', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
    { encoding: 'buffer', maxBuffer: 1 << 24 });
  const buf = r.stdout;
  if (!buf || buf.length < 3) return null;
  let R = 0, G = 0, B = 0, n = 0;
  for (let i = 0; i + 2 < buf.length; i += 3) { R += buf[i]; G += buf[i + 1]; B += buf[i + 2]; n++; }
  if (!n) return null;
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(R)}${hex(G)}${hex(B)}`;
}

// The BORDER RING's own colour, per shot: the finer field beside `ground` (see GROUND/borderSeries
// above for why the ring, not the whole frame). `ground` says light/mid/dark; `groundHex` says WHICH
// light or dark, so an olive wash and a white paper backdrop that measure the same bucket do not read
// as the same shot.
function groundColorOf(t0, len) {
  const CROPS = ['crop=iw:ih*0.12:0:0', 'crop=iw:ih*0.12:0:ih-ih*0.12', 'crop=iw*0.12:ih:0:0', 'crop=iw*0.12:ih:iw-iw*0.12:0'];
  let R = 0, G = 0, B = 0, n = 0;
  for (const crop of CROPS) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', Math.max(0, t0).toFixed(3), '-t', Math.max(0.2, len).toFixed(3),
      '-i', VIDEO, '-vf', `${crop},scale=8:8`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
      { encoding: 'buffer', maxBuffer: 1 << 24 });
    const buf = r.stdout;
    if (!buf || buf.length < 3) continue;
    for (let i = 0; i + 2 < buf.length; i += 3) { R += buf[i]; G += buf[i + 1]; B += buf[i + 2]; n++; }
  }
  if (!n) return null;
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(R)}${hex(G)}${hex(B)}`;
}

// AXIS AND DIRECTION FROM ONE COMPARISON. If the incoming side's centroid sits further right than the
// outgoing side's did (cx grows), the frame is being entered from the right and left by the left, which
// reads as "right-to-left" flow; the mirror holds on y ("bottom-to-top" when cy grows, content entering
// low and having been leaving high). Whichever axis moved more is the seam's axis.
function measureSeam(run) {
  // The CORE (run.core0..run.core1), not the outer threshold run: that is the actual empty-ground span,
  // see detectSeams above. Windows for flow/colour are measured off it, not off the wider penumbra.
  const gap = Number((run.core1 - run.core0 + 1 / fps).toFixed(3));
  const preT = Math.max(0, run.core0 - SEAM_WINDOW);
  const postT = run.core1 + 1 / fps;
  const pre = edgeCentroid(preT, run.core0 - preT);
  const postLen = Math.min(SEAM_WINDOW, Math.max(0.02, LAST_FRAME - postT));
  const post = edgeCentroid(postT, postLen);
  let axis = null, direction = null;
  if (pre && post) {
    const dx = post.cx - pre.cx, dy = post.cy - pre.cy;
    axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    direction = axis === 'x' ? (dx >= 0 ? 'right-to-left' : 'left-to-right') : (dy >= 0 ? 'bottom-to-top' : 'top-to-bottom');
  }
  return {
    t: Number(run.t.toFixed(2)), gap, frames: run.frames.length,
    axis, direction,
    groundBefore: meanColorOf(preT, run.core0 - preT),
    groundAfter: meanColorOf(postT, postLen),
  };
}

const GROUND_EDGES = [[60, 'dark', 'mid'], [128, 'mid', 'light']];
const GROUND_DOUBT = 4;
const bucket = (luma) => {
  const name = luma > 128 ? 'light' : luma > 60 ? 'mid' : 'dark';
  return GROUND_EDGES.some(([e]) => Math.abs(luma - e) < GROUND_DOUBT) ? `${name}?` : name;
};

const measureShot = (s) => {
  const luma = mean(between(LUMA, s.t0, s.t1));
  const groundLuma = mean(between(GROUND, s.t0, s.t1));
  const deltas = insideShot(s.t0, s.t1, s.i === 1);
  const delta = mean(deltas);
  const joint = jointSize(s.t0, s.i === 1);
  const tone = toneOf(s.t0, s.len);
  const groundHex = groundColorOf(s.t0, s.len);
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
    // GROUND IS THE BORDER RING'S LIGHTNESS, not the whole frame's, and that is a reversal from this
    // field's first cut. Whole-frame `luma` (kept above, still useful: it is what a viewer's eye
    // averages) is the WRONG read for "what is the backdrop doing", because a centred UI card or hero
    // word drags it toward whatever that card is, not the wash behind it. Measured, not theorised:
    // madera's shots 3 (a blurred-photo wash going blue/olive/brick-red, border luma 136) and 5 (an
    // olive wash, border luma 175.6 vs a whole-frame 136 skewed light by a centred white window) both
    // printed "light" off the old whole-frame read and neither is. `groundLuma`/`ground` now read the
    // border ring `borderSeries()` builds above; `groundHex` (below) is the finer field beside the
    // bucket, so an olive wash and a white paper ground that land in the same bucket do not read alike.
    //
    // A BUCKET EDGE IS A COIN TOSS AND MUST NOT PRINT AS A FACT. brew's accent window measured 128.4
    // against a light/mid edge at 128 and was called "light" with total confidence. Within 4 of an
    // edge the name carries a `?`, so a reader sees the uncertainty in the value rather than having to
    // know the thresholds. Fixed here, at the write site, rather than gated afterwards.
    groundLuma: groundLuma == null ? null : Number(groundLuma.toFixed(1)),
    ground: groundLuma == null ? null : bucket(groundLuma),
    groundHex,
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

const { peak, near, cuts } = detectCuts(VIDEO, dir, THRESHOLD, MIN_SHOT);
const cutsDetected = cuts.length > 0;
const seams = detectSeams(EDGE, SEAM_THRESHOLD, duration).map(measureSeam);
// SECOND OPINION: a joint neither a spike (cut) nor a near-zero-edge run (seam) look like, because
// nothing goes to zero and nothing spikes; the frame just keeps changing, evenly, for a while. See the
// flag block above for why these numbers are ponytail defaults.
const pans = detectPans(DELTA, PAN_FLOOR, PAN_MIN_RUN, FLAT_RATIO);
const crossfades = detectCrossfades(DELTA, CROSSFADE_LO, CROSSFADE_HI, CROSSFADE_MIN_RUN, FLAT_RATIO);

// FOUR KINDS OF JOINT, ONE BOUNDARY LIST (mergeJoints, imported from shot-detect.mjs). Two that land
// within MIN_SHOT of each other are the same joint measured two ways, and the more EXACT measurement
// wins: a cut is an exact scene-score peak, a seam a run of low-edge frames, a pan/crossfade a run of
// DELTA frames, in that order of precision (JOINT_PRIORITY there). Not "whichever sorted first":
// measured on this study's own ground-truth fixture, a fading title left a few near-empty-edge frames
// right before a real hard cut, so a SEAM at 2.95s and the CUT it was standing in front of at 3.00s
// landed 0.05s apart, and first-sorted-wins would have kept the seam and silently thrown the cut away.
// The disagreement is still RECORDED either way, never silently dropped.
const { joints, conflicts } = mergeJoints([
  { kind: 'cut', items: cuts },
  { kind: 'seam', items: seams },
  { kind: 'pan', items: pans },
  { kind: 'crossfade', items: crossfades },
], MIN_SHOT);
const detected = joints.length > 0;
// NO SILENT FALLBACK. A film with no detected joint is ONE SHOT, stated as such, never an invented
// equal-slice sample dressed up as a cut list (the deleted behaviour: engine-doctrine/MISTAKES.md and the OWNER
// note that removed it). The reason is printed in `note` below and in study.md/the console report.
const bounds = detected ? [0, ...joints.map((j) => j.t)] : [0];
const shots = bounds.map((t0, i) => {
  const j = i === 0 ? null : joints[i - 1];
  return {
    i: i + 1, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration,
    score: j && j.kind === 'cut' ? j.evidence.score : null,
    jointKind: j ? j.kind : null,
  };
}).filter((s) => s.t1 - s.t0 > 0.05).map((s) => ({ ...s, len: s.t1 - s.t0 }));

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
  const outT = Math.max(Math.min(s.t1 - 0.08, LAST_FRAME), s.t0);
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

// ffmpeg's hstack/vstack both refuse `inputs=1` ("Value 1.000000 ... out of range [2 - …]"), which a
// single-cell row or single-row page hits for real once a film can measure as ONE shot (the deleted
// equal-slice fallback used to guarantee at least two samples; it no longer does). One input is just a
// copy, optionally padded, so this drops to that instead of asking hstack/vstack to do nothing.
function stackImages(files, out, axis, padW, padH, what) {
  if (files.length === 1) {
    const pad = padW && padH ? `,pad=${padW}:${padH}:0:0:black` : '';
    ffmpegOrDie(['-v', 'error', '-y', '-i', files[0], '-vf', `null${pad}`, '-frames:v', '1', out], out, what);
    return;
  }
  const stack = axis === 'h' ? `hstack=inputs=${files.length}` : `vstack=inputs=${files.length}`;
  const pad = padW && padH ? `,pad=${padW}:${padH}:0:0:black` : '';
  ffmpegOrDie(['-v', 'error', '-y', ...files.flatMap((c) => ['-i', c]),
    '-filter_complex', `${stack}${pad}`, '-frames:v', '1', out], out, what);
}

// ── contact sheet: one row per shot, frames chosen by EVENT (see above), not by position ─────────
// Same shape as make beats, and for the same reason: the middle of a shot is the frame that hides the
// entrance, which is exactly what a study is looking for (engine-doctrine/CRAFT/REFERENCE-STUDY.md, MISTAKES #124).
const frames = path.join(dir, 'frames');
fs.mkdirSync(frames, { recursive: true });
const tileW = 300, tileH = Math.round((tileW * height) / width);
const rows = [];
for (const s of shots) {
  const ts = eventFrames(s, CELLS).map((t) => seekable(Math.max(s.t0, Math.min(s.t1 - 0.01, t))));
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
  stackImages(cells, row, 'h', tileW * CELLS, tileH, `row ${s.i}`);
  rows.push(row);
}
const sheet = path.join(dir, 'sheet.png');
stackImages(rows, sheet, 'v', null, null, 'contact sheet');

// ── motion strips: how a shot MOVES, contiguously ────────────────────────────────────────────────
// One PNG per studied shot, sampled every 1/STRIP_FPS second across the whole shot and tiled in
// reading order. Busiest first, measured by the shot's own mean delta, because a strip of a still shot
// is a wall of identical frames and teaches nothing.
if (STRIPS > 0) {
  const busiest = [...shots].sort((a, b) => (b.motion || 0) - (a.motion || 0)).slice(0, STRIPS);
  for (const s2 of busiest) {
    const n = Math.max(2, Math.min(48, Math.round(s2.len * STRIP_FPS)));
    const cols = Math.min(8, n);
    const cellW = 240, cellH = Math.round((cellW * height) / width);
    const out = path.join(dir, `strip${String(s2.i).padStart(2, '0')}.png`);
    // -ss before -i seeks fast; fps= then resamples the decoded span, so the strip is contiguous in
    // TIME rather than a set of independent seeks that can each land on a different keyframe.
    ffmpegOrDie(['-v', 'error', '-y', '-ss', s2.t0.toFixed(3), '-t', Math.max(0.05, s2.len).toFixed(3),
      '-i', VIDEO, '-vf', `fps=${STRIP_FPS},scale=${cellW}:${cellH},tile=${cols}x${Math.ceil(n / cols)}`,
      '-frames:v', '1', out], out, `strip ${s2.i}`);
    console.log(`  strip ${s2.i}: ${s2.len.toFixed(2)}s at ${STRIP_FPS}fps -> ${n} frames -> ${path.relative(ROOT, out)}`);
  }
}

// ── every unique frame, seen ──────────────────────────────────────────────────────────────────────
// The event sheet above shows frames at delta PEAKS only, which is the whole film minus everything
// between the peaks: exactly the gap this study was found to have. Full coverage is the default now,
// not an opt-in (STRIPS above stays opt-in for the same reason it always was: it costs far more per
// shot and answers a narrower question, HOW one busy shot moves, not WHAT the whole film shows).
//
// A frame is UNIQUE if it changed from the one before it by more than DUP_FLOOR (see the flag block):
// a held frame or a re-encoded duplicate does not clear that bar, and stands for by the last frame that
// did. `isUniqueFrame` reuses DELTA index-aligned with LUMA, the same convention `insideShot`/`jointSize`
// already rely on elsewhere in this file (DELTA[i-1] is the delta arriving AT LUMA[i]).
const fx = (n, d = 2) => Number(n.toFixed(d));
const isUniqueFrame = (i) => i === 0 || !DELTA[i - 1] || DELTA[i - 1].v > DUP_FLOOR;
const uniqueFrames = LUMA.map((f, i) => ({ i, t: f.t })).filter((f) => isUniqueFrame(f.i));

const PAGE_CELLS = PAGE_COLS * PAGE_ROWS;
const pagesDir = path.join(dir, 'pages');
fs.mkdirSync(pagesDir, { recursive: true });
const pageCellW = 480, pageCellH = Math.round((pageCellW * height) / width);
const pagesMeta = [];
for (let p = 0; p * PAGE_CELLS < uniqueFrames.length; p++) {
  const chunk = uniqueFrames.slice(p * PAGE_CELLS, (p + 1) * PAGE_CELLS);
  const cellFiles = chunk.map((fr, k) => {
    const t = seekable(fr.t);
    const out = path.join(pagesDir, `.cell_${p}_${k}.png`);
    // Stamped with the real timestamp AND the frame number (item 2's own test: read the typed prompt in
    // madera's first act off a page), and sized bigger than the event-sheet cells (480 vs 300) for it.
    ffmpegOrDie(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', VIDEO, '-frames:v', '1', '-vf',
      `scale=${pageCellW}:${pageCellH},drawtext=text='${drawtext(`f${fr.i} ${t.toFixed(2)}s`)}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.65`,
      out], out, `page ${p + 1} cell ${k}`);
    return out;
  });
  const rowFiles = [];
  for (let r = 0; r * PAGE_COLS < cellFiles.length; r++) {
    const rowCells = cellFiles.slice(r * PAGE_COLS, (r + 1) * PAGE_COLS);
    const rowOut = path.join(pagesDir, `.row_${p}_${r}.png`);
    // Padded to a full row width, same reason as the event sheet's rows: a short last row of a short
    // last page still tiles.
    stackImages(rowCells, rowOut, 'h', pageCellW * PAGE_COLS, pageCellH, `page ${p + 1} row ${r}`);
    rowFiles.push(rowOut);
  }
  const pageOut = path.join(pagesDir, `page-${String(p + 1).padStart(3, '0')}.png`);
  stackImages(rowFiles, pageOut, 'v', null, null, `page ${p + 1}`);
  for (const f of [...cellFiles, ...rowFiles]) fs.rmSync(f, { force: true });
  pagesMeta.push({
    page: p + 1, file: path.relative(ROOT, pageOut), t0: fx(chunk[0].t), t1: fx(chunk[chunk.length - 1].t),
    cells: chunk.map((fr, k) => ({ cell: k, frame: fr.i, t: fx(fr.t) })),
  });
}

// Every HELD frame maps to the unique frame that stands for it (the last one before it that WAS unique),
// and from there to the page/cell a checker can look up: the proof that nothing was skipped, not just a
// claim of it.
const uniqueLoc = {};
for (const pg of pagesMeta) for (const c of pg.cells) uniqueLoc[c.frame] = { page: pg.page, cell: c.cell };
const heldFrames = [];
let lastUnique = 0;
for (let i = 0; i < LUMA.length; i++) {
  if (isUniqueFrame(i)) { lastUnique = i; continue; }
  heldFrames.push({ frame: i, t: fx(LUMA[i].t), representative: lastUnique, ...uniqueLoc[lastUnique] });
}
fs.writeFileSync(path.join(dir, 'pages.json'), JSON.stringify({
  name: NAME, totalFrames: DECODED_FRAMES, uniqueFrames: uniqueFrames.length,
  pages: pagesMeta, held: heldFrames,
}, null, 1) + '\n');

// THE LEDGER THE AUTHOR MUST FILL. One line per page, `<fill…>` until someone writes what is on it;
// study-check refuses to call a study complete while any line still says `<fill`.
fs.writeFileSync(path.join(dir, 'pages.md'),
  `# Pages · ${NAME}\n\n`
  + `One line per page. The study is INCOMPLETE until every line says what happens on that page, not\n`
  + `\`<fill\`. \`make study-check NAME=${NAME}\` names exactly which pages are still unfilled.\n\n`
  + pagesMeta.map((pg) => `page ${String(pg.page).padStart(3, '0')} (${pg.t0}-${pg.t1}s): <fill: what happens on this page>`).join('\n')
  + '\n');

// medianFrameDelta / longestHoldS: the two figures a reference-bars reader needs, and the reason
// prose ("median frame delta ~0.23", "median frame delta 0.08") could not be checked by any gate.
//
// BOTH READ OFF DELTA/STILL_FLOOR ABOVE, not harness/lib/frame-forensics.mjs's frameDeltaSweep. A
// first pass used frameDeltaSweep (a 64x36 grid, max per-pixel delta) and got 0.039/0.020 against the
// prose's 0.08/0.23; DELTA (160x90, tblend=difference, mean YAVG) gives 0.098/0.212, the measure the
// prose actually agrees with, because it is the measure this file's own `motion`/`peak`/`held` per-
// shot fields were already reading. "How much does this film move" already had an owner; the fix is
// citing it, not adding a second one. longestHoldS moves to the same measure ON PURPOSE: a hold and
// the delta that names "quiet" must read off one scale, or study.json could disagree with itself
// about what "held" means. medianFrameDelta reuses the DELTA array already decoded above (line ~294),
// never a second ffmpeg pass.
const deltaValues = DELTA.map((f) => f.v);
const sortedDeltaValues = [...deltaValues].sort((a, b) => a - b);
const medianFrameDelta = sortedDeltaValues.length
  ? fx(sortedDeltaValues.length % 2 ? sortedDeltaValues[(sortedDeltaValues.length - 1) / 2]
      : (sortedDeltaValues[sortedDeltaValues.length / 2 - 1] + sortedDeltaValues[sortedDeltaValues.length / 2]) / 2, 3)
  : null;
let longestHoldFrames = 0, runFrames = 0;
for (const f of DELTA) {
  if (f.v < STILL_FLOOR) { runFrames++; if (runFrames > longestHoldFrames) longestHoldFrames = runFrames; }
  else runFrames = 0;
}
const longestHoldS = DELTA.length ? fx(longestHoldFrames / fps, 2) : null;

// ── the study ─────────────────────────────────────────────────────────────────────────────────────
const study = {
  source: (() => { const r = path.relative(ROOT, path.resolve(VIDEO)); return r.startsWith('..') ? path.resolve(VIDEO) : r; })(),
  name: NAME,
  measured: {
    duration: fx(duration), width, height, fps: fx(fps, 3),
    aspect: `${width}:${height}`, hasAudio,
    // No more 'fixed-sampling': that name belonged to the equal-slice fallback this study deleted.
    // 'none' means exactly what it says, a film with no joint any detector here found.
    shotDetection: [...new Set(joints.map((j) => j.kind))].join('+') || 'none',
    threshold: THRESHOLD, peakSceneScore: fx(peak, 3), nearMisses: near,
    seamThreshold: SEAM_THRESHOLD, seamsFound: seams.length,
    panFloor: PAN_FLOOR, pansFound: pans.length,
    crossfadeBand: [CROSSFADE_LO, CROSSFADE_HI], crossfadesFound: crossfades.length,
    shots: shots.length, medianShot: fx(median), cutsPerMinute: fx((shots.length / duration) * 60, 1),
    medianFrameDelta, longestHoldS,
  },
  coverage: { frames: DECODED_FRAMES, unique: uniqueFrames.length, pages: pagesMeta.length, ledger: 'incomplete' },
  shots: shots.map((s) => ({ i: s.i, t0: fx(s.t0), t1: fx(s.t1), len: fx(s.len),
    score: s.score == null ? null : fx(s.score, 3), jointKind: s.jointKind,
    luma: s.luma, ground: s.ground, groundLuma: s.groundLuma, groundHex: s.groundHex,
    motion: s.motion, alive: s.alive, accent: s.accent, saturation: s.saturation })),
  seams, pans, crossfades, conflicts,
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
  // Reported, never resolved automatically: which of two names is the right one is a judgement, and
  // deleting somebody's authored reading to enforce a hash would be the cure being worse.
  for (const f of fs.readdirSync(GRAMMAR_DIR).filter((x) => x.endsWith('.json') && x !== `${NAME}.json`)) {
    let other = null; try { other = JSON.parse(fs.readFileSync(path.join(GRAMMAR_DIR, f), 'utf8')); } catch { continue; }
    if (other && other.hash === VIDEO_HASH)
      console.log(`  ⚠ THE SAME FILM is already in the store as "${other.name}" (identical bytes).\n`
        + `    Two rows for one film double it in every comparison. Keep the better NAME and delete the other.`);
  }
  const file = path.join(GRAMMAR_DIR, `${NAME}.json`);
  let prior = null;
  try { prior = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first study of this film */ }
  const priorShot = (i) => (prior && prior.shots || []).find((x) => x.i === i) || {};

  const out = {
    name: NAME,
    // The FILENAME, never the file. A reader who has the film can point study at it again; a reader who
    // does not still gets every number and every judgement, which is the whole point of committing this.
    source: path.basename(study.source),
    hash: VIDEO_HASH,
    measured: study.measured,
    // Sets on first study of this film, ledger left 'incomplete': `make study-check NAME=…` re-derives
    // it from pages.md/pages.json/the shots below and writes 'complete' only when nothing is left unseen
    // or unexplained. Merged forward like `threads`/`spectacle` so re-studying doesn't discard it.
    coverage: study.coverage,
    shots: shots.map((s) => ({
      i: s.i, t0: Number(s.t0.toFixed(2)), len: Number(s.len.toFixed(2)),
      ground: s.ground, groundLuma: s.groundLuma, groundHex: s.groundHex, luma: s.luma, accent: s.accent,
      // THE SHAPE, not just the average. Two shots with the same mean are different shots if one holds
      // and then explodes. `peak` is the loudest single frame, `held` the share of frames below the
      // still floor, and `curve` is the change series itself at 4 samples a second: enough to see a
      // build, a stop and a burst, small enough that a whole film is a few dozen numbers.
      motion: s.motion, peak: s.peak, held: s.held, frames: s.frames, joint: s.joint,
      jointKind: s.jointKind, curve: s.curve,
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
    // Empty-ground seams found between shots, measured (not merely detected): each one's gap duration,
    // flow axis/direction and the ground colour on either side. This is what feeds a `recipes/*.json`
    // seam candidate, see the grammar → recipes write-up below.
    seams: study.seams,
    // The second-opinion joints (pan/whip, crossfade) and any place two detectors disagreed about the
    // same moment: reported, never silently resolved. See PAN_FLOOR/CROSSFADE_* above.
    pans: study.pans, crossfades: study.crossfades, conflicts: study.conflicts,
    threads: (prior && prior.threads) ?? null,
    spectacle: (prior && prior.spectacle) ?? null,
    takeaway: (prior && prior.takeaway) ?? null,
  };
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  return { file, filled: out.shots.filter((x) => x.onScreen).length, total: out.shots.length };
}

const rel = (p) => path.relative(ROOT, p);
const note = detected
  ? `Shot boundaries are MEASURED: ${cuts.length} hard cut(s) (scene score > ${THRESHOLD}, peak ${fx(peak, 3)}), `
    + `${seams.length} empty-ground seam(s) (edge content <= ${SEAM_THRESHOLD}), ${pans.length} sustained pan(s) `
    + `(delta >= ${PAN_FLOOR}, flat, held >= ${PAN_MIN_RUN}s) and ${crossfades.length} crossfade(s) `
    + `(delta ${CROSSFADE_LO}-${CROSSFADE_HI}, flat, held >= ${CROSSFADE_MIN_RUN}s). Check them against the sheet and the pages.`
  // NO SILENT FALLBACK: no detected joint of any of the four kinds means ONE shot, stated as such, never
  // an invented equal-slice sample. Read the pages (refs/${NAME}/pages/) before deciding this is really
  // one shot: a joint of a fifth kind this study does not measure yet (a match cut, say) would land here too.
  : `no joints found: cuts peaked at ${fx(peak, 3)} (below ${THRESHOLD}), edge content never fell below `
    + `${SEAM_THRESHOLD}, no sustained pan or crossfade held long enough. The film is one shot, or its `
    + `joints are of a kind this study does not measure: read the pages.`;

const md = `# Study · ${NAME}

Source: \`${study.source}\` · ${study.measured.duration}s · ${width}x${height} · ${study.measured.fps}fps · ${hasAudio ? 'has audio' : 'no audio track'}
Sheet: \`${rel(sheet)}\`

${note}
${shots.length} ${detected ? 'shots' : 'shot'} · median ${study.measured.medianShot}s · ${study.measured.cutsPerMinute} per minute.
Coverage: ${study.coverage.frames} frames decoded, ${study.coverage.unique} unique, ${study.coverage.pages} page(s) → \`${rel(pagesDir)}/\`.
Fill \`${rel(path.join(dir, 'pages.md'))}\` (one line per page) before this study counts as complete: \`make study-check NAME=${NAME}\`.

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

**The film's own motion, for comparison with ours.** The studied reference corpus measures 1.06 to
5.01 motion (median 2.84) and 11% to 77% still (median 29%), not the 1.7-2.0 / 13-24% this doc quoted
before checking it against the corpus (\`node harness/author/claims.mjs\`, grammar/_claims.json). \`./bin/vawe
<scene>\` prints the same still-share for our attempt, but on JPEG-captured frames against this figure's
H.264-decoded ones: read the codec it prints beside the number before comparing the two directly.

${seams.length ? `## Seams (empty-ground joints)

Neither shot's own delta curve carries these: they are frames of empty ground between two acts, found
by edge content falling to <= ${SEAM_THRESHOLD} for one or more frames, not by a luma-delta cut. \`axis\`/
\`direction\` compare the edge centroid ${SEAM_WINDOW}s before the gap opens against ${SEAM_WINDOW}s after
it closes: which way the content was leaving, and which way it arrives.

| t | gap | frames | axis | direction | ground before | ground after |
|---|-----|--------|------|-----------|----------------|----------------|
${seams.map((s) => `| ${s.t}s | ${s.gap}s | ${s.frames} | ${s.axis ?? '?'} | ${s.direction ?? '?'} | ${s.groundBefore ?? '?'} | ${s.groundAfter ?? '?'} |`).join('\n')}

` : ''}${pans.length ? `## Pans / pushes

Sustained, flat, elevated delta (>= ${PAN_FLOOR}, held >= ${PAN_MIN_RUN}s): the whole frame moving at close
to constant speed, a whip or a push, not a cut and not ordinary shot motion.

| t | mean | peak | flatness | frames |
|---|------|------|----------|--------|
${pans.map((p) => `| ${p.t}s | ${p.mean} | ${p.peak} | ${p.flatness} | ${p.frames} |`).join('\n')}

` : ''}${crossfades.length ? `## Crossfades

Sustained, flat, moderate delta (${CROSSFADE_LO}-${CROSSFADE_HI}, held >= ${CROSSFADE_MIN_RUN}s): a slow dissolve, not a cut.

| t | mean | peak | flatness | frames |
|---|------|------|----------|--------|
${crossfades.map((c) => `| ${c.t}s | ${c.mean} | ${c.peak} | ${c.flatness} | ${c.frames} |`).join('\n')}

` : ''}${conflicts.length ? `## Disagreements

Two detectors both found a joint within ${MIN_SHOT}s of each other and named it differently. Reported,
never silently resolved: read the pages around each one and decide which reading is right.

${conflicts.map((c) => `- ${c.detail}`).join('\n')}

` : ''}## Pages: every unique frame, in order

\`${rel(pagesDir)}/page-NNN.png\`, ${study.coverage.pages} page(s) covering all ${study.coverage.unique} unique
frames (of ${study.coverage.frames} decoded; the rest are held/duplicate and stand in for by the frame
before them, see \`${rel(path.join(dir, 'pages.json'))}\`). Fill \`${rel(path.join(dir, 'pages.md'))}\`, one
line per page, before writing the four judgement columns below: they should come FROM those lines, not
from the peaks-only sheet above.

## Then cut it

The method that produced this table cut a 31s film to 15s by REMOVING shots, never by speeding them
up. One event per screen. Mark each row above KEEP or CUT before you write a storyboard.

## Carry forward

Open \`${rel(sheet)}\` and \`${rel(frames)}/\` before answering below. Answer these four, then run
\`make storyboard-draft\` (or write the storyboard by hand) and paste the answers in. The storyboard is
where they turn into our film.

- **pace:** median shot ${study.measured.medianShot}s. Our library runs 2.5-4s beats. Do we match this reference, and can we?
- **threads:** what survives a cut here? Name it, then name OUR version of it in our own subject.
- **spectacle:** which single shot is the loud one, and what makes it loud?
- **field:** look at the ground in the sheet, not a colour you'd eyedrop from it. Is it flat, textured,
  or generative (light, particles, a shader)? Name the specific look, not a hex.

Storyboard fields these feed: \`pace:\`, \`threads:\`/\`object:\`, \`spectacle:\`, \`color:\` (the field line,
not a swatch).
See \`engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md\` and \`engine-doctrine/CRAFT/REFERENCE-STUDY.md\`.

## Write recipe candidates

A study is not finished at the table above. If a seam, spine, enter, exit, camera move or ground change
here is a pattern worth reusing, write it to \`grammar/_${NAME}.recipes.json\` in the \`recipes.json\` entry
shape (\`kind\`, \`blurb\`, \`sources\`, \`slots\`, \`params\` with measured defaults, see \`recipes/README.md\`).
It is a CANDIDATE, not a promotion: a person still moves it into \`recipes/recipes.json\`.
`;
fs.writeFileSync(path.join(dir, 'study.md'), md);

// ── report ────────────────────────────────────────────────────────────────────────────────────────
console.log(`✓ ${shots.length} ${detected ? 'shots' : 'shot'} · ${study.measured.duration}s · ${width}x${height} · ${study.measured.fps}fps → ${rel(dir)}/`);
console.log(`  ${DECODED_FRAMES} frames decoded (container states ${EXPECTED_FRAMES}), ${uniqueFrames.length} unique, ${pagesMeta.length} page(s).`);
if (!cutsDetected) {
  console.log(`  ⚠ no hard cuts: peak scene score ${fx(peak, 3)} < ${THRESHOLD}. Dissolves, a no-cut film of empty-ground seams, or a single shot.`);
  console.log(`    Lower it with --threshold 0.15 if you believe there are cuts, then READ the sheet before trusting the list.`);
}
if (cutsDetected && near) {
  console.log(`  ⚠ ${near} frame(s) scored between ${THRESHOLD / 2} and ${THRESHOLD}: probably dissolves this list MISSES. Re-run with --threshold ${THRESHOLD / 2} and compare the sheets.`);
}
if (seams.length) {
  console.log(`  ${seams.length} empty-ground seam(s) (edge content <= ${SEAM_THRESHOLD}):`);
  for (const s of seams) console.log(`    ${s.t}s  gap ${s.gap}s (${s.frames}f)  axis ${s.axis ?? '?'} ${s.direction ?? '?'}  ${s.groundBefore ?? '?'} -> ${s.groundAfter ?? '?'}`);
}
if (pans.length) {
  console.log(`  ${pans.length} sustained pan(s) (delta >= ${PAN_FLOOR}, flat, held >= ${PAN_MIN_RUN}s):`);
  for (const p of pans) console.log(`    ${p.t}s  mean ${p.mean} peak ${p.peak} flatness ${p.flatness} (${p.frames}f)`);
}
if (crossfades.length) {
  console.log(`  ${crossfades.length} crossfade(s) (delta ${CROSSFADE_LO}-${CROSSFADE_HI}, flat, held >= ${CROSSFADE_MIN_RUN}s):`);
  for (const c of crossfades) console.log(`    ${c.t}s  mean ${c.mean} peak ${c.peak} flatness ${c.flatness} (${c.frames}f)`);
}
if (conflicts.length) {
  console.log(`  ⚠ ${conflicts.length} disagreement(s) between detectors, not silently resolved:`);
  for (const c of conflicts) console.log(`    ${c.detail}`);
}
for (const s of shots) {
  console.log(`  ${String(s.i).padStart(2, ' ')}. ${fx(s.t0).toFixed(2)}s  ${fx(s.len).toFixed(2)}s${s.score == null ? '' : `  (score ${fx(s.score, 3)})`}${s.jointKind ? `  [${s.jointKind}]` : ''}`);
}
console.log(`\n  median shot ${study.measured.medianShot}s · ${study.measured.cutsPerMinute}/min${hasAudio ? '' : ' · NO audio track: the sound column is empty by fact, not by omission'}`);
const g = writeGrammar(study, shots);
console.log(`  grammar → ${rel(g.file)}  (${g.filled}/${g.total} shots carry an authored reading; it is COMMITTED and outlives refs/)`);
console.log(`  pages → ${rel(pagesDir)}/  (fill ${rel(path.join(dir, 'pages.md'))}, then \`make study-check NAME=${NAME}\`)`);
console.log(`  Read ${rel(sheet)}, fill the four authored columns in ${rel(dir)}/study.md, then storyboard and write recipe candidates.`);
