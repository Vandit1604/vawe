// harness/media/clip-audio.test.mjs: house-rule self-check, no framework.
//   node harness/media/clip-audio.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { extractClipAudio } from './clip-audio.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-audio-'));

// A 6s tone so the extracted span and the rate-match both have something real to measure.
const src = path.join(tmp, 'src.wav');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-ar', '44100', '-ac', '1', src]);

const outDir = path.join(tmp, 'out');

// (a) A layer with no `audio` key produces nothing.
{
  const rows = extractClipAudio({
    layers: [{ type: 'video', src: 'src.wav', in: 1, out: 3 }],
    formatDir: tmp, repoRoot: tmp, outDir,
  });
  assert(rows.length === 0, `a layer with no audio must produce nothing, got ${rows.length} rows`);
}

// (b) The extracted span: [in, out) at rate 1 is (out-in) seconds of audio.
{
  const rows = extractClipAudio({
    layers: [{ type: 'video', id: 'a', src: 'src.wav', in: 1, out: 3, start: 5, audio: true }],
    formatDir: tmp, repoRoot: tmp, outDir,
  });
  assert(rows.length === 1, `expected one clip track, got ${rows.length}`);
  assert(rows[0].start === 5, `start must carry the layer's scene-time offset, got ${rows[0].start}`);
  assert(rows[0].gain === 1 && rows[0].duck === 1, 'audio:true must default to gain 1, duck 1');
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'json', rows[0].file]));
  const dur = Number(info.format.duration);
  assert(Math.abs(dur - 2) < 0.05, `[1,3) at rate 1 should extract ~2s, got ${dur}s`);
}

// (c) The rate match: rate=2 halves the extracted span's duration (atempo=2).
{
  const rows = extractClipAudio({
    layers: [{ type: 'video', id: 'b', src: 'src.wav', in: 0, out: 4, rate: 2, audio: { gain: 0.5, duck: 0.2 } }],
    formatDir: tmp, repoRoot: tmp, outDir,
  });
  assert(rows[0].gain === 0.5 && rows[0].duck === 0.2, 'authored gain/duck must round-trip');
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'json', rows[0].file]));
  const dur = Number(info.format.duration);
  assert(Math.abs(dur - 2) < 0.05, `[0,4) at rate 2 should rate-match to ~2s, got ${dur}s`);
}

console.log('clip-audio.test.mjs: ok');
