// `vawe dev --small` encodes a draft to post: on per-pixel grain it must be several times smaller than the plain draft
// and still close to the frames. Needs ffmpeg.
//   node --test tests/media/render-small.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ffmpegEncode } from '../../harness/media/render-page.mjs';
import { VERBS } from '../../harness/cli/verbs.mjs';

const W = 480, H = 252, FRAMES = 30;
// A print's grain: a fixed per-pixel pattern that does not change from frame to frame.
const GRAIN = 'gt(mod(X*X*31+Y*Y*17+X*Y*13,101),60)';

function psnr(file, frames) {
  const r = spawnSync('ffmpeg', ['-i', file, '-framerate', '30', '-i', frames, '-lavfi', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/average:([\d.]+)/.exec(r.stderr)?.[1]);
}

test('a small draft is under a third of the plain draft and keeps the picture', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-small-'));
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `color=c=0x0a52ff:s=${W}x${H}:r=30:d=1`,
      '-vf', `format=rgb24,geq=r='${GRAIN}*190+10':g='${GRAIN}*150+82':b='255-${GRAIN}*30',drawbox=x='40+t*200':y=60:w=80:h=120:color=white:t=fill`,
      path.join(dir, 'f%06d.jpg')]);
    const kArr = Array(FRAMES).fill(1);
    const start = kArr.map((_, i) => i).concat(FRAMES);
    const plain = path.join(dir, 'plain.mp4'), small = path.join(dir, 'small.mp4');
    for (const [out, opts] of [[plain, {}], [small, { small: true }]]) {
      const r = ffmpegEncode(dir, 30, kArr, start, out, { final: false, ...opts });
      assert.equal(r.status, 0, r.stderr);
    }
    const [a, b] = [plain, small].map((f) => fs.statSync(f).size);
    assert.ok(b < a / 3, `small ${b} bytes, plain ${a} bytes`);
    const db = psnr(small, path.join(dir, 'f%06d.jpg'));
    assert.ok(db > 25, `small draft PSNR ${db} dB`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('dev --small reaches the encoder, and a plain dev does not', () => {
  const dev = VERBS.find((v) => v.name === 'dev');
  const encodeArgs = (v) => dev.build(v, ['films/x/page.html']).find((s) => s.script === 'harness/media/render-page.mjs').args;
  assert.ok(encodeArgs({ small: true }).includes('--small'));
  assert.ok(!encodeArgs({}).includes('--small'));
});
