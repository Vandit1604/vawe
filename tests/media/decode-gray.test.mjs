import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decodeGray } from '../../harness/media/see/frame.mjs';
import { sheetTileDiffs } from '../../harness/media/draft-check.mjs';
import { frameMotion } from '../../harness/media/motion-curve.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-gray-'));
const mp4 = path.join(dir, 'bars.mp4');
spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=2', '-pix_fmt', 'yuv420p', mp4]);
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('decodeGray returns the frames back to back, one byte a pixel', () => {
  const { data, error } = decodeGray(mp4, { w: 32, h: 18, fps: 10 });
  assert.equal(error, null);
  assert.equal(data.length, 32 * 18 * 20);
});

test('decodeGray stops after the asked frames from the asked second', () => {
  const { data } = decodeGray(mp4, { w: 32, h: 18, t: 0.5, frames: 3, flags: 'area' });
  assert.equal(data.length, 32 * 18 * 3);
});

test('decodeGray gives the ffmpeg message for a file it cannot read', () => {
  const { data, error } = decodeGray(path.join(dir, 'missing.mp4'), { w: 32, h: 18 });
  assert.equal(data, null);
  assert.match(error, /missing\.mp4/);
});

test('the two readers on top of it still see a moving picture', () => {
  assert.ok(frameMotion(mp4).some((v) => v > 0));
  assert.ok(sheetTileDiffs(mp4).diffs.length > 0);
});
