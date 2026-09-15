// harness/media/clip-audio.mjs: the pre-pass that lets a video layer's OWN audio reach the render.
//
// core/layers/video.js mutes its <video> element (the mixer owns sound, not the DOM) and
// renderer/internal/audio only ever mixed music/voice/cues/bridges. A layer that sets `audio: true`
// (or `{gain, duck}`) has no other way to say "this clip has sound", so before the Go mixer runs, this
// script walks the EXPANDED scene (relative-time grammar and block/beat sugar already resolved, see
// internal/render/expand.go) for `video` layers with `audio` on, and for each one:
//   1. extracts [in, out) of the SOURCE file's own audio,
//   2. resamples it to the mixer's rate (44100, mono, matching renderer/internal/audio's `sr`),
//   3. rate-matches with `atempo=<rate>` when the layer's `rate` is not 1 -- THE ONE LOSSY STEP.
//      atempo re-times the audio to the same duration the picture takes; ffmpeg's atempo filter is
//      itself only accurate for 0.5-2.0x, so a layer with a rate outside that range needs to chain
//      atempo stages (not done here yet, see clip-audio.test.mjs).
//   4. writes a wav plus the scene-time offset (the layer's `contentStart ?? start`) where it belongs.
// Go (renderer/internal/audio/audio.go, ClipTrack) places the result in the same per-sample mix loop
// that already places music, voice and bridges. Loudness normalization stays at the mux, untouched.
//
// A layer with no `audio` key produces nothing here, so a film that never opts in renders exactly as
// it did before this file existed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolveRelativeTimes } from '../../core/timeline/relative-time.js';

const MIXER_RATE = 44100;

// Depth-first walk of layers + group children, the same shape checkLayer in core/validate/validate.mjs
// recurses (children/layers keys), collecting every `video` layer with `audio` set.
function collectClipLayers(layers) {
  const out = [];
  const walk = (list) => {
    for (const L of list || []) {
      if (!L || typeof L !== 'object') continue;
      if (L.type === 'video' && L.audio != null) out.push(L);
      if (Array.isArray(L.children)) walk(L.children);
      if (Array.isArray(L.layers)) walk(L.layers);
    }
  };
  walk(layers);
  return out;
}

// A path under assets/ resolves off the repo root (core/engine/src-url.js); a scene may also keep an
// asset alongside itself in formatDir. Same two-base fallback order the Go resolve() uses for
// music/vo, so the two audio owners (bed and clip) agree on where a file lives.
function resolveSrc(src, formatDir, repoRoot) {
  // A LEADING SLASH IS THE REPO ROOT, NOT THE DISK ROOT. A scene writes "/assets/x.mp4" because the
  // page that loads it lives at /films/scene/ and a bare "assets/x.mp4" would 404 there
  // (core/engine/src-url.js owns that rule). Reading it as a filesystem absolute path handed ffmpeg
  // /assets/x.mp4, which does not exist, and the render died in the pre-pass with "No such file".
  if (src.startsWith("/")) {
    const rooted = path.join(repoRoot, src.slice(1));
    return fs.existsSync(rooted) ? rooted : (fs.existsSync(src) ? src : null);
  }
  if (path.isAbsolute(src)) return src;
  for (const base of [formatDir, repoRoot]) {
    const p = path.join(base, src);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// A SOURCE WITH NO AUDIO TRACK IS NORMAL IN AN EDIT, not an error. B-roll, a screen capture and a
// generated clip all carry video only, and asking ffmpeg for their audio fails the whole render in the
// pre-pass. Measured: 5 of 6 clips in one film had no audio stream. Ask first, skip with a line.
// Exported so harness/media/ingest.mjs can ask the same question of a whole source file (not just a
// clip layer's slice of one) without a second ffprobe incantation.
export function hasAudioStream(src) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a',
    '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', src], { encoding: 'utf8' });
  return r.status === 0 && /audio/.test(r.stdout || '');
}

