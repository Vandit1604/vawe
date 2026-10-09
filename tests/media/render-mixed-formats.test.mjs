// Chromium can save some frames as RGBA and others as RGB; the encode must keep every frame anyway.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ffmpegEncode } from '../../harness/media/render-page.mjs';

const frameCount = (mp4) => Number(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).trim());

test('a sequence that switches between RGB and RGBA frames loses no frames', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-mixed-'));
  for (let i = 0; i < 60; i++) {
    const fmt = Math.floor(i / 10) % 2 ? 'rgba' : 'rgb24';
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x223344:s=160x90', '-frames:v', '1', '-pix_fmt', fmt, path.join(dir, `f${String(i).padStart(6, '0')}.png`)]);
  }
  const kArr = [...Array(30).fill(1), ...Array(15).fill(2)];
  const start = [0];
  for (const k of kArr) start.push(start.at(-1) + k);
  const out = path.join(dir, 'out.mp4');
  const r = ffmpegEncode(dir, 60, kArr, start, out, { final: true });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(frameCount(out), 45);
  fs.rmSync(dir, { recursive: true, force: true });
});
