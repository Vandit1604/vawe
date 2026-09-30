// harness/media/page-audio.mjs: offline audio for page films. A page holds plain <audio> elements
// (never played live); this reads them and mixes ONE ffmpeg graph onto the rendered video.
//   <audio src="music.mp3" loop data-at="0" data-gain="-3" data-fade-out="0.4"></audio>   (loop = the music bed)
//   <audio data-synth="whoosh" data-at="2.4"></audio>   (voices: core/audio/kit.mjs CUES; no data-gain
//                                                        takes the voice's DEFAULT_GAIN_DB, -26 for a UI cue)
//   <audio src="vo.wav" data-role="vo"></audio>          (ducks music -18 dB while it plays)
//   <meta name="loudness" content="-14">   (wins over the default below)
// The mix is as written: the sum of the cues at their gains, nothing raised or lowered. Only a -1 dBTP
// safety limiter runs, and it never raises a level. <meta name="loudness"> opts in to normalising to it.
// A cue that peaks more than 6 dB above the median cue is warned about, never refused.
// CLI: node harness/media/page-audio.mjs <page.html> <video.mp4> <out.mp4>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CUES, DEFAULT_GAIN_DB, renderCue, normalize, encodeWav, wavDuration } from '../../core/audio/kit.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const VO_DUCK_DB = -18;
const DUCK_ATTACK = 0.05;
const DUCK_RELEASE = 0.3;
const CUE_CEILING = 0.8;
const CUE_SPREAD_DB = 6;
const PEAK_LIMIT_DB = -1;
const LIMITER_DB = -1.5;

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status}): ${(r.stderr || r.error?.message || '').split('\n').slice(-12).join('\n')}`);
  return r.stderr;
}

function probeSeconds(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  if (!(d > 0)) throw new Error(`page-audio: cannot read the duration of ${file}`);
  return d;
}

function toFilePath(rawSrc, pageUrl, pagePath) {
  if (pagePath) return path.resolve(path.dirname(pagePath), decodeURI(rawSrc.split(/[?#]/)[0]));
  const u = new URL(rawSrc, pageUrl);
  if (u.protocol === 'file:') return fileURLToPath(u);
  return path.join(REPO_ROOT, decodeURIComponent(u.pathname));
}

/**
 * readPageAudio(page, { pagePath }?) -> { specs, loudness }  (loudness: the <meta name="loudness"> value, or null)
 * `page` is a puppeteer Page on a loaded film. `pagePath` (the page's file) makes src resolution exact;
 * without it a src resolves against the repo root that the preview server serves.
 * spec: { src | synth, at, gain (dB), fadeIn, fadeOut, trim, duck (dB or null), role }
 */
export async function readPageAudio(page, { pagePath } = {}) {
  const raw = await page.evaluate(() => {
    const num = (el, k, d) => { const v = parseFloat(el.dataset[k]); return Number.isFinite(v) ? v : d; };
    const tracks = [...document.querySelectorAll('audio')].map((el) => ({
      src: el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || null,
      synth: el.dataset.synth || null,
      at: num(el, 'at', 0), gain: num(el, 'gain', null), fadeIn: num(el, 'fadeIn', 0), fadeOut: num(el, 'fadeOut', 0),
      trim: num(el, 'trim', 0), duck: num(el, 'duck', null), role: el.dataset.role || (el.loop ? 'music' : null),
    }));
    const meta = parseFloat(document.querySelector('meta[name="loudness"]')?.content);
    return { tracks, loudness: Number.isFinite(meta) ? meta : null, url: location.href };
  });
  const problems = [];
  const specs = raw.tracks.map(({ src, ...t }) => {
    const where = `<audio> at ${t.at} s`;
    if (t.synth) {
      if (!CUES[t.synth]) problems.push(`${where}: data-synth="${t.synth}" is not a voice. Voices: ${Object.keys(CUES).join(' ')}`);
      return { ...t, gain: t.gain ?? DEFAULT_GAIN_DB[t.synth] ?? 0 };
    }
    if (!src) { problems.push(`${where}: an <audio> element needs src or data-synth`); return t; }
    const file = toFilePath(src, raw.url, pagePath);
    if (!fs.existsSync(file)) problems.push(`${where}: src="${src}" resolved to ${file}, which does not exist`);
    return { ...t, src: file, gain: t.gain ?? 0 };
  });
  if (problems.length) throw new Error(problems.join('\n'), { cause: { problems } });
  for (const s of specs) s.role ||= 'sfx';
  return { specs, loudness: raw.loudness };
}

function probePeakDb(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = r.stderr.match(/max_volume:\s*(-?[\d.]+) dB/);
  return m ? parseFloat(m[1]) : 0;
}

// peakDb is the cue's loudest sample after data-gain, in dBFS, before the limiter.
function materialise(spec, tmp, i) {
  if (spec.src) return { file: spec.src, seconds: probeSeconds(spec.src), peakDb: probePeakDb(spec.src) + spec.gain };
  const samples = normalize(renderCue(CUES[spec.synth]), CUE_CEILING);
  const file = path.join(tmp, `cue${i}-${spec.synth}.wav`);
  fs.writeFileSync(file, encodeWav(samples));
  return { file, seconds: wavDuration(samples), peakDb: 20 * Math.log10(CUE_CEILING) + spec.gain };
}

/**
 * cueSpreadWarnings(tracks) -> string[]: one line per sfx cue that peaks more than CUE_SPREAD_DB above
 * the median cue, naming the cue, its level, the median and the data-gain change that fixes it.
 */
export function cueSpreadWarnings(tracks) {
  const cues = tracks.filter(({ spec }) => spec.role === 'sfx');
  if (cues.length < 2) return [];
  const sorted = cues.map((c) => c.peakDb).sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  return cues.filter((c) => c.peakDb - median > CUE_SPREAD_DB).map(({ spec, peakDb }) => {
    const over = Math.round(peakDb - median);
    const name = spec.synth || path.basename(spec.src);
    return `cue "${name}" at ${spec.at} s peaks ${over} dB above the rest (${Math.round(peakDb)} vs ${Math.round(median)} dB): lower data-gain by ${over}`;
  });
}

const f = (n) => Number(n.toFixed(4));

function duckWindows(tracks, duration) {
  return tracks.flatMap(({ spec, seconds }) => {
    const db = spec.duck ?? (spec.role === 'vo' ? VO_DUCK_DB : null);
    if (db === null || spec.role === 'music') return [];
    const end = Math.min(duration, spec.at + Math.max(0, seconds - spec.trim));
    return [{ a: spec.at, b: end, linear: 10 ** (db / 20) }];
  });
}

function duckExpr(windows) {
  return windows
    .map((w) => `(1-${f(1 - w.linear)}*clip(min((t-${f(w.a)})/${DUCK_ATTACK},(${f(w.b + DUCK_RELEASE)}-t)/${DUCK_RELEASE}),0,1))`)
    .join('*');
}

function trackChain({ spec, seconds }, i, duration, windows) {
  const isMusic = spec.role === 'music';
  const room = Math.max(0.01, duration - spec.at);
  const playable = Math.max(0.01, seconds - spec.trim);
  const len = isMusic && playable < room ? room : Math.min(room, playable);
  const c = [`atrim=start=${f(spec.trim)}`, 'asetpts=PTS-STARTPTS', `aresample=${RATE}`, 'aformat=channel_layouts=stereo'];
  if (isMusic) c.push('aloop=loop=-1:size=2147483647', 'asetpts=N/SR/TB');
  c.push(`atrim=end=${f(len)}`, 'asetpts=PTS-STARTPTS', `volume=${f(spec.gain)}dB`);
  if (spec.fadeIn > 0) c.push(`afade=t=in:st=0:d=${f(spec.fadeIn)}`);
  if (spec.fadeOut > 0) c.push(`afade=t=out:st=${f(Math.max(0, len - spec.fadeOut))}:d=${f(spec.fadeOut)}`);
  const ms = Math.round(spec.at * 1000);
  if (ms > 0) c.push(`adelay=${ms}|${ms}`);
  if (isMusic && windows.length) c.push(`volume=eval=frame:volume='${duckExpr(windows)}'`);
  return `[${i}:a]${c.join(',')}[a${i}]`;
}

function lastJson(stderr) {
  const m = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!m) throw new Error('page-audio: loudnorm printed no measurement');
  return JSON.parse(m[m.length - 1]);
}

function measureFile(file) {
  const err = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = err.slice(err.lastIndexOf('Summary:'));
  return { I: parseFloat(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]), TP: parseFloat(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) };
}

// The limiter lowers peaks above LIMITER_DB and passes everything below it untouched.
const LIMITER = `alimiter=limit=${f(10 ** (LIMITER_DB / 20))}:level=false`;

function normaliseFilter(mixWav, loudness) {
  const p1 = lastJson(run('ffmpeg', ['-hide_banner', '-nostats', '-i', mixWav, '-af', `loudnorm=I=${loudness}:TP=${PEAK_LIMIT_DB}:LRA=11:print_format=json`, '-f', 'null', '-']));
  if (!(parseFloat(p1.input_i) > -70)) return `aresample=${RATE}`;
  const measured = `measured_I=${p1.input_i}:measured_TP=${p1.input_tp}:measured_LRA=${p1.input_lra}:measured_thresh=${p1.input_thresh}:offset=${p1.target_offset}`;
  return `loudnorm=I=${loudness}:TP=${PEAK_LIMIT_DB}:LRA=11:${measured}:linear=true,aresample=${RATE}`;
}

/** Mix the specs into `<tmp>/mix.wav` as written (no limiter, no normalising). Returns the wav path and the cue-spread warnings. */
function writeMix(specs, duration, tmp) {
  const tracks = specs.map((spec, i) => ({ spec, ...materialise(spec, tmp, i) }));
  const windows = duckWindows(tracks, duration);
  const chains = tracks.map((t, i) => trackChain(t, i, duration, windows));
  const labels = tracks.map((_, i) => `[a${i}]`).join('');
  const graph = `${chains.join(';')};${labels}amix=inputs=${tracks.length}:normalize=0:duration=longest:dropout_transition=0,apad,atrim=end=${f(duration)}[mix]`;
  const mixWav = path.join(tmp, 'mix.wav');
  run('ffmpeg', ['-y', '-loglevel', 'error', ...tracks.flatMap((t) => ['-i', t.file]), '-filter_complex', graph, '-map', '[mix]', '-c:a', 'pcm_f32le', mixWav]);
  return { warnings: cueSpreadWarnings(tracks), mixWav };
}

/** { I, TP }: integrated LUFS and true peak dBFS of the mix as written, before the limiter; null when there are no specs. */
export function measureMixLevel({ specs, duration }) {
  if (!specs.length) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-audio-'));
  try {
    return measureFile(writeMix(specs, duration, tmp).mixWav);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * mixAndMux({ specs, duration, video, out, loudness = null }) -> { out, measured: { I, TP }, warnings }
 * The audio track is the mix as written plus a -1 dBTP limiter; `loudness` (LUFS) opts in to normalising
 * to it. `measured` is the loudness of the audio track as written into `out`, and one line prints it.
 * With no specs, `out` is the video copied with no audio track and `measured` is null. `warnings`
 * (cueSpreadWarnings) are printed to stderr and never fail the mix.
 */
export async function mixAndMux({ specs, duration, video, out, loudness = null }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-audio-'));
  const tmpOut = `${out}.tmp-${process.pid}.mp4`;
  try {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    if (!specs.length) {
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-c', 'copy', '-movflags', '+faststart', tmpOut]);
      fs.renameSync(tmpOut, out);
      return { out, measured: null, warnings: [] };
    }
    const { warnings, mixWav } = writeMix(specs, duration, tmp);
    for (const w of warnings) console.warn(`page-audio: ${w}`);
    const af = loudness === null ? `${LIMITER},aresample=${RATE}` : `${normaliseFilter(mixWav, loudness)},${LIMITER}`;
    run('ffmpeg', ['-y', '-hide_banner', '-nostats', '-i', video, '-i', mixWav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', af,
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmpOut]);
    fs.renameSync(tmpOut, out);
    const measured = measureFile(out);
    console.log(`page-audio: ${loudness === null ? 'mix as written' : `normalised to ${loudness} LUFS`}: ${measured.I.toFixed(1)} LUFS, ${measured.TP.toFixed(1)} dBTP`);
    return { out, measured, warnings };
  } finally {
    fs.rmSync(tmpOut, { force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function cli([pagePath, video, out]) {
  if (!pagePath || !video || !out) {
    console.error('usage: node harness/media/page-audio.mjs <page.html> <video.mp4> <out.mp4>');
    process.exit(2);
  }
  const { openPreview } = await import('./preview-server.mjs');
  const { page, url, close } = await openPreview(pagePath);
  let read;
  try {
    await page.goto(url, { waitUntil: 'load' });
    read = await readPageAudio(page, { pagePath: path.resolve(pagePath) });
  } finally {
    await close();
  }
  const r = await mixAndMux({ specs: read.specs, duration: probeSeconds(video), video, out, loudness: read.loudness });
  console.log(`${r.out}: ${read.specs.length} tracks${r.measured ? `, ${r.measured.I.toFixed(1)} LUFS, ${r.measured.TP.toFixed(1)} dBTP` : ', no audio'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli(process.argv.slice(2));
