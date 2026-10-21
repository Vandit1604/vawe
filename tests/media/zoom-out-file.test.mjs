import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

test('zoom --out ending in .png writes that file, not a folder of that name', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-zoom-out-'));
  const mp4 = path.join(dir, 'clip.mp4');
  assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=10:duration=1', '-pix_fmt', 'yuv420p', mp4]).status, 0);
  const out = path.join(dir, 'crop.png');
  const zoom = path.join(import.meta.dirname, '../../harness/media/see/zoom.mjs');
  const r = spawnSync(process.execPath, [zoom, mp4, '--at', '0.5', '--box', '100,100,240,135', '--scale', '2', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.statSync(out).isFile());
  assert.equal(r.stdout.trim().split('\n').at(-1), out);
  fs.rmSync(dir, { recursive: true, force: true });
});
