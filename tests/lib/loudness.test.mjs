import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { measureFile } from '../../harness/lib/loudness.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-loud-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('measureFile reads the loudness and the true peak of a tone', () => {
  const wav = path.join(dir, 'tone.wav');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-af', 'volume=-20dB', wav]);
  const { I, TP } = measureFile(wav);
  assert.ok(I < -30 && I > -50, `I ${I}`);
  assert.ok(TP < -20, `TP ${TP}`);
});

test('measureFile throws for a film with no audio stream', () => {
  const mp4 = path.join(dir, 'silent.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=1', '-pix_fmt', 'yuv420p', mp4]);
  assert.throws(() => measureFile(mp4), /ffmpeg failed|no audio stream/);
});
