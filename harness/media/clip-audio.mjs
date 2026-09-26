import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolveRelativeTimes } from '../../core/timeline/relative-time.js';

const MIXER_RATE = 44100;

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

// A leading slash is the repo root, not the disk root (core/engine/src-url.js owns that rule); reading it as a filesystem absolute path once handed ffmpeg a nonexistent /assets/x.mp4 and the render died in the pre-pass with "No such file".
function resolveSrc(src, formatDir, repoRoot) {
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

// A source with no audio track is normal in an edit, not an error (measured: 5 of 6 clips in one film had no audio stream); asking ffmpeg for it would fail the whole render.
// Exported so harness/media/ingest.mjs can ask the same question of a whole source file without a second ffprobe incantation.
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

// extractClipAudio: the entry point render.go shells out to. Returns the ClipTrack rows it wrote wav files for; a layer with a missing source is skipped with a stderr warning rather than failing the whole render.
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
    // `out` is the source-time trim point read here, but core/timeline/clips.js also reads a layer's `out` as an EXIT ANIMATION NAME (driveClips) unconditionally, for every layer type (engine-doctrine/MISTAKES.md candidate); `duration` avoids the collision.
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

// Prints the ClipTrack rows as JSON on stdout; Go unmarshals them straight into []ClipTrack.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [sceneFile, formatDir, repoRoot, outDir] = process.argv.slice(2);
  if (!sceneFile || !formatDir || !repoRoot || !outDir) {
    console.error('usage: node clip-audio.mjs <expanded-scene.json> <formatDir> <repoRoot> <outDir>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  // internal/render/expand.go only pre-resolves relative-time strings when the scene also carries block/beat/comp/recipes/voice sugar; resolving here too is a no-op when Go already did it, required when it did not.
  resolveRelativeTimes(data);
  const rows = extractClipAudio({ layers: data.layers, formatDir, repoRoot, outDir });
  process.stdout.write(JSON.stringify(rows));
}
