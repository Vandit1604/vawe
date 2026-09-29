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
