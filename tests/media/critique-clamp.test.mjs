import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { clampToLastFrame, probe } from '../../harness/media/see-views.mjs';
import { probeVideo } from '../../harness/media/see/core.mjs';

test('clampToLastFrame moves a time past the end to the last frame and says so', () => {
  assert.deepEqual(clampToLastFrame(1, 2, 30), { t: 1, clamped: false });
  assert.deepEqual(clampToLastFrame(99, 2, 30), { t: 1.967, clamped: true });
  assert.deepEqual(clampToLastFrame(5, 0.01, 30), { t: 0, clamped: true });
});

// A draft with audio longer than its video: the container says 2.4 s, the video holds 60 frames (2.0 s).
test('a strip past the end of a film with a longer audio track reads the video length and notes the clamp', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-clamp-'));
  const mp4 = path.join(dir, 'long-audio.mp4');
  const made = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=2', '-f', 'lavfi', '-i', 'sine=d=2.4',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', mp4]);
  assert.equal(made.status, 0);
  assert.ok(Math.abs(probe(mp4).dur - 2) < 0.05);
  assert.ok(Math.abs(probeVideo(mp4).dur - 2) < 0.05);
  const see = path.join(import.meta.dirname, '../../harness/media/see.mjs');
  const r = spawnSync(process.execPath, [see, mp4, '--strip', '99', '--out', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /note: 99s is past the last frame; the strip is centred on the last frame \(1\.967s\)/);
  fs.rmSync(dir, { recursive: true, force: true });
});
