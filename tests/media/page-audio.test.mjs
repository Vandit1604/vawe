// tests/media/page-audio.test.mjs: the offline mix lands a cue at its data-at time and the master
// reaches the loudness target. Needs ffmpeg, not Chrome.
//   node --test tests/media/page-audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mixAndMux } from '../../harness/media/page-audio.mjs';
import { onsetEnvelope } from '../../core/beats/detect.js';

const SR = 44100;

test('two synth cues land at data-at and the master sits at -14 LUFS', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'page-audio-test-'));
  try {
    const video = path.join(dir, 'silent.mp4');
    const out = path.join(dir, 'out.mp4');
    const mk = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
    assert.equal(mk.status, 0, String(mk.stderr));

    const specs = [
      { synth: 'chime', at: 0.4, gain: 0, fadeIn: 0, fadeOut: 0, trim: 0, duck: null, role: 'sfx' },
      { synth: 'impact', at: 1.3, gain: -6, fadeIn: 0, fadeOut: 0, trim: 0, duck: null, role: 'sfx' },
    ];
    const { measured } = await mixAndMux({ specs, duration: 2, video, out, loudness: -14 });

    const ebu = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
    const summary = ebu.stderr.slice(ebu.stderr.lastIndexOf('Summary:'));
    const integrated = parseFloat(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]);
    assert.ok(Math.abs(integrated - -14) <= 1, `integrated ${integrated} LUFS is more than 1 LU from -14`);
    assert.ok(Math.abs(measured.I - -14) <= 1, `reported ${measured.I} LUFS`);

    const pcm = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', out, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 64 * 1024 * 1024 });
    const samples = new Float32Array(pcm.stdout.buffer.slice(pcm.stdout.byteOffset, pcm.stdout.byteOffset + pcm.stdout.byteLength));
    const { env, hopSeconds } = onsetEnvelope(samples, SR);
    const peak = env.reduce((a, b) => Math.max(a, b), 0);
    const first = env.findIndex((v) => v > 0.3 * peak);
    assert.ok(Math.abs(first * hopSeconds - 0.4) < 0.06, `first onset at ${(first * hopSeconds).toFixed(3)} s, wanted 0.4 s`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const ebur = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return { I: parseFloat(s.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak: parseFloat(s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) };
};

test('a cue-only film with quiet cues is never raised, and an explicit loudness still wins', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'page-audio-quiet-'));
  try {
    const video = path.join(dir, 'silent.mp4');
    const mk = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30:d=5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
    assert.equal(mk.status, 0, String(mk.stderr));
    const cue = (synth, at, gain) => ({ synth, at, gain, fadeIn: 0, fadeOut: 0, trim: 0, duck: null, role: 'sfx' });
    const specs = [cue('droplet', 0.3, -30), cue('swell', 0.7, -36), cue('bloom', 1.7, -30), cue('pluck', 2.4, -32)];
    const auto = path.join(dir, 'auto.mp4'), loud = path.join(dir, 'loud.mp4');
    await mixAndMux({ specs, duration: 5, video, out: auto });
    await mixAndMux({ specs, duration: 5, video, out: loud, loudness: -14 });
    const a = ebur(auto), l = ebur(loud);
    console.log(`cue-only auto ${a.I} LUFS peak ${a.peak}; explicit -14: ${l.I} LUFS peak ${l.peak}`);
    assert.ok(a.I <= -20.5, `cue-only master ${a.I} LUFS was raised`);
    assert.ok(a.peak <= -6, `cue-only peak ${a.peak} dBFS is above -6`);
    assert.ok(l.I > a.I + 5, `explicit -14 gave ${l.I} LUFS, auto gave ${a.I}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