// Runs ffmpeg to cut [in, out) of `src`'s audio, rate-match it, and write a mono 44.1kHz wav.
function extractOne(src, inPoint, outPoint, rate, outFile) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error',
    '-ss', String(inPoint), '-to', String(outPoint), '-i', src];
  const filters = [];
  if (rate !== 1) filters.push(`atempo=${rate}`);
  if (filters.length) args.push('-filter:a', filters.join(','));
  args.push('-ar', String(MIXER_RATE), '-ac', '1', '-c:a', 'pcm_s16le', outFile);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

// extractClipAudio: the entry point render.go shells out to. Returns the ClipTrack rows (as plain
// objects, JSON-serialized on stdout by main() below) it wrote wav files for; layers whose source is
// missing are skipped with a stderr warning rather than failing the whole render, matching the
// severity the Go mixer already uses for a missing named cue.
export function extractClipAudio({ layers, formatDir, repoRoot, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = [];
  const clipLayers = collectClipLayers(layers);
  clipLayers.forEach((L, i) => {
    const abs = resolveSrc(L.src, formatDir, repoRoot);
    if (!abs) {
      process.stderr.write(`⚠ clip-audio: layer ${L.id || i} names src ${JSON.stringify(L.src)}, which is not on disk. Its clip audio is skipped.\n`);
      return;
    }
    if (!hasAudioStream(abs)) {
      process.stderr.write(`⚠ clip-audio: layer ${L.id || i} (${path.basename(abs)}) carries no audio track, so there is nothing to mix. Its clip audio is skipped.\n`);
      return;
    }
    const inPoint = L.in ?? 0;
    const rate = L.rate ?? 1;
    // `out` is the source-time trim point video.js itself reads, but core/timeline/clips.js ALSO reads
    // a layer's `out` as an EXIT ANIMATION NAME (driveClips), unconditionally, for every layer type
    // (engine-doctrine/MISTAKES.md candidate, not this pre-pass's to fix). An author who names a numeric
    // `out` on a video layer with clip audio hits that collision at render time, so `duration` (window
    // length on the SCENE clock, already how every real video layer in this repo trims today) is the
    // path that actually renders: derive the source OUT point from it the same way sourceTime() would
    // clamp to it, rather than requiring the colliding prop.
    const outPoint = L.out ?? (L.duration != null ? inPoint + L.duration * rate : null);
    if (outPoint == null || outPoint <= inPoint) {
      process.stderr.write(`⚠ clip-audio: layer ${L.id || i} has no valid \`out\` or \`duration\` past \`in\`, so its clip audio has no window to extract. Skipped.\n`);
      return;
    }
    const start = L.contentStart ?? L.start ?? 0;
    const a = L.audio === true ? {} : L.audio;
    const gain = a.gain ?? 1;
    const duck = a.duck ?? 1;
    const outFile = path.join(outDir, `clip-${i}.wav`);
    extractOne(abs, inPoint, outPoint, rate, outFile);
    rows.push({ file: outFile, start, gain, duck });
  });
  return rows;
}

// CLI: node clip-audio.mjs <expanded-scene.json> <formatDir> <repoRoot> <outDir>
// Prints the ClipTrack rows as JSON on stdout; Go unmarshals them straight into []ClipTrack.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [sceneFile, formatDir, repoRoot, outDir] = process.argv.slice(2);
  if (!sceneFile || !formatDir || !repoRoot || !outDir) {
    console.error('usage: node clip-audio.mjs <expanded-scene.json> <formatDir> <repoRoot> <outDir>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  // internal/render/expand.go only pre-resolves relative-time strings ("a.end") when the scene also
  // carries block/beat/comp/recipes/voice sugar; a plain scene reaches the page with them unresolved
  // (core/timeline/relative-time.js's own header comment). Resolving here too is a no-op when Go
  // already did it, and required when it did not.
  resolveRelativeTimes(data);
  const rows = extractClipAudio({ layers: data.layers, formatDir, repoRoot, outDir });
  process.stdout.write(JSON.stringify(rows));
}
