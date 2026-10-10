import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decodeMono } from '../../harness/lib/audio-onsets.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-decode-'));
const wav = path.join(dir, 'tone.wav');
spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', wav]);
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('decodeMono reads the whole track at the asked rate', () => {
  const { samples, error } = decodeMono(wav, 8000);
  assert.equal(error, null);
  assert.ok(Math.abs(samples.length - 24000) < 50, `${samples.length} samples`);
});

test('decodeMono with seconds reads only the start', () => {
  const { samples } = decodeMono(wav, 8000, { seconds: 1.5 });
  assert.ok(Math.abs(samples.length - 12000) < 50, `${samples.length} samples`);
});

test('decodeMono names the error for a file that is not audio', () => {
  const bad = path.join(dir, 'bad.wav');
  fs.writeFileSync(bad, 'not audio');
  const { samples, error } = decodeMono(bad);
  assert.equal(samples, null);
  assert.ok(error);
});
