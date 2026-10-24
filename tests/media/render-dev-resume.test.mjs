// A dev draft killed halfway (a sleeping laptop) skips its finished slices on the next run, even with another worker count.
// Needs Chrome and ffmpeg.   node --test tests/media/render-dev-resume.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';

const PAGE = 'tests/fixtures/pages/seek-canvas.html';
// 1 s at 240 fps is 240 frames: four 60-frame slices on one worker.
const ARGS = ['--fps', '240', '--dur', '1', '--w', '160', '--h', '90', '--silent'];
const render = (out, workers) => [ 'harness/media/render-page.mjs', PAGE, out, ...ARGS, '--workers', workers ];
const framesDirs = (dir) => fs.readdirSync(dir).filter((n) => n.includes('.frames-')).map((n) => path.join(dir, n));
const doneSlices = (dir) => framesDirs(dir).flatMap((d) => fs.readdirSync(d).filter((n) => /^slice-\d+\.done$/.test(n)));
const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

async function killAfterSlices(out, count) {
  const child = spawn(process.execPath, render(out, '1'), { stdio: 'ignore' });
  const exited = new Promise((resolve) => child.on('exit', resolve));
  while (doneSlices(path.dirname(out)).length < count) {
    if (child.exitCode !== null) throw new Error('the render ended before it could be killed');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  child.kill('SIGKILL');
  await exited;
}

test('a killed dev draft resumes its finished slices and matches a clean render', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-dev-resume-'));
  const out = path.join(dir, 'a', 'film.mp4');
  fs.mkdirSync(path.dirname(out));
  try {
    await killAfterSlices(out, 1);
    assert.ok(!fs.existsSync(out));
    const kept = doneSlices(path.dirname(out)).length;
    const r = spawnSync(process.execPath, render(out, '3'), { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`, ${kept} slice\\(s\\) resumed from an earlier run`));

    const clean = path.join(dir, 'b', 'film.mp4');
    fs.mkdirSync(path.dirname(clean));
    assert.equal(spawnSync(process.execPath, render(clean, '1'), { encoding: 'utf8' }).status, 0);
    assert.deepEqual(frameHashes(out), frameHashes(clean));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
