// tests/media/page-audio.test.mjs: the offline mix is as written (no normalising), a cue lands at its
// data-at time, the -1 dBTP limiter only lowers peaks, and <meta name="loudness"> opts in to a target.
// Needs ffmpeg, not Chrome.
//   node --test tests/media/page-audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mixAndMux } from '../../harness/media/page-audio.mjs';
import { DEFAULT_GAIN_DB } from '../../core/audio/kit.mjs';
import { onsetEnvelope } from '../../core/beats/detect.js';

const SR = 44100;

const ebur = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return { I: parseFloat(s.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak: parseFloat(s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) };
};

const cue = (synth, at, gain) => ({ synth, at, gain: gain ?? DEFAULT_GAIN_DB[synth], fadeIn: 0, fadeOut: 0, trim: 0, duck: null, role: 'sfx' });

function withFilm(seconds, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'page-audio-test-'));
  const video = path.join(dir, 'silent.mp4');
  const mk = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=black:s=64x64:r=30:d=${seconds}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
  assert.equal(mk.status, 0, String(mk.stderr));
  return body({ dir, video }).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

test('a cue lands at data-at and the mix is the sum at the written gains', () => withFilm(2, async ({ dir, video }) => {
  const out = path.join(dir, 'out.mp4');
  const { measured } = await mixAndMux({ specs: [cue('chime', 0.4, -10)], duration: 2, video, out });
  const pcm = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', out, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Float32Array(pcm.stdout.buffer.slice(pcm.stdout.byteOffset, pcm.stdout.byteOffset + pcm.stdout.byteLength));
  const { env, hopSeconds } = onsetEnvelope(samples, SR);
  const peak = env.reduce((a, b) => Math.max(a, b), 0);
  const first = env.findIndex((v) => v > 0.3 * peak);
  assert.ok(Math.abs(first * hopSeconds - 0.4) < 0.06, `first onset at ${(first * hopSeconds).toFixed(3)} s, wanted 0.4 s`);
  assert.ok(Math.abs(measured.I - ebur(out).I) <= 0.2, `reported ${measured.I} LUFS`);
}));

test('a mix is not normalised: 10 dB more gain is 10 dB more loudness', () => withFilm(3, async ({ dir, video }) => {
  const at = (gain) => mixAndMux({ specs: [cue('chime', 0.4, gain)], duration: 3, video, out: path.join(dir, `g${gain}.mp4`) });
  const quiet = (await at(-30)).measured, louder = (await at(-20)).measured;
  assert.ok(Math.abs(louder.I - quiet.I - 10) <= 0.5, `${quiet.I} -> ${louder.I} LUFS for +10 dB`);
}));

test('4 soft cues and 1 swell at default gains land near -20 LUFS, true peak under -6 dBTP', () => withFilm(6, async ({ dir, video }) => {
  const specs = [cue('pluck', 0.4), cue('chime', 1.2), cue('droplet', 2.2), cue('bloom', 3.4), cue('swell', 3.9)];
  const { measured } = await mixAndMux({ specs, duration: 6, video, out: path.join(dir, 'out.mp4') });
  assert.ok(Math.abs(measured.I + 20) <= 2, `default mix ${measured.I} LUFS is not within 2 LU of -20`);
  assert.ok(measured.TP < -6, `default mix true peak ${measured.TP} dBTP is not below -6`);
}));

test('the limiter only lowers peaks: a hot mix stays under -1 dBTP, a quiet one is not raised', () => withFilm(3, async ({ dir, video }) => {
  const hot = await mixAndMux({ specs: [cue('impact', 0.3, 12), cue('braam', 0.3, 12)], duration: 3, video, out: path.join(dir, 'hot.mp4') });
  assert.ok(hot.measured.TP <= -0.5, `hot mix peaks at ${hot.measured.TP} dBTP`);
  const soft = await mixAndMux({ specs: [cue('pluck', 0.3, -40)], duration: 3, video, out: path.join(dir, 'soft.mp4') });
  assert.ok(soft.measured.TP < -35, `a -40 dB cue measured ${soft.measured.TP} dBTP: something raised it`);
}));

test('<meta name="loudness"> opts in: the mix is normalised to that target', () => withFilm(5, async ({ dir, video }) => {
  const specs = [cue('droplet', 0.3, -30), cue('swell', 0.7, -36), cue('bloom', 1.7, -30), cue('pluck', 2.4, -32)];
  const asWritten = await mixAndMux({ specs, duration: 5, video, out: path.join(dir, 'auto.mp4') });
  const normalised = await mixAndMux({ specs, duration: 5, video, out: path.join(dir, 'loud.mp4'), loudness: -14 });
  assert.ok(asWritten.measured.I < -40, `as written: ${asWritten.measured.I} LUFS`);
  assert.ok(Math.abs(normalised.measured.I + 14) <= 1.5, `normalised to ${normalised.measured.I} LUFS, wanted -14`);
  assert.ok(Math.abs(ebur(path.join(dir, 'loud.mp4')).I - normalised.measured.I) <= 0.2);
}));

test('a page with low explicit gains gets a dB change that brings the mix into the band', async () => {
  const { measureMixLevel } = await import('../../harness/media/page-audio.mjs');
  const { soundLine, RULES } = await import('../../harness/lib/draft-check.mjs');
  const at = (shift) => ['pluck', 'chime', 'droplet', 'bloom', 'swell'].map((s, i) => cue(s, 0.4 + i, DEFAULT_GAIN_DB[s] + shift));
  const before = measureMixLevel({ specs: at(-7), duration: 6 });
  assert.ok(before.I < RULES.lufsLow, `fixture level ${before.I} LUFS is not under the band`);
  const line = soundLine(before.I, undefined, before);
  console.log(`before ${before.I} LUFS: ${line}`);
  const change = Number(/change every data-gain by ([+-]\d+) dB/.exec(line)[1]);
  const after = measureMixLevel({ specs: at(-7 + change), duration: 6 });
  console.log(`after ${after.I} LUFS`);
  assert.ok(after.I >= RULES.lufsLow && after.I <= RULES.lufsHigh, `after ${change} dB: ${after.I} LUFS`);
  assert.ok(Math.abs(after.I - RULES.lufsTarget) <= 1, `after ${change} dB: ${after.I} LUFS, wanted about ${RULES.lufsTarget}`);
});
